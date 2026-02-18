import apiClient from './client'

export interface ComplaintResponse {
  adminId: string
  adminName: string
  message: string
  isInternal?: boolean
  createdAt: string
}

export interface Complaint {
  _id: string
  complaintId?: string
  user?: {
    _id: string
    name: string
    email: string
  }
  userId?: string
  userName?: string
  userEmail?: string
  subject: string
  description: string
  category: 'order_issue' | 'delivery_issue' | 'payment_issue' | 'account_issue' | 'technical_issue' | 'menu_issue' | 'general_inquiry' | 'feedback'
  priority: 'Low' | 'Medium' | 'High' | 'Urgent'
  status: 'Open' | 'In-progress' | 'Resolved' | 'Closed'
  orderId?: string
  attachments?: string[]
  media?: string[]
  responses?: ComplaintResponse[]
  response?: string
  respondedAt?: string
  relatedOrderId?: string
  assignedTo?: {
    _id: string
    name: string
    email: string
  }
  resolvedAt?: string
  resolvedBy?: string
  closedAt?: string
  lastResponseAt?: string
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface ComplaintFilters {
  status?: string
  category?: string
  priority?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}

export const getComplaints = async (filters?: ComplaintFilters) => {
  const response = await apiClient.get<{ 
    success: boolean; 
    data: Complaint[]; 
    pagination: { total: number; page: number; limit: number; pages: number; hasMore: boolean } 
  }>('/complaints/all', {
    params: filters,
  })
  return response.data
}

export const getComplaintById = async (id: string) => {
  const response = await apiClient.get<Complaint>(`/complaints/admin/${id}`)
  return response.data
}

export const updateComplaintStatus = async (id: string, status: Complaint['status']) => {
  const response = await apiClient.put<Complaint>(`/complaints/${id}/status`, { status })
  return response.data
}

export const addComplaintResponse = async (id: string, message: string, isInternal?: boolean) => {
  const response = await apiClient.post<Complaint>(`/complaints/${id}/respond`, { message, isInternal })
  return response.data
}

export const respondToComplaint = async (id: string, message: string) => {
  return addComplaintResponse(id, message, false)
}

export const createComplaint = async (data: Partial<Complaint>) => {
  const response = await apiClient.post<Complaint>('/complaints/admin', data)
  return response.data
}

export const updateComplaint = async (id: string, data: Partial<Complaint>) => {
  const response = await apiClient.put<Complaint>(`/complaints/admin/${id}`, data)
  return response.data
}

export const deleteComplaint = async (id: string) => {
  const response = await apiClient.delete(`/complaints/admin/${id}`)
  return response.data
}

export const assignComplaint = async (id: string, adminId: string) => {
  const response = await apiClient.put<Complaint>(`/complaints/${id}/assign`, { adminId })
  return response.data
}

export interface ComplaintStats {
  total: number
  openComplaints: number
  resolvedComplaints: number
  byStatus: { [key: string]: number }
  byCategory: { [key: string]: number }
  byPriority: { [key: string]: number }
  avgResolutionTimeHours: number
}

export const getComplaintStats = async () => {
  const response = await apiClient.get<{ success: boolean; data: ComplaintStats }>('/complaints/stats')
  return response.data.data
}

export const exportComplaints = async (filters?: ComplaintFilters) => {
  const response = await apiClient.get('/complaints/admin/export', {
    params: filters,
    responseType: 'blob',
  })
  return response.data
}
