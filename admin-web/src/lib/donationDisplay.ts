/** Match backend `donation-anonymity.util` / kiosk placeholders. */
const ANON_NAME = 'Ek Hari Bhagat'
const ANON_PHONE_DIGITS = '8568294776'

export function digitsOnly(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '')
}

/** Eligible for “Assign to donor” (anonymous at checkout or legacy placeholder, no donor profile). */
export function isAnonymousForAssign(d: {
  status?: string
  donorId?: string | null
  submittedAsAnonymous?: boolean | null
  donorName?: string | null
  donorPhone?: string | null
}): boolean {
  if (d.status !== 'SUCCEEDED' || d.donorId) return false
  if (d.submittedAsAnonymous === true) return true
  return d.donorName?.trim() === ANON_NAME && digitsOnly(d.donorPhone) === ANON_PHONE_DIGITS
}
