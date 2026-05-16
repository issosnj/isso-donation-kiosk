/** Must match kiosk `DonationDetailsView` anonymous placeholders. */
export const ANONYMOUS_PLACEHOLDER_FULL_NAME = 'Ek Hari Bhagat';
export const ANONYMOUS_PLACEHOLDER_PHONE_DIGITS = '8568294776';

function digitsOnly(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/** Legacy rows (before `submittedAsAnonymous`) that used kiosk anonymous placeholders. */
export function donationMatchesAnonymousPlaceholders(donation: {
  donorName?: string | null;
  donorPhone?: string | null;
}): boolean {
  const name = (donation.donorName || '').trim();
  const phoneDigits = digitsOnly(donation.donorPhone);
  return name === ANONYMOUS_PLACEHOLDER_FULL_NAME && phoneDigits === ANONYMOUS_PLACEHOLDER_PHONE_DIGITS;
}

/**
 * Anonymous for attribution: not linked to a donor profile, and either flagged at checkout
 * or matching legacy placeholder name+phone.
 */
export function isAnonymousForAttribution(donation: {
  donorId?: string | null;
  submittedAsAnonymous?: boolean | null;
  donorName?: string | null;
  donorPhone?: string | null;
}): boolean {
  if (donation.donorId) return false;
  if (donation.submittedAsAnonymous === true) return true;
  return donationMatchesAnonymousPlaceholders(donation);
}
