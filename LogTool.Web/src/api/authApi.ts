import { apiRequest } from './client'

export interface WhoAmIResponse {
  identity: string
}

export const getWhoAmI = () => apiRequest<WhoAmIResponse>('/api/auth/whoami')
