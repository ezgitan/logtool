import { useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { getMonthlyReport } from '../api/logsApi'
import { StatusMessage } from '../components/StatusMessage'
import type { MonthlyReport } from '../types/log'

const now = new Date()

const monthFormatter = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'excel_file_locked') {
      return 'The Excel file is open or in use by another process. Close it and try again.'
    }
    return error.message
  }
  return 'Something went wrong. Please try again.'
}

export function MonthlyReportPage() {
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [report, setReport] = useState<MonthlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isCurrentOrFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)

  useEffect(() => {
    setLoading(true)
    setError(null)
    getMonthlyReport(year, month)
      .then(setReport)
      .catch((caught: unknown) => {
        setReport(null)
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

  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">MONTHLY REPORT</p>
          <h1>Monthly Report</h1>
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

        {loading && <p className="empty-state">Loading report…</p>}

        {!loading && !error && report && (
          <>
            <div className="daily-table-wrap">
              <table className="daily-table report-table">
                <thead>
                  <tr>
                    <th scope="col">Member</th>
                    <th scope="col">Office Day</th>
                    <th scope="col">Office Hour</th>
                    <th scope="col">Remote Day</th>
                    <th scope="col">Remote Hour</th>
                    <th scope="col">Total Worked Day</th>
                    <th scope="col">Total Worked Hour</th>
                    <th scope="col">Total Leave Day</th>
                    <th scope="col">Not Working Days</th>
                  </tr>
                </thead>
                <tbody>
                  {report.members.map((entry) => (
                    <tr key={entry.memberName}>
                      <td className="daily-member">{entry.memberName}</td>
                      <td className="report-cell">{entry.officeDays}</td>
                      <td className="report-cell">{entry.officeHours}</td>
                      <td className="report-cell">{entry.remoteDays}</td>
                      <td className="report-cell">{entry.remoteHours}</td>
                      <td className="report-cell">{entry.totalWorkedDays}</td>
                      <td className="report-cell">{entry.totalWorkedHours}</td>
                      <td className="report-cell">{entry.totalLeaveDays}</td>
                      <td className="report-cell">{entry.notWorkingDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="report-footer">
              Working days in {monthFormatter.format(new Date(year, month - 1, 1))}: {report.workingDaysInMonth}
            </p>
          </>
        )}
      </section>
    </>
  )
}
