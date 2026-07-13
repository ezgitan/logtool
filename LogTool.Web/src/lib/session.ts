export type Session =
  | { role: 'member'; email: string; memberName: string }
  | { role: 'admin'; email: string }
