import { getWhoAmI } from '../api/authApi'
import { getMembers } from '../api/logsApi'
import { COMPANY_EMAIL_DOMAIN, isAdminEmail } from './adminConfig'
import { matchMemberByEmail } from './memberMatch'
import type { Session } from './session'

export async function resolveIdentity(): Promise<Session> {
  let identity: string
  try {
    const response = await getWhoAmI()
    identity = response.identity
  } catch {
    throw new Error('Could not verify your identity. Make sure you are on the company network.')
  }

  const email = `${identity}@${COMPANY_EMAIL_DOMAIN}`

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
