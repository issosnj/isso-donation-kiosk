import { Donation } from './entities/donation.entity';

export type ReceiptLineItem = { label: string; amount: number };

function formatLineLabel(label: string, quantity?: number): string {
  const q = Number(quantity);
  if (Number.isFinite(q) && q > 1) {
    return `${label} (×${q})`;
  }
  return label;
}

/**
 * Line items saved at checkout (kiosk additional seva). Falls back to a single category/donation row.
 */
export function getReceiptLineItems(donation: Donation): ReceiptLineItem[] {
  const raw = donation.lineItems as unknown;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((row: any) => ({
      label: formatLineLabel(String(row?.label ?? 'Donation'), row?.quantity),
      amount: Number(row?.amount) || 0,
    }));
  }
  return [
    {
      label: donation.category?.name || 'Donation',
      amount: Number(donation.amount),
    },
  ];
}
