"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCallback, useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, Trash2, RefreshCw, Download } from "lucide-react"
import { Input } from "@/components/ui/input"
import { TableHead } from "@/components/ui/table"
import { MoreHorizontal } from "lucide-react"
import * as complaintsApi from "@/lib/api/complaints"
import * as usersApi from "@/lib/api/users"

// User interface for dropdown
interface User {
  _id: string;
  name: string;
  email: string;
}

// Error handling utility function
const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (err && typeof err === 'object' && 'response' in err) {
    const axiosError = err as { response?: { data?: { message?: string } }; message?: string };
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.message) {
      return axiosError.message;
    }
  }
  return defaultMessage;
};

// Category transformer: converts display value to backend format
const transformCategoryToBackend = (displayValue: string): string => {
  const categoryMap: Record<string, string> = {
    'Food Quality': 'food_quality',
    'Delivery Time': 'delivery_time',
    'Payment Issues': 'payment_issues',
    'Service': 'service',
    'Other': 'other',
  };
  return categoryMap[displayValue] || displayValue.toLowerCase().replace(/\s+/g, '_');
};

// Category transformer: converts backend value to display format
const transformCategoryToDisplay = (backendValue: string): string => {
  const displayMap: Record<string, string> = {
    'food_quality': 'Food Quality',
    'delivery_time': 'Delivery Time',
    'payment_issues': 'Payment Issues',
    'service': 'Service',
    'other': 'Other',
  };
  return displayMap[backendValue] || backendValue.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

// Form validation
const validateComplaintForm = (data: Partial<Complaint>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!data.subject || data.subject.trim().length < 5) {
    errors.push('Subject must be at least 5 characters');
  }
  if (data.subject && data.subject.length > 100) {
    errors.push('Subject must not exceed 100 characters');
  }
  if (!data.description || data.description.trim().length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  if (data.description && data.description.length > 500) {
    errors.push('Description must not exceed 500 characters');
  }
  if (!data.category) {
    errors.push('Category is required');
  }
  
  return { valid: errors.length === 0, errors };
};

export interface Complaint {
  id: string
  complaintId: string
  user: {
    _id: string
    name: string
    email: string
  }
  subject: string
  description: string
  status: string
  priority: string
  category: string
  createdAt: string
  updatedAt: string
  userName?: string
  userEmail?: string
  resolvedAt?: string
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [totalComplaints, setTotalComplaints] = useState(0)
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [newComplaintData, setNewComplaintData] = useState<Partial<Complaint>>({});
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const { toast } = useToast();
  // Fetch users for dropdown
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await usersApi.getUsers({ limit: 1000 });
      if (Array.isArray(response.users)) {
        setUsers(response.users.map((u) => ({
          _id: u._id || '',
          name: u.name || '',
          email: u.email || '',
        })));
      } else {
        setUsers([]);
      }
    } catch (err) {
      toast({ title: 'Error', description: getErrorMessage(err, 'Failed to fetch users.') });
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (addDialogOpen) {
      fetchUsers();
    }
  }, [addDialogOpen, fetchUsers]);

  // Robust fetchComplaints using same approach as chefs page
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      // Map UI filter values to backend enum values
      const statusMap: Record<string, string> = {
        'open': 'Open',
        'in-progress': 'In-progress',
        'resolved': 'Resolved',
        'closed': 'Closed',
        'all': '',
        '': '',
      };
      const priorityMap: Record<string, string> = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'all': '',
        '': '',
      };
      // Category filter: pass as-is except for 'all'
      const categoryValue = categoryFilter === 'all' ? '' : categoryFilter;
      
      const response = await complaintsApi.getComplaints({
        status: statusMap[statusFilter] ?? '',
        priority: priorityMap[priorityFilter] ?? '',
        category: categoryValue,
        page,
        limit,
      });
      
      // Defensive mapping: backend returns { success, data: [...], pagination: { total } }
      const mappedComplaints = Array.isArray(response.data)
        ? response.data.map((c) => ({
            id: c._id || '',
            complaintId: c.complaintId || c._id || '',
            user: { 
              _id: c.user?._id || '', 
              name: c.user?.name || '', 
              email: c.user?.email || '' 
            },
            subject: c.subject || '',
            description: c.description || '',
            status: c.status || '',
            priority: c.priority || '',
            category: transformCategoryToDisplay(c.category || ''),
            createdAt: c.createdAt || '',
            updatedAt: c.updatedAt || '',
            userName: c.user?.name,
            userEmail: c.user?.email,
          }))
        : [];
      setComplaints(mappedComplaints);
      setTotalComplaints(response.pagination?.total || mappedComplaints.length);
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Failed to fetch complaints.');
      toast({ title: 'Error', description: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, page, limit, toast]);

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

  const handleUpdateComplaint = async () => {
    if (selectedComplaint) {
      try {
        // Only validate description (resolution notes) if updated
        if (newComplaintData.description && newComplaintData.description.trim().length < 10) {
          toast({ 
            title: 'Validation Error', 
            description: 'Resolution notes must be at least 10 characters'
          });
          return;
        }
        
        // Build payload with only status and description (resolution notes)
        const statusMap: Record<string, string> = {
          open: 'Open',
          'in-progress': 'In-progress',
          resolved: 'Resolved',
          closed: 'Closed',
          'Open': 'Open',
          'In-progress': 'In-progress',
          'Resolved': 'Resolved',
          'Closed': 'Closed',
        };
        
        const statusValue = statusMap[(newComplaintData.status || selectedComplaint.status || 'open').toLowerCase?.() || newComplaintData.status || selectedComplaint.status] || 'Open';
        
        const payload: Partial<complaintsApi.Complaint> = {
          status: statusValue as complaintsApi.Complaint['status'],
          description: newComplaintData.description ?? selectedComplaint.description,
        };
        
        // Use complaintId for admin endpoint
        const complaintId = selectedComplaint.complaintId || selectedComplaint.id;
        await complaintsApi.updateComplaint(complaintId, payload);
        
        setEditDialogOpen(false);
        setNewComplaintData({});
        fetchComplaints();
        toast({ title: 'Complaint updated!', description: `Complaint ${selectedComplaint.subject} has been updated.` });
      } catch (err) {
        const errorMessage = getErrorMessage(err, 'Failed to update complaint.');
        toast({ title: 'Error', description: errorMessage });
      }
    }
  }

  const handleAddComplaint = async () => {
    try {
      // Defensive: build payload as per backend requirements
      if (!newComplaintData.user || typeof newComplaintData.user !== 'object' || !newComplaintData.user._id) {
        toast({ title: 'Error', description: 'Please select a user.' });
        return;
      }
      
      // Validate form
      const validation = validateComplaintForm(newComplaintData);
      if (!validation.valid) {
        toast({ 
          title: 'Validation Error', 
          description: validation.errors.join(', ')
        });
        return;
      }

      // Map status and priority to correct case for backend
      const statusMap: Record<string, string> = {
        open: 'Open',
        'in-progress': 'In-progress',
        resolved: 'Resolved',
        closed: 'Closed',
      };
      const priorityMap: Record<string, string> = {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
      };
      
      const statusValue = statusMap[(newComplaintData.status || 'open').toLowerCase()] || 'Open';
      const priorityValue = priorityMap[(newComplaintData.priority || 'low').toLowerCase()] || 'Low';
      
      // Transform category to backend format
      const categoryValue = transformCategoryToBackend(newComplaintData.category || '');
      
      const payload: Partial<complaintsApi.Complaint> = {
        userId: newComplaintData.user._id,
        userName: newComplaintData.user.name || '',
        userEmail: newComplaintData.user.email || '',
        subject: newComplaintData.subject as string,
        description: newComplaintData.description || '',
        category: categoryValue as string,
        status: statusValue as complaintsApi.Complaint['status'],
        priority: priorityValue as complaintsApi.Complaint['priority'],
        attachments: [],
        responses: [],
      };
      
      await complaintsApi.createComplaint(payload);
      
      setAddDialogOpen(false);
      setNewComplaintData({});
      fetchComplaints();
      toast({ title: 'Complaint added!', description: `New complaint ${payload.subject} has been added.` });
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Failed to add complaint.');
      toast({ title: 'Error', description: errorMessage });
    }
  };

  const handleDeleteComplaint = async () => {
    if (selectedComplaint) {
      try {
        const complaintId = selectedComplaint.complaintId || selectedComplaint.id;
        await complaintsApi.deleteComplaint(complaintId);
        
        setDeleteDialogOpen(false);
        fetchComplaints();
        toast({ title: 'Complaint deleted!', description: `Complaint ${selectedComplaint.subject} has been deleted.` });
      } catch (err) {
        const errorMessage = getErrorMessage(err, 'Failed to delete complaint.');
        toast({ title: 'Error', description: errorMessage });
      }
    }
  }

  const handleExportComplaints = async () => {
    try {
      const blob = await complaintsApi.exportComplaints({
        status: statusFilter === 'all' ? '' : statusFilter,
        priority: priorityFilter === 'all' ? '' : priorityFilter,
        category: categoryFilter === 'all' ? '' : categoryFilter,
      });
      
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'complaints.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: 'Export successful!', description: 'Complaints data has been exported to CSV.' });
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Failed to export complaints.');
      toast({ title: 'Error', description: errorMessage });
    }
  }

  const filteredComplaints = complaints.filter(
    (complaint) =>
      complaint.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      complaint.user?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )



  const getPriorityColor = (priority: Complaint["priority"]) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-100"
      case "medium":
        return "bg-orange-100 text-orange-800 hover:bg-orange-100"
      case "low":
        return "bg-green-100 text-green-800 hover:bg-green-100"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100"
    }
  }

  // Normalize various backend status formats to the select value options
  const normalizeStatusForSelect = (status?: string) => {
    if (!status) return "";
    const s = String(status).toLowerCase();
    if (s.includes("open")) return "open";
    if (s.includes("in-progress") || s.includes("in progress") || s === "inprogress") return "in-progress";
    if (s.includes("resolve")) return "resolved";
    if (s.includes("closed")) return "closed";
    return s;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Complaints</h2>
        {/* <Button onClick={() => {
          setSelectedComplaint(null);
          setNewComplaintData({
            userName: "", userEmail: "",
            subject: "", description: "", category: "",
            status: "open", priority: "low",
          });
          setAddDialogOpen(true);
        }}>Add Complaint</Button> */}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search complaints by user, subject, or ID..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(value: "open" | "in-progress" | "resolved" | "closed" | "all") => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={(value: "low" | "medium" | "high" | "all") => setPriorityFilter(value)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Filter by Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(value: string) => setCategoryFilter(value)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="food_quality">Food Quality</SelectItem>
              <SelectItem value="delivery_time">Delivery Time</SelectItem>
              <SelectItem value="payment_issues">Payment Issues</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8" onClick={fetchComplaints}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handleExportComplaints}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Select value={String(limit)} onValueChange={(value) => setLimit(Number(value))}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  Loading complaints...
                </TableCell>
              </TableRow>
            ) : complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No complaints found.
                </TableCell>
              </TableRow>
            ) : (
              filteredComplaints.map((complaint) => (
              <TableRow key={complaint.id}>
                <TableCell className="font-medium">{complaint.complaintId}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{complaint.user?.name}</span>
                    <span className="text-xs text-muted-foreground">{complaint.user?.email}</span>
                  </div>
                </TableCell>
                <TableCell>{complaint.subject}</TableCell>
                <TableCell>
                  <Badge variant="outline">{complaint.category}</Badge>
                </TableCell>
                <TableCell>
                  <StatusBadge status={complaint.status} />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={getPriorityColor(complaint.priority)}>
                    {complaint.priority?.charAt(0).toUpperCase() + complaint.priority?.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>{complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : ""}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {/* <DropdownMenuItem
                          onClick={() => handleViewComplaint(complaint.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View
                      </DropdownMenuItem> */}
                      <DropdownMenuItem
                        onClick={() => {
                            setSelectedComplaint(complaint);
                            // Prefill the edit form and ensure status matches the select option values
                            setNewComplaintData({ ...complaint, status: normalizeStatusForSelect(complaint.status) });
                            setEditDialogOpen(true);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                            setSelectedComplaint(complaint);
                            setDeleteDialogOpen(true);
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1 || loading}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={page * limit >= totalComplaints || loading}
        >
          Next
        </Button>
      </div>

      {/* View Complaint Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Complaint Details</DialogTitle>
            <DialogDescription>Detailed information about the selected complaint.</DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Complaint ID</p>
                  <p className="text-sm">{selectedComplaint.complaintId || selectedComplaint.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Category</p>
                  <Badge variant="outline">{selectedComplaint.category}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Status</p>
                  <StatusBadge
                    status={selectedComplaint.status}
                    category="generic"
                    ariaLabel={`Complaint status: ${selectedComplaint.status}`}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Priority</p>
                  <Badge variant="secondary" className={getPriorityColor(selectedComplaint.priority)}>
                    {selectedComplaint.priority}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">User Information</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`/placeholder.svg?height=32&width=32`} alt={selectedComplaint.user?.name || selectedComplaint.userName} />
                    <AvatarFallback>{selectedComplaint.user?.name ? selectedComplaint.user.name.charAt(0) : (selectedComplaint.userName ? selectedComplaint.userName.charAt(0) : "?")}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{selectedComplaint.user?.name || selectedComplaint.userName}</span>
                    <span className="text-xs text-muted-foreground">{selectedComplaint.user?.email || selectedComplaint.userEmail}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Subject</p>
                <p className="text-sm">{selectedComplaint.subject}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm">{selectedComplaint.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Submitted On</p>
                  <p className="text-sm">{selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString() : ""}</p>
                </div>
                {selectedComplaint.resolvedAt && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Resolved On</p>
                    <p className="text-sm">{selectedComplaint.resolvedAt}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Complaint Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Complaint</DialogTitle>
            <DialogDescription>Update complaint information</DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select value={newComplaintData.status || ""} onValueChange={(value) => setNewComplaintData({...newComplaintData, status: value as Complaint["status"]})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="resolution" className="text-right">
                  Resolution Notes
                </Label>
                <Textarea
                  id="resolution"
                  placeholder="Add resolution notes"
                  className="col-span-3"
                  rows={5}
                  value={newComplaintData.description || ""}
                  onChange={(e) => setNewComplaintData({...newComplaintData, description: e.target.value})}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateComplaint}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Complaint Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this complaint? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedComplaint && (
            <div className="py-4">
              <p className="text-center font-semibold">
                {selectedComplaint.id} - {selectedComplaint.subject}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteComplaint}>
              Delete Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Complaint Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Complaint</DialogTitle>
            <DialogDescription>
              Create a new complaint with the following information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user" className="text-right">User</Label>
              <Select
                value={typeof newComplaintData.user === 'object' && newComplaintData.user?._id ? newComplaintData.user._id : ''}
                onValueChange={(_id) => {
                  const selected = users.find((u) => u._id === _id);
                  setNewComplaintData({ ...newComplaintData, user: selected || undefined });
                }}
                disabled={usersLoading}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={usersLoading ? 'Loading users...' : 'Select user'} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">Subject *</Label>
              <div className="col-span-3">
                <Input 
                  id="subject" 
                  value={newComplaintData.subject || ""} 
                  onChange={(e) => setNewComplaintData({...newComplaintData, subject: e.target.value})}
                  placeholder="Enter subject (5-100 characters)"
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {newComplaintData.subject?.length || 0}/100 characters (min: 5)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Description *</Label>
              <div className="col-span-3">
                <Textarea 
                  id="description" 
                  value={newComplaintData.description || ""} 
                  onChange={(e) => setNewComplaintData({...newComplaintData, description: e.target.value})}
                  placeholder="Enter description (10-500 characters)"
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {newComplaintData.description?.length || 0}/500 characters (min: 10)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={newComplaintData.status || "open"} onValueChange={(value) => setNewComplaintData({...newComplaintData, status: value as Complaint["status"]})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In-progress">In Progress</SelectItem>
                  <SelectItem value="Resolved">Resolved</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">Priority</Label>
              <Select value={newComplaintData.priority || "low"} onValueChange={(value) => setNewComplaintData({...newComplaintData, priority: value as Complaint["priority"]})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Category *</Label>
              <Select value={newComplaintData.category || ""} onValueChange={(value) => setNewComplaintData({...newComplaintData, category: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Food Quality">Food Quality</SelectItem>
                  <SelectItem value="Delivery Time">Delivery Time</SelectItem>
                  <SelectItem value="Payment Issues">Payment Issues</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddComplaint}>Add Complaint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
