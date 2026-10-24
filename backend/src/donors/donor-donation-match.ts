/**
 * A succeeded donation is attributed to at most one donor:
 * - the donor linked by donorId, or
 * - when donorId is empty, the donor in the same temple whose phone matches.
 *
 * Phones are compared as digits. An 11-digit US number with a leading 1
 * matches the 10-digit form stored by the kiosk.
 */

export function canonicalDonorPhone(phone: string | null | undefined): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits;
}

export function canonicalPhoneSql(columnExpr: string): string {
  const digits = `REGEXP_REPLACE(COALESCE(${columnExpr}, ''), '[^0-9]', '', 'g')`;
  return `(CASE WHEN char_length(${digits}) = 11 AND substring(${digits} from 1 for 1) = '1' THEN substring(${digits} from 2) ELSE ${digits} END)`;
}

export function donationBelongsToDonorSql(donationAlias: string, donorAlias: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(donationAlias) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(donorAlias)) {
    throw new Error('Invalid SQL alias');
  }
  const donationPhone = canonicalPhoneSql(`${donationAlias}."donorPhone"`);
  const donorPhone = canonicalPhoneSql(`${donorAlias}.phone`);
  const donationDigits = `REGEXP_REPLACE(COALESCE(${donationAlias}."donorPhone", ''), '[^0-9]', '', 'g')`;
  // If two donor rows canonicalize to the same phone, an unlinked gift is counted once.
  // Prefer the row whose stored digits match the gift, then the oldest row.
  return `(
    ${donationAlias}."donorId" = ${donorAlias}.id
    OR (
      ${donationAlias}."donorId" IS NULL
      AND ${donorPhone} <> ''
      AND ${donationPhone} = ${donorPhone}
      AND ${donorAlias}.id = (
        SELECT d_pick.id
        FROM donors d_pick
        WHERE d_pick."templeId" = ${donationAlias}."templeId"
          AND ${canonicalPhoneSql('d_pick.phone')} = ${donationPhone}
          AND ${canonicalPhoneSql('d_pick.phone')} <> ''
        ORDER BY
          CASE
            WHEN REGEXP_REPLACE(COALESCE(d_pick.phone, ''), '[^0-9]', '', 'g') = ${donationDigits} THEN 0
            ELSE 1
          END,
          d_pick."createdAt" ASC
        LIMIT 1
      )
    )
  )`;
}

export function roundMoney(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}
