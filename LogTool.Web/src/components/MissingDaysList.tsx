import type { MissingLogDay } from '../types/log'

interface MissingDaysListProps {
  days: MissingLogDay[]
  selectedDate: string
  onSelect: (date: string) => void
  loading: boolean
}

const formatter = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

export function MissingDaysList({ days, selectedDate, onSelect, loading }: MissingDaysListProps) {
  if (loading) {
    return <p className="empty-state">Eksik günler kontrol ediliyor…</p>
  }

  if (days.length === 0) {
    return <p className="empty-state success-empty">Bu ay tamamlandı. Eksik kayıt görünmüyor.</p>
  }

  return (
    <div className="missing-days" aria-label="Eksik log günleri">
      {days.map((day) => (
        <button
          type="button"
          className={selectedDate === day.date ? 'day-chip selected' : 'day-chip'}
          key={day.date}
          onClick={() => onSelect(day.date)}
        >
          <span>{formatter.format(new Date(`${day.date}T12:00:00`))}</span>
          <small>{day.attendance ?? 'Attendance eksik'}</small>
        </button>
      ))}
    </div>
  )
}
