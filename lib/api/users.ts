import apiClient from './client'
import { User } from '../types'

export interface UserFilters {
  search?: string
  status?: string
  dietPreference?: string
  eatingPreference?: string
  tier?: 'bronze' | 'silver' | 'gold'
  page?: number
  limit?: number
}

export const getUsers = async (filters?: UserFilters) => {
  const response = await apiClient.get<{ users: User[]; total: number }>('/admin/users', {
    params: filters,
  })
  return response.data
}

export const getUserById = async (id: string) => {
  const response = await apiClient.get<User>(`/admin/users/${id}`)
  return response.data
}

export const createUser = async (data: Partial<User>) => {
  const response = await apiClient.post<User>('/admin/users', data)
  return response.data
}

export const updateUser = async (id: string, data: Partial<User>) => {
  const response = await apiClient.put<User>(`/admin/users/${id}`, data)
  return response.data
}

export const deleteUser = async (id: string) => {
  const response = await apiClient.delete(`/admin/users/${id}`)
  return response.data
}

export const updateUserTier = async (id: string, tier: 'bronze' | 'silver' | 'gold') => {
  const response = await apiClient.put<User>(`/admin/users/${id}/tier`, { tier })
  return response.data
}

export const exportUsers = async (filters?: UserFilters) => {
  const response = await apiClient.get('/admin/users-export', {
    params: filters,
    responseType: 'blob',
  })
  return response.data
}

export interface UserLocation {
  _id: string
  label?: string
  saveAs?: string
  formattedAddress?: string
  flatNumber?: string
  landmark?: string
  addressComponents?: {
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  isDefault?: boolean
}

export const getUserAddresses = async (userId: string) => {
  const response = await apiClient.get<{ success: boolean; locations: UserLocation[] }>(`/admin/users/${userId}/locations`)
  return response.data.locations
}

export const getUserCancelledOrders = async (userId: string) => {
  const response = await apiClient.get<{ success: boolean; orders: unknown[] }>(`/admin/users/${userId}/cancelled-orders`)
  return response.data.orders
}

export const getAbandonedCarts = async () => {
  const response = await apiClient.get<{ success: boolean; carts: unknown[]; total: number }>('/admin/carts/abandoned')
  return response.data
}
