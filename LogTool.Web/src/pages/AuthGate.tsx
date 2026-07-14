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
          </>
        )}

        {!loading && (
          <>
            <p className="eyebrow">FIRST TIME HERE</p>
            <h1>Download the setup script</h1>
            <p className="login-hint">
              Run it once to sign in and enable reminder notifications. This page will update
              on its own once it's done — no need to reopen or refresh anything.
            </p>
            <a className="setup-download" href="/setup.vbs">
              Download setup script
            </a>

            {error && (
              <p className="status-message status-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
