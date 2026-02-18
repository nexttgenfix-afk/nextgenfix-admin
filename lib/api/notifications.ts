import apiClient from './client'

export interface SendNotificationPayload {
  userId: string
  title: string
  body: string
  data?: Record<string, string>
}

export interface SendTopicNotificationPayload {
  topic: string
  title: string
  body: string
  data?: Record<string, string>
}

export const sendNotification = async (payload: SendNotificationPayload) => {
  const response = await apiClient.post('/notifications/send', payload)
  return response.data
}

export const sendTopicNotification = async (payload: SendTopicNotificationPayload) => {
  const response = await apiClient.post('/notifications/topics/send', payload)
  return response.data
}
