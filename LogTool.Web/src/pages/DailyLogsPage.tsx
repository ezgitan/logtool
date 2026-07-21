import { useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { getDailyLogs } from '../api/logsApi'
import { LogEditModal } from '../components/LogEditModal'
import { StatusMessage } from '../components/StatusMessage'
import type { DailyLogEntry } from '../types/log'

const today = new Date().toISOString().slice(0, 10)
const SELECTED_DATE_STORAGE_KEY = 'logtool.dailyLogsDate'

function getInitialDate() {
  const stored = localStorage.getItem(SELECTED_DATE_STORAGE_KEY)
  return stored && stored <= today ? stored : today
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

const weekdayShortFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short' })
const dayNumberFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit' })

function parseIsoDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** Last 6 work days before today (weekends skipped), oldest first, so they sit to the left of the "Today" box. */
function getPastWeekDates() {
  const base = parseIsoDate(today)
  const dates: string[] = []
  const cursor = new Date(base)

  while (dates.length < 6) {
    cursor.setDate(cursor.getDate() - 1)
    if (cursor.getDay() === 0 || cursor.getDay() === 6) continue
    dates.push(cursor.toISOString().slice(0, 10))
  }

  return dates.reverse()
}

const pastWeekDates = getPastWeekDates()

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'excel_file_locked') {
      return 'The Excel file is open or in use by another process. Close it and try again.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

interface DailyLogsPageProps {
  currentMemberName: string | null
}

export function DailyLogsPage({ currentMemberName }: DailyLogsPageProps) {
  const [date, setDate] = useState(getInitialDate)
  const [entries, setEntries] = useState<DailyLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingOwnEntry, setEditingOwnEntry] = useState(false)

  const refreshEntries = () =>
    getDailyLogs(date)
      .then(setEntries)
      .catch((caught: unknown) => {
        setEntries([])
        setError(getErrorMessage(caught))
      })

  useEffect(() => {
    if (!date) return
    localStorage.setItem(SELECTED_DATE_STORAGE_KEY, date)
    setLoading(true)
    setError(null)
    refreshEntries().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const ownEntry = currentMemberName ? entries.find((entry) => entry.memberName === currentMemberName) : undefined

  function handleEditSaved() {
    setEditingOwnEntry(false)
    void refreshEntries()
  }

  return (
    <>
      <section className="intro">
        <div>
          <h1>Daily Logs</h1>
        </div>
        <div className="quick-date-row">
          {pastWeekDates.map((iso) => (
            <button
              key={iso}
              type="button"
              className={date === iso ? 'quick-date-chip selected' : 'quick-date-chip'}
              onClick={() => setDate(iso)}
            >
              <span>{weekdayShortFormatter.format(parseIsoDate(iso))}</span>
              <strong>{dayNumberFormatter.format(parseIsoDate(iso))}</strong>
            </button>
          ))}
          <button
            type="button"
            className={date === today ? 'today-card today-card-button selected' : 'today-card today-card-button'}
            onClick={() => setDate(today)}
          >
            <span>Today</span>
            <strong>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long' }).format(new Date())}</strong>
          </button>
        </div>
      </section>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      <section className="panel daily-panel">
        <div className="panel-heading daily-heading">
          <div>
            <h2>{dateFormatter.format(new Date(`${date}T12:00:00`))}</h2>
          </div>
          <div className="daily-heading-actions">
            <label className="daily-date-picker">
              Date
              <input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
        </div>

        {loading && <p className="empty-state">Loading records…</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="empty-state">No active users found for this date.</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="daily-table-wrap">
            <table className="daily-table" aria-label="Daily team records">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Attendance</th>
                  <th scope="col">Log</th>
                  {currentMemberName && <th scope="col"></th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.memberName}>
                    <td className="daily-member">{entry.memberName}</td>
                    <td>
                      {entry.attendance ? (
                        <span className={`attendance-badge attendance-${slugify(entry.attendance)}`}>
                          {entry.attendance}
                        </span>
                      ) : (
                        <span className="attendance-badge attendance-missing">Not set</span>
                      )}
                    </td>
                    <td className={entry.log ? 'daily-log' : 'daily-log daily-log-empty'}>
                      {entry.log || 'No log entered'}
                    </td>
                    {currentMemberName && (
                      <td>
                        {entry.memberName === currentMemberName && (
                          <button
                            type="button"
                            className="admin-notify-button"
                            onClick={() => setEditingOwnEntry(true)}
                          >
                            Edit
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingOwnEntry && currentMemberName && (
        <LogEditModal
          memberName={currentMemberName}
          date={date}
          dateLabel={dateFormatter.format(new Date(`${date}T12:00:00`))}
          initialAttendance={ownEntry?.attendance ?? null}
          initialLog={ownEntry?.log ?? null}
          onSaved={handleEditSaved}
          onCancel={() => setEditingOwnEntry(false)}
        />
      )}
    </>
  )
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}
