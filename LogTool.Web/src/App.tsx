import { useEffect, useState } from 'react'
import { getPushSettings } from './api/pushApi'
import { clearSession, loadSession, saveSession, type Session } from './lib/session'
import { hasDismissedReminderPrompt, markReminderPromptDismissed } from './lib/reminderPrompt'
import { DailyLogsPage } from './pages/DailyLogsPage'
import { LoginPage } from './pages/LoginPage'
import { MonthlyReportPage } from './pages/MonthlyReportPage'
import { MyLogsPage } from './pages/MyLogsPage'
import { ReminderPromptModal } from './pages/ReminderPromptModal'
import './App.css'

type Page = 'my-logs' | 'daily-logs' | 'monthly-report'

interface ReminderModalState {
  mode: 'first-run' | 'settings'
  hour: number
  minute: number
}

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [page, setPage] = useState<Page>('my-logs')
  const [reminderModal, setReminderModal] = useState<ReminderModalState | null>(null)

  useEffect(() => {
    if (!session) return
    let cancelled = false

    getPushSettings(session.memberName)
      .then((settings) => {
        if (cancelled) return
        if (settings.reminderHour !== null && settings.reminderMinute !== null) {
          return
        }
        if (hasDismissedReminderPrompt(session.memberName)) {
          return
        }
        setReminderModal({ mode: 'first-run', hour: 17, minute: 0 })
      })
      .catch(() => {
        // sessiz geç: bildirim ayarları opsiyonel bir özellik
      })

    return () => {
      cancelled = true
    }
  }, [session])

  function handleLogin(newSession: Session) {
    saveSession(newSession)
    setSession(newSession)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    setPage('my-logs')
  }

  async function openReminderSettings() {
    if (!session) return
    try {
      const current = await getPushSettings(session.memberName)
      setReminderModal({
        mode: 'settings',
        hour: current.reminderHour ?? 17,
        minute: current.reminderMinute ?? 0,
      })
    } catch {
      setReminderModal({ mode: 'settings', hour: 17, minute: 0 })
    }
  }

  function handleReminderSaved() {
    setReminderModal(null)
  }

  function handleReminderCancelled() {
    if (reminderModal?.mode === 'first-run' && session) {
      markReminderPromptDismissed(session.memberName)
    }
    setReminderModal(null)
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="LogTool ana sayfa">
          <span className="brand-mark">L</span>
          <span>LogTool</span>
        </a>
        <nav aria-label="Ana navigasyon">
          <button
            type="button"
            className={page === 'my-logs' ? 'nav-link active' : 'nav-link'}
            onClick={() => setPage('my-logs')}
          >
            My Logs
          </button>
          <button
            type="button"
            className={page === 'daily-logs' ? 'nav-link active' : 'nav-link'}
            onClick={() => setPage('daily-logs')}
          >
            Daily Logs
          </button>
          <button
            type="button"
            className={page === 'monthly-report' ? 'nav-link active' : 'nav-link'}
            onClick={() => setPage('monthly-report')}
          >
            Monthly Report
          </button>
        </nav>
        <div className="session-actions">
          <span className="user-badge" title={session.email}>
            {session.memberName.slice(0, 2).toUpperCase()}
          </span>
          <button type="button" className="logout-button" onClick={openReminderSettings}>
            Bildirim saati
          </button>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Çıkış yap
          </button>
        </div>
      </header>

      <main id="main">
        {page === 'my-logs' && <MyLogsPage memberName={session.memberName} />}
        {page === 'daily-logs' && <DailyLogsPage />}
        {page === 'monthly-report' && <MonthlyReportPage />}
      </main>

      {reminderModal && (
        <ReminderPromptModal
          memberName={session.memberName}
          mode={reminderModal.mode}
          initialHour={reminderModal.hour}
          initialMinute={reminderModal.minute}
          onSaved={handleReminderSaved}
          onCancel={handleReminderCancelled}
        />
      )}
    </div>
  )
}

export default App
