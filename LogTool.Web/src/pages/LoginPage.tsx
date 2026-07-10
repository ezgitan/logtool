import { useState } from 'react'
import { ApiRequestError } from '../api/client'
import { getMembers } from '../api/logsApi'
import { matchMemberByEmail } from '../lib/memberMatch'
import type { Session } from '../lib/session'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LoginPageProps {
  onLogin: (session: Session) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()

    if (!emailPattern.test(trimmedEmail)) {
      setError('Geçerli bir e-posta adresi girin.')
      return
    }
    if (!password) {
      setError('Şifre alanı boş bırakılamaz.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const members = await getMembers()
      const result = matchMemberByEmail(trimmedEmail, members)

      if (result.status === 'found') {
        onLogin({ email: trimmedEmail, memberName: result.member.name })
        return
      }

      if (result.status === 'ambiguous') {
        setError(`"${result.firstName}" ismiyle birden fazla üye bulundu. Lütfen yöneticinle iletişime geç.`)
      } else {
        setError(`"${result.firstName}" isminde bir ekip üyesi bulunamadı.`)
      }
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : 'Üye listesi alınamadı. Lütfen tekrar deneyin.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-shell">
      <form className="panel login-card" onSubmit={handleSubmit}>
        <div className="brand login-brand">
          <span className="brand-mark">L</span>
          <span>LogTool</span>
        </div>
        <p className="eyebrow">GİRİŞ</p>
        <h1>Hesabına giriş yap</h1>
        <p className="login-hint">E-posta adresin üzerinden ekip üyeliğin otomatik olarak eşleştirilir.</p>

        {error && <p className="status-message status-error" role="alert"><span aria-hidden="true">!</span>{error}</p>}

        <label>
          E-posta
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ezgi.tan@sirket.com"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </button>
      </form>
    </div>
  )
}
