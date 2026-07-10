import { apiRequest } from './client'
import type { RegisterPushSubscriptionRequest } from '../types/log'

export const getPushPublicKey = () => apiRequest<{ publicKey: string }>('/api/push/public-key')

export const registerPushSubscription = (payload: RegisterPushSubscriptionRequest) =>
  apiRequest<void>('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
