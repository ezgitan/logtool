import { useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { getLogRange, getMonthlyReport } from '../api/logsApi'
import { LogEditModal } from '../components/LogEditModal'
import { StatusMessage } from '../components/StatusMessage'
import type { LogEntry, MonthlyReport } from '../types/log'

const now = new Date()

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })
const remoteDateFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDateFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

const WORKED_ATTENDANCE = new Set(['Office', 'Home Office'])
const LEAVE_ATTENDANCE = new Set(['Leave', 'Bank Holiday'])

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

function formatRemoteDate(isoDate: string) {
  return remoteDateFormatter.format(parseIsoDate(isoDate))
}

function formatShortDate(isoDate: string) {
  return shortDateFormatter.format(parseIsoDate(isoDate))
}

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

function isoDateOf(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}

interface RemoteDaysSelection {
  memberName: string
  dates: string[]
}

interface MonthlyReportPageProps {
  currentMemberName: string | null
}

export function MonthlyReportPage({ currentMemberName }: MonthlyReportPageProps) {
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [remoteDaysSelection, setRemoteDaysSelection] = useState<RemoteDaysSelection | null>(null)

  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [rangeEntries, setRangeEntries] = useState<LogEntry[] | null>(null)
  const [rangeLoading, setRangeLoading] = useState(false)
  const [rangeError, setRangeError] = useState<string | null>(null)
  const [editingEntryDate, setEditingEntryDate] = useState<string | null>(null)

  const isCurrentOrFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setRemoteDaysSelection(null)
    setSelectedMember(null)
    getMonthlyReport(year, month)
      .then(setReport)
      .catch((caught: unknown) => {
        setReport(null)
        setError(getErrorMessage(caught))
      })
      .finally(() => setLoading(false))
  }, [year, month])

  const refreshRange = () => {
    if (!selectedMember || !rangeStart || !rangeEnd) return
    setRangeLoading(true)
    setRangeError(null)
    return getLogRange(selectedMember, rangeStart, rangeEnd)
      .then(setRangeEntries)
      .catch((caught: unknown) => {
        setRangeEntries(null)
        setRangeError(getErrorMessage(caught))
      })
      .finally(() => setRangeLoading(false))
  }

  useEffect(() => {
    if (!selectedMember || !rangeStart || !rangeEnd) return
    let cancelled = false
    setRangeLoading(true)
    setRangeError(null)
    getLogRange(selectedMember, rangeStart, rangeEnd)
      .then((entries) => {
        if (!cancelled) setRangeEntries(entries)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        setRangeEntries(null)
        setRangeError(getErrorMessage(caught))
      })
      .finally(() => {
        if (!cancelled) setRangeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedMember, rangeStart, rangeEnd])

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

  function openMemberRange(memberName: string) {
    setSelectedMember(memberName)
    setRangeStart(isoDateOf(year, month, 1))
    setRangeEnd(isoDateOf(year, month, lastDayOfMonth(year, month)))
    setRangeEntries(null)
    setRangeError(null)
  }

  function closeMemberRange() {
    setSelectedMember(null)
    setRangeEntries(null)
    setRangeError(null)
    setEditingEntryDate(null)
  }

  function handleEntryEditSaved() {
    setEditingEntryDate(null)
    void refreshRange()
  }

  const breakdown: Record<string, number> = {}
  let totalWorkedDays = 0
  let totalLeaveDays = 0
  if (rangeEntries) {
    for (const entry of rangeEntries) {
      if (!entry.attendance) continue
      breakdown[entry.attendance] = (breakdown[entry.attendance] ?? 0) + 1
      if (WORKED_ATTENDANCE.has(entry.attendance)) totalWorkedDays++
      if (LEAVE_ATTENDANCE.has(entry.attendance)) totalLeaveDays++
    }
  }

  return (
    <>
      <section className="intro">
        <div>
          <h1>Monthly Report</h1>
        </div>
        {!loading && !error && report && (
          <p className="working-days-badge">
            Working days in {monthFormatter.format(new Date(year, month - 1, 1))}: {report.workingDaysInMonth}
          </p>
        )}
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

        {loading && <p className="empty-state">Loading report…</p>}

        {!loading && !error && report && (
          <div className="daily-table-wrap">
            <table className="daily-table report-table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Office Day</th>
                  <th scope="col">Remote Day</th>
                  <th scope="col">Total Worked Day</th>
                  <th scope="col">Total Leave Day</th>
                </tr>
              </thead>
              <tbody>
                {report.members.map((entry) => (
                  <tr key={entry.memberName}>
                    <td className="daily-member">
                      <button
                        type="button"
                        className="member-name-toggle"
                        onClick={() => openMemberRange(entry.memberName)}
                      >
                        {entry.memberName}
                      </button>
                    </td>
                    <td className="report-cell">{entry.officeDays}</td>
                    <td className="report-cell">
                      {entry.remoteDays > 0 ? (
                        <button
                          type="button"
                          className="remote-day-toggle"
                          onClick={() =>
                            setRemoteDaysSelection({ memberName: entry.memberName, dates: entry.remoteDates })
                          }
                        >
                          {entry.remoteDays}
                        </button>
                      ) : (
                        entry.remoteDays
                      )}
                    </td>
                    <td className="report-cell">{entry.totalWorkedDays}</td>
                    <td className="report-cell">{entry.totalLeaveDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {remoteDaysSelection && (
        <div className="modal-overlay" onClick={() => setRemoteDaysSelection(null)}>
          <div className="panel remote-dates-card" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">HOME OFFICE DAYS</p>
            <h2>{remoteDaysSelection.memberName}</h2>
            <p className="login-hint">{monthFormatter.format(new Date(year, month - 1, 1))}</p>
            <ul className="remote-dates-list">
              {remoteDaysSelection.dates.map((date) => (
                <li key={date}>{formatRemoteDate(date)}</li>
              ))}
            </ul>
            <div className="reminder-actions">
              <button type="button" onClick={() => setRemoteDaysSelection(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMember && (
        <div className="modal-overlay" onClick={closeMemberRange}>
          <div className="panel member-range-card" onClick={(event) => event.stopPropagation()}>
            <p className="eyebrow">MEMBER LOGS</p>
            <h2>{selectedMember}</h2>

            {rangeError && <StatusMessage tone="error">{rangeError}</StatusMessage>}
            {rangeLoading && <p className="empty-state">Loading…</p>}

            <div className="member-range-layout">
              <div className="member-range-side">
                <div className="range-picker-row">
                  <label>
                    From
                    <input
                      type="date"
                      value={rangeStart}
                      max={rangeEnd || undefined}
                      onChange={(event) => setRangeStart(event.target.value)}
                    />
                  </label>
                  <label>
                    To
                    <input
                      type="date"
                      value={rangeEnd}
                      min={rangeStart || undefined}
                      onChange={(event) => setRangeEnd(event.target.value)}
                    />
                  </label>
                </div>

                {!rangeLoading && !rangeError && rangeEntries && (
                  <>
                    <div className="range-summary">
                      <div className="range-summary-item">
                        <strong>{totalWorkedDays}</strong>
                        <span>Total Worked Days</span>
                      </div>
                      <div className="range-summary-item">
                        <strong>{totalLeaveDays}</strong>
                        <span>Total Leave Days</span>
                      </div>
                    </div>

                    {Object.keys(breakdown).length > 0 && (
                      <table className="attendance-breakdown-table">
                        <thead>
                          <tr>
                            <th scope="col">Attendance Type</th>
                            <th scope="col">Days</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(breakdown).map(([type, count]) => (
                            <tr key={type}>
                              <td>{type}</td>
                              <td>{count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>

              {!rangeLoading && !rangeError && rangeEntries && (
                <ul className="range-log-list">
                  {rangeEntries.length === 0 && <li className="empty-state">No records in this range.</li>}
                  {rangeEntries.map((entry) => (
                    <li
                      key={entry.date}
                      className={selectedMember === currentMemberName ? 'range-log-item range-log-item-editable' : 'range-log-item'}
                    >
                      <div className="range-log-date">{formatShortDate(entry.date)}</div>
                      {entry.attendance ? (
                        <span className={`attendance-badge attendance-${slugify(entry.attendance)}`}>
                          {entry.attendance}
                        </span>
                      ) : (
                        <span className="attendance-badge attendance-missing">Not set</span>
                      )}
                      <div className={entry.log ? 'daily-log' : 'daily-log daily-log-empty'}>
                        {entry.log || 'No log entered'}
                      </div>
                      {selectedMember === currentMemberName && (
                        <button
                          type="button"
                          className="admin-notify-button"
                          onClick={() => setEditingEntryDate(entry.date)}
                        >
                          Edit
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="reminder-actions">
              <button type="button" onClick={closeMemberRange}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editingEntryDate && selectedMember && (
        <LogEditModal
          memberName={selectedMember}
          date={editingEntryDate}
          dateLabel={formatShortDate(editingEntryDate)}
          initialAttendance={rangeEntries?.find((entry) => entry.date === editingEntryDate)?.attendance ?? null}
          initialLog={rangeEntries?.find((entry) => entry.date === editingEntryDate)?.log ?? null}
          onSaved={handleEntryEditSaved}
          onCancel={() => setEditingEntryDate(null)}
        />
      )}
    </>
  )
}
