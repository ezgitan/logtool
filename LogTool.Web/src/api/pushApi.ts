import { apiRequest } from './client'
import type {
  AppNotification,
  PushSettings,
  RegisterPushSubscriptionRequest,
  SendNotificationResult,
} from '../types/log'

export const getPushPublicKey = () => apiRequest<{ publicKey: string }>('/api/push/public-key')

export const getPushSettings = (memberName: string) =>
  apiRequest<PushSettings>(`/api/push/settings?memberName=${encodeURIComponent(memberName)}`)

export const registerPushSubscription = (payload: RegisterPushSubscriptionRequest) =>
  apiRequest<void>('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const notifyAllMembers = (message: string) =>
  apiRequest<SendNotificationResult>('/api/push/notify-all', {
    method: 'POST',
    body: JSON.stringify({ message }),
  })

export const notifyMember = (memberName: string, message: string) =>
  apiRequest<SendNotificationResult>(`/api/push/notify/${encodeURIComponent(memberName)}`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  })

export const getNotifications = (memberName: string) =>
  apiRequest<AppNotification[]>(`/api/notifications?memberName=${encodeURIComponent(memberName)}`)

export const markNotificationsRead = (memberName: string) =>
  apiRequest<void>(`/api/notifications/mark-read?memberName=${encodeURIComponent(memberName)}`, {
    method: 'POST',
  })

export const deleteNotification = (memberName: string, id: string) =>
  apiRequest<void>(`/api/notifications/${encodeURIComponent(id)}?memberName=${encodeURIComponent(memberName)}`, {
    method: 'DELETE',
  })

export const clearAllNotifications = (memberName: string) =>
  apiRequest<void>(`/api/notifications?memberName=${encodeURIComponent(memberName)}`, {
    method: 'DELETE',
  })
