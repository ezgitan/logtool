import { useState } from 'react'
import { setupReminderPush } from '../lib/push'

interface ReminderPromptModalProps {
  memberName: string
  onDone: () => void
}

export function ReminderPromptModal({ memberName, onDone }: ReminderPromptModalProps) {
  const [time, setTime] = useState('17:00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const [hourText, minuteText] = time.split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText)

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      setError('Geçerli bir saat seç.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await setupReminderPush(memberName, hour, minute)
      onDone()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Bildirim kurulamadı.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay">
      <form className="panel reminder-card" onSubmit={handleSubmit}>
        <p className="eyebrow">HATIRLATMA</p>
        <h2>Log hatırlatma saati</h2>
        <p className="login-hint">
          Gün içinde log girmeyi unutmaman için seçtiğin saatte tarayıcı bildirimi gönderelim.
        </p>

        {error && (
          <p className="status-message status-error" role="alert">
            <span aria-hidden="true">!</span>
            {error}
          </p>
        )}

        <label>
          Saat
          <input type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
        </label>

        <div className="reminder-actions">
          <button type="button" className="logout-button" onClick={onDone} disabled={submitting}>
            Şimdi değil
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Kuruluyor…' : 'Bildirimi kur'}
          </button>
        </div>
      </form>
    </div>
  )
}
