import { showErrorToast } from '../lib/toast'
import type { ApiError } from '../types/log'

export class ApiRequestError extends Error {
  readonly status: number
  readonly code?: string

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message)
    this.status = status
    this.code = code
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? 'GET'
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch (error) {
    console.error(`API request failed (network error): ${method} ${path}`, error)
    showErrorToast('Could not reach the server. Check your connection and try again.')
    throw error
  }

  if (!response.ok) {
    let error: ApiError = {}
    try {
      error = (await response.json()) as ApiError
    } catch {
      // The fallback below is intentionally user friendly.
    }

    console.error(`API request failed: ${method} ${path} -> ${response.status}`, error)
    showErrorToast(error.message ?? 'The request could not be completed. Please try again.')

    throw new ApiRequestError(
      error.message ?? 'The request could not be completed. Please try again.',
      response.status,
      error.code,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
