import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { ToastHost } from './components/ToastHost.tsx'
import { showErrorToast } from './lib/toast.ts'
import './index.css'
import App from './App.tsx'

window.addEventListener('error', (event) => {
  console.error('Unhandled error', event.error)
  showErrorToast('Something went wrong. Try again, or reload the page if it keeps happening.')
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection', event.reason)
  showErrorToast('Something went wrong. Try again, or reload the page if it keeps happening.')
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <ToastHost />
    </ErrorBoundary>
  </StrictMode>,
)
