import { useEffect, useRef, useState } from 'react'
import { getNotifications, markNotificationsRead } from '../api/pushApi'
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
    if (next && unreadCount > 0) {
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
      markNotificationsRead(memberName).catch((error: unknown) =>
        console.error('Could not mark notifications as read', error),
      )
    }
  }

  return (
    <div className="notifications-bell" ref={containerRef}>
      <button type="button" className="bell-button" onClick={toggleOpen} aria-label="Notifications">
        <BellIcon />
        {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notifications-panel">
          <p className="notifications-panel-title">Notifications</p>

          {notifications.length === 0 && <p className="empty-state">No notifications yet.</p>}

          {notifications.length > 0 && (
            <ul className="notifications-list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={notification.read ? 'notification-item' : 'notification-item notification-unread'}
                >
                  <p>{notification.message}</p>
                  <span className="notification-time">{timeFormatter.format(new Date(notification.sentAt))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
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
