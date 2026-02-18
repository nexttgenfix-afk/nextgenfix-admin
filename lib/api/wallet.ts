import apiClient from './client'

export interface WalletTransaction {
  transactionId: string
  user: string
  type: 'top_up' | 'order_payment' | 'refund' | 'bonus' | 'deduction' | 'reversal'
  amount: number
  balanceBefore: number
  balanceAfter: number
  status: 'pending' | 'completed' | 'failed' | 'reversed'
  description: string
  createdAt: string
  updatedAt: string
  metadata?: {
    orderId?: string
    adminId?: string
    reason?: string
    referenceNumber?: string
    notes?: string
  }
}

export interface UserWallet {
  id: string
  name: string
  email: string
  phone: string
  tier: string
  totalOrders: number
  totalSpent: number
  walletBalance: number
}

export interface WalletStats {
  totalBalance: number
  usersWithBalance: number
  transactionStats: {
    [key: string]: {
      count: number
      totalAmount: number
    }
  }
  summary: {
    topUps: { count: number; totalAmount: number }
    payments: { count: number; totalAmount: number }
    refunds: { count: number; totalAmount: number }
    bonuses: { count: number; totalAmount: number }
    deductions: { count: number; totalAmount: number }
  }
}

export interface WalletFilters {
  page?: number
  limit?: number
  type?: string
  startDate?: string
  endDate?: string
  status?: string
}

export interface SearchUser {
  id: string
  name: string
  email: string
  phone: string
  walletBalance: number
}

/**
 * Get platform-wide wallet statistics
 */
export const getWalletStats = async (filters?: { startDate?: string; endDate?: string }) => {
  const response = await apiClient.get<{ success: boolean; data: WalletStats }>('/admin/wallet/stats', {
    params: filters,
  })
  return response.data.data
}

/**
 * Get specific user's wallet details
 */
export const getUserWallet = async (userId: string) => {
  const response = await apiClient.get<{
    success: boolean
    data: {
      user: UserWallet
      statsByType: { [key: string]: { count: number; totalAmount: number } }
      recentTransactions: WalletTransaction[]
    }
  }>(`/admin/wallet/user/${userId}`)
  return response.data.data
}

/**
 * Add bonus to user wallet
 */
export const addWalletBonus = async (userId: string, amount: number, description?: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: {
      transactionId: string
      amount: number
      newBalance: number
    }
  }>('/admin/wallet/add-bonus', {
    userId,
    amount,
    description,
  })
  return response.data.data
}

/**
 * Deduct amount from user wallet
 */
export const deductWalletAmount = async (userId: string, amount: number, reason?: string) => {
  const response = await apiClient.post<{
    success: boolean
    message: string
    data: {
      transactionId: string
      amount: number
      newBalance: number
    }
  }>('/admin/wallet/deduct', {
    userId,
    amount,
    reason,
  })
  return response.data.data
}

/**
 * Get user's wallet transaction history
 */
export const getWalletTransactionHistory = async (userId: string, filters?: WalletFilters) => {
  const response = await apiClient.get<{
    success: boolean
    data: WalletTransaction[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>(`/wallet/transactions`, {
    params: {
      userId,
      ...filters,
    },
  })
  return response.data
}

/**
 * Search users by name or phone number
 */
export const searchUsers = async (query: string) => {
  const response = await apiClient.get<{
    success: boolean
    data: SearchUser[]
  }>('/admin/wallet/search', {
    params: { query },
  })
  return response.data.data
}
