import { useState } from 'react'
import { clearSession, loadSession, saveSession, type Session } from './lib/session'
import { DailyLogsPage } from './pages/DailyLogsPage'
import { LoginPage } from './pages/LoginPage'
import { MonthlyReportPage } from './pages/MonthlyReportPage'
import { MyLogsPage } from './pages/MyLogsPage'
import { ReminderPromptModal } from './pages/ReminderPromptModal'
import './App.css'

type Page = 'my-logs' | 'daily-logs' | 'monthly-report'

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession())
  const [page, setPage] = useState<Page>('my-logs')

  function handleLogin(newSession: Session) {
    saveSession(newSession)
    setSession(newSession)
  }

  function handleLogout() {
    clearSession()
    setSession(null)
    setPage('my-logs')
  }

  function handleReminderDone() {
    setSession((current) => {
      if (!current) return current
      const updated = { ...current, reminderConfigured: true }
      saveSession(updated)
      return updated
    })
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

      {!session.reminderConfigured && (
        <ReminderPromptModal memberName={session.memberName} onDone={handleReminderDone} />
      )}
    </div>
  )
}

export default App
