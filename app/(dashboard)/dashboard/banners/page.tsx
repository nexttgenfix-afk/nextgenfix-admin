"use client"

import { useState, useRef } from "react"
import { MoreHorizontal, Search, Plus, Edit, Trash2, RefreshCw, Upload, X, ImageIcon, VideoIcon } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/status-badge"
import { useToast } from "@/hooks/use-toast"
import { getBanners, createBanner, updateBanner, deleteBanner, uploadBannerMedia, type Banner } from "@/lib/api/banners"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  return defaultMessage
}

const typeColors: Record<string, string> = {
  promotion: "bg-blue-100 text-blue-700 border-blue-200",
  offer: "bg-green-100 text-green-700 border-green-200",
  new_item: "bg-purple-100 text-purple-700 border-purple-200",
  announcement: "bg-orange-100 text-orange-700 border-orange-200",
}

const typeLabels: Record<string, string> = {
  promotion: "Promotion",
  offer: "Offer",
  new_item: "New Item",
  announcement: "Announcement",
}

const emptyForm = {
  title: "",
  mediaType: "image" as "image" | "video",
  image: "",
  video: "",
  link: "",
  type: "promotion" as Banner["type"],
  isActive: true,
  displayOrder: 0,
  startDate: "",
  endDate: "",
}

export default function BannersPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null)
  const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null)
  const [formData, setFormData] = useState(emptyForm)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["banners"],
    queryFn: getBanners,
  })

  const banners = data?.data || []
  const filtered = banners.filter((b) =>
    b.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const createMutation = useMutation({
    mutationFn: createBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] })
      setIsCreateDialogOpen(false)
      resetForm()
      toast({ title: "Success", description: "Banner created successfully" })
    },
    onError: (err) => toast({ title: "Error", description: getErrorMessage(err, "Failed to create banner") }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Banner> }) => updateBanner(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] })
      setIsEditDialogOpen(false)
      setSelectedBanner(null)
      resetForm()
      toast({ title: "Success", description: "Banner updated successfully" })
    },
    onError: (err) => toast({ title: "Error", description: getErrorMessage(err, "Failed to update banner") }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBanner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["banners"] })
      setIsDeleteDialogOpen(false)
      setBannerToDelete(null)
      toast({ title: "Success", description: "Banner deleted successfully" })
    },
    onError: (err) => toast({ title: "Error", description: getErrorMessage(err, "Failed to delete banner") }),
  })

  const resetForm = () => {
    setFormData(emptyForm)
    setPreviewUrl("")
    setSelectedBanner(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file)
    setPreviewUrl(localUrl)

    // Upload to Cloudinary
    setUploading(true)
    try {
      const url = await uploadBannerMedia(file, formData.mediaType)
      if (formData.mediaType === "image") {
        setFormData((prev) => ({ ...prev, image: url }))
      } else {
        setFormData((prev) => ({ ...prev, video: url }))
      }
      toast({ title: "Uploaded", description: "Media uploaded successfully" })
    } catch (err) {
      setPreviewUrl("")
      toast({ title: "Error", description: getErrorMessage(err, "Failed to upload media") })
    } finally {
      setUploading(false)
    }
  }

  const handleMediaTypeChange = (v: "image" | "video") => {
    setFormData((prev) => ({ ...prev, mediaType: v, image: "", video: "" }))
    setPreviewUrl("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleCreate = () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Title is required" })
      return
    }
    if (formData.mediaType === "image" && !formData.image) {
      toast({ title: "Error", description: "Please upload an image" })
      return
    }
    if (formData.mediaType === "video" && !formData.video) {
      toast({ title: "Error", description: "Please upload a video" })
      return
    }
    createMutation.mutate({ ...formData, displayOrder: Number(formData.displayOrder) })
  }

  const handleEdit = (banner: Banner) => {
    setSelectedBanner(banner)
    setFormData({
      title: banner.title,
      mediaType: banner.mediaType,
      image: banner.image || "",
      video: banner.video || "",
      link: banner.link || "",
      type: banner.type,
      isActive: banner.isActive,
      displayOrder: banner.displayOrder,
      startDate: banner.startDate ? banner.startDate.split("T")[0] : "",
      endDate: banner.endDate ? banner.endDate.split("T")[0] : "",
    })
    setPreviewUrl(banner.mediaType === "video" ? (banner.video || "") : (banner.image || ""))
    setIsEditDialogOpen(true)
  }

  const handleUpdate = () => {
    if (!selectedBanner || !formData.title.trim()) {
      toast({ title: "Error", description: "Title is required" })
      return
    }
    updateMutation.mutate({
      id: selectedBanner._id,
      data: { ...formData, displayOrder: Number(formData.displayOrder) },
    })
  }

  const BannerForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Title *</Label>
        <Input
          className="col-span-3"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Weekend Special — 30% Off"
        />
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Media Type</Label>
        <Select value={formData.mediaType} onValueChange={handleMediaTypeChange}>
          <SelectTrigger className="col-span-3">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Upload area */}
      <div className="grid grid-cols-4 items-start gap-4">
        <Label className="text-right pt-2">
          {formData.mediaType === "image" ? "Image *" : "Video *"}
        </Label>
        <div className="col-span-3 space-y-2">
          {previewUrl ? (
            <div className="relative rounded-lg overflow-hidden border bg-black">
              {formData.mediaType === "video" ? (
                <video src={previewUrl} controls muted className="w-full max-h-48 object-contain" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-cover" />
              )}
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl("")
                  setFormData((prev) => ({ ...prev, image: "", video: "" }))
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
              >
                <X className="h-4 w-4" />
              </button>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm">
                  Uploading...
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full h-32 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-slate-400 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <Upload className="h-6 w-6" />
              <span className="text-sm">
                {uploading ? "Uploading..." : `Click to upload ${formData.mediaType}`}
              </span>
              <span className="text-xs">
                {formData.mediaType === "image" ? "JPG, PNG, WebP — max 5MB" : "MP4, MOV, WebM — max 50MB"}
              </span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={formData.mediaType === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/quicktime,video/webm"}
            className="hidden"
            onChange={handleFileChange}
          />
          {!previewUrl && (
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading..." : "Choose file"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Link</Label>
        <Input
          className="col-span-3"
          value={formData.link}
          onChange={(e) => setFormData({ ...formData, link: e.target.value })}
          placeholder="Optional deep link"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Type</Label>
        <Select value={formData.type} onValueChange={(v: Banner["type"]) => setFormData({ ...formData, type: v })}>
          <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="promotion">Promotion</SelectItem>
            <SelectItem value="offer">Offer</SelectItem>
            <SelectItem value="new_item">New Item</SelectItem>
            <SelectItem value="announcement">Announcement</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Display Order</Label>
        <Input
          type="number"
          className="col-span-3"
          value={formData.displayOrder}
          onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })}
          placeholder="1"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Start Date</Label>
        <Input type="date" className="col-span-3" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">End Date</Label>
        <Input type="date" className="col-span-3" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label className="text-right">Status</Label>
        <Select value={formData.isActive ? "active" : "inactive"} onValueChange={(v) => setFormData({ ...formData, isActive: v === "active" })}>
          <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  return (
    <div className="flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Banners</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Banner
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search banners..."
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
              <TableHead className="w-[180px]">Preview</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading banners...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">No banners found</TableCell>
              </TableRow>
            ) : (
              filtered.map((banner) => (
                <TableRow key={banner._id}>
                  <TableCell>
                    <div className="w-40 h-20 rounded-md overflow-hidden bg-slate-100 flex items-center justify-center border">
                      {banner.mediaType === "video" && banner.video ? (
                        <video
                          src={banner.video}
                          muted
                          className="w-full h-full object-cover"
                          onMouseEnter={(e) => (e.currentTarget as HTMLVideoElement).play()}
                          onMouseLeave={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0 }}
                        />
                      ) : banner.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-slate-400">
                          {banner.mediaType === "video" ? <VideoIcon className="h-6 w-6" /> : <ImageIcon className="h-6 w-6" />}
                          <span className="text-xs">No media</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-[180px]">
                    <p className="truncate">{banner.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{banner.mediaType}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${typeColors[banner.type]}`}>
                      {typeLabels[banner.type]}
                    </Badge>
                  </TableCell>
                  <TableCell>{banner.displayOrder}</TableCell>
                  <TableCell>
                    {banner.endDate ? new Date(banner.endDate).toLocaleDateString() : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={banner.isActive ? "Active" : "Inactive"} />
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
                        <DropdownMenuItem onClick={() => handleEdit(banner)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => { setBannerToDelete(banner); setIsDeleteDialogOpen(true) }}
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

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsCreateDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Banner</DialogTitle>
            <DialogDescription>Create a new banner for the app home screen.</DialogDescription>
          </DialogHeader>
          <BannerForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || uploading}>
              {createMutation.isPending ? "Creating..." : "Create Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsEditDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Banner</DialogTitle>
            <DialogDescription>Update banner details.</DialogDescription>
          </DialogHeader>
          <BannerForm />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm() }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending || uploading}>
              {updateMutation.isPending ? "Updating..." : "Update Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the banner{" "}
              <span className="font-semibold">{bannerToDelete?.title}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setBannerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bannerToDelete && deleteMutation.mutate(bannerToDelete._id)}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Banner"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
