import { getMembers } from '../api/logsApi'
import { COMPANY_EMAIL_DOMAIN, isAdminEmail } from './adminConfig'
import { matchMemberByEmail } from './memberMatch'
import type { Session } from './session'

const IDENTITY_STORAGE_KEY = 'logtool.identity'

function readIdentityFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const identity = params.get('identity')
  if (!identity) return null

  // Strip the identity param from the visible URL so it doesn't linger in
  // the address bar, browser history, or get shared/bookmarked by mistake.
  params.delete('identity')
  const cleanedQuery = params.toString()
  const newUrl = window.location.pathname + (cleanedQuery ? `?${cleanedQuery}` : '') + window.location.hash
  window.history.replaceState({}, '', newUrl)

  return identity
}

export async function resolveIdentity(): Promise<Session> {
  const fromUrl = readIdentityFromUrl()
  if (fromUrl) {
    sessionStorage.setItem(IDENTITY_STORAGE_KEY, fromUrl)
  }

  const identity = fromUrl ?? sessionStorage.getItem(IDENTITY_STORAGE_KEY)

  if (!identity) {
    throw new Error(
      'No identity was provided. Open LogTool using the LogTool shortcut on your desktop instead of typing the address directly.',
    )
  }

  const email = identity.includes('@') ? identity : `${identity}@${COMPANY_EMAIL_DOMAIN}`

  if (isAdminEmail(email)) {
    return { role: 'admin', email }
  }

  const members = await getMembers()
  const result = matchMemberByEmail(email, members)

  if (result.status === 'found') {
    return { role: 'member', email, memberName: result.member.name }
  }

  if (result.status === 'ambiguous') {
    throw new Error(`Multiple users found matching "${result.firstName}". Contact your admin.`)
  }

  throw new Error(`No user found matching "${result.firstName}". Contact your admin.`)
}
