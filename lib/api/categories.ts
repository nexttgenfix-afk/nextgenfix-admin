import apiClient from './client'

export interface Category {
  _id: string
  name: string
  parentCategory?: string | null
  description?: string
  image?: string
  itemCount?: number
  createdAt: string
  updatedAt: string
}

export const getCategories = async (all = false, parentCategory?: string) => {
  const params: Record<string, any> = {};
  if (all) params.all = 'true';
  if (parentCategory) params.parentCategory = parentCategory;
  
  const response = await apiClient.get<{ categories: Category[] }>('/admin/categories', { params })
  return response.data
}

export const getSubcategories = async (parentId: string) => {
  const response = await apiClient.get<{ subcategories: Category[] }>(`/categories/${parentId}/subcategories`)
  return response.data
}

export const getCategoryById = async (id: string) => {
  const response = await apiClient.get<Category>(`/categories/${id}`)
  return response.data
}

export const createCategory = async (data: Omit<Category, '_id' | 'itemCount' | 'createdAt' | 'updatedAt'> | FormData) => {
  const config = data instanceof FormData 
    ? { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 120 seconds for file uploads
      }
    : {};
  
  const response = await apiClient.post<Category>('/categories', data, config)
  return response.data
}

export const updateCategory = async (id: string, data: Partial<Category> | FormData) => {
  const config = data instanceof FormData 
    ? { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 120 seconds for file uploads
      }
    : {};
  
  const response = await apiClient.put<Category>(`/categories/${id}`, data, config)
  return response.data
}

export const deleteCategory = async (id: string) => {
  const response = await apiClient.delete(`/categories/${id}`)
  return response.data
}
