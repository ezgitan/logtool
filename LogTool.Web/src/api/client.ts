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
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!response.ok) {
    let error: ApiError = {}
    try {
      error = (await response.json()) as ApiError
    } catch {
      // The fallback below is intentionally user friendly.
    }

    throw new ApiRequestError(
      error.message ?? 'İstek tamamlanamadı. Lütfen tekrar deneyin.',
      response.status,
      error.code,
    )
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
