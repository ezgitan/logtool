import { useEffect, useState } from 'react'
import { ApiRequestError } from '../api/client'
import { getDailyLogs } from '../api/logsApi'
import { StatusMessage } from '../components/StatusMessage'
import type { DailyLogEntry } from '../types/log'

const today = new Date().toISOString().slice(0, 10)

const dateFormatter = new Intl.DateTimeFormat('tr-TR', {
  weekday: 'long',
  day: '2-digit',
  month: 'long',
  year: 'numeric',
})

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'excel_file_locked') {
      return 'Excel dosyası açık veya başka bir işlem tarafından kullanılıyor. Dosyayı kapatıp tekrar deneyin.'
    }
    return error.message
  }
  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
}

export function DailyLogsPage() {
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<DailyLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!date) return
    setLoading(true)
    setError(null)
    getDailyLogs(date)
      .then(setEntries)
      .catch((caught: unknown) => {
        setEntries([])
        setError(getErrorMessage(caught))
      })
      .finally(() => setLoading(false))
  }, [date])

  const filled = entries.filter((entry) => entry.attendance || entry.log).length

  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">TEAM OVERVIEW</p>
          <h1>Ekibin günlük durumu.</h1>
          <p>Seçtiğin tarihte kim nerede çalışmış, kim log girmiş tek ekranda gör.</p>
        </div>
        <div className="today-card">
          <span>Bugün</span>
          <strong>{new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long' }).format(new Date())}</strong>
        </div>
      </section>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      <section className="panel daily-panel">
        <div className="panel-heading daily-heading">
          <div>
            <p className="eyebrow">{dateFormatter.format(new Date(`${date}T12:00:00`))}</p>
            <h2>Üye kayıtları</h2>
          </div>
          <div className="daily-heading-actions">
            {!loading && !error && <span className="count-badge">{filled}/{entries.length}</span>}
            <label className="daily-date-picker">
              Tarih
              <input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} />
            </label>
          </div>
        </div>

        {loading && <p className="empty-state">Kayıtlar yükleniyor…</p>}

        {!loading && !error && entries.length === 0 && (
          <p className="empty-state">Bu tarih için aktif üye bulunamadı.</p>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="daily-table-wrap">
            <table className="daily-table" aria-label="Günlük ekip kayıtları">
              <thead>
                <tr>
                  <th scope="col">Üye</th>
                  <th scope="col">Attendance</th>
                  <th scope="col">Log</th>
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
                        <span className="attendance-badge attendance-missing">Belirtilmedi</span>
                      )}
                    </td>
                    <td className={entry.log ? 'daily-log' : 'daily-log daily-log-empty'}>
                      {entry.log || 'Log girilmemiş'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}
