import { useEffect, useState } from 'react'
import { getPushSettings } from './api/pushApi'
import { LogoMark } from './components/LogoMark'
import { getNotificationPermission } from './lib/push'
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
  const [justUpgraded, setJustUpgraded] = useState(false)
  const [page, setPage] = useState<Page>('my-logs')
  const [reminderModal, setReminderModal] = useState<ReminderModalState | null>(null)
  const [hasConfiguredReminder, setHasConfiguredReminder] = useState(false)
  const [notificationsBlocked, setNotificationsBlocked] = useState(false)
  const [closingDeliveryTab, setClosingDeliveryTab] = useState(false)
  const [showContinueFallback, setShowContinueFallback] = useState(false)
  const [pendingSession, setPendingSession] = useState<Session | null>(null)

  useEffect(() => {
    let cancelled = false

    function trySignIn() {
      getStoredIdentity()
        .then(({ identity: stored, outdated, serverVersion, justCompletedNewVersion, deliveredViaUrl }) => {
          if (cancelled) return
          if (serverVersion) setSetupVersion(serverVersion)
          if (justCompletedNewVersion) setJustUpgraded(true)
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

              // This tab is the one setup.vbs opened just to deliver the
              // identity - the "download setup" tab picks it up and updates
              // itself via the storage event below, so this one tries to
              // close itself instead of showing a redundant second copy of
              // the app. Browsers only allow closing script-opened tabs, so
              // this is best-effort: if it's blocked, the fallback screen
              // below just tells the person they can close it themselves.
              if (deliveredViaUrl) {
                setClosingDeliveryTab(true)
                setPendingSession(resolved)
                setTimeout(() => window.close(), 400)
                // If we're still here after a moment, closing was blocked
                // (e.g. no other tab opened this one) - offer a way forward
                // instead of leaving the person stuck on a dead-end screen.
                setTimeout(() => setShowContinueFallback(true), 1500)
                return
              }

              setSession(resolved)
              setPage(defaultPageFor(resolved))
            })
            .catch((error: unknown) => {
              if (cancelled) return
              console.error('Could not resolve session for stored identity', error)
              setAuthError(error instanceof Error ? error.message : 'Could not verify your identity.')
            })
            .finally(() => {
              if (!cancelled) setAuthLoading(false)
            })
        })
        .catch((error: unknown) => {
          console.error('Could not determine stored identity', error)
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
        setHasConfiguredReminder(settings.reminderHour !== null && settings.reminderMinute !== null)

        // A fresh setup.vbs run may mean the push subscription it depends on
        // went stale across the update - re-prompt even if a time was
        // already configured, so notifications get re-registered.
        if (justUpgraded) {
          setReminderModal({
            mode: 'first-run',
            hour: settings.reminderHour ?? 17,
            minute: settings.reminderMinute ?? 0,
          })
          setJustUpgraded(false)
          return
        }

        if (settings.reminderHour !== null && settings.reminderMinute !== null) {
          return
        }
        if (hasDismissedReminderPrompt(memberName)) {
          return
        }
        setReminderModal({ mode: 'first-run', hour: 17, minute: 0 })
      })
      .catch((error: unknown) => {
        // Not shown to the user: notification settings are optional, but
        // still worth a trace if this is why a reminder prompt didn't show.
        console.error('Could not load push settings', error)
      })

    return () => {
      cancelled = true
    }
  }, [session, justUpgraded])

  // Notification permission can be revoked by the browser at any time,
  // without the person ever opening "Reminder time" to find out - watch it
  // live so a blocked state shows up on its own instead of only surfacing
  // the next time someone happens to reopen that screen.
  useEffect(() => {
    if (!session || session.role !== 'member' || !hasConfiguredReminder) {
      setNotificationsBlocked(false)
      return
    }

    setNotificationsBlocked(getNotificationPermission() === 'denied')

    if (!('permissions' in navigator)) return

    let status: PermissionStatus | null = null
    let cancelled = false

    function handleChange() {
      if (status) setNotificationsBlocked(status.state === 'denied')
    }

    navigator.permissions
      .query({ name: 'notifications' as PermissionName })
      .then((result) => {
        if (cancelled) return
        status = result
        status.addEventListener('change', handleChange)
        handleChange()
      })
      .catch(() => {
        // Permissions API not supported for 'notifications' in this browser - the one-time check above still applies.
      })

    return () => {
      cancelled = true
      status?.removeEventListener('change', handleChange)
    }
  }, [session, hasConfiguredReminder])

  async function openReminderSettings() {
    if (!session || session.role !== 'member') return
    try {
      const current = await getPushSettings(session.memberName)
      setReminderModal({
        mode: 'settings',
        hour: current.reminderHour ?? 17,
        minute: current.reminderMinute ?? 0,
      })
    } catch (error) {
      console.error('Could not load current push settings', error)
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

  function continueInThisTab() {
    if (!pendingSession) return
    setSession(pendingSession)
    setPage(defaultPageFor(pendingSession))
    setClosingDeliveryTab(false)
  }

  if (closingDeliveryTab) {
    return (
      <div className="login-shell">
        <div className="panel login-card">
          <div className="brand login-brand">
            <span className="brand-mark"><LogoMark /></span>
            <span>LogTool</span>
          </div>
          <p className="eyebrow">SIGNED IN</p>
          <h1>All set</h1>
          <p className="login-hint">
            You&rsquo;re signed in. This tab should close on its own — if it doesn&rsquo;t, you can close
            it and continue on the other tab.
          </p>
          {showContinueFallback && (
            <button type="button" onClick={continueInThisTab}>
              Continue in this tab
            </button>
          )}
        </div>
      </div>
    )
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
              Settings
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

      {notificationsBlocked && session.role === 'member' && (
        <div className="notice-banner" role="alert">
          <span>Notifications are blocked for this site — reminders won&rsquo;t be delivered.</span>
          <button type="button" onClick={openReminderSettings}>
            Fix now
          </button>
        </div>
      )}

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

      {setupVersion && <div className="version-badge">v{setupVersion}</div>}
    </div>
  )
}

export default App
