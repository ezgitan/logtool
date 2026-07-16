import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="login-shell">
          <div className="panel login-card">
            <p className="eyebrow">SOMETHING WENT WRONG</p>
            <h1>LogTool hit an unexpected error</h1>
            <p className="login-hint">
              Reloading the page usually fixes this. If it keeps happening, let your admin know what you
              were doing when it happened.
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
