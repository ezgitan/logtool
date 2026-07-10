import { apiRequest } from './client'
import type { PushSettings, RegisterPushSubscriptionRequest } from '../types/log'

export const getPushPublicKey = () => apiRequest<{ publicKey: string }>('/api/push/public-key')

export const getPushSettings = (memberName: string) =>
  apiRequest<PushSettings>(`/api/push/settings?memberName=${encodeURIComponent(memberName)}`)

export const registerPushSubscription = (payload: RegisterPushSubscriptionRequest) =>
  apiRequest<void>('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
