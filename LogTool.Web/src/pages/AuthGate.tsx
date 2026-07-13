import { LogoMark } from '../components/LogoMark'

interface AuthGateProps {
  loading: boolean
  error: string | null
}

export function AuthGate({ loading, error }: AuthGateProps) {
  return (
    <div className="login-shell">
      <div className="panel login-card">
        <div className="brand login-brand">
          <span className="brand-mark"><LogoMark /></span>
          <span>LogTool</span>
        </div>

        {loading && (
          <>
            <p className="eyebrow">SIGNING IN</p>
            <h1>Checking your identity…</h1>
            <p className="login-hint">Verifying you&rsquo;re on the company network.</p>
          </>
        )}

        {!loading && error && (
          <>
            <p className="eyebrow">ACCESS DENIED</p>
            <h1>Can&rsquo;t verify your identity</h1>
            <p className="status-message status-error" role="alert">
              <span aria-hidden="true">!</span>
              {error}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
