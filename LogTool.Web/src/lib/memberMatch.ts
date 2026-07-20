import type { Member } from '../types/log'

export type MemberMatchResult =
  | { status: 'found'; member: Member }
  | { status: 'not_found'; attemptedName: string }
  | { status: 'ambiguous'; attemptedName: string }

function capitalizeToken(token: string): string {
  if (!token) return token
  return token.charAt(0).toLocaleUpperCase('tr-TR') + token.slice(1).toLocaleLowerCase('tr-TR')
}

/** "ezgi.tan@nxp.com" -> "Ezgi Tan" - matches how names are entered as Excel column headers. */
export function fullNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? ''
  const tokens = localPart.split(/[._-]+/).filter(Boolean)
  return tokens.map(capitalizeToken).join(' ')
}

export function matchMemberByEmail(email: string, members: Member[]): MemberMatchResult {
  const attemptedName = fullNameFromEmail(email)
  const normalized = attemptedName.toLocaleLowerCase('tr-TR')

  const matches = members.filter((member) => member.name.trim().toLocaleLowerCase('tr-TR') === normalized)

  if (matches.length === 1) {
    return { status: 'found', member: matches[0] }
  }

  return { status: matches.length === 0 ? 'not_found' : 'ambiguous', attemptedName }
}
