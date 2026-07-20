import { useEffect, useRef, useState } from 'react'
import { clearAllNotifications, deleteNotification, getNotifications, markNotificationsRead } from '../api/pushApi'
import type { AppNotification } from '../types/log'

const POLL_INTERVAL_MS = 60_000

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

interface NotificationsBellProps {
  memberName: string
}

export function NotificationsBell({ memberName }: NotificationsBellProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((notification) => !notification.read).length

  useEffect(() => {
    let cancelled = false

    function load() {
      getNotifications(memberName)
        .then((result) => {
          if (!cancelled) setNotifications(result)
        })
        .catch((error: unknown) => console.error('Could not load notifications', error))
    }

    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [memberName])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      getNotifications(memberName)
        .then(setNotifications)
        .catch((error: unknown) => console.error('Could not load notifications', error))
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [memberName])

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (!next) return

    // Always fetch fresh on open instead of trusting whatever the last poll
    // happened to have - the poll interval is long enough that a message
    // sent right before opening the panel could otherwise look missing.
    getNotifications(memberName)
      .then((result) => {
        setNotifications(result)
        if (result.some((notification) => !notification.read)) {
          setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
          markNotificationsRead(memberName).catch((error: unknown) =>
            console.error('Could not mark notifications as read', error),
          )
        }
      })
      .catch((error: unknown) => console.error('Could not load notifications', error))
  }

  function handleDelete(id: string) {
    setNotifications((current) => current.filter((notification) => notification.id !== id))
    deleteNotification(memberName, id).catch((error: unknown) =>
      console.error('Could not delete notification', error),
    )
  }

  function handleClearAll() {
    setNotifications([])
    clearAllNotifications(memberName).catch((error: unknown) =>
      console.error('Could not clear notifications', error),
    )
  }

  return (
    <div className="notifications-bell" ref={containerRef}>
      <button type="button" className="bell-button" onClick={toggleOpen} aria-label="Notifications">
        <BellIcon />
        {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notifications-panel">
          <div className="notifications-panel-header">
            <p className="notifications-panel-title">Notifications</p>
            {notifications.length > 0 && (
              <button type="button" className="notifications-clear-all" onClick={handleClearAll}>
                Clear all
              </button>
            )}
          </div>

          {notifications.length === 0 && <p className="empty-state">No notifications yet.</p>}

          {notifications.length > 0 && (
            <ul className="notifications-list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.read ? 'notification-item' : 'notification-item notification-unread'}
                >
                  <div className="notification-item-body">
                    <p>{notification.message}</p>
                    <span className="notification-time">{timeFormatter.format(new Date(notification.sentAt))}</span>
                  </div>
                  <button
                    type="button"
                    className="notification-delete-button"
                    onClick={() => handleDelete(notification.id)}
                    aria-label="Delete notification"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
