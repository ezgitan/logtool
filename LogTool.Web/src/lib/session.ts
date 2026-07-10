export interface Session {
  email: string
  memberName: string
  reminderConfigured?: boolean
}

const SESSION_KEY = 'logtool.session'

export function loadSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<Session>
    if (typeof parsed.email === 'string' && typeof parsed.memberName === 'string') {
      return {
        email: parsed.email,
        memberName: parsed.memberName,
        reminderConfigured: parsed.reminderConfigured === true,
      }
    }
  } catch {
    // ignore malformed session data
  }
  return null
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}
