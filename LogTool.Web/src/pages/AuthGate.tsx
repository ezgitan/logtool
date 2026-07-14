import { type FormEvent, useState } from 'react'
import { LogoMark } from '../components/LogoMark'

interface AuthGateProps {
  loading: boolean
  error: string | null
  submitting: boolean
  onSubmit: (email: string) => void
}

export function AuthGate({ loading, error, submitting, onSubmit }: AuthGateProps) {
  const [email, setEmail] = useState('')

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <div className="login-shell">
      <div className="panel login-card">
        <div className="brand login-brand">
          <span className="brand-mark"><LogoMark /></span>
          <span>LogTool</span>
        </div>

        {loading ? (
          <>
            <p className="eyebrow">SIGNING IN</p>
            <h1>Checking your identity…</h1>
          </>
        ) : (
          <>
            <p className="eyebrow">SIGN IN</p>
            <h1>Enter your work email</h1>
            <p className="login-hint">No password needed — just your company email address.</p>
            <form onSubmit={handleSubmit}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name.surname@nxp.com"
                  autoFocus
                  required
                />
              </label>
              <button type="submit" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Continue'}
              </button>
            </form>

            {error && (
              <p className="status-message status-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </p>
            )}

            <p className="login-hint">
              First time here? <a href="/setup.vbs">Download the one-time setup script</a> to
              sign in automatically and enable reminder notifications, without typing your
              email every time.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
