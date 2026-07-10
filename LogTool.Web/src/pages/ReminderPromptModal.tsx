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

export function ReminderPromptModal({
  memberName,
  mode,
  initialHour,
  initialMinute,
  onSaved,
  onCancel,
}: ReminderPromptModalProps) {
  const [time, setTime] = useState(`${pad(initialHour)}:${pad(initialMinute)}`)
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
      onSaved()
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
        <h2>{mode === 'first-run' ? 'Log hatırlatma saati' : 'Bildirim saatini güncelle'}</h2>
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
          <button type="button" className="logout-button" onClick={onCancel} disabled={submitting}>
            {mode === 'first-run' ? 'Şimdi değil' : 'Vazgeç'}
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  )
}
