"use client"

import { useState } from "react"
import { MoreHorizontal, Search, Plus, Edit, Trash2, RefreshCw, ToggleLeft, ToggleRight } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import { useToast } from "@/hooks/use-toast"
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, toggleCouponStatus, generateCouponCode, type Coupon } from "@/lib/api/coupons"
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

export default function CouponsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    minOrderValue: "",
    maxDiscount: "",
    usageLimit: "",
    usageLimitPerUser: "",
    validFrom: "",
    validUntil: "",
    isActive: true,
    applicableTiers: [] as ('all' | 'bronze' | 'silver' | 'gold')[],
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch coupons
  const { data: couponsData, isLoading: couponsLoading, refetch: refetchCoupons } = useQuery({
    queryKey: ['coupons'],
    queryFn: getCoupons,
  })

  const coupons = couponsData?.coupons || []

  // Filter coupons based on search and exclude spin wheel coupons
  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) && 
    coupon.meta?.origin !== 'spinWheel'
  )

  // Create coupon mutation
  const createMutation = useMutation({
    mutationFn: (data: Omit<Coupon, '_id' | 'usedCount' | 'createdAt' | 'updatedAt'>) => createCoupon(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      setIsCreateDialogOpen(false)
      resetForm()
      toast({ title: "Success", description: "Coupon created successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create coupon")
      })
    }
  })

  // Update coupon mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Coupon> }) =>
      updateCoupon(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      setIsEditDialogOpen(false)
      setSelectedCoupon(null)
      resetForm()
      toast({ title: "Success", description: "Coupon updated successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update coupon")
      })
    }
  })

  // Delete coupon mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      setIsDeleteDialogOpen(false)
      setCouponToDelete(null)
      toast({ title: "Success", description: "Coupon deleted successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete coupon")
      })
    }
  })

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: toggleCouponStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast({ title: "Success", description: "Coupon status updated successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update coupon status")
      })
    }
  })

  // Generate code mutation
  const generateCodeMutation = useMutation({
    mutationFn: generateCouponCode,
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, code: data.code }))
      toast({ title: "Success", description: "Coupon code generated" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to generate coupon code")
      })
    }
  })

  const handleCreate = () => {
    if (!formData.code.trim() || !formData.discountValue || !formData.usageLimit) {
      toast({ title: "Error", description: "Code, discount value, and usage limit are required" })
      return
    }

    const couponData = {
      ...formData,
      discountValue: parseFloat(formData.discountValue),
      minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : 0,
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
      usageLimit: parseInt(formData.usageLimit),
      usageLimitPerUser: formData.usageLimitPerUser ? parseInt(formData.usageLimitPerUser) : 1,
      validFrom: formData.validFrom || new Date().toISOString().split('T')[0],
      validUntil: formData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    }

    createMutation.mutate(couponData)
  }

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon)
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      minOrderValue: coupon.minOrderValue.toString(),
      maxDiscount: coupon.maxDiscount?.toString() || "",
      usageLimit: coupon.usageLimit.toString(),
      usageLimitPerUser: coupon.usageLimitPerUser.toString(),
      validFrom: coupon.validFrom.split('T')[0],
      validUntil: coupon.validUntil.split('T')[0],
      isActive: coupon.isActive,
      applicableTiers: coupon.applicableTiers,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedCoupon || !formData.code.trim() || !formData.discountValue || !formData.usageLimit) {
      toast({ title: "Error", description: "Code, discount value, and usage limit are required" })
      return
    }

    const couponData = {
      ...formData,
      discountValue: parseFloat(formData.discountValue),
      minOrderValue: parseFloat(formData.minOrderValue) || 0,
      maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
      usageLimit: parseInt(formData.usageLimit),
      usageLimitPerUser: parseInt(formData.usageLimitPerUser) || 1,
    }

    updateMutation.mutate({
      id: selectedCoupon._id,
      data: couponData
    })
  }

  const handleDelete = (coupon: Coupon) => {
    setCouponToDelete(coupon)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (couponToDelete) {
      deleteMutation.mutate(couponToDelete._id)
    }
  }

  const handleToggleStatus = (coupon: Coupon) => {
    toggleMutation.mutate(coupon._id)
  }

  const handleGenerateCode = () => {
    generateCodeMutation.mutate()
  }

  const handleTierToggle = (tier: 'bronze' | 'silver' | 'gold', checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      applicableTiers: checked
        ? [...prev.applicableTiers, tier]
        : prev.applicableTiers.filter(t => t !== tier)
    }))
  }

  const resetForm = () => {
    setFormData({
      code: "",
      discountType: "percentage",
      discountValue: "",
      minOrderValue: "",
      maxDiscount: "",
      usageLimit: "",
      usageLimitPerUser: "",
      validFrom: "",
      validUntil: "",
      isActive: true,
      applicableTiers: [],
    })
    setSelectedCoupon(null)
  }

  const getDiscountDisplay = (coupon: Coupon) => {
    if (coupon.discountType === 'percentage') {
      return `${coupon.discountValue}%`
    }
    return `₹${coupon.discountValue}`
  }

  const getTiersDisplay = (tiers: string[]) => {
    if (tiers.includes('all')) return 'All'
    if (tiers.length === 0) return 'None'
    return tiers.map(tier => tier.charAt(0).toUpperCase() + tier.slice(1)).join(', ')
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Coupons</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => refetchCoupons()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Coupon
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search coupons..."
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
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Min Order</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Tiers</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {couponsLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading coupons...
                </TableCell>
              </TableRow>
            ) : filteredCoupons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  No coupons found
                </TableCell>
              </TableRow>
            ) : (
              filteredCoupons.map((coupon) => (
                <TableRow key={coupon._id}>
                  <TableCell className="font-medium font-mono">{coupon.code}</TableCell>
                  <TableCell>{getDiscountDisplay(coupon)}</TableCell>
                  <TableCell>₹{coupon.minOrderValue}</TableCell>
                  <TableCell>{coupon.usedCount}/{coupon.usageLimit}</TableCell>
                  <TableCell>{new Date(coupon.validUntil).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getTiersDisplay(coupon.applicableTiers)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {coupon.meta?.origin ? (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
                        {coupon.meta.origin === 'spinWheel' ? 'Spin Wheel' : coupon.meta.origin}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Manual</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={coupon.isActive ? 'Active' : 'Inactive'} />
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
                        <DropdownMenuItem onClick={() => handleEdit(coupon)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(coupon)}>
                          {coupon.isActive ? (
                            <>
                              <ToggleLeft className="mr-2 h-4 w-4" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <ToggleRight className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(coupon)}
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

      {/* Create Coupon Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Coupon</DialogTitle>
            <DialogDescription>
              Create a new discount coupon for customers.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Code *
              </Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2024"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateCode}
                  disabled={generateCodeMutation.isPending}
                >
                  Generate
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discountType" className="text-right">
                Type *
              </Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: "percentage" | "fixed") =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="discountValue" className="text-right">
                Value *
              </Label>
              <Input
                id="discountValue"
                type="number"
                step="1"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className="col-span-3"
                placeholder={formData.discountType === 'percentage' ? "10" : "50"}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="minOrderValue" className="text-right">
                Min Order
              </Label>
              <Input
                id="minOrderValue"
                type="number"
                step="1"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
            {formData.discountType === 'percentage' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="maxDiscount" className="text-right">
                  Max Discount
                </Label>
                <Input
                  id="maxDiscount"
                  type="number"
                  step="1"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  className="col-span-3"
                  placeholder="100.00"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="usageLimit" className="text-right">
                Usage Limit *
              </Label>
              <Input
                id="usageLimit"
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                className="col-span-3"
                placeholder="100"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="usageLimitPerUser" className="text-right">
                Per User Limit
              </Label>
              <Input
                id="usageLimitPerUser"
                type="number"
                value={formData.usageLimitPerUser}
                onChange={(e) => setFormData({ ...formData, usageLimitPerUser: e.target.value })}
                className="col-span-3"
                placeholder="1"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="validFrom" className="text-right">
                Valid From
              </Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="validUntil" className="text-right">
                Valid Until
              </Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Applicable Tiers
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="tier-all"
                    checked={formData.applicableTiers.includes('all')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({ ...formData, applicableTiers: ['all'] })
                      } else {
                        setFormData({ ...formData, applicableTiers: [] })
                      }
                    }}
                  />
                  <Label htmlFor="tier-all">All Tiers</Label>
                </div>
                {!formData.applicableTiers.includes('all') && (
                  <>
                    {(['bronze', 'silver', 'gold'] as const).map((tier) => (
                      <div key={tier} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tier-${tier}`}
                          checked={formData.applicableTiers.includes(tier)}
                          onCheckedChange={(checked) => handleTierToggle(tier, checked as boolean)}
                        />
                        <Label htmlFor={`tier-${tier}`}>
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Coupon Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Coupon</DialogTitle>
            <DialogDescription>
              Update coupon details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-code" className="text-right">
                Code *
              </Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-discountType" className="text-right">
                Type *
              </Label>
              <Select
                value={formData.discountType}
                onValueChange={(value: "percentage" | "fixed") =>
                  setFormData({ ...formData, discountType: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-discountValue" className="text-right">
                Value *
              </Label>
              <Input
                id="edit-discountValue"
                type="number"
                step="0.01"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-minOrderValue" className="text-right">
                Min Order
              </Label>
              <Input
                id="edit-minOrderValue"
                type="number"
                step="0.01"
                value={formData.minOrderValue}
                onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                className="col-span-3"
              />
            </div>
            {formData.discountType === 'percentage' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-maxDiscount" className="text-right">
                  Max Discount
                </Label>
                <Input
                  id="edit-maxDiscount"
                  type="number"
                  step="0.01"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-usageLimit" className="text-right">
                Usage Limit *
              </Label>
              <Input
                id="edit-usageLimit"
                type="number"
                value={formData.usageLimit}
                onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-usageLimitPerUser" className="text-right">
                Per User Limit
              </Label>
              <Input
                id="edit-usageLimitPerUser"
                type="number"
                value={formData.usageLimitPerUser}
                onChange={(e) => setFormData({ ...formData, usageLimitPerUser: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-validFrom" className="text-right">
                Valid From
              </Label>
              <Input
                id="edit-validFrom"
                type="date"
                value={formData.validFrom}
                onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-validUntil" className="text-right">
                Valid Until
              </Label>
              <Input
                id="edit-validUntil"
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Applicable Tiers
              </Label>
              <div className="col-span-3 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-tier-all"
                    checked={formData.applicableTiers.includes('all')}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({ ...formData, applicableTiers: ['all'] })
                      } else {
                        setFormData({ ...formData, applicableTiers: [] })
                      }
                    }}
                  />
                  <Label htmlFor="edit-tier-all">All Tiers</Label>
                </div>
                {!formData.applicableTiers.includes('all') && (
                  <>
                    {(['bronze', 'silver', 'gold'] as const).map((tier) => (
                      <div key={tier} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-tier-${tier}`}
                          checked={formData.applicableTiers.includes(tier)}
                          onCheckedChange={(checked) => handleTierToggle(tier, checked as boolean)}
                        />
                        <Label htmlFor={`edit-tier-${tier}`}>
                          {tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </Label>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the coupon{" "}
              <span className="font-semibold font-mono">{couponToDelete?.code}</span> from the system.
              {couponToDelete?.usedCount && couponToDelete.usedCount > 0 && (
                <span className="block mt-2 text-yellow-600">
                  ⚠️ Warning: This coupon has been used {couponToDelete.usedCount} time(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCouponToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Coupon"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}