import { getMembers } from '../api/logsApi'
import { COMPANY_EMAIL_DOMAIN, isAdminEmail } from './adminConfig'
import { matchMemberByEmail } from './memberMatch'
import type { Session } from './session'

const IDENTITY_STORAGE_KEY = 'logtool.identity'

function readIdentityFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  const identity = params.get('identity')
  if (!identity) return null
  params.delete('identity')
  const cleanedQuery = params.toString()
  const newUrl = window.location.pathname + (cleanedQuery ? `?${cleanedQuery}` : '') + window.location.hash
  window.history.replaceState({}, '', newUrl)
  return identity
}

function normalizeEmail(identity: string): string {
  return identity.includes('@') ? identity : `${identity}@${COMPANY_EMAIL_DOMAIN}`
}

/**
 * Identity supplied automatically via the setup script's `?identity=` link.
 * Persisted in localStorage (not sessionStorage) so running the script once
 * signs a person in permanently on that browser - no repeat visits needed.
 */
export function getStoredIdentity(): string | null {
  const fromUrl = readIdentityFromUrl()
  if (fromUrl) {
    localStorage.setItem(IDENTITY_STORAGE_KEY, fromUrl)
    return fromUrl
  }
  return localStorage.getItem(IDENTITY_STORAGE_KEY)
}

export async function resolveSession(identity: string): Promise<Session> {
  const email = normalizeEmail(identity)
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
