import { getMembers } from '../api/logsApi'
import { COMPANY_EMAIL_DOMAIN, isAdminEmail } from './adminConfig'
import { matchMemberByEmail } from './memberMatch'
import type { Session } from './session'

export const IDENTITY_STORAGE_KEY = 'logtool.identity'
const SETUP_VERSION_STORAGE_KEY = 'logtool.setupVersion'

function readParamsFromUrl(): { identity: string | null; setupVersion: string | null } {
  const params = new URLSearchParams(window.location.search)
  const identity = params.get('identity')
  const setupVersion = params.get('setupVersion')
  if (identity) {
    params.delete('identity')
    params.delete('setupVersion')
    const cleanedQuery = params.toString()
    const newUrl = window.location.pathname + (cleanedQuery ? `?${cleanedQuery}` : '') + window.location.hash
    window.history.replaceState({}, '', newUrl)
  }
  return { identity, setupVersion }
}

function normalizeEmail(identity: string): string {
  return identity.includes('@') ? identity : `${identity}@${COMPANY_EMAIL_DOMAIN}`
}

export async function fetchRequiredSetupVersion(): Promise<string | null> {
  try {
    const response = await fetch('/api/setup/version')
    if (!response.ok) return null
    const data = (await response.json()) as { version: string }
    return data.version
  } catch (error) {
    console.error('Could not check the current setup.vbs version', error)
    return null
  }
}

export interface StoredIdentityResult {
  identity: string | null
  /** True when a person previously completed setup, but with an older setup.vbs than the server now serves. */
  outdated: boolean
  /** The server's current setup.vbs version, if the check succeeded. */
  serverVersion: string | null
  /**
   * True exactly once, right after a person finishes running a *different*
   * setup.vbs version than the one they'd completed before (not the very
   * first time ever). Used to re-prompt for the reminder time even if one
   * was already configured, since the push subscription it depends on may
   * have gone stale across the update.
   */
  justCompletedNewVersion: boolean
  /**
   * True when the identity was just delivered via the `?identity=` link
   * (i.e. this is the tab the setup script opened), as opposed to a
   * returning visit reading it back out of storage. Used to close that tab
   * automatically once signed in, since the original "download setup" tab
   * updates itself the same moment via the storage event.
   */
  deliveredViaUrl: boolean
}

/**
 * Identity supplied automatically via the setup script's `?identity=` link.
 * Persisted in localStorage (not sessionStorage) so running the script once
 * signs a person in permanently on that browser - no repeat visits needed.
 *
 * Every stored identity is tagged with the setup.vbs version that produced
 * it. If the server's current version has moved on, the stored identity is
 * treated as invalid so the person is sent back to "download setup" instead
 * of silently running on stale certificate-trust/identity logic - without
 * anyone having to manually clear browser storage.
 */
export async function getStoredIdentity(): Promise<StoredIdentityResult> {
  const { identity: fromUrl, setupVersion: fromUrlVersion } = readParamsFromUrl()
  const requiredVersion = await fetchRequiredSetupVersion()

  if (fromUrl) {
    const previousVersion = localStorage.getItem(SETUP_VERSION_STORAGE_KEY)
    const version = fromUrlVersion ?? requiredVersion ?? ''
    const justCompletedNewVersion = previousVersion !== null && previousVersion !== version
    localStorage.setItem(IDENTITY_STORAGE_KEY, fromUrl)
    localStorage.setItem(SETUP_VERSION_STORAGE_KEY, version)
    return {
      identity: fromUrl,
      outdated: false,
      serverVersion: requiredVersion,
      justCompletedNewVersion,
      deliveredViaUrl: true,
    }
  }

  const storedIdentity = localStorage.getItem(IDENTITY_STORAGE_KEY)
  if (!storedIdentity) {
    return {
      identity: null,
      outdated: false,
      serverVersion: requiredVersion,
      justCompletedNewVersion: false,
      deliveredViaUrl: false,
    }
  }

  // If the version check itself failed (offline blip, etc.), don't lock a
  // returning person out over it - fall through and let them straight in.
  if (requiredVersion === null) {
    return {
      identity: storedIdentity,
      outdated: false,
      serverVersion: null,
      justCompletedNewVersion: false,
      deliveredViaUrl: false,
    }
  }

  const storedVersion = localStorage.getItem(SETUP_VERSION_STORAGE_KEY)
  if (storedVersion !== requiredVersion) {
    return {
      identity: null,
      outdated: true,
      serverVersion: requiredVersion,
      justCompletedNewVersion: false,
      deliveredViaUrl: false,
    }
  }

  return {
    identity: storedIdentity,
    outdated: false,
    serverVersion: requiredVersion,
    justCompletedNewVersion: false,
    deliveredViaUrl: false,
  }
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
    throw new Error(`Multiple users found matching "${result.attemptedName}". Contact your admin.`)
  }
  throw new Error(`No user found matching "${result.attemptedName}". Contact your admin.`)
}
