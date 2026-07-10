import type { Member } from '../types/log'

export type MemberMatchResult =
  | { status: 'found'; member: Member }
  | { status: 'not_found'; firstName: string }
  | { status: 'ambiguous'; firstName: string }

export function firstNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? ''
  const firstToken = localPart.split(/[._-]+/)[0] ?? ''
  return firstToken
}

export function matchMemberByEmail(email: string, members: Member[]): MemberMatchResult {
  const firstName = firstNameFromEmail(email)
  const normalized = firstName.toLocaleLowerCase('tr-TR')

  const matches = members.filter((member) => {
    const memberFirstName = member.name.trim().split(/\s+/)[0] ?? ''
    return memberFirstName.toLocaleLowerCase('tr-TR') === normalized
  })

  if (matches.length === 1) {
    return { status: 'found', member: matches[0] }
  }

  return { status: matches.length === 0 ? 'not_found' : 'ambiguous', firstName }
}
