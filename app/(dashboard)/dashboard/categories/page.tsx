"use client"

import { useState } from "react"
import { MoreHorizontal, Search, Plus, Edit, Trash2, RefreshCw, X } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { getCategories, createCategory, updateCategory, deleteCategory, type Category } from "@/lib/api/categories"
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

export default function CategoriesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch categories
  const { data: categoriesData, isLoading, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const categories = categoriesData?.categories || []

  // Filter categories based on search
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsCreateDialogOpen(false)
      resetForm()
      toast({ title: "Success", description: "Category created successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to create category")
      })
    }
  })

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Category> }) =>
      updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsEditDialogOpen(false)
      resetForm()
      toast({ title: "Success", description: "Category updated successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update category")
      })
    }
  })

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsDeleteDialogOpen(false)
      setCategoryToDelete(null)
      toast({ title: "Success", description: "Category deleted successfully" })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to delete category")
      })
    }
  })

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: "Error", 
          description: "Image size must be less than 5MB" 
        })
        return
      }
      
      setSelectedImage(file)
      setImagePreviewUrl(URL.createObjectURL(file))
    }
  }

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl("")
    }
  }

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Category name is required" })
      return
    }
    
    // Use FormData if image is selected
    if (selectedImage) {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      if (formData.description) {
        formDataToSend.append('description', formData.description)
      }
      formDataToSend.append('image', selectedImage)
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createMutation.mutate(formDataToSend as any)
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      image: category.image || "",
    })
    // Set existing image preview
    if (category.image) {
      setImagePreviewUrl(category.image)
    }
    setIsEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast({ title: "Error", description: "Category name is required" })
      return
    }
    
    // Use FormData if new image is selected
    if (selectedImage) {
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      if (formData.description) {
        formDataToSend.append('description', formData.description)
      }
      formDataToSend.append('image', selectedImage)
      
      updateMutation.mutate({
        id: selectedCategory._id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: formDataToSend as any
      })
    } else {
      updateMutation.mutate({
        id: selectedCategory._id,
        data: formData
      })
    }
  }

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (categoryToDelete) {
      deleteMutation.mutate(categoryToDelete._id)
    }
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", image: "" })
    setSelectedCategory(null)
    setSelectedImage(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl("")
    }
  }

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
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
              <TableHead className="w-[100px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Items Count</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading categories...
                </TableCell>
              </TableRow>
            ) : filteredCategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              filteredCategories.map((category) => (
                <TableRow key={category._id}>
                  <TableCell>
                    {category.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={category.image} 
                        alt={category.name}
                        className="w-22 h-16 object-cover rounded-lg border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-22 h-16 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-normal">{category.name}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {category.description || "No description"}
                  </TableCell>
                  <TableCell>{category.itemCount || 0}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleEdit(category)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(category)}
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

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Create a new category for organizing menu items.
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
                placeholder="e.g., Appetizers"
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
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="image" className="text-right pt-2">
                Category Image
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
                      alt="Category preview"
                      className="w-32 h-32 object-cover rounded border"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=No+Image';
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload category image (max 5MB)
                </p>
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
              {createMutation.isPending ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update category information.
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
                rows={3}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-image" className="text-right pt-2">
                Category Image
              </Label>
              <div className="col-span-3 space-y-2">
                {/* Show current image if exists and no new image selected */}
                {imagePreviewUrl && !selectedImage && (
                  <div className="mb-2">
                    <p className="text-xs text-muted-foreground mb-2">Current Image:</p>
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={imagePreviewUrl} 
                        alt="Current category"
                        className="w-32 h-32 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=No+Image';
                        }}
                      />
                    </div>
                  </div>
                )}
                
                <Input
                  id="edit-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="cursor-pointer"
                />
                
                {/* Show new image preview */}
                {selectedImage && imagePreviewUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">New Image:</p>
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={imagePreviewUrl} 
                        alt="New category preview"
                        className="w-32 h-32 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=No+Image';
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {selectedImage 
                    ? "This new image will replace the existing image."
                    : "Upload new image to replace existing (max 5MB)."}
                </p>
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
              {updateMutation.isPending ? "Updating..." : "Update Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {categoryToDelete && (
            <div className="py-4">
              <p className="text-center font-semibold">
                {categoryToDelete.name}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setCategoryToDelete(null)
              }}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}