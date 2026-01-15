"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { MoreHorizontal, Search, Download, RefreshCw, Eye, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import * as usersApi from "@/lib/api/users"
import type { User as BaseUser } from "@/lib/types"

interface User extends BaseUser {
  dietPreference?: string
  eatingPreference?: string
  status?: "Active" | "Inactive"
  totalOrders?: number
  password?: string
}

const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  if (err && typeof err === "object" && "message" in err && typeof (err as { message?: string }).message === "string") {
    return (err as { message: string }).message;
  }
  return defaultMessage;
};

const getTierBadge = (tier?: string) => {
  switch (tier?.toLowerCase()) {
    case "bronze":
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100">
          🥉 Bronze
        </Badge>
      );
    case "silver":
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100">
          🥈 Silver
        </Badge>
      );
    case "gold":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100">
          🥇 Gold
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground italic">
          No Tier
        </Badge>
      );
  }
};


export default function UsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [dietPreferenceFilter, setDietPreferenceFilter] = useState(searchParams.get("diet") || "all");
  const [eatingPreferenceFilter, setEatingPreferenceFilter] = useState(searchParams.get("eating") || "all");
  const [tierFilter, setTierFilter] = useState(searchParams.get("tier") || "all");
  const [totalUsers, setTotalUsers] = useState(0);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialoggOpen, setAddDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState<Partial<User>>({ password: "" });
  const { toast } = useToast();

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all" && statusFilter !== "") params.set("status", statusFilter);
    if (dietPreferenceFilter !== "all" && dietPreferenceFilter !== "") params.set("diet", dietPreferenceFilter);
    if (eatingPreferenceFilter !== "all" && eatingPreferenceFilter !== "") params.set("eating", eatingPreferenceFilter);
    if (tierFilter !== "all" && tierFilter !== "") params.set("tier", tierFilter);
    
    const query = params.toString();
    router.push(`/dashboard/users${query ? `?${query}` : ""}`, { scroll: false });
  }, [statusFilter, dietPreferenceFilter, eatingPreferenceFilter, tierFilter, router]);

  // Fetch users
  useEffect(() => {
    setLoading(true);
    const fetchUsers = async () => {
      try {
        const res = await usersApi.getUsers({
          search: searchQuery,
          status: statusFilter === "all" ? "" : statusFilter,
          dietPreference: dietPreferenceFilter === "all" || dietPreferenceFilter === "none" ? "" : dietPreferenceFilter,
          eatingPreference: eatingPreferenceFilter === "all" || eatingPreferenceFilter === "none" ? "" : eatingPreferenceFilter,
          tier: tierFilter === "all" ? undefined : tierFilter as any,
          page,
          limit,
        });
        setUsers(res.users);
        setTotalUsers(res.total);
      } catch (err) {
        const errorMessage = getErrorMessage(err, "Failed to fetch users.");
        toast({ title: "Error", description: errorMessage });
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, statusFilter, dietPreferenceFilter, eatingPreferenceFilter, tierFilter, page, limit, refreshKey]);

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery),
  );

  const handleViewUser = async (userId: string) => {
    try {
      const res = await usersApi.getUserById(userId);
      setSelectedUser(res);
      console.log("Selected User:", res);
      setViewDialogOpen(true);
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to fetch user details.");
      toast({ title: "Error", description: errorMessage });
    }
  };

  const handleUpdateUser = async () => {
    if (selectedUser) {
      try {
        await usersApi.updateUser(selectedUser._id, newUserData);
        setEditDialogOpen(false);
        setNewUserData({});
        // Refresh users
        setRefreshKey(prev => prev + 1);
        toast({ title: "User updated!", description: `User ${selectedUser.name} has been updated.` });
      } catch (err) {
        const errorMessage = getErrorMessage(err, "Failed to update user.");
        toast({ title: "Error", description: errorMessage });
      }
    }
  };

  const handleDeleteUser = async () => {
    if (selectedUser) {
      try {
        await usersApi.deleteUser(selectedUser._id);
        setDeleteDialogOpen(false);
        // Refresh users
        setRefreshKey(prev => prev + 1);
        toast({ title: "User deleted!", description: `User ${selectedUser.name} has been deleted.` });
      } catch (err) {
        const errorMessage = getErrorMessage(err, "Failed to delete user.");
        toast({ title: "Error", description: errorMessage });
      }
    }
  };

  const handleAddUser = async () => {
    try {
      await usersApi.createUser(newUserData);
      setAddDialogOpen(false);
      setNewUserData({});
      // Refresh users
      setRefreshKey(prev => prev + 1);
      toast({ title: "User added!", description: `New user ${newUserData.name} has been added.` });
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to add user.");
      toast({ title: "Error", description: errorMessage });
    }
  };

  const handleExportUsers = async () => {
    try {
      const blob = await usersApi.exportUsers({
        search: searchQuery,
        status: statusFilter === "all" ? "" : statusFilter,
        dietPreference: dietPreferenceFilter === "all" ? "" : dietPreferenceFilter,
        eatingPreference: eatingPreferenceFilter === "all" ? "" : eatingPreferenceFilter,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast({ title: "Export successful!", description: "Users data has been exported to CSV." });
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to export users.");
      toast({ title: "Error", description: errorMessage });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
        <Button onClick={() => {
          setSelectedUser(null);
          setNewUserData({
            name: "", email: "", phone: "", password: "",
            dietPreference: "none", // Use 'none' for initial value
            eatingPreference: "none", // Use 'none' for initial value
            status: "Active"
          });
          setAddDialogOpen(true);
        }}>Add User</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search users by name, email, or phone..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Inactive">Inactive</SelectItem>
              <SelectItem value="Blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>

          <Select value={dietPreferenceFilter} onValueChange={(value: string) => setDietPreferenceFilter(value)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Diet Preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Diets</SelectItem>
              <SelectItem value="veg">Vegetarian</SelectItem>
              <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>

          <Select value={eatingPreferenceFilter} onValueChange={(value: string) => setEatingPreferenceFilter(value)}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue placeholder="Eating Preference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Eating</SelectItem>
              <SelectItem value="pure-veg-only">Pure Veg Only</SelectItem>
              <SelectItem value="veg-from-anywhere">Veg From Anywhere</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tierFilter} onValueChange={(value: string) => setTierFilter(value)}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="bronze">🥉 Bronze</SelectItem>
              <SelectItem value="silver">🥈 Silver</SelectItem>
              <SelectItem value="gold">🥇 Gold</SelectItem>
            </SelectContent>
          </Select>

          {/* Only one Refresh button, triggers setRefreshKey */}

          <Button variant="outline" size="sm" className="h-8" onClick={() => setRefreshKey(prev => prev + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>

          <Button variant="outline" size="sm" className="h-8" onClick={handleExportUsers}>
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
              <TableHead className="w-[50px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact Info</TableHead>
              <TableHead>Preferences</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead>Registered On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user, idx) => (
              <TableRow key={user._id || idx}>
                <TableCell className="font-medium">{typeof user._id === "string" && user._id.length >= 3 ? user._id.slice(-3) : typeof user._id === "string" ? user._id : "---"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={`/placeholder.svg?height=28&width=28`} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {user.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{user.email}</span>
                    <span className="text-xs text-muted-foreground">{user.phone}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <Badge variant="outline" className="w-fit">
                      {user.dietPreference}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{user.eatingPreference}</span>
                  </div>
                </TableCell>
                <TableCell>{getTierBadge(user.tier)}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={user.status}
                    category="generic"
                    compact
                    ariaLabel={`User status: ${user.status}`}
                  />
                </TableCell>
                <TableCell>{user.totalOrders}</TableCell>
                <TableCell>{user.createdAt instanceof Date ? user.createdAt.toLocaleDateString() : user.createdAt}</TableCell>
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
                      <DropdownMenuItem
                        onClick={() => {
                          // setSelectedUser(user)
                          // setViewDialogOpen(true)
                          handleViewUser(user._id);
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setNewUserData(user);
                          setEditDialogOpen(true)
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedUser(user)
                          setDeleteDialogOpen(true)
                        }}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {loading && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading users...
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No users found.
          </div>
        )}
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
          disabled={page * limit >= totalUsers || loading}
        >
          Next
        </Button>
      </div>

      {/* View User Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Detailed information about the selected user.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={`/placeholder.svg?height=64&width=64`} alt={selectedUser.name} />
                  <AvatarFallback>{selectedUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="text-xl font-semibold">{selectedUser.name}</h4>
                  <p className="text-sm text-muted-foreground">ID: {selectedUser._id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm">{selectedUser.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Food Preference</p>
                  <p className="text-sm">{selectedUser.dietPreference}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Eating Preference</p>
                  <p className="text-sm">{selectedUser.eatingPreference}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Status</p>
                  <StatusBadge
                    status={selectedUser.status}
                    category="generic"
                    ariaLabel={`User status: ${selectedUser.status}`}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Registered On</p>
                    <p className="text-sm">
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt).toLocaleString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                      : "N/A"}
                    </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Total Orders</p>
                  <p className="text-sm">{selectedUser.totalOrders}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input id="name" defaultValue={selectedUser.name} className="col-span-3" onChange={(e) => setNewUserData({...newUserData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">
                  Email
                </Label>
                <Input id="email" defaultValue={selectedUser.email} className="col-span-3" onChange={(e) => setNewUserData({...newUserData, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input id="phone" defaultValue={selectedUser.phone} className="col-span-3" onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Status</Label>
                <div className="flex items-center space-x-2 col-span-3">
                  <Checkbox id="status" checked={newUserData.status === "Active"} onCheckedChange={(checked) => setNewUserData({...newUserData, status: checked ? "Active" : "Inactive"})} />
                  <Label htmlFor="status">Active</Label>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dietPreference" className="text-right">
                  Food Preference
                </Label>
        <Select value={newUserData.dietPreference === undefined || newUserData.dietPreference === "" ? "none" : newUserData.dietPreference} onValueChange={(value: string) => setNewUserData({...newUserData, dietPreference: value === "none" ? "" : value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select food preference" />
                  </SelectTrigger>
                  <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="veg">Vegetarian</SelectItem>
            <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="eatingPreference" className="text-right">
                  Eating Preference
                </Label>
        <Select value={newUserData.eatingPreference === undefined || newUserData.eatingPreference === "" ? "none" : newUserData.eatingPreference} onValueChange={(value: string) => setNewUserData({...newUserData, eatingPreference: value === "none" ? "" : value})}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select eating preference" />
                  </SelectTrigger>
                  <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="pure-veg-only">Pure Veg Only</SelectItem>
            <SelectItem value="veg-from-anywhere">Veg From Anywhere</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notes" className="text-right">
                  Notes
                </Label>
                <Textarea id="notes" placeholder="Add notes about this user" className="col-span-3" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="py-4">
              <p className="text-center font-semibold">
                {selectedUser.name} ({selectedUser._id})
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addDialoggOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Enter new user information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newName" className="text-right">Name</Label>
              <Input id="newName" value={newUserData.name || ""} className="col-span-3" onChange={(e) => setNewUserData({...newUserData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newEmail" className="text-right">Email</Label>
              <Input id="newEmail" value={newUserData.email || ""} className="col-span-3" onChange={(e) => setNewUserData({...newUserData, email: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPhone" className="text-right">Phone</Label>
              <Input id="newPhone" value={newUserData.phone || ""} className="col-span-3" onChange={(e) => setNewUserData({...newUserData, phone: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newPassword" className="text-right">Password</Label>
              <Input id="newPassword" type="password" value={newUserData.password || ""} className="col-span-3" onChange={(e) => setNewUserData({...newUserData, password: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox id="newStatus" checked={newUserData.status === "Active"} onCheckedChange={(checked) => setNewUserData({...newUserData, status: checked ? "Active" : "Inactive"})} />
                <Label htmlFor="newStatus">Active</Label>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newdietPreference" className="text-right">Food Preference</Label>
              <Select value={newUserData.dietPreference === undefined || newUserData.dietPreference === "" ? "none" : newUserData.dietPreference} onValueChange={(value: string) => setNewUserData({...newUserData, dietPreference: value === "none" ? "" : value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select food preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="veg">Vegetarian</SelectItem>
                  <SelectItem value="non-veg">Non-Vegetarian</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newEatingPreference" className="text-right">Eating Preference</Label>
              <Select value={newUserData.eatingPreference === undefined || newUserData.eatingPreference === "" ? "none" : newUserData.eatingPreference} onValueChange={(value: string) => setNewUserData({...newUserData, eatingPreference: value === "none" ? "" : value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select eating preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="pure-veg-only">Pure Veg Only</SelectItem>
                  <SelectItem value="veg-from-anywhere">Veg From Anywhere</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


