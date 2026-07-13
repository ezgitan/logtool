export const COMPANY_EMAIL_DOMAIN = 'nxp.com'
export const ADMIN_EMAIL = `huseyin.karacali@${COMPANY_EMAIL_DOMAIN}`

export function isAdminEmail(email: string): boolean {
  return email.trim().toLowerCase() === ADMIN_EMAIL
}
