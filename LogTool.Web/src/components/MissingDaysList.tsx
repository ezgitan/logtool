import type { MissingLogDay } from '../types/log'

interface MissingDaysListProps {
  days: MissingLogDay[]
  selectedDate: string
  onSelect: (date: string) => void
  loading: boolean
}

const formatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
})

export function MissingDaysList({ days, selectedDate, onSelect, loading }: MissingDaysListProps) {
  if (loading) {
    return <p className="empty-state">Checking for missing days…</p>
  }

  if (days.length === 0) {
    return <p className="empty-state success-empty">This month is complete. No missing entries.</p>
  }

  return (
    <div className="missing-days" aria-label="Missing log days">
      {days.map((day) => (
        <button
          type="button"
          className={selectedDate === day.date ? 'day-chip selected' : 'day-chip'}
          key={day.date}
          onClick={() => onSelect(day.date)}
        >
          <span>{formatter.format(new Date(`${day.date}T12:00:00`))}</span>
          <small>{day.attendance ?? 'Attendance missing'}</small>
        </button>
      ))}
    </div>
  )
}
