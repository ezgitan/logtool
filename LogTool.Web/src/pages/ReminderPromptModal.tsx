import { useState } from 'react'
import { setupReminderPush } from '../lib/push'

interface ReminderPromptModalProps {
  memberName: string
  mode: 'first-run' | 'settings'
  initialHour: number
  initialMinute: number
  onSaved: () => void
  onCancel: () => void
}

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

const hours = Array.from({ length: 24 }, (_, value) => value)
const minutes = Array.from({ length: 60 }, (_, value) => value)

export function ReminderPromptModal({
  memberName,
  mode,
  initialHour,
  initialMinute,
  onSaved,
  onCancel,
}: ReminderPromptModalProps) {
  const [hour, setHour] = useState(initialHour)
  const [minute, setMinute] = useState(initialMinute)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await setupReminderPush(memberName, hour, minute)
      onSaved()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not set up notifications.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <form className="panel reminder-card" onSubmit={handleSubmit}>
        <p className="eyebrow">REMINDER</p>
        <h2>{mode === 'first-run' ? 'Reminder time' : 'Update reminder time'}</h2>
        <p className="login-hint">
          We&rsquo;ll send a browser notification at this time if today&rsquo;s log is still missing.
        </p>

        {error && (
          <p className="status-message status-error" role="alert">
            <span aria-hidden="true">!</span>
            {error}
          </p>
        )}

        <label>
          Time
          <div className="time-select-row">
            <select value={hour} onChange={(event) => setHour(Number(event.target.value))} aria-label="Hour">
              {hours.map((value) => (
                <option key={value} value={value}>
                  {pad(value)}
                </option>
              ))}
            </select>
            <span className="time-select-separator">:</span>
            <select value={minute} onChange={(event) => setMinute(Number(event.target.value))} aria-label="Minute">
              {minutes.map((value) => (
                <option key={value} value={value}>
                  {pad(value)}
                </option>
              ))}
            </select>
          </div>
        </label>

        <div className="reminder-actions">
          <button type="button" className="logout-button" onClick={onCancel} disabled={submitting}>
            {mode === 'first-run' ? 'Not now' : 'Cancel'}
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
