"use client"

import { useState } from "react"
import { MoreHorizontal, Search, Plus, Edit, Trash2, RefreshCw, Calendar, Users, MapPin, CheckCircle, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import { useToast } from "@/hooks/use-toast"
import { getTables, createTable, updateTable, deleteTable, bulkCreateTables, getReservations, updateReservationStatus, type Table as TableType, type Reservation } from "@/lib/api/tables"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  return defaultMessage;
};

export default function TablesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null)
  const [tableFormData, setTableFormData] = useState({
    tableNumber: "",
    capacity: "",
    location: "",
    features: "",
    isAvailableForReservation: true,
  })
  const [bulkFormData, setBulkFormData] = useState({
    prefix: "T",
    startNumber: "",
    endNumber: "",
    capacity: "",
    location: "",
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch tables
  const { data: tablesData, isLoading: tablesLoading, refetch: refetchTables } = useQuery({
    queryKey: ['tables'],
    queryFn: getTables,
  })

  // Fetch reservations
  const { data: reservationsData, isLoading: reservationsLoading, refetch: refetchReservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: getReservations,
  })

  const tables = tablesData?.tables || []
  const reservations = reservationsData?.reservations || []

  // Filter tables based on search
  const filteredTables = tables.filter(table =>
    (table.tableNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (table.location ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Filter reservations based on search
  const filteredReservations = reservations.filter(reservation =>
    (reservation.userName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (reservation.tableNumber ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Create table mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<TableType, '_id' | 'status' | 'createdAt' | 'updatedAt'>) => createTable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      // Ensure UI updates immediately
      try {
        refetchTables()
        refetchReservations()
      } catch {
        // noop
      }
      setIsCreateDialogOpen(false)
      resetTableForm()
      toast({ title: "Success", description: "Table created successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create table")
      })
    }
  })

  // Bulk create tables mutation
  const bulkCreateMutation = useMutation({
    mutationFn: bulkCreateTables,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      // Ensure UI updates immediately after bulk create
      try {
        refetchTables()
        refetchReservations()
      } catch {
        // noop
      }
      setIsBulkCreateDialogOpen(false)
      resetBulkForm()
      toast({ title: "Success", description: "Tables created successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create tables")
      })
    }
  })

  // Update table mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TableType> }) =>
      updateTable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      // Immediately refresh data so edited changes are visible
      try {
        refetchTables()
        refetchReservations()
      } catch {
        // noop
      }
      setIsEditDialogOpen(false)
      setSelectedTable(null)
      resetTableForm()
      toast({ title: "Success", description: "Table updated successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update table")
      })
    }
  })

  // Delete table mutation
  const deleteMutation = useMutation({
    mutationFn: deleteTable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      toast({ title: "Success", description: "Table deleted successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete table")
      })
    }
  })

  // Update reservation status mutation
  const updateReservationMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Reservation['status'] }) =>
      updateReservationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      toast({ title: "Success", description: "Reservation status updated successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update reservation status")
      })
    }
  })

  const handleCreateTable = () => {
    if (!tableFormData.tableNumber.trim() || !tableFormData.capacity) {
      toast({ title: "Error", description: "Table number and capacity are required" })
      return
    }

    const tableData = {
      ...tableFormData,
      capacity: parseInt(tableFormData.capacity),
      features: tableFormData.features.split(',').map(f => f.trim()).filter(f => f),
    }

    createMutation.mutate(tableData)
  }

  const handleBulkCreate = () => {
    if (!bulkFormData.startNumber || !bulkFormData.endNumber || !bulkFormData.capacity) {
      toast({ title: "Error", description: "Start number, end number, and capacity are required" })
      return
    }

    const startNum = parseInt(bulkFormData.startNumber)
    const endNum = parseInt(bulkFormData.endNumber)

    if (startNum >= endNum) {
      toast({ title: "Error", description: "Start number must be less than end number" })
      return
    }

    bulkCreateMutation.mutate({
      ...bulkFormData,
      startNumber: startNum,
      endNumber: endNum,
      capacity: parseInt(bulkFormData.capacity),
    })
  }

  const handleEdit = (table: TableType) => {
    setSelectedTable(table)
    setTableFormData({
      tableNumber: table.tableNumber,
      capacity: table.capacity.toString(),
      location: table.location,
      features: table.features.join(', '),
      isAvailableForReservation: table.isAvailableForReservation,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedTable || !tableFormData.tableNumber.trim() || !tableFormData.capacity) {
      toast({ title: "Error", description: "Table number and capacity are required" })
      return
    }

    const tableData = {
      ...tableFormData,
      capacity: parseInt(tableFormData.capacity),
      features: tableFormData.features.split(',').map(f => f.trim()).filter(f => f),
    }

    updateMutation.mutate({
      id: selectedTable._id,
      data: tableData
    })
  }

  const handleDelete = (table: TableType) => {
    // Open a confirmation dialog before deleting
    setSelectedTable(table)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (!selectedTable) return
    deleteMutation.mutate(selectedTable._id)
    setIsDeleteDialogOpen(false)
    setSelectedTable(null)
  }

  const handleUpdateReservationStatus = (reservation: Reservation, status: Reservation['status']) => {
    updateReservationMutation.mutate({ id: reservation._id, status })
  }

  const resetTableForm = () => {
    setTableFormData({
      tableNumber: "",
      capacity: "",
      location: "",
      features: "",
      isAvailableForReservation: true,
    })
    setSelectedTable(null)
  }

  const resetBulkForm = () => {
    setBulkFormData({
      prefix: "T",
      startNumber: "",
      endNumber: "",
      capacity: "",
      location: "",
    })
  }

  const getStatusBadge = (status: TableType['status']) => {
    return <StatusBadge status={status} />
  }

  const getReservationStatusBadge = (status: Reservation['status']) => {
    return <StatusBadge status={status} />
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Tables & Reservations</h2>
      </div>

      <Tabs defaultValue="tables" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
              <div className="flex space-x-2">
                <Button onClick={() => { refetchTables(); refetchReservations(); }} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => setIsBulkCreateDialogOpen(true)} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Bulk Create
                </Button>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Table
                </Button>
              </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table Number</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reservation</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tablesLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading tables...
                    </TableCell>
                  </TableRow>
                ) : filteredTables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No tables found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTables.map((table) => (
                    <TableRow key={table._id}>
                      <TableCell className="font-medium">{table.tableNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="mr-1 h-4 w-4" />
                          {table.capacity}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="mr-1 h-4 w-4" />
                          {table.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {table.features.map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(table.status)}</TableCell>
                      <TableCell>
                        {table.isAvailableForReservation ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(table)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(table)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
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
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          <div className="flex items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reservations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Guests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservationsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading reservations...
                    </TableCell>
                  </TableRow>
                ) : filteredReservations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      No reservations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReservations.map((reservation) => (
                    <TableRow key={reservation._id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.userName}</div>
                          <div className="text-sm text-muted-foreground">{reservation.userPhone}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{reservation.tableNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Calendar className="mr-1 h-4 w-4" />
                          {new Date(reservation.reservationDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {reservation.reservationTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Users className="mr-1 h-4 w-4" />
                          {reservation.guestCount}
                        </div>
                      </TableCell>
                      <TableCell>{getReservationStatusBadge(reservation.status)}</TableCell>
                      <TableCell>{new Date(reservation.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {reservation.status === 'pending' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateReservationStatus(reservation, 'confirmed')}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Confirm
                              </DropdownMenuItem>
                            )}
                            {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateReservationStatus(reservation, 'cancelled')}
                                className="text-red-600"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            )}
                            {reservation.status === 'confirmed' && (
                              <DropdownMenuItem
                                onClick={() => handleUpdateReservationStatus(reservation, 'completed')}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Mark Complete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Table Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Table</DialogTitle>
            <DialogDescription>
              Create a new table for dining reservations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tableNumber" className="text-right">
                Table Number *
              </Label>
              <Input
                id="tableNumber"
                value={tableFormData.tableNumber}
                onChange={(e) => setTableFormData({ ...tableFormData, tableNumber: e.target.value })}
                className="col-span-3"
                placeholder="T1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="capacity" className="text-right">
                Capacity *
              </Label>
              <Input
                id="capacity"
                type="number"
                value={tableFormData.capacity}
                onChange={(e) => setTableFormData({ ...tableFormData, capacity: e.target.value })}
                className="col-span-3"
                placeholder="4"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Select
                value={tableFormData.location}
                onValueChange={(value) => setTableFormData({ ...tableFormData, location: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indoor">Indoor</SelectItem>
                  <SelectItem value="Outdoor">Outdoor</SelectItem>
                  <SelectItem value="Rooftop">Rooftop</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="features" className="text-right">
                Features
              </Label>
              <Input
                id="features"
                value={tableFormData.features}
                onChange={(e) => setTableFormData({ ...tableFormData, features: e.target.value })}
                className="col-span-3"
                placeholder="Window seat, AC, Smoking allowed"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                resetTableForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTable}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Table Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete table {selectedTable?.tableNumber}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedTable(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 text-white"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Create Tables Dialog */}
      <Dialog open={isBulkCreateDialogOpen} onOpenChange={setIsBulkCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bulk Create Tables</DialogTitle>
            <DialogDescription>
              Create multiple tables at once with sequential numbering.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="prefix" className="text-right">
                Prefix
              </Label>
              <Input
                id="prefix"
                value={bulkFormData.prefix}
                onChange={(e) => setBulkFormData({ ...bulkFormData, prefix: e.target.value })}
                className="col-span-3"
                placeholder="T"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startNumber" className="text-right">
                Start *
              </Label>
              <Input
                id="startNumber"
                type="number"
                value={bulkFormData.startNumber}
                onChange={(e) => setBulkFormData({ ...bulkFormData, startNumber: e.target.value })}
                className="col-span-3"
                placeholder="1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endNumber" className="text-right">
                End *
              </Label>
              <Input
                id="endNumber"
                type="number"
                value={bulkFormData.endNumber}
                onChange={(e) => setBulkFormData({ ...bulkFormData, endNumber: e.target.value })}
                className="col-span-3"
                placeholder="10"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bulkCapacity" className="text-right">
                Capacity *
              </Label>
              <Input
                id="bulkCapacity"
                type="number"
                value={bulkFormData.capacity}
                onChange={(e) => setBulkFormData({ ...bulkFormData, capacity: e.target.value })}
                className="col-span-3"
                placeholder="4"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bulkLocation" className="text-right">
                Location
              </Label>
              <Select
                value={bulkFormData.location}
                onValueChange={(value) => setBulkFormData({ ...bulkFormData, location: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indoor">Indoor</SelectItem>
                  <SelectItem value="Outdoor">Outdoor</SelectItem>
                  <SelectItem value="Rooftop">Rooftop</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBulkCreateDialogOpen(false)
                resetBulkForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkCreate}
              disabled={bulkCreateMutation.isPending}
            >
              {bulkCreateMutation.isPending ? "Creating..." : "Create Tables"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Table Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
            <DialogDescription>
              Update table information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-tableNumber" className="text-right">
                Table Number *
              </Label>
              <Input
                id="edit-tableNumber"
                value={tableFormData.tableNumber}
                onChange={(e) => setTableFormData({ ...tableFormData, tableNumber: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-capacity" className="text-right">
                Capacity *
              </Label>
              <Input
                id="edit-capacity"
                type="number"
                value={tableFormData.capacity}
                onChange={(e) => setTableFormData({ ...tableFormData, capacity: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-location" className="text-right">
                Location
              </Label>
              <Select
                value={tableFormData.location}
                onValueChange={(value) => setTableFormData({ ...tableFormData, location: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Indoor">Indoor</SelectItem>
                  <SelectItem value="Outdoor">Outdoor</SelectItem>
                  <SelectItem value="Rooftop">Rooftop</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-features" className="text-right">
                Features
              </Label>
              <Input
                id="edit-features"
                value={tableFormData.features}
                onChange={(e) => setTableFormData({ ...tableFormData, features: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                resetTableForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Table"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}