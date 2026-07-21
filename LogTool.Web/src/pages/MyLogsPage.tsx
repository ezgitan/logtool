import { useCallback, useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { getLog, getMissingDays, updateLog } from '../api/logsApi'
import { MissingDaysList } from '../components/MissingDaysList'
import { StatusMessage } from '../components/StatusMessage'
import type { MissingLogDay } from '../types/log'

const attendanceOptions = [
  'Office',
  'Home Office',
  'Leave',
  'School',
  'Mission',
  'Company Activity',
  'Bank Holiday',
  'Report',
]

const autoLogAttendance = new Set(['Leave', 'School', 'Company Activity', 'Bank Holiday', 'Report'])

const today = new Date().toISOString().slice(0, 10)

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'excel_file_locked') {
      return 'The Excel file is open or in use by another process. Close it and try again.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

interface MyLogsPageProps {
  memberName: string
}

export function MyLogsPage({ memberName }: MyLogsPageProps) {
  const [date, setDate] = useState(today)
  const [attendance, setAttendance] = useState('Office')
  const [log, setLog] = useState('')
  const [hasExistingEntry, setHasExistingEntry] = useState(false)
  const [missingDays, setMissingDays] = useState<MissingLogDay[]>([])
  const [loadingMissing, setLoadingMissing] = useState(false)
  const [loadingLog, setLoadingLog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ tone: 'error' | 'success' | 'info'; text: string } | null>(null)

  const refreshMissingDays = useCallback(async () => {
    if (!memberName) return
    setLoadingMissing(true)
    try {
      setMissingDays(await getMissingDays(memberName))
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error) })
    } finally {
      setLoadingMissing(false)
    }
  }, [memberName])

  useEffect(() => {
    void refreshMissingDays()
  }, [refreshMissingDays])

  useEffect(() => {
    if (!memberName || !date) return
    setLoadingLog(true)
    setMessage(null)
    getLog(memberName, date)
      .then((entry) => {
        const loadedAttendance = entry.attendance ?? 'Office'
        setAttendance(loadedAttendance)
        setLog(entry.log ?? (autoLogAttendance.has(loadedAttendance) ? loadedAttendance : ''))
        setHasExistingEntry(Boolean(entry.log))
        if (entry.log) {
          setMessage({ tone: 'info', text: 'You already have an entry for this date - feel free to update it.' })
        } else if (entry.attendance) {
          setMessage({ tone: 'info', text: 'Attendance is set for this date; the log is still missing.' })
        }
      })
      .catch((error: unknown) => {
        setAttendance('Office')
        setLog('')
        setHasExistingEntry(false)
        setMessage({ tone: 'error', text: getErrorMessage(error) })
      })
      .finally(() => setLoadingLog(false))
  }, [date, memberName])

  function handleAttendanceChange(value: string) {
    setAttendance(value)
    if (autoLogAttendance.has(value)) {
      setLog(value)
    } else if (autoLogAttendance.has(attendance)) {
      setLog('')
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!memberName || !date || !log.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      await updateLog(memberName, date, { attendance, log })
      setMessage({ tone: 'success', text: 'Log and attendance saved to the Excel file.' })
      setHasExistingEntry(true)
      await refreshMissingDays()
    } catch (error) {
      setMessage({ tone: 'error', text: getErrorMessage(error) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <section className="intro">
        <div>
          <h1>Daily Log</h1>
        </div>
        <div className="today-card">
          <span>Today</span>
          <strong>{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long' }).format(new Date())}</strong>
        </div>
      </section>

      {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}

      <div className="workspace-grid">
        <aside className="panel side-panel">
          <div className="panel-heading">
            <div>
              <h2>Missing days</h2>
            </div>
            <span className="count-badge">{missingDays.length}</span>
          </div>

          <MissingDaysList
            days={missingDays}
            selectedDate={date}
            onSelect={setDate}
            loading={loadingMissing}
          />
        </aside>

        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <h2>Work log</h2>
            </div>
            {loadingLog && <span className="loading-dot">Loading</span>}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label>
                Date
                <input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} required />
              </label>
              <label>
                Attendance
                <select value={attendance} onChange={(event) => handleAttendanceChange(event.target.value)}>
                  {attendanceOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>

            <label className="log-field">
              What did you work on today?
              <textarea
                value={log}
                onChange={(event) => setLog(event.target.value)}
                maxLength={10000}
                placeholder="Describe the tasks, research, and key outcomes for today…"
                disabled={autoLogAttendance.has(attendance)}
                required
              />
              <span className="character-count">{log.length.toLocaleString('en-GB')} / 10,000</span>
            </label>

            <div className="form-footer">
              <p>{hasExistingEntry ? 'You can update this entry any time.' : 'You can update this entry any time after saving.'}</p>
              <button type="submit" disabled={saving || loadingLog || !log.trim()}>
                {saving ? 'Saving…' : hasExistingEntry ? 'Update entry' : 'Save entry'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  )
}
