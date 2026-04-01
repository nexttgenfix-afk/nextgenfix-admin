"use client"

import { useState } from "react"
import { MoreHorizontal, Search, Plus, Edit, Trash2, RefreshCw, X, ChevronRight, ChevronDown } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image: "",
    parentCategory: "",
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch ALL categories (including subcategories) using all=true
  const { data: categoriesData, isLoading, refetch } = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () => getCategories(true),
  })

  const allCategories: Category[] = categoriesData?.categories || []

  // Split into parents and subcategories
  const parentCategories = allCategories.filter(c => !c.parentCategory)
  const subcategoriesMap = allCategories.reduce<Record<string, Category[]>>((acc, c) => {
    if (c.parentCategory) {
      const parentId = typeof c.parentCategory === 'string' ? c.parentCategory : (c.parentCategory as unknown as { _id: string })?._id
      if (parentId) {
        acc[parentId] = [...(acc[parentId] || []), c]
      }
    }
    return acc
  }, {})

  // Filter logic — searches both parents and subcategories
  const matchesSearch = (c: Category) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)

  const filteredParents = searchTerm
    ? parentCategories.filter(p =>
        matchesSearch(p) || (subcategoriesMap[p._id] || []).some(matchesSearch)
      )
    : parentCategories

  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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
      toast({ title: "Error", description: getErrorMessage(error, "Failed to create category") })
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
      toast({ title: "Error", description: getErrorMessage(error, "Failed to update category") })
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
      toast({ title: "Error", description: getErrorMessage(error, "Failed to delete category") })
    }
  })

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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
      setImagePreviewUrl("")
    }
  }

  const buildPayload = () => {
    if (selectedImage) {
      const fd = new FormData()
      fd.append('name', formData.name)
      if (formData.description) fd.append('description', formData.description)
      if (formData.parentCategory) fd.append('parentCategory', formData.parentCategory)
      fd.append('image', selectedImage)
      return fd as unknown as Partial<Category>
    }
    return {
      name: formData.name,
      description: formData.description,
      ...(formData.parentCategory ? { parentCategory: formData.parentCategory } : {}),
    }
  }

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Category name is required" })
      return
    }
    createMutation.mutate(buildPayload() as Parameters<typeof createCategory>[0])
  }

  const handleEdit = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      description: category.description || "",
      image: category.image || "",
      parentCategory: (category.parentCategory as string) || "",
    })
    if (category.image) setImagePreviewUrl(category.image)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedCategory || !formData.name.trim()) {
      toast({ title: "Error", description: "Category name is required" })
      return
    }
    updateMutation.mutate({ id: selectedCategory._id, data: buildPayload() })
  }

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (categoryToDelete) deleteMutation.mutate(categoryToDelete._id)
  }

  const resetForm = () => {
    setFormData({ name: "", description: "", image: "", parentCategory: "" })
    setSelectedCategory(null)
    setSelectedImage(null)
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
      setImagePreviewUrl("")
    }
  }

  const CategoryImageCell = ({ category }: { category: Category }) => (
    category.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={category.image}
        alt={category.name}
        className="w-20 h-14 object-cover rounded-lg border"
        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=No+Image' }}
      />
    ) : (
      <div className="w-20 h-14 bg-muted rounded border flex items-center justify-center text-muted-foreground text-xs">
        No Image
      </div>
    )
  )

  const ActionsMenu = ({ category }: { category: Category }) => (
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
          <Edit className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleDelete(category)} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  const ImageFormFields = (prefix: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`${prefix}-image`}>Category Image</Label>
      <div className="space-y-2">
        {imagePreviewUrl && !selectedImage && (
          <div className="mb-2">
            <p className="text-xs text-muted-foreground mb-1">Current Image:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="Current category"
              className="w-28 h-28 object-cover rounded border"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=No+Image' }}
            />
          </div>
        )}
        <Input id={`${prefix}-image`} type="file" accept="image/*" onChange={handleImageSelect} className="cursor-pointer" />
        {selectedImage && imagePreviewUrl && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreviewUrl}
              alt="Preview"
              className="w-28 h-28 object-cover rounded border"
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/128?text=No+Image' }}
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
          {selectedImage ? "This image will replace the existing one." : "Upload image (max 5MB)"}
        </p>
      </div>
    </div>
  )

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {parentCategories.length} categories · {allCategories.length - parentCategories.length} subcategories
          </p>
        </div>
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
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">Loading categories...</TableCell>
              </TableRow>
            ) : filteredParents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">No categories found</TableCell>
              </TableRow>
            ) : (
              filteredParents.map((parent) => {
                const subs = (subcategoriesMap[parent._id] || []).filter(s =>
                  searchTerm ? matchesSearch(s) : true
                )
                const hasSubcategories = subs.length > 0
                const isExpanded = expandedCategories.has(parent._id)

                return [
                  // Parent row
                  <TableRow key={parent._id} className="bg-muted/20 hover:bg-muted/30">
                    <TableCell><CategoryImageCell category={parent} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {hasSubcategories ? (
                          <button
                            type="button"
                            onClick={() => toggleExpand(parent._id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />
                            }
                          </button>
                        ) : (
                          <span className="w-4" />
                        )}
                        <span className="font-semibold">{parent.name}</span>
                        {hasSubcategories && (
                          <Badge variant="secondary" className="text-xs">{subs.length}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {parent.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Category</Badge>
                    </TableCell>
                    <TableCell>{parent.itemCount || 0}</TableCell>
                    <TableCell className="text-right"><ActionsMenu category={parent} /></TableCell>
                  </TableRow>,

                  // Subcategory rows (shown when expanded or when searching)
                  ...(isExpanded || searchTerm ? subs.map((sub) => (
                    <TableRow key={sub._id} className="bg-background hover:bg-muted/10">
                      <TableCell>
                        <div className="pl-6">
                          <CategoryImageCell category={sub} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 pl-10">
                          <span className="text-muted-foreground">└</span>
                          <span>{sub.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {sub.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Subcategory</Badge>
                      </TableCell>
                      <TableCell>{sub.itemCount || 0}</TableCell>
                      <TableCell className="text-right"><ActionsMenu category={sub} /></TableCell>
                    </TableRow>
                  )) : [])
                ]
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Category Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
            <DialogDescription>
              Leave "Parent Category" empty to create a top-level category, or select one to create a subcategory.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="parent-category">Parent Category <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select
                value={formData.parentCategory || "none"}
                onValueChange={(v) => setFormData({ ...formData, parentCategory: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level category)</SelectItem>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.parentCategory && (
                <p className="text-xs text-muted-foreground">
                  This will be created as a subcategory under <strong>{parentCategories.find(c => c._id === formData.parentCategory)?.name}</strong>.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={formData.parentCategory ? "e.g., Chicken Rolls" : "e.g., Appetizers"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            {ImageFormFields("create")}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update category information.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-parent-category">Parent Category <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select
                value={formData.parentCategory || "none"}
                onValueChange={(v) => setFormData({ ...formData, parentCategory: v === "none" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (top-level category)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (top-level category)</SelectItem>
                  {parentCategories
                    .filter(c => c._id !== selectedCategory?._id)
                    .map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            {ImageFormFields("edit")}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update"}
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
              {categoryToDelete && subcategoriesMap[categoryToDelete._id]?.length > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Warning: this category has {subcategoriesMap[categoryToDelete._id].length} subcategories that will also be affected.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {categoryToDelete && (
            <div className="py-2">
              <p className="text-center font-semibold">{categoryToDelete.name}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setCategoryToDelete(null) }} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
