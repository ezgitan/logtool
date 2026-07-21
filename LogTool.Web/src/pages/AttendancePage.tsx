import { useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { getAttendanceGrid, getLogRange } from '../api/logsApi'
import { LogEditModal } from '../components/LogEditModal'
import { StatusMessage } from '../components/StatusMessage'
import type { AttendanceGrid } from '../types/log'

const now = new Date()

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
const weekdayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'long' })

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'excel_file_locked') {
      return 'The Excel file is open or in use by another process. Close it and try again.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

function parseIsoDate(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatHeaderDate(isoDate: string) {
  const date = parseIsoDate(isoDate)
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

interface EditingCell {
  memberName: string
  date: string
}

export function AttendancePage() {
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [grid, setGrid] = useState<AttendanceGrid | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [editingCell, setEditingCell] = useState<EditingCell | null>(null)
  const [editInitialAttendance, setEditInitialAttendance] = useState<string | null>(null)
  const [editInitialLog, setEditInitialLog] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const isCurrentOrFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)

  const refreshGrid = () =>
    getAttendanceGrid(year, month)
      .then(setGrid)
      .catch((caught: unknown) => {
        setGrid(null)
        setError(getErrorMessage(caught))
      })

  useEffect(() => {
    setLoading(true)
    setError(null)
    setCopied(false)
    refreshGrid().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  function goToPreviousMonth() {
    if (month === 1) {
      setYear((current) => current - 1)
      setMonth(12)
    } else {
      setMonth((current) => current - 1)
    }
  }

  function goToNextMonth() {
    if (isCurrentOrFutureMonth) return
    if (month === 12) {
      setYear((current) => current + 1)
      setMonth(1)
    } else {
      setMonth((current) => current + 1)
    }
  }

  async function copyTable() {
    if (!grid) return

    const memberRows = grid.members.map((member) => [member.memberName, ...member.codes.map((code) => code ?? '')])
    const tsv = memberRows.map((row) => row.join('\t')).join('\r\n')

    try {
      await navigator.clipboard.writeText(tsv)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (caught) {
      console.error('Could not copy attendance table', caught)
      setError('Could not copy to clipboard.')
    }
  }

  function openEditCell(memberName: string, date: string) {
    setEditingCell({ memberName, date })
    setEditInitialAttendance(null)
    setEditInitialLog(null)
    setEditError(null)
    setEditLoading(true)
    getLogRange(memberName, date, date)
      .then((entries) => {
        const entry = entries[0]
        setEditInitialAttendance(entry?.attendance ?? null)
        setEditInitialLog(entry?.log ?? null)
      })
      .catch((caught: unknown) => setEditError(getErrorMessage(caught)))
      .finally(() => setEditLoading(false))
  }

  function closeEditCell() {
    setEditingCell(null)
    setEditError(null)
  }

  function handleEditSaved() {
    closeEditCell()
    void refreshGrid()
  }

  return (
    <>
      <section className="intro">
        <div>
          <h1>Attendance</h1>
        </div>
      </section>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      <section className="panel report-panel">
        <div className="month-nav">
          <button type="button" className="month-nav-button" onClick={goToPreviousMonth} aria-label="Previous month">
            ‹
          </button>
          <h2>{monthFormatter.format(new Date(year, month - 1, 1))}</h2>
          <button
            type="button"
            className="month-nav-button"
            onClick={goToNextMonth}
            disabled={isCurrentOrFutureMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        {loading && <p className="empty-state">Loading attendance…</p>}

        {!loading && !error && grid && (
          <>
            <div className="attendance-actions">
              <button type="button" className="button-success" onClick={copyTable}>
                {copied ? 'Copied!' : 'Copy table for Excel'}
              </button>
            </div>

            <div className="daily-table-wrap">
              <table className="daily-table attendance-table">
                <thead>
                  <tr>
                    <th scope="col"></th>
                    {grid.dates.map((date) => (
                      <th scope="col" key={date}>
                        <div className="attendance-day-name">{weekdayFormatter.format(parseIsoDate(date))}</div>
                        <div className="attendance-day-date">{formatHeaderDate(date)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grid.members.map((member) => (
                    <tr key={member.memberName}>
                      <td className="daily-member">{member.memberName}</td>
                      {member.codes.map((code, index) => (
                        <td className="attendance-cell" key={grid.dates[index]}>
                          <button
                            type="button"
                            className="attendance-cell-button"
                            onClick={() => openEditCell(member.memberName, grid.dates[index])}
                          >
                            {code ?? ''}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="attendance-legend">
              <p className="eyebrow">İzin Kodları</p>
              <ul>
                {grid.legend.map((entry) => (
                  <li key={entry.code}>
                    <strong>{entry.code}:</strong> {entry.label}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>

      {editingCell && editLoading && (
        <div className="modal-overlay" onClick={closeEditCell}>
          <div className="panel notify-member-card" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">EDIT LOG</p>
            <h2>{editingCell.memberName}</h2>
            <p className="login-hint">{formatHeaderDate(editingCell.date)}</p>
            {editError ? <StatusMessage tone="error">{editError}</StatusMessage> : <p className="empty-state">Loading…</p>}
          </div>
        </div>
      )}

      {editingCell && !editLoading && (
        <LogEditModal
          memberName={editingCell.memberName}
          date={editingCell.date}
          dateLabel={formatHeaderDate(editingCell.date)}
          initialAttendance={editInitialAttendance}
          initialLog={editInitialLog}
          asAdmin
          onSaved={handleEditSaved}
          onCancel={closeEditCell}
        />
      )}
    </>
  )
}
