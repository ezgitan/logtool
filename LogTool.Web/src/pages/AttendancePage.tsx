import { useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { getAttendanceGrid } from '../api/logsApi'
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

function tsvCell(value: string) {
  return /[\t\n"]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

export function AttendancePage() {
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [grid, setGrid] = useState<AttendanceGrid | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const isCurrentOrFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setCopied(false)
    getAttendanceGrid(year, month)
      .then(setGrid)
      .catch((caught: unknown) => {
        setGrid(null)
        setError(getErrorMessage(caught))
      })
      .finally(() => setLoading(false))
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

    const headerRow = [
      '',
      ...grid.dates.map((date) =>
        tsvCell(`${weekdayFormatter.format(parseIsoDate(date))}\n${formatHeaderDate(date)}`),
      ),
    ]
    const memberRows = grid.members.map((member) => [
      tsvCell(member.memberName),
      ...member.codes.map((code) => code ?? ''),
    ])
    const legendRows = [[''], ['İzin Kodları'], ...grid.legend.map((entry) => [`${entry.code}: ${entry.label}`])]
    const tsv = [headerRow, ...memberRows, ...legendRows].map((row) => row.join('\t')).join('\r\n')

    try {
      await navigator.clipboard.writeText(tsv)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (caught) {
      console.error('Could not copy attendance table', caught)
      setError('Could not copy to clipboard.')
    }
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
              <button type="button" onClick={copyTable}>
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
                          {code ?? ''}
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
    </>
  )
}
