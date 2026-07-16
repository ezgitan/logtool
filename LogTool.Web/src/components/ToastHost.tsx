import { useEffect, useState } from 'react'
import { subscribeToast, type ToastEvent } from '../lib/toast'

const AUTO_DISMISS_MS = 8000

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastEvent[]>([])

  useEffect(() => {
    return subscribeToast((toast) => {
      setToasts((current) => [...current, toast])
      setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id))
      }, AUTO_DISMISS_MS)
    })
  }, [])

  function dismiss(id: number) {
    setToasts((current) => current.filter((item) => item.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="toast-host" role="alert" aria-live="assertive">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <span>{toast.message}</span>
          <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
