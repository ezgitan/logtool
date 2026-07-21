import { useEffect, useState } from 'react'
import { clearMessageHistory, deleteMessageHistoryEntry, getMessageHistory } from '../api/logsApi'
import { StatusMessage } from './StatusMessage'
import type { AdminMessage } from '../types/log'

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

interface MessageHistoryModalProps {
  onClose: () => void
}

export function MessageHistoryModal({ onClose }: MessageHistoryModalProps) {
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMessageHistory()
      .then(setMessages)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Could not load message history.'),
      )
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(id: string) {
    setMessages((current) => current.filter((message) => message.id !== id))
    deleteMessageHistoryEntry(id).catch((caught: unknown) => console.error('Could not delete message', caught))
  }

  function handleClearAll() {
    setMessages([])
    clearMessageHistory().catch((caught: unknown) => console.error('Could not clear message history', caught))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="panel notify-member-card" onClick={(event) => event.stopPropagation()}>
        <div className="notifications-panel-header">
          <p className="eyebrow">MESSAGE HISTORY</p>
          {messages.length > 0 && (
            <button type="button" className="notifications-clear-all" onClick={handleClearAll}>
              Clear all
            </button>
          )}
        </div>
        <h2>Sent messages</h2>

        {loading && <p className="empty-state">Loading…</p>}
        {error && <StatusMessage tone="error">{error}</StatusMessage>}

        {!loading && !error && messages.length === 0 && <p className="empty-state">No messages sent yet.</p>}

        {!loading && !error && messages.length > 0 && (
          <ul className="notifications-list">
            {messages.map((message) => (
              <li key={message.id} className="notification-item">
                <div className="notification-item-body">
                  <p className="message-history-target">{message.target}</p>
                  <p>{message.message}</p>
                  <span className="notification-time">{timeFormatter.format(new Date(message.sentAt))}</span>
                </div>
                <button
                  type="button"
                  className="notification-delete-button"
                  onClick={() => handleDelete(message.id)}
                  aria-label="Delete message"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="reminder-actions">
          <button type="button" className="button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
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
