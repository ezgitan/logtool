export interface ToastEvent {
  id: number
  message: string
}

type ToastListener = (toast: ToastEvent) => void

const listeners = new Set<ToastListener>()
let nextId = 1

/** Shows a short-lived error popup to the user. Callable from anywhere, including outside React (e.g. api/client.ts). */
export function showErrorToast(message: string): void {
  const toast: ToastEvent = { id: nextId++, message }
  listeners.forEach((listener) => listener(toast))
}

export function subscribeToast(listener: ToastListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
