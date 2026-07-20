export const COMPANY_EMAIL_DOMAIN = 'nxp.com'
export const ADMIN_EMAILS = [`huseyin.karacali@${COMPANY_EMAIL_DOMAIN}`, `ezgi.tan@${COMPANY_EMAIL_DOMAIN}`]

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase())
}
