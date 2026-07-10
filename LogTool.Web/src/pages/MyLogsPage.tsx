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

const today = new Date().toISOString().slice(0, 10)

function getErrorMessage(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'excel_file_locked') {
      return 'Excel dosyası açık veya başka bir işlem tarafından kullanılıyor. Dosyayı kapatıp tekrar deneyin.'
    }
    return error.message
  }
  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
}

interface MyLogsPageProps {
  memberName: string
}

export function MyLogsPage({ memberName }: MyLogsPageProps) {
  const [date, setDate] = useState(today)
  const [attendance, setAttendance] = useState('Office')
  const [log, setLog] = useState('')
  const [locked, setLocked] = useState(false)
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
        setAttendance(entry.attendance ?? 'Office')
        setLog(entry.log ?? '')
        setLocked(Boolean(entry.log))
        if (entry.log) {
          setMessage({ tone: 'info', text: 'Bu tarih için log zaten girildi, düzenlenemez.' })
        } else if (entry.attendance) {
          setMessage({ tone: 'info', text: 'Bu tarih için attendance mevcut, log bekleniyor.' })
        }
      })
      .catch((error: unknown) => {
        setAttendance('Office')
        setLog('')
        setLocked(false)
        setMessage({ tone: 'error', text: getErrorMessage(error) })
      })
      .finally(() => setLoadingLog(false))
  }, [date, memberName])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!memberName || !date || !log.trim() || locked) return
    setSaving(true)
    setMessage(null)
    try {
      await updateLog(memberName, date, { attendance, log })
      setMessage({ tone: 'success', text: 'Log ve attendance Excel dosyasına kaydedildi.' })
      setLocked(true)
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
          <p className="eyebrow">DAILY WORK LOG</p>
          <h1>Günün kaydını tamamla.</h1>
          <p>Eksik günlerini gör, attendance durumunu seç ve çalışmanı güvenle Excel’e kaydet.</p>
        </div>
        <div className="today-card">
          <span>Bugün</span>
          <strong>{new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long' }).format(new Date())}</strong>
        </div>
      </section>

      {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}

      <div className="workspace-grid">
        <aside className="panel side-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">PLAN</p>
              <h2>Eksik günler</h2>
            </div>
            <span className="count-badge">{missingDays.length}</span>
          </div>

          <div className="session-member">
            <span className="eyebrow">KULLANICI</span>
            <strong>{memberName}</strong>
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
              <p className="eyebrow">LOG ENTRY</p>
              <h2>Çalışma kaydı</h2>
            </div>
            {loadingLog && <span className="loading-dot">Yükleniyor</span>}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label>
                Tarih
                <input type="date" value={date} max={today} onChange={(event) => setDate(event.target.value)} required />
              </label>
              <label>
                Attendance
                <select
                  value={attendance}
                  onChange={(event) => setAttendance(event.target.value)}
                  disabled={locked}
                >
                  {attendanceOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
            </div>

            <label className="log-field">
              Bugün ne yaptın?
              <textarea
                value={log}
                onChange={(event) => setLog(event.target.value)}
                maxLength={10000}
                placeholder="Tamamladığın işleri, araştırmaları ve önemli çıktıları yaz…"
                disabled={locked}
                required
              />
              <span className="character-count">{log.length.toLocaleString('tr-TR')} / 10.000</span>
            </label>

            <div className="form-footer">
              <p>{locked ? 'Bu kayıt girildikten sonra değiştirilemez.' : 'Kaydettikten sonra bu tarih düzenlenemez.'}</p>
              <button type="submit" disabled={saving || loadingLog || locked || !log.trim()}>
                {locked ? 'Kaydedildi' : saving ? 'Kaydediliyor…' : 'Kaydı tamamla'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </>
  )
}
