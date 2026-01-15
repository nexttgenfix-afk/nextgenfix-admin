"use client";
import { useState, useEffect, useCallback } from "react";
import {
  MoreHorizontal,
  Search,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import * as menuApi from "@/lib/api/menu";
import * as categoriesApi from "@/lib/api/categories";

export interface MenuItem {
  id: string;
  isVeg?: boolean;
  name: string;
  description: {
    text: string;
    formatting: string;
  };
  price: number;
  category: string;
  cuisine: string;
  dietaryInfo: string[];
  allergens?: string[];
  status: "available" | "out-of-stock" | "coming-soon";
  preparationTime: number;
  rating: number;
  imageUrl?: string;
  images?: string[];
  tags: string[];
  moodTag?: "good" | "angry" | "in_love" | "sad" | null;
  hungerLevelTag?: "little_hungry" | "quite_hungry" | "very_hungry" | "super_hungry" | null;
  recommendedItems?: string[];
  specialOffer?: {
    isSpecial: boolean;
    validFrom?: string;
    validUntil?: string;
    specialPrice?: number;
    description?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Category {
  _id: string;
  name: string;
}
// Error handling utility function
const getErrorMessage = (err: unknown, defaultMessage: string): string => {
  if (err && typeof err === "object" && "response" in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  return defaultMessage;
};

export default function MenuItemsPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  const [categoryFilter, setCategoryFilter] = useState("")
  const [totalMenuItems, setTotalMenuItems] = useState(0)
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [newItemData, setNewItemData] = useState<Record<string, unknown>>({
    name: "",
    category: "",
    price: 0,
    status: "Available",
    rating: 0,
    moodTag: null,
    hungerLevelTag: null,
    allergens: [],
    recommendedItems: [],
    images: [],
    specialOffer: {
      isSpecial: false,
      validFrom: "",
      validUntil: "",
    },
  });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // List menu items API
  const fetchMenuItems = useCallback(async () => {
    setLoading(true);
    try {
      // Prepare filters
      const filters: Record<string, unknown> = {
        search: searchQuery,
        page,
        limit,
      };

      // Add category filter (use category ID)
      if (categoryFilter && categoryFilter !== "all") {
        filters.category = categoryFilter;
      }

      // Add status filter (map frontend values to backend status values)
      if (statusFilter && statusFilter !== "all") {
        // Map frontend status values to backend
        const statusMap: Record<string, string> = {
          'available': 'Available',
          'out-of-stock': 'Out of Stock',
          'coming-soon': 'Coming Soon'
        };
        filters.status = statusMap[statusFilter] || statusFilter;
      }

      const response = await menuApi.getMenuItems(filters);
      // Defensive mapping: backend returns { menuItems: [...], total: n }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiResponse = response as any;
      const rawItems = Array.isArray(apiResponse.items) ? apiResponse.items : (Array.isArray(apiResponse.menuItems) ? apiResponse.menuItems : []);
      const items = rawItems.map((item: unknown) => {
            // Type guard to ensure item is an object
            if (typeof item !== "object" || item === null) return null;
            const obj = item as Record<string, unknown>;
            return {
              id: (obj.id as string) || (obj._id as string),
              name: obj.name as string,
              description: typeof obj.description === 'object'
                ? obj.description as { text: string; formatting: string }
                : { text: (obj.description as string) || '', formatting: 'PlainText' },
              price: Number(obj.price),
              category: (obj.category as string) || '',
              cuisine: (obj.cuisine as string) || '',
              dietaryInfo: Array.isArray(obj.dietaryInfo) ? obj.dietaryInfo as string[] : [],
              status: (() => {
                const status = (obj.status as string) || (obj.isAvailable === false ? 'Out of Stock' : 'Available');
                // Normalize status: "Available" -> "available", "Out of Stock" -> "out-of-stock"
                return status.toLowerCase().replace(/\s+/g, '-') as MenuItem["status"];
              })(),
              preparationTime: Number(obj.preparationTime) || 0,
              rating: typeof obj.rating === 'object'
                ? (obj.rating as { average?: number }).average ?? 0
                : Number(obj.rating) || 0,
              imageUrl: (obj.image as string) || 
                (obj.photos && typeof obj.photos === 'object'
                  ? (obj.photos as { main?: string }).main
                  : undefined) || 
                (obj.imageUrl as string) || 
                (Array.isArray(obj.images) && obj.images.length > 0 
                  ? obj.images[0] as string 
                  : ''),
              tags: Array.isArray(obj.tags) ? obj.tags as string[] : [],
              moodTag: (obj.moodTag as MenuItem["moodTag"]) || null,
              hungerLevelTag: (obj.hungerLevelTag as MenuItem["hungerLevelTag"]) || null,
              allergens: Array.isArray(obj.allergens) 
                ? obj.allergens as string[] 
                : typeof obj.allergens === 'string' 
                  ? [obj.allergens]
                  : [],
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              recommendedItems: Array.isArray(obj.recommendedItems) 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (obj.recommendedItems as any[]).map((item: any) => 
                    typeof item === 'string' ? item : (item._id || item.id)
                  )
                : typeof obj.recommendedItems === 'string'
                  ? [obj.recommendedItems]
                  : [],
              images: Array.isArray(obj.images) ? obj.images as string[] : [],
              specialOffer: obj.specialOffer as MenuItem["specialOffer"],
              createdAt: obj.createdAt as string,
              updatedAt: obj.updatedAt as string,
            };
          }).filter((item: unknown): item is MenuItem => item !== null);
      setMenuItems(items);
      console.log("Fetched menu items:", items);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setTotalMenuItems((apiResponse as any).total || items.length);
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to fetch menu items.");
      toast({ title: "Error", description: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, statusFilter, page, limit, toast]);

  const fetchCategories = useCallback(async () => {
  try {
    const response = await categoriesApi.getCategories();
    if (Array.isArray(response.categories)) {
      setCategories(response.categories);
    } else if (Array.isArray(response)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setCategories(response as any);
    }
  } catch (err) {
    console.error("Failed to fetch categories:", err);
  }
}, []);

  useEffect(() => {
    fetchMenuItems();
    fetchCategories();
  }, [fetchMenuItems, fetchCategories]);

  // Get menu item details API
  const handleViewItem = async (itemId: string) => {
    try {
      const response = await menuApi.getMenuItemById(itemId);
      // Defensive normalization for single menu item response
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = response as any;
      
      console.log("View item data:", data);
      console.log("Recommended items from API:", data.recommendedItems);
      
      // Extract image URL - backend uses 'image' field
      let imageUrl = data.image || '';
      
      // Fallback to other possible fields if 'image' is empty
      if (!imageUrl) {
        if (data.photos && typeof data.photos === 'object' && data.photos.main) {
          imageUrl = data.photos.main;
        } else if (data.imageUrl) {
          imageUrl = data.imageUrl;
        } else if (Array.isArray(data.images) && data.images.length > 0) {
          imageUrl = data.images[0];
        }
      }
      
      // Extract images array - check for additional photos
      let images: string[] = [];
      if (data.photos && Array.isArray(data.photos.additional) && data.photos.additional.length > 0) {
        images = data.photos.additional;
      } else if (Array.isArray(data.images) && data.images.length > 0) {
        images = data.images;
      }
      
      const normalized: MenuItem = {
        id: (data.id || data._id) as string,
        name: data.name || '',
        description: typeof data.description === 'object'
          ? data.description
          : { text: data.description || '', formatting: 'PlainText' },
        price: Number(data.price),
        category: data.category || '',
        cuisine: data.cuisine || '',
        dietaryInfo: Array.isArray(data.dietaryInfo) ? data.dietaryInfo : [],
        status: (() => {
          const status = data.status || (data.isAvailable === false ? 'Out of Stock' : 'Available');
          // Normalize: "Available" -> "available", "Out of Stock" -> "out-of-stock"
          return status.toLowerCase().replace(/\s+/g, '-') as MenuItem["status"];
        })(),
        preparationTime: Number(data.preparationTime) || 0,
        rating: typeof data.rating === 'object' ? (data.rating.average ?? 0) : (Number(data.rating) || 0),
        imageUrl: imageUrl,
        tags: Array.isArray(data.tags) ? data.tags : [],
        moodTag: data.moodTag || null,
        hungerLevelTag: data.hungerLevelTag || null,
        allergens: Array.isArray(data.allergens) ? data.allergens : [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recommendedItems: Array.isArray(data.recommendedItems) 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? data.recommendedItems.map((item: any) => 
              typeof item === 'string' ? item : (item._id || item.id)
            )
          : [],
        images: images,
        specialOffer: data.specialOffer,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
      
      setSelectedItem(normalized);
      setViewDialogOpen(true);
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to fetch menu item details.");
      toast({ title: "Error", description: errorMessage });
    }
  };

  // Update menu item API
  const handleEditItem = async () => {
    if (!selectedItem) return;

    setIsSubmitting(true);

    try {
      // If images are selected, use FormData
      if (selectedImages.length > 0) {
        // Validate file sizes
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        const oversizedFiles = selectedImages.filter(file => file.size > maxFileSize);
        if (oversizedFiles.length > 0) {
          toast({
            title: "Validation Error",
            description: "Some images exceed 5MB limit. Please compress them."
          });
          setIsSubmitting(false);
          return;
        }

        const formData = new FormData();
        
        // Add all updated fields to FormData
        if (selectedItem.name) formData.append('name', selectedItem.name);
        if (selectedItem.price) formData.append('price', selectedItem.price.toString());
        if (selectedItem.category) formData.append('category', selectedItem.category);
        if (selectedItem.status) formData.append('status', selectedItem.status === 'available' ? 'Available' : selectedItem.status === 'out-of-stock' ? 'Out of Stock' : 'Coming Soon');
        if (selectedItem.preparationTime) formData.append('preparationTime', selectedItem.preparationTime.toString());
        if (selectedItem.moodTag) formData.append('moodTag', selectedItem.moodTag);
        if (selectedItem.hungerLevelTag) formData.append('hungerLevelTag', selectedItem.hungerLevelTag);
        
        // Handle description
        if (selectedItem.description) {
          const desc = typeof selectedItem.description === 'object' 
            ? selectedItem.description.text 
            : selectedItem.description;
          formData.append('description', desc);
        }
        
        // Handle allergens
        if (selectedItem.allergens && selectedItem.allergens.length > 0) {
          formData.append('allergens', JSON.stringify(selectedItem.allergens));
        }
        
        // Handle recommendedItems
        if (selectedItem.recommendedItems && selectedItem.recommendedItems.length > 0) {
          formData.append('recommendedItems', JSON.stringify(selectedItem.recommendedItems));
        }

        // Handle specialOffer
        if (selectedItem.specialOffer) {
          formData.append('specialOffer', JSON.stringify(selectedItem.specialOffer));
        }
        
        // Add image files
        selectedImages.forEach((file) => {
          formData.append('images', file);
        });
        
        await menuApi.updateMenuItem(selectedItem.id, formData);
      } else {
        // No images, use regular JSON payload
        const payload: Record<string, unknown> = {};
        if (selectedItem.name !== undefined) payload.name = selectedItem.name;
        if (selectedItem.price !== undefined) payload.price = selectedItem.price;
        if (selectedItem.category && categories.length > 0) {
          const found = categories.find(cat => cat._id === selectedItem.category);
          if (found) payload.category = found._id;
        }
        if (selectedItem.status !== undefined) {
          // Map frontend status to backend format
          const statusMap: Record<string, string> = {
            'available': 'Available',
            'out-of-stock': 'Out of Stock',
            'coming-soon': 'Coming Soon'
          };
          payload.status = statusMap[selectedItem.status] || selectedItem.status;
        }
        if (selectedItem.preparationTime !== undefined) payload.preparationTime = selectedItem.preparationTime;
        if (selectedItem.moodTag !== undefined) payload.moodTag = selectedItem.moodTag;
        if (selectedItem.hungerLevelTag !== undefined) payload.hungerLevelTag = selectedItem.hungerLevelTag;
        if (selectedItem.description !== undefined) {
          payload.description = typeof selectedItem.description === 'object' 
            ? selectedItem.description.text 
            : selectedItem.description;
        }
        if (selectedItem.allergens !== undefined && selectedItem.allergens.length > 0) {
          payload.allergens = selectedItem.allergens;
        }
        if (selectedItem.recommendedItems !== undefined) {
          payload.recommendedItems = selectedItem.recommendedItems;
        }

        if (selectedItem.specialOffer !== undefined) {
          payload.specialOffer = selectedItem.specialOffer;
        }
        
        await menuApi.updateMenuItem(selectedItem.id, payload);
      }
      
      setEditDialogOpen(false);
      setSelectedImages([]);
      setImagePreviewUrls([]);
      fetchMenuItems();
      toast({ 
        title: "Success!", 
        description: `Menu item "${selectedItem.name}" has been updated.` 
      });
    } catch (err) {
      console.error('Error updating menu item:', err);
      
      // Check if it's a timeout error
      let errorMessage = "Failed to update menu item.";
      if (err && typeof err === 'object' && 'code' in err) {
        if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') {
          errorMessage = "Upload timeout. Please try with smaller images or check your connection.";
        }
      }
      
      // Use existing error message handler as fallback
      errorMessage = getErrorMessage(err, errorMessage);
      
      toast({ 
        title: "Error", 
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation function for Add Item
  const validateAddItemForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate name
    if (!newItemData.name || typeof newItemData.name !== 'string' || (newItemData.name as string).trim() === '') {
      errors.name = 'Item name is required.';
    } else if ((newItemData.name as string).length < 3) {
      errors.name = 'Item name must be at least 3 characters.';
    } else if ((newItemData.name as string).length > 100) {
      errors.name = 'Item name must not exceed 100 characters.';
    }

    // Validate price
    const price = typeof newItemData.price === 'number' && !isNaN(newItemData.price)
      ? newItemData.price
      : parseFloat(String(newItemData.price));
    if (isNaN(price) || price <= 0) {
      errors.price = 'Price must be a valid number greater than 0.';
    } else if (price > 100000) {
      errors.price = 'Price seems too high. Please verify.';
    }

    // Validate category
    if (!newItemData.category || typeof newItemData.category !== 'string' || (newItemData.category as string).trim() === '') {
      errors.category = 'Please select a category.';
    } else {
      const categoryFound = categories.find(cat => cat._id === newItemData.category);
      if (!categoryFound) {
        errors.category = 'Selected category is invalid.';
      }
    }

    // Validate description
    const description = typeof newItemData.description === 'string' 
      ? newItemData.description 
      : (newItemData.description as { text: string })?.text || '';
    if (description.trim() === '') {
      errors.description = 'Description is required.';
    } else if (description.length < 10) {
      errors.description = 'Description must be at least 10 characters.';
    } else if (description.length > 500) {
      errors.description = 'Description must not exceed 500 characters.';
    }

    // Validate preparation time
    if (newItemData.preparationTime) {
      const prepTime = Number(newItemData.preparationTime);
      if (prepTime < 0) {
        errors.preparationTime = 'Preparation time cannot be negative.';
      } else if (prepTime > 300) {
        errors.preparationTime = 'Preparation time seems too long (max 5 hours).';
      }
    }

    // Validate images
    if (selectedImages.length > 5) {
      errors.images = 'You can upload a maximum of 5 images.';
    }

    // Validate file sizes
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = selectedImages.filter(file => file.size > maxFileSize);
    if (oversizedFiles.length > 0) {
      errors.images = `Some images exceed 5MB limit. Please compress them.`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Compress image before upload
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // Calculate new dimensions (max 1200px width/height)
          let width = img.width;
          let height = img.height;
          const maxSize = 1200;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with quality 0.8
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.8
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  // Handle image selection with compression
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files);
    
    // Show loading state
    toast({ 
      title: 'Processing images...', 
      description: 'Compressing images for optimal upload.'
    });

    try {
      // Compress images
      const compressedFiles = await Promise.all(
        newFiles.map(file => compressImage(file))
      );

      setSelectedImages(prev => [...prev, ...compressedFiles]);

      // Create preview URLs
      const newPreviewUrls = compressedFiles.map(file => URL.createObjectURL(file));
      setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);

      toast({ 
        title: 'Images ready', 
        description: `${compressedFiles.length} image(s) processed successfully.`
      });
    } catch (error) {
      console.error('Error compressing images:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to process some images. Please try again.'
      });
    }
  };

  // Remove selected image
  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => {
      const newUrls = prev.filter((_, i) => i !== index);
      // Revoke the removed URL to free memory
      URL.revokeObjectURL(prev[index]);
      return newUrls;
    });
  };

  // Add menu item API
  const handleAddItem = async () => {
    // Clear previous errors
    setFormErrors({});

    // Validate form before submission
    if (!validateAddItemForm()) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fix the errors in the form before submitting.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for multipart upload
      const formData = new FormData();
      
      // Name (required by backend)
      formData.append('name', (newItemData.name as string || '').trim());
      
      // Category (required by backend - send _id)
      const categoryObj = categories.find(cat => cat._id === newItemData.category);
      formData.append('category', categoryObj?._id || newItemData.category as string);
      
      // Price (required by backend)
      const price = typeof newItemData.price === 'number' && !isNaN(newItemData.price)
        ? newItemData.price
        : parseFloat(String(newItemData.price));
      formData.append('price', price.toString());
      
      // Optional fields
      formData.append('status', newItemData.status as string || "Available");
      formData.append('isVeg', String(newItemData.isVeg || true));
      
      if (newItemData.description) {
        const desc = typeof newItemData.description === 'string' 
          ? newItemData.description 
          : (newItemData.description as { text: string })?.text || '';
        formData.append('description', desc);
      }
      if (newItemData.preparationTime) {
        formData.append('preparationTime', String(newItemData.preparationTime));
      }
      if (newItemData.moodTag) {
        formData.append('moodTag', newItemData.moodTag as string);
      }
      if (newItemData.hungerLevelTag) {
        formData.append('hungerLevelTag', newItemData.hungerLevelTag as string);
      }
      if (newItemData.allergens && Array.isArray(newItemData.allergens) && (newItemData.allergens as string[]).length > 0) {
        formData.append('allergens', JSON.stringify(newItemData.allergens));
      }
      if (newItemData.recommendedItems && Array.isArray(newItemData.recommendedItems) && (newItemData.recommendedItems as string[]).length > 0) {
        formData.append('recommendedItems', JSON.stringify(newItemData.recommendedItems));
      }

      // Handle specialOffer
      if (newItemData.specialOffer) {
        formData.append('specialOffer', JSON.stringify(newItemData.specialOffer));
      }

      // Append image files
      selectedImages.forEach((file) => {
        formData.append('images', file);
      });
      
      await menuApi.createMenuItem(formData);
      
      const addedItemName = newItemData.name;

      // Success - close dialog and reset form
      setAddDialogOpen(false);
      setNewItemData({
        name: "",
        category: "",
        price: 0,
        status: "Available",
        rating: 0,
        moodTag: null,
        hungerLevelTag: null,
        allergens: [],
        recommendedItems: [],
        images: [],
        specialOffer: {
          isSpecial: false,
          validFrom: "",
          validUntil: "",
          specialPrice: 0,
          description: "",
        },
      });
      setSelectedImages([]);
      setImagePreviewUrls([]);
      setFormErrors({});
      
      fetchMenuItems();
      
      toast({ 
        title: "Success!", 
        description: `Menu item "${addedItemName}" has been added successfully at ₹${price}.` 
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to add menu item. Please try again.");
      toast({ 
        title: "Error", 
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete menu item API
  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    setIsDeleting(true);

    try {
      await menuApi.deleteMenuItem(selectedItem.id);
      setDeleteDialogOpen(false);
      fetchMenuItems();
      toast({ 
        title: "Success!", 
        description: `Menu item "${selectedItem.name}" has been deleted.` 
      });
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to delete menu item.");
      toast({ 
        title: "Error", 
        description: errorMessage
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Export menu items API
  const handleExportMenuItems = async () => {
    try {
      const blob = await menuApi.exportMenuItems({
        search: searchQuery,
        category: categoryFilter === "all" ? undefined : categoryFilter,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'menu-items.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast({ title: "Export successful!", description: "Menu items data has been exported to CSV." });
    } catch (err) {
      const errorMessage = getErrorMessage(err, "Failed to export menu items.");
      toast({ title: "Error", description: errorMessage });
    }
  };



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Menu Items</h2>
        <Button onClick={() => {
          setSelectedItem(null);
          setNewItemData({
            name: "",
            description: { text: "", formatting: "PlainText" },
            price: 0,
            category: "",
            cuisine: "",
            dietaryInfo: [],
            status: "available",
            preparationTime: 0,
            rating: 0,
            tags: [],
            isVeg: false,
            specialOffer: {
              isSpecial: false,
              validFrom: "",
              validUntil: "",
            },
          });
          setSelectedImages([]);
          setImagePreviewUrls([]);
          setAddDialogOpen(true);
        }}>Add Item</Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search menu items by name, category, or ID..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={(value: "available" | "out-of-stock" | "coming-soon" | "all") => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Filter by Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              <SelectItem value="coming-soon">Coming Soon</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={(value: string) => setCategoryFilter(value)}>
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8" onClick={fetchMenuItems}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={handleExportMenuItems}>
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
              {/* <TableHead className="w-[100px]">ID</TableHead> */}
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prep Time</TableHead>
              <TableHead>Mood Tag</TableHead>
              <TableHead>Hunger Level</TableHead>
              <TableHead>Allergens</TableHead>
              {/* <TableHead>Rating</TableHead> */}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  Loading menu items...
                </TableCell>
              </TableRow>
            ) : menuItems?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  No menu items found.
                </TableCell>
              </TableRow>
            ) : (
              Array.isArray(menuItems) ? menuItems.map((item) => (
                <TableRow key={item.id}>
                  {/* <TableCell className="font-medium">{item.id}</TableCell> */}
                  <TableCell>
                    {item.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {/* <span className="text-xs text-muted-foreground">
                        {item.cuisine}
                      </span> */}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{categories.find(cat => cat._id === item.category)?.name || item.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {item.specialOffer?.isSpecial ? (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                        ⏰ Limited
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Regular
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>₹{item.price.toFixed(2)}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{item.preparationTime} min</span>
                  </TableCell>
                  <TableCell>
                    {item.moodTag ? (
                      <Badge variant="outline" className="text-xs">
                        {item.moodTag.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.hungerLevelTag ? (
                      <Badge variant="outline" className="text-xs">
                        {item.hungerLevelTag.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.allergens && item.allergens.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.allergens.slice(0, 2).map((allergen, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {allergen}
                          </Badge>
                        ))}
                        {item.allergens.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{item.allergens.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  {/* <TableCell>{item.rating}</TableCell> */}
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
                        <DropdownMenuItem onClick={() => handleViewItem(item.id)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            // Normalize status before setting
                            const normalizedItem = {
                              ...item,
                              // Normalize status: backend returns "Available", "Out of Stock", "Coming Soon"
                              // Frontend needs: "available", "out-of-stock", "coming-soon"
                              status: (item.status.toLowerCase().replace(/\s+/g, '-') as MenuItem["status"])
                            };
                            setSelectedItem(normalizedItem);
                            setSelectedImages([]);
                            setImagePreviewUrls([]);
                            setEditDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedItem(item);
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
              )) : null
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
          disabled={page * limit >= totalMenuItems || loading}
        >
          Next
        </Button>
      </div>

      {/* View Item Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Menu Item Details</DialogTitle>
            <DialogDescription>
              Detailed information about the selected menu item.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4 py-4">
              {/* Display image if available */}
              {selectedItem.imageUrl && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Product Image</p>
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.name}
                      className="max-w-full h-48 object-cover rounded-lg border shadow-sm"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x200?text=No+Image';
                      }}
                    />
                  </div>
                </div>
              )}
              
              {/* Display multiple images if available */}
              {selectedItem.images && selectedItem.images.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Additional Images</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.images.map((imgUrl, idx) => (
                      <div key={idx} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={imgUrl} 
                          alt={`${selectedItem.name} - ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded border shadow-sm"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=No+Image';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All data in 2 columns */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Item ID</p>
                  <p className="text-sm break-all">{selectedItem.id}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Category</p>
                  <Badge variant="outline">{categories.find(cat => cat._id === selectedItem.category)?.name || selectedItem.category}</Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-sm">{selectedItem.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Price</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold ${selectedItem.specialOffer?.isSpecial && selectedItem.specialOffer?.specialPrice ? "line-through text-muted-foreground" : ""}`}>
                      ₹{selectedItem.price.toFixed(2)}
                    </p>
                    {selectedItem.specialOffer?.isSpecial && selectedItem.specialOffer?.specialPrice && (
                      <p className="text-sm font-bold text-green-600">
                        ₹{selectedItem.specialOffer.specialPrice.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Description</p>
                  <p className="text-sm">{typeof selectedItem.description === 'object' ? selectedItem.description.text : selectedItem.description}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <StatusBadge
                    status={selectedItem.status}
                    category="generic"
                    ariaLabel={`Item status: ${selectedItem.status}`}
                  />
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Preparation Time</p>
                  <p className="text-sm">{selectedItem.preparationTime} minutes</p>
                </div>

                {/* <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Cuisine</p>
                  <p className="text-sm">{selectedItem.cuisine}</p>
                </div> */}

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Rating</p>
                  <p className="text-sm">{selectedItem.rating} ⭐</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Item Type</p>
                  <div className="flex items-center gap-2">
                    {selectedItem.specialOffer?.isSpecial ? (
                      <>
                        <Badge variant="secondary" className="bg-status-warning-100 text-status-warning-800 border-amber-200">⏰ Limited Time Offer</Badge>
                        {selectedItem.specialOffer.validUntil && (
                          <span className="text-xs text-muted-foreground">
                            Ends: {new Date(selectedItem.specialOffer.validUntil).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline">Regular Item</Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Mood Tag</p>
                  <Badge variant="outline">
                    {selectedItem.moodTag 
                      ? selectedItem.moodTag.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                      : 'Not Set'}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Hunger Level</p>
                  <Badge variant="outline">
                    {selectedItem.hungerLevelTag 
                      ? selectedItem.hungerLevelTag.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                      : 'Not Set'}
                  </Badge>
                </div>

                {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Allergens</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedItem.allergens.map((allergen, idx) => (
                        <Badge key={idx} variant="secondary">{allergen}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.recommendedItems && selectedItem.recommendedItems.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Recommended Items ({selectedItem.recommendedItems.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedItem.recommendedItems.map((itemId, idx) => {
                        const recommendedItem = menuItems.find(item => item.id === itemId);
                        return (
                          <Badge key={idx} variant="outline" className="bg-blue-50">
                            {recommendedItem?.name || itemId}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Item Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>Update menu item information</DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="edit-name"
                  value={selectedItem.name}
                  className="col-span-3"
                  onChange={(e) => setSelectedItem({...selectedItem, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-price" className="text-right">
                  Price
                </Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={selectedItem.price}
                  className="col-span-3"
                  onChange={(e) => setSelectedItem({...selectedItem, price: parseFloat(e.target.value)})} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-category" className="text-right">
                  Category
                </Label>
                <Select
                  value={selectedItem.category || ''}
                  onValueChange={(value) => setSelectedItem({ ...selectedItem, category: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <Select 
                  value={selectedItem.status || "available"} 
                  onValueChange={(value) => setSelectedItem({...selectedItem, status: value as MenuItem["status"]})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    <SelectItem value="coming-soon">Coming Soon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Limited Time Offer */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-isSpecial" className="text-right">
                  Limited Time
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Checkbox
                    id="edit-isSpecial"
                    checked={selectedItem.specialOffer?.isSpecial || false}
                    onCheckedChange={(checked) => 
                      setSelectedItem({
                        ...selectedItem,
                        specialOffer: {
                          isSpecial: checked === true,
                          validFrom: selectedItem.specialOffer?.validFrom || "",
                          validUntil: selectedItem.specialOffer?.validUntil || "",
                          specialPrice: selectedItem.specialOffer?.specialPrice || 0,
                          description: selectedItem.specialOffer?.description || "",
                        }
                      })
                    }
                  />
                  <span className="text-sm text-muted-foreground">Make this a limited time menu item</span>
                </div>
              </div>

              {selectedItem.specialOffer?.isSpecial && (
                <>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-validFrom" className="text-right">
                      Available From
                    </Label>
                    <Input
                      id="edit-validFrom"
                      type="date"
                      className="col-span-3"
                      value={selectedItem.specialOffer?.validFrom ? new Date(selectedItem.specialOffer.validFrom).toISOString().split('T')[0] : ""}
                      onChange={(e) => 
                        setSelectedItem({
                          ...selectedItem,
                          specialOffer: {
                            isSpecial: true,
                            validFrom: e.target.value,
                            validUntil: selectedItem.specialOffer?.validUntil || "",
                            specialPrice: selectedItem.specialOffer?.specialPrice || 0,
                            description: selectedItem.specialOffer?.description || "",
                          }
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-validUntil" className="text-right">
                      Available Until
                    </Label>
                    <Input
                      id="edit-validUntil"
                      type="date"
                      className="col-span-3"
                      value={selectedItem.specialOffer?.validUntil ? new Date(selectedItem.specialOffer.validUntil).toISOString().split('T')[0] : ""}
                      onChange={(e) => 
                        setSelectedItem({
                          ...selectedItem,
                          specialOffer: {
                            isSpecial: true,
                            validFrom: selectedItem.specialOffer?.validFrom || "",
                            validUntil: e.target.value,
                            specialPrice: selectedItem.specialOffer?.specialPrice || 0,
                            description: selectedItem.specialOffer?.description || "",
                          }
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-specialPrice" className="text-right">
                      Special Price
                    </Label>
                    <Input
                      id="edit-specialPrice"
                      type="number"
                      step="0.01"
                      className="col-span-3"
                      value={selectedItem.specialOffer?.specialPrice || ""}
                      onChange={(e) => 
                        setSelectedItem({
                          ...selectedItem,
                          specialOffer: {
                            isSpecial: true,
                            validFrom: selectedItem.specialOffer?.validFrom || "",
                            validUntil: selectedItem.specialOffer?.validUntil || "",
                            specialPrice: parseFloat(e.target.value),
                            description: selectedItem.specialOffer?.description || "",
                          }
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="edit-offerDescription" className="text-right">
                      Offer Description
                    </Label>
                    <Input
                      id="edit-offerDescription"
                      className="col-span-3"
                      placeholder="e.g. 50% off for new year"
                      value={selectedItem.specialOffer?.description || ""}
                      onChange={(e) => 
                        setSelectedItem({
                          ...selectedItem,
                          specialOffer: {
                            isSpecial: true,
                            validFrom: selectedItem.specialOffer?.validFrom || "",
                            validUntil: selectedItem.specialOffer?.validUntil || "",
                            specialPrice: selectedItem.specialOffer?.specialPrice || 0,
                            description: e.target.value,
                          }
                        })
                      }
                    />
                  </div>
                </>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-moodTag" className="text-right">
                  Mood Tag
                </Label>
                <Select 
                  value={selectedItem.moodTag || ""} 
                  onValueChange={(value) => setSelectedItem({...selectedItem, moodTag: value as MenuItem["moodTag"]})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select mood" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="angry">Angry</SelectItem>
                    <SelectItem value="in_love">In Love</SelectItem>
                    <SelectItem value="sad">Sad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-hungerLevelTag" className="text-right">
                  Hunger Level
                </Label>
                <Select 
                  value={selectedItem.hungerLevelTag || ""} 
                  onValueChange={(value) => setSelectedItem({...selectedItem, hungerLevelTag: value as MenuItem["hungerLevelTag"]})}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select hunger level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="little_hungry">Little Hungry</SelectItem>
                    <SelectItem value="quite_hungry">Quite Hungry</SelectItem>
                    <SelectItem value="very_hungry">Very Hungry</SelectItem>
                    <SelectItem value="super_hungry">Super Hungry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Input
                  id="edit-description"
                  placeholder="Enter item description"
                  className="col-span-3"
                  value={typeof selectedItem.description === 'object' 
                    ? selectedItem.description.text 
                    : selectedItem.description || ""}
                  onChange={(e) => setSelectedItem({
                    ...selectedItem, 
                    description: typeof selectedItem.description === 'object'
                      ? {...selectedItem.description, text: e.target.value}
                      : {text: e.target.value, formatting: 'PlainText'}
                  })}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-preparationTime" className="text-right">
                  Prep Time (min)
                </Label>
                <Input
                  id="edit-preparationTime"
                  type="number"
                  placeholder="0"
                  className="col-span-3"
                  value={selectedItem.preparationTime || ""}
                  onChange={(e) => setSelectedItem({...selectedItem, preparationTime: parseInt(e.target.value)})}
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-images" className="text-right pt-2">
                  Images
                </Label>
                <div className="col-span-3 space-y-2">
                  {/* Show current image if exists and no new images selected */}
                  {selectedItem.imageUrl && imagePreviewUrls.length === 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-2">Current Image:</p>
                      <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={selectedItem.imageUrl} 
                          alt="Current menu item"
                          className="w-32 h-32 object-cover rounded border"
                          onError={(e) => {
                            // Fallback if image fails to load
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  <Input
                    id="edit-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="cursor-pointer"
                  />
                  
                  {/* Show new image previews */}
                  {imagePreviewUrls.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">New Images to Upload:</p>
                      <div className="flex flex-wrap gap-2">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={url} 
                              alt={`Preview ${index + 1}`}
                              className="w-20 h-20 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    {imagePreviewUrls.length > 0 
                      ? "These new images will replace the existing image."
                      : "Upload new images to replace the existing image (up to 5, max 5MB each)."}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-allergens" className="text-right pt-2">
                  Allergens
                </Label>
                <div className="col-span-3 space-y-2">
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      const currentAllergens = selectedItem.allergens || [];
                      if (value && !currentAllergens.includes(value)) {
                        setSelectedItem({
                          ...selectedItem, 
                          allergens: [...currentAllergens, value]
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select allergens" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuts">Nuts</SelectItem>
                      <SelectItem value="dairy">Dairy</SelectItem>
                      <SelectItem value="gluten">Gluten</SelectItem>
                      <SelectItem value="soy">Soy</SelectItem>
                      <SelectItem value="eggs">Eggs</SelectItem>
                      <SelectItem value="fish">Fish</SelectItem>
                      <SelectItem value="shellfish">Shellfish</SelectItem>
                      <SelectItem value="wheat">Wheat</SelectItem>
                      <SelectItem value="peanuts">Peanuts</SelectItem>
                      <SelectItem value="sesame">Sesame</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.allergens.map((allergen, index) => (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {allergen}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => {
                              setSelectedItem({
                                ...selectedItem,
                                allergens: selectedItem.allergens?.filter((_, i) => i !== index)
                              });
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="edit-recommendedItems" className="text-right pt-2">
                  Recommended Items
                </Label>
                <div className="col-span-3 space-y-2">
                  <Select 
                    value="" 
                    onValueChange={(value) => {
                      const currentRecommended = selectedItem.recommendedItems || [];
                      if (value && !currentRecommended.includes(value)) {
                        setSelectedItem({
                          ...selectedItem, 
                          recommendedItems: [...currentRecommended, value]
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select recommended items" />
                    </SelectTrigger>
                    <SelectContent>
                      {menuItems
                        .filter(item => item.status === 'available' && item.id !== selectedItem.id)
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedItem.recommendedItems && selectedItem.recommendedItems.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.recommendedItems.map((itemId, index) => {
                        const recommendedItem = menuItems.find(item => item.id === itemId);
                        return (
                          <Badge 
                            key={index} 
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {recommendedItem?.name || itemId}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => {
                                setSelectedItem({
                                  ...selectedItem,
                                  recommendedItems: selectedItem.recommendedItems?.filter((_, i) => i !== index)
                                });
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select menu items to recommend with this dish
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEditItem} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Item Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this menu item? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <div className="py-4">
              <p className="text-center font-semibold">
                {selectedItem.name} ({selectedItem.id})
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Menu Item</DialogTitle>
            <DialogDescription>
              Create a new menu item with the following information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="name"
                  placeholder="Enter item name"
                  value={(newItemData.name as string) || ""}
                  onChange={(e) => setNewItemData({...newItemData, name: e.target.value})}
                  className={formErrors.name ? "border-red-500" : ""}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500">{formErrors.name}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="price" className="text-right">
                Price <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={(newItemData.price as number) || ""}
                  onChange={(e) => setNewItemData({...newItemData, price: parseFloat(e.target.value)})}
                  className={formErrors.price ? "border-red-500" : ""}
                />
                {formErrors.price && (
                  <p className="text-xs text-red-500">{formErrors.price}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 space-y-1">
                <Select
                  value={(newItemData.category as string) || ''}
                  onValueChange={(value) => setNewItemData({ ...newItemData, category: value })}
                >
                  <SelectTrigger className={formErrors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.category && (
                  <p className="text-xs text-red-500">{formErrors.category}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={(newItemData.status as string) || "Available"} onValueChange={(value) => setNewItemData({...newItemData, status: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                  <SelectItem value="Coming Soon">Coming Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Limited Time Offer */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isSpecial" className="text-right">
                Limited Time
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Checkbox
                  id="isSpecial"
                  checked={(newItemData.specialOffer as any)?.isSpecial || false}
                  onCheckedChange={(checked) => 
                    setNewItemData({
                      ...newItemData,
                      specialOffer: {
                        ...(newItemData.specialOffer as any),
                        isSpecial: checked === true
                      }
                    })
                  }
                />
                <span className="text-sm text-muted-foreground">Make this a limited time menu item</span>
              </div>
            </div>

            {((newItemData.specialOffer as any)?.isSpecial) && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="validFrom" className="text-right">
                    Available From
                  </Label>
                  <Input
                    id="validFrom"
                    type="date"
                    className="col-span-3"
                    value={(newItemData.specialOffer as any)?.validFrom || ""}
                    onChange={(e) => 
                      setNewItemData({
                        ...newItemData,
                        specialOffer: {
                          ...(newItemData.specialOffer as any),
                          validFrom: e.target.value
                        }
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="validUntil" className="text-right">
                    Available Until
                  </Label>
                  <Input
                    id="validUntil"
                    type="date"
                    className="col-span-3"
                    value={(newItemData.specialOffer as any)?.validUntil || ""}
                    onChange={(e) => 
                      setNewItemData({
                        ...newItemData,
                        specialOffer: {
                          ...(newItemData.specialOffer as any),
                          validUntil: e.target.value
                        }
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="specialPrice" className="text-right">
                    Special Price
                  </Label>
                  <Input
                    id="specialPrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="col-span-3"
                    value={(newItemData.specialOffer as any)?.specialPrice || ""}
                    onChange={(e) => 
                      setNewItemData({
                        ...newItemData,
                        specialOffer: {
                          ...(newItemData.specialOffer as any),
                          specialPrice: parseFloat(e.target.value)
                        }
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="offerDescription" className="text-right">
                    Offer Description
                  </Label>
                  <Input
                    id="offerDescription"
                    placeholder="e.g. Festival Season Special"
                    className="col-span-3"
                    value={(newItemData.specialOffer as any)?.description || ""}
                    onChange={(e) => 
                      setNewItemData({
                        ...newItemData,
                        specialOffer: {
                          ...(newItemData.specialOffer as any),
                          description: e.target.value
                        }
                      })
                    }
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rating" className="text-right">
                Rating
              </Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                placeholder="0.0"
                className="col-span-3"
                value={(newItemData.rating as number) || ""}
                onChange={(e) => setNewItemData({...newItemData, rating: parseFloat(e.target.value)})}
              />
            </div>
                        <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="moodTag" className="text-right">
                Mood Tag
              </Label>
              <Select value={(newItemData.moodTag as string) || ""} onValueChange={(value) => setNewItemData({...newItemData, moodTag: value || null})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="angry">Angry</SelectItem>
                  <SelectItem value="in_love">In Love</SelectItem>
                  <SelectItem value="sad">Sad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="hungerLevelTag" className="text-right">
                Hunger Level
              </Label>
              <Select value={(newItemData.hungerLevelTag as string) || ""} onValueChange={(value) => setNewItemData({...newItemData, hungerLevelTag: value || null})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select hunger level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="little_hungry">Little Hungry</SelectItem>
                  <SelectItem value="quite_hungry">Quite Hungry</SelectItem>
                  <SelectItem value="very_hungry">Very Hungry</SelectItem>
                  <SelectItem value="super_hungry">Super Hungry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description <span className="text-red-500">*</span>
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="description"
                  placeholder="Enter item description (min 10 chars)"
                  value={typeof newItemData.description === 'object' 
                    ? (newItemData.description as { text: string })?.text || ""
                    : (newItemData.description as string) || ""}
                  onChange={(e) => setNewItemData({...newItemData, description: e.target.value})}
                  className={formErrors.description ? "border-red-500" : ""}
                />
                {formErrors.description && (
                  <p className="text-xs text-red-500">{formErrors.description}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="preparationTime" className="text-right">
                Prep Time (min)
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="preparationTime"
                  type="number"
                  placeholder="0"
                  value={(newItemData.preparationTime as number) || ""}
                  onChange={(e) => setNewItemData({...newItemData, preparationTime: parseInt(e.target.value)})}
                  className={formErrors.preparationTime ? "border-red-500" : ""}
                />
                {formErrors.preparationTime && (
                  <p className="text-xs text-red-500">{formErrors.preparationTime}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="images" className="text-right pt-2">
                Product Images
              </Label>
              <div className="col-span-3 space-y-2">
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className={`cursor-pointer ${formErrors.images ? "border-red-500" : ""}`}
                />
                {imagePreviewUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {imagePreviewUrls.map((url, index) => (
                      <div key={index} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={url} 
                          alt={`Preview ${index + 1}`}
                          className="w-20 h-20 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formErrors.images ? (
                  <p className="text-xs text-red-500">{formErrors.images}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Upload up to 5 images (max 5MB each). First image will be the main display.
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="allergens" className="text-right pt-2">
                Allergens
              </Label>
              <div className="col-span-3 space-y-2">
                <Select 
                  value="" 
                  onValueChange={(value) => {
                    if (value && !((newItemData.allergens as string[]) || []).includes(value)) {
                      setNewItemData({
                        ...newItemData, 
                        allergens: [...((newItemData.allergens as string[]) || []), value]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select allergens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nuts">Nuts</SelectItem>
                    <SelectItem value="dairy">Dairy</SelectItem>
                    <SelectItem value="gluten">Gluten</SelectItem>
                    <SelectItem value="soy">Soy</SelectItem>
                    <SelectItem value="eggs">Eggs</SelectItem>
                    <SelectItem value="fish">Fish</SelectItem>
                    <SelectItem value="shellfish">Shellfish</SelectItem>
                    <SelectItem value="wheat">Wheat</SelectItem>
                    <SelectItem value="peanuts">Peanuts</SelectItem>
                    <SelectItem value="sesame">Sesame</SelectItem>
                  </SelectContent>
                </Select>
                {Array.isArray(newItemData.allergens) && (newItemData.allergens as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(newItemData.allergens as string[]).map((allergen, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {allergen}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => {
                            setNewItemData({
                              ...newItemData,
                              allergens: (newItemData.allergens as string[]).filter((_, i) => i !== index)
                            });
                          }}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="recommendedItems" className="text-right pt-2">
                Recommended Items
              </Label>
              <div className="col-span-3 space-y-2">
                <Select 
                  value="" 
                  onValueChange={(value) => {
                    if (value && !((newItemData.recommendedItems as string[]) || []).includes(value)) {
                      setNewItemData({
                        ...newItemData, 
                        recommendedItems: [...((newItemData.recommendedItems as string[]) || []), value]
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select recommended items" />
                  </SelectTrigger>
                  <SelectContent>
                    {menuItems
                      .filter(item => item.status === 'available')
                      .map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {Array.isArray(newItemData.recommendedItems) && (newItemData.recommendedItems as string[]).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(newItemData.recommendedItems as string[]).map((itemId, index) => {
                      const recommendedItem = menuItems.find(item => item.id === itemId);
                      return (
                        <Badge 
                          key={index} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {recommendedItem?.name || itemId}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => {
                              setNewItemData({
                                ...newItemData,
                                recommendedItems: (newItemData.recommendedItems as string[]).filter((_, i) => i !== index)
                              });
                            }}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Select menu items to recommend with this dish
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddDialogOpen(false);
              setFormErrors({});
            }} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

