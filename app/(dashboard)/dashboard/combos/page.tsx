"use client"

import { useState } from "react"
import { MoreHorizontal, Search, Plus, Edit, Trash2, RefreshCw, ToggleLeft, ToggleRight, X } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { getAllCombos, createCombo, updateCombo, deleteCombo, toggleComboStatus, checkPriceMismatches, type ComboOffer, type ComboDiscount } from "@/lib/api/combos"
import { getMenuItems, type MenuItem } from "@/lib/api/menu"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SelectedItemPreview } from "@/components/combo/selected-item-preview"
import { MenuItemSelector } from "@/components/combo/menu-item-selector"
import { DiscountControls } from "@/components/combo/discount-controls"
import { PriceSummary } from "@/components/combo/price-summary"
import { PriceWarningAlert, PriceWarningBadge } from "@/components/combo/price-warning"

const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  return defaultMessage;
};

export default function CombosPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedCombo, setSelectedCombo] = useState<ComboOffer | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("")
  
  // NEW: Enhanced state management with quantity and discount support
  const [formData, setFormData] = useState<{
    name: string
    description: string
    selectedItems: Array<{ item: MenuItem; quantity: number }>
    discount: ComboDiscount
    validFrom: string
    validUntil: string
  }>({
    name: "",
    description: "",
    selectedItems: [],
    discount: { type: 'none', value: 0 },
    validFrom: "",
    validUntil: "",
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch combos (admin - includes inactive)
  const { data: combosData, isLoading: combosLoading, refetch: refetchCombos } = useQuery({
    queryKey: ['combos'],
    queryFn: getAllCombos,
  })

  // Fetch menu items for selection
  const { data: menuItemsData } = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => getMenuItems(),
  })

  const combos = combosData?.combos || []
  const menuItems = menuItemsData?.menuItems || []

  // NEW: Calculate original price from selected items
  const calculateOriginalPrice = () => {
    return formData.selectedItems.reduce(
      (sum, { item, quantity }) => sum + (item.price * quantity),
      0
    )
  }

  const originalPrice = calculateOriginalPrice()

  // Filter combos based on search
  const filteredCombos = combos.filter(combo =>
    combo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    combo.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // NEW: Check price mismatches mutation
  const checkPricesMutation = useMutation({
    mutationFn: checkPriceMismatches,
    onSuccess: (data) => {
      toast({
        title: "Price Check Complete",
        description: `Found ${data.warningsCount} combo(s) with price mismatches`
      })
      refetchCombos()
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to check prices")
      })
    }
  })

  // Create combo mutation
  const createMutation = useMutation({
    mutationFn: (data: FormData) => createCombo(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] })
      setIsCreateDialogOpen(false)
      resetForm()
      toast({ title: "Success", description: "Combo offer created successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create combo offer")
      })
    }
  })

  // Update combo mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      updateCombo(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] })
      setIsEditDialogOpen(false)
      setSelectedCombo(null)
      resetForm()
      toast({ title: "Success", description: "Combo offer updated successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update combo offer")
      })
    }
  })

  // Delete combo mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCombo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] })
      toast({ title: "Success", description: "Combo offer deleted successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete combo offer")
      })
    }
  })

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: toggleComboStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['combos'] })
      toast({ title: "Success", description: "Combo status updated successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update combo status")
      })
    }
  })

  const handleCreate = () => {
    if (!formData.name.trim() || formData.selectedItems.length === 0) {
      toast({ title: "Error", description: "Name and at least one menu item are required" })
      return
    }

    const formDataToSend = new FormData()
    formDataToSend.append('name', formData.name.trim())
    formDataToSend.append('description', formData.description)
    
    // Format items as array of {menuItem: id, quantity: number}
    const items = formData.selectedItems.map(si => ({
      menuItem: si.item._id,
      quantity: si.quantity
    }))
    formDataToSend.append('items', JSON.stringify(items))
    
    // Add discount information
    formDataToSend.append('discount', JSON.stringify(formData.discount))
    
    formDataToSend.append('validFrom', formData.validFrom || new Date().toISOString().split('T')[0])
    formDataToSend.append('validUntil', formData.validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    
    if (selectedImage) {
      formDataToSend.append('image', selectedImage)
    }

    createMutation.mutate(formDataToSend)
  }

  const handleEdit = (combo: ComboOffer) => {
    setSelectedCombo(combo)
    
    // Transform combo items to selectedItems format with full MenuItem objects
    const selectedItems = combo.items.map(item => {
      // item.menuItem can be either a populated MenuItem object or just an ID string
      const menuItemData = typeof item.menuItem === 'string' 
        ? menuItems.find(mi => mi._id === item.menuItem)
        : item.menuItem
      
      return {
        item: menuItemData || item.menuItem as MenuItem,
        quantity: item.quantity
      }
    })
    
    setFormData({
      name: combo.name,
      description: combo.description || "",
      selectedItems: selectedItems,
      discount: combo.discount || { type: 'none', value: 0 },
      validFrom: combo.validFrom.split('T')[0],
      validUntil: combo.validUntil.split('T')[0],
    })
    setImagePreviewUrl(combo.image || "")
    setIsEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedCombo || !formData.name.trim() || formData.selectedItems.length === 0) {
      toast({ title: "Error", description: "Name and at least one menu item are required" })
      return
    }

    const formDataToSend = new FormData()
    formDataToSend.append('name', formData.name.trim())
    formDataToSend.append('description', formData.description)
    
    // Format items as array of {menuItem: id, quantity: number}
    const items = formData.selectedItems.map(si => ({
      menuItem: si.item._id,
      quantity: si.quantity
    }))
    formDataToSend.append('items', JSON.stringify(items))
    
    // Add discount information
    formDataToSend.append('discount', JSON.stringify(formData.discount))
    
    formDataToSend.append('validFrom', formData.validFrom)
    formDataToSend.append('validUntil', formData.validUntil)
    
    if (selectedImage) {
      formDataToSend.append('image', selectedImage)
    }

    updateMutation.mutate({
      id: selectedCombo._id,
      data: formDataToSend
    })
  }

  const handleDelete = (combo: ComboOffer) => {
    if (confirm(`Are you sure you want to delete "${combo.name}"?`)) {
      deleteMutation.mutate(combo._id)
    }
  }

  const handleToggleStatus = (combo: ComboOffer) => {
    toggleMutation.mutate(combo._id)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "Image size must be less than 5MB" })
        return
      }
      setSelectedImage(file)
      setImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setImagePreviewUrl("")
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      selectedItems: [],
      discount: { type: 'none', value: 0 },
      validFrom: "",
      validUntil: "",
    })
    setSelectedCombo(null)
    setSelectedImage(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
    setImagePreviewUrl("")
  }

  const getMenuItemNames = (items: Array<{menuItem: string | MenuItem, quantity: number}>) => {
    return items.map(item => {
      const menuItem = typeof item.menuItem === 'string'
        ? menuItems.find(mi => mi._id === item.menuItem)
        : item.menuItem
      const name = menuItem?.name || 'Unknown Item'
      return item.quantity > 1 ? `${name} (x${item.quantity})` : name
    }).join(', ')
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Combo Offers</h2>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => checkPricesMutation.mutate()} 
            variant="outline" 
            size="sm"
            disabled={checkPricesMutation.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkPricesMutation.isPending ? 'animate-spin' : ''}`} />
            Check Prices
          </Button>
          <Button onClick={() => refetchCombos()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Combo
          </Button>
        </div>
      </div>

      {/* Price Warning Alert */}
      {combos.some(combo => combo.priceWarning?.hasWarning) && (
        <PriceWarningAlert
          combosWithWarnings={combos.filter(combo => combo.priceWarning?.hasWarning)}
          onCheckPrices={() => checkPricesMutation.mutate()}
        />
      )}

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search combos..."
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
              <TableHead>Name</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Valid Until</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combosLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading combo offers...
                </TableCell>
              </TableRow>
            ) : filteredCombos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No combo offers found
                </TableCell>
              </TableRow>
            ) : (
              filteredCombos.map((combo) => (
                <TableRow key={combo._id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {combo.name}
                      {combo.priceWarning?.hasWarning && (
                        <PriceWarningBadge warning={combo.priceWarning} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="truncate" title={getMenuItemNames(combo.items)}>
                      {combo.items.length} items
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {combo.discount && combo.discount.type !== 'none' && combo.originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{combo.originalPrice.toFixed(2)}
                        </span>
                      )}
                      <span>₹{combo.price.toFixed(2)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(combo.validUntil).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={combo.isActive ? "default" : "secondary"}>
                      {combo.isActive ? "Active" : "Inactive"}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => handleEdit(combo)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleStatus(combo)}>
                          {combo.isActive ? (
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
                          onClick={() => handleDelete(combo)}
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

      {/* Create Combo Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Combo Offer</DialogTitle>
            <DialogDescription>
              Create a new combo offer with multiple menu items.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="e.g., Family Feast"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="image" className="text-right pt-2">
                Combo Image
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="cursor-pointer"
                />
                {imagePreviewUrl && (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={imagePreviewUrl} 
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload an image (max 5MB). JPG, PNG, or WebP format.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Menu Items *
              </Label>
              <div className="col-span-3 space-y-4">
                <MenuItemSelector
                  menuItems={menuItems}
                  selectedItemIds={formData.selectedItems.map(si => si.item._id)}
                  onSelectItem={(item: MenuItem) => {
                    const existing = formData.selectedItems.find(
                      (si) => si.item._id === item._id
                    )
                    if (existing) {
                      // Increase quantity if already selected
                      setFormData({
                        ...formData,
                        selectedItems: formData.selectedItems.map((si) =>
                          si.item._id === item._id
                            ? { ...si, quantity: si.quantity + 1 }
                            : si
                        ),
                      })
                    } else {
                      // Add new item with quantity 1
                      setFormData({
                        ...formData,
                        selectedItems: [
                          ...formData.selectedItems,
                          { item, quantity: 1 },
                        ],
                      })
                    }
                  }}
                />
                {formData.selectedItems.length > 0 && (
                  <div className="space-y-2">
                    {formData.selectedItems.map((selectedItem, index) => (
                      <SelectedItemPreview
                        key={selectedItem.item._id}
                        item={selectedItem.item}
                        quantity={selectedItem.quantity}
                        onQuantityChange={(newQuantity) => {
                          setFormData({
                            ...formData,
                            selectedItems: formData.selectedItems.map((si, i) =>
                              i === index ? { ...si, quantity: newQuantity } : si
                            ),
                          })
                        }}
                        onRemove={() => {
                          setFormData({
                            ...formData,
                            selectedItems: formData.selectedItems.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Discount
              </Label>
              <div className="col-span-3">
                <DiscountControls
                  discount={formData.discount}
                  originalPrice={originalPrice}
                  onChange={(discount) =>
                    setFormData({ ...formData, discount })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Price Summary
              </Label>
              <div className="col-span-3">
                <PriceSummary
                  originalPrice={originalPrice}
                  discount={formData.discount}
                />
              </div>
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
              {createMutation.isPending ? "Creating..." : "Create Combo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Combo Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Combo Offer</DialogTitle>
            <DialogDescription>
              Update combo offer details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-image" className="text-right pt-2">
                Combo Image
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="cursor-pointer"
                />
                {imagePreviewUrl && (
                  <div className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={imagePreviewUrl} 
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload a new image to replace the existing one (max 5MB).
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Menu Items *
              </Label>
              <div className="col-span-3 space-y-4">
                <MenuItemSelector
                  menuItems={menuItems}
                  selectedItemIds={formData.selectedItems.map(si => si.item._id)}
                  onSelectItem={(item: MenuItem) => {
                    const existing = formData.selectedItems.find(
                      (si) => si.item._id === item._id
                    )
                    if (existing) {
                      // Increase quantity if already selected
                      setFormData({
                        ...formData,
                        selectedItems: formData.selectedItems.map((si) =>
                          si.item._id === item._id
                            ? { ...si, quantity: si.quantity + 1 }
                            : si
                        ),
                      })
                    } else {
                      // Add new item with quantity 1
                      setFormData({
                        ...formData,
                        selectedItems: [
                          ...formData.selectedItems,
                          { item, quantity: 1 },
                        ],
                      })
                    }
                  }}
                />
                {formData.selectedItems.length > 0 && (
                  <div className="space-y-2">
                    {formData.selectedItems.map((selectedItem, index) => (
                      <SelectedItemPreview
                        key={selectedItem.item._id}
                        item={selectedItem.item}
                        quantity={selectedItem.quantity}
                        onQuantityChange={(newQuantity) => {
                          setFormData({
                            ...formData,
                            selectedItems: formData.selectedItems.map((si, i) =>
                              i === index ? { ...si, quantity: newQuantity } : si
                            ),
                          })
                        }}
                        onRemove={() => {
                          setFormData({
                            ...formData,
                            selectedItems: formData.selectedItems.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Discount
              </Label>
              <div className="col-span-3">
                <DiscountControls
                  discount={formData.discount}
                  originalPrice={originalPrice}
                  onChange={(discount) =>
                    setFormData({ ...formData, discount })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">
                Price Summary
              </Label>
              <div className="col-span-3">
                <PriceSummary
                  originalPrice={originalPrice}
                  discount={formData.discount}
                />
              </div>
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
              {updateMutation.isPending ? "Updating..." : "Update Combo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}