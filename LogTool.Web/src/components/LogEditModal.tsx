import { useState } from 'react'
import { ApiRequestError } from '../api/client'
import { adminUpdateLog, updateLog } from '../api/logsApi'
import { StatusMessage } from './StatusMessage'

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

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'excel_file_locked') {
      return 'The Excel file is open or in use by another process. Close it and try again.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

interface LogEditModalProps {
  memberName: string
  date: string
  dateLabel: string
  initialAttendance: string | null
  initialLog: string | null
  /** Admin edits bypass the Bank Holiday lock; self-edits go through the normal endpoint. */
  asAdmin?: boolean
  onSaved: () => void
  onCancel: () => void
}

export function LogEditModal({
  memberName,
  date,
  dateLabel,
  initialAttendance,
  initialLog,
  asAdmin,
  onSaved,
  onCancel,
}: LogEditModalProps) {
  const [attendance, setAttendance] = useState(initialAttendance ?? 'Office')
  const [log, setLog] = useState(initialLog ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const save = asAdmin ? adminUpdateLog : updateLog
      await save(memberName, date, { attendance, log })
      onSaved()
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="panel notify-member-card" onClick={(event) => event.stopPropagation()}>
        <p className="eyebrow">EDIT LOG</p>
        <h2>{memberName}</h2>
        <p className="login-hint">{dateLabel}</p>

        {error && <StatusMessage tone="error">{error}</StatusMessage>}

        <form onSubmit={handleSubmit} className="admin-add-form">
          <label>
            Attendance
            <select value={attendance} onChange={(event) => setAttendance(event.target.value)}>
              {attendanceOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Log
            <textarea
              value={log}
              onChange={(event) => setLog(event.target.value)}
              rows={4}
              maxLength={10000}
            />
          </label>
          <div className="reminder-actions">
            <button type="button" className="button-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
