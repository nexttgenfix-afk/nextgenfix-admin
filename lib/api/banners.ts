import apiClient from './client'

export interface Banner {
  _id: string
  title: string
  mediaType: 'image' | 'video'
  image?: string
  video?: string
  link: string
  type: 'promotion' | 'offer' | 'new_item' | 'announcement'
  isActive: boolean
  displayOrder: number
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
}

export const getBanners = async () => {
  const response = await apiClient.get<{ success: boolean; data: Banner[] }>('/banners/admin')
  return response.data
}

export const createBanner = async (data: Omit<Banner, '_id' | 'createdAt' | 'updatedAt'>) => {
  const response = await apiClient.post<{ success: boolean; data: Banner }>('/banners/admin', data)
  return response.data
}

export const updateBanner = async (id: string, data: Partial<Banner>) => {
  const response = await apiClient.put<{ success: boolean; data: Banner }>(`/banners/admin/${id}`, data)
  return response.data
}

export const deleteBanner = async (id: string) => {
  const response = await apiClient.delete(`/banners/admin/${id}`)
  return response.data
}

export const uploadBannerMedia = async (file: File, type: 'image' | 'video'): Promise<string> => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<{ success: boolean; url: string }>(
    `/banners/admin/upload/${type}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return response.data.url
}
