interface StatusMessageProps {
  tone: 'error' | 'success' | 'info'
  children: string
}

export function StatusMessage({ tone, children }: StatusMessageProps) {
  return (
    <div className={`status-message status-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{tone === 'success' ? '✓' : tone === 'error' ? '!' : 'i'}</span>
      {children}
    </div>
  )
}
