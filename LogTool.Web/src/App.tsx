import { useEffect, useState } from 'react'
import { getPushSettings } from './api/pushApi'
import { LogoMark } from './components/LogoMark'
import { hasDismissedReminderPrompt, markReminderPromptDismissed } from './lib/reminderPrompt'
import { getStoredIdentity, IDENTITY_STORAGE_KEY, resolveSession } from './lib/identity'
import type { Session } from './lib/session'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { AuthGate } from './pages/AuthGate'
import { DailyLogsPage } from './pages/DailyLogsPage'
import { MonthlyReportPage } from './pages/MonthlyReportPage'
import { MyLogsPage } from './pages/MyLogsPage'
import { ReminderPromptModal } from './pages/ReminderPromptModal'
import './App.css'

type Page = 'my-logs' | 'daily-logs' | 'monthly-report' | 'admin-users'

interface ReminderModalState {
  mode: 'first-run' | 'settings'
  hour: number
  minute: number
}

function defaultPageFor(session: Session): Page {
  return session.role === 'admin' ? 'admin-users' : 'my-logs'
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [setupOutdated, setSetupOutdated] = useState(false)
  const [setupVersion, setSetupVersion] = useState<string | null>(null)
  const [page, setPage] = useState<Page>('my-logs')
  const [reminderModal, setReminderModal] = useState<ReminderModalState | null>(null)

  useEffect(() => {
    let cancelled = false

    function trySignIn() {
      getStoredIdentity()
        .then(({ identity: stored, outdated, serverVersion }) => {
          if (cancelled) return
          if (serverVersion) setSetupVersion(serverVersion)
          if (outdated) {
            setSetupOutdated(true)
            setAuthLoading(false)
            return
          }
          if (!stored) {
            setAuthLoading(false)
            return
          }

          resolveSession(stored)
            .then((resolved) => {
              if (cancelled) return
              setSetupOutdated(false)
              setSession(resolved)
              setPage(defaultPageFor(resolved))
            })
            .catch((error: unknown) => {
              if (cancelled) return
              setAuthError(error instanceof Error ? error.message : 'Could not verify your identity.')
            })
            .finally(() => {
              if (!cancelled) setAuthLoading(false)
            })
        })
        .catch(() => {
          if (!cancelled) setAuthLoading(false)
        })
    }

    trySignIn()

    // The setup script opens a separate tab to deliver the identity. Once
    // that tab stores it, pick it up here via the storage event instead of
    // making the user open yet another tab for the page they started on.
    function handleStorageChange(event: StorageEvent) {
      if (event.key === IDENTITY_STORAGE_KEY) trySignIn()
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      cancelled = true
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    if (!session || session.role !== 'member') return
    const memberName = session.memberName
    let cancelled = false

    getPushSettings(memberName)
      .then((settings) => {
        if (cancelled) return
        if (settings.reminderHour !== null && settings.reminderMinute !== null) {
          return
        }
        if (hasDismissedReminderPrompt(memberName)) {
          return
        }
        setReminderModal({ mode: 'first-run', hour: 17, minute: 0 })
      })
      .catch(() => {
        // ignore silently: notification settings are optional
      })

    return () => {
      cancelled = true
    }
  }, [session])

  async function openReminderSettings() {
    if (!session || session.role !== 'member') return
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
    if (reminderModal?.mode === 'first-run' && session?.role === 'member') {
      markReminderPromptDismissed(session.memberName)
    }
    setReminderModal(null)
  }

  if (authLoading || !session) {
    return <AuthGate loading={authLoading} error={authError} outdated={setupOutdated} version={setupVersion} />
  }

  const isAdmin = session.role === 'admin'
  const badgeLabel = session.role === 'member' ? session.memberName : 'Admin'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main" aria-label="LogTool home">
          <span className="brand-mark"><LogoMark /></span>
          <span>LogTool</span>
        </a>
        <nav aria-label="Main navigation">
          {!isAdmin && (
            <button
              type="button"
              className={page === 'my-logs' ? 'nav-link active' : 'nav-link'}
              onClick={() => setPage('my-logs')}
            >
              My Logs
            </button>
          )}
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
          {isAdmin && (
            <button
              type="button"
              className={page === 'admin-users' ? 'nav-link active' : 'nav-link'}
              onClick={() => setPage('admin-users')}
            >
              Users
            </button>
          )}
        </nav>
        <div className="session-actions">
          <span className="user-badge" title={session.email}>
            {badgeLabel}
          </span>
          {!isAdmin && (
            <button type="button" className="logout-button" onClick={openReminderSettings}>
              Reminder time
            </button>
          )}
        </div>
      </header>

      <main id="main">
        {page === 'my-logs' && session.role === 'member' && <MyLogsPage memberName={session.memberName} />}
        {page === 'daily-logs' && <DailyLogsPage />}
        {page === 'monthly-report' && <MonthlyReportPage />}
        {page === 'admin-users' && isAdmin && <AdminUsersPage />}
      </main>

      {reminderModal && session.role === 'member' && (
        <ReminderPromptModal
          memberName={session.memberName}
          mode={reminderModal.mode}
          initialHour={reminderModal.hour}
          initialMinute={reminderModal.minute}
          onSaved={handleReminderSaved}
          onCancel={handleReminderCancelled}
        />
      )}

      {setupVersion && <div className="version-badge">Setup v{setupVersion}</div>}
    </div>
  )
}

export default App
