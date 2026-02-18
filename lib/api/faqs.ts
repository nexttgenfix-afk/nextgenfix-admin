import apiClient from './client'

export interface FAQ {
  _id?: string
  faqId: string
  question: string
  answer: string
  category: 'ordering' | 'payment' | 'delivery' | 'account' | 'menu' | 'general'
  isActive: boolean
  order: number
  views: number
  helpful: number
  notHelpful: number
  tags: string[]
  admin?: {
    createdBy?: string
    updatedBy?: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface FAQFilters {
  page?: number
  limit?: number
  category?: string
  isActive?: boolean
}

export interface FAQStats {
  totalFAQs: number
  activeFAQs: number
  byCategory: Array<{ _id: string; count: number }>
  mostViewed: Array<{ question: string; category: string; views: number; helpful: number; notHelpful: number }>
  engagement: {
    totalViews: number
    totalHelpful: number
    totalNotHelpful: number
  }
}

/**
 * Create new FAQ (Admin)
 */
export const createFAQ = async (data: { question: string; answer: string; category: string; tags?: string[] }) => {
  const response = await apiClient.post<{ success: boolean; message: string; data: FAQ }>('/help-support/faqs/admin', data)
  return response.data.data
}

/**
 * Get all FAQs (Admin - includes inactive)
 */
export const getAllFAQsAdmin = async (filters?: FAQFilters) => {
  const response = await apiClient.get<{
    success: boolean
    data: FAQ[]
    pagination: { page: number; limit: number; total: number; totalPages: number }
  }>('/help-support/faqs/admin/list', {
    params: filters,
  })
  return response.data
}

/**
 * Update FAQ (Admin)
 */
export const updateFAQ = async (id: string, data: Partial<FAQ>) => {
  const response = await apiClient.put<{ success: boolean; message: string; data: FAQ }>(
    `/help-support/faqs/admin/${id}`,
    data
  )
  return response.data.data
}

/**
 * Delete FAQ (Admin)
 */
export const deleteFAQ = async (id: string) => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/help-support/faqs/admin/${id}`)
  return response.data
}

/**
 * Reorder FAQs (Admin)
 */
export const reorderFAQs = async (faqOrder: Array<{ faqId: string; order: number }>) => {
  const response = await apiClient.post<{ success: boolean; message: string }>(
    '/help-support/faqs/admin/reorder',
    { faqOrder }
  )
  return response.data
}

/**
 * Get FAQ statistics (Admin)
 */
export const getFAQStats = async () => {
  const response = await apiClient.get<{ success: boolean; data: FAQStats }>('/help-support/faqs/admin/stats')
  return response.data.data
}

/**
 * Get all active FAQs (Public - user/mobile app)
 */
export const getFAQs = async (category?: string) => {
  const response = await apiClient.get<{ success: boolean; data: FAQ[] }>('/help-support/faqs', {
    params: category ? { category } : undefined,
  })
  return response.data.data
}

/**
 * Get FAQs by category (Public)
 */
export const getFAQsByCategory = async (category: string) => {
  const response = await apiClient.get<{ success: boolean; data: FAQ[] }>(`/help-support/faqs/category/${category}`)
  return response.data.data
}

/**
 * Search FAQs (Public)
 */
export const searchFAQs = async (query: string) => {
  const response = await apiClient.get<{ success: boolean; data: FAQ[] }>('/help-support/faqs/search', {
    params: { query },
  })
  return response.data.data
}

/**
 * Mark FAQ as helpful (Public)
 */
export const markFAQHelpful = async (faqId: string, isHelpful: boolean) => {
  const response = await apiClient.post(`/help-support/faqs/${faqId}/helpful`, { isHelpful })
  return response.data
}

/**
 * Increment FAQ view (Public)
 */
export const incrementFAQView = async (faqId: string) => {
  const response = await apiClient.post(`/help-support/faqs/${faqId}/view`)
  return response.data
}
