export type DonationStatus =
  | 'SUCCEEDED'
  | 'PENDING'
  | 'FAILED'
  | 'CANCELED'
  | 'REFUNDED'
  | 'PLEDGED'

export interface DonationCategory {
  id: string
  name: string
}

export interface DonationTemple {
  id: string
  name: string
}

export interface Donation {
  id: string
  templeId: string
  amount: number | string
  netAmount?: number | string | null
  stripeFee?: number | string | null
  squareFee?: number | string | null
  status: DonationStatus | string
  createdAt: string
  receiptNumber?: string | null
  donorName?: string | null
  donorPhone?: string | null
  donorEmail?: string | null
  donorAddress?: string | null
  donorId?: string | null
  submittedAsAnonymous?: boolean
  assignedAt?: string | null
  stripePaymentIntentId?: string | null
  squarePaymentId?: string | null
  category?: DonationCategory | null
  temple?: DonationTemple | null
}

export interface PaymentDetailsResponse {
  paymentStatus?: string
  netAmount: number
  stripeFee?: number
  squareFee?: number
  cardType?: string
  cardLast4?: string
  createdAt?: string
  payment?: Record<string, unknown>
}

export interface DonationsKpis {
  totalGross: number
  totalNet: number
  totalFees: number
  completedCount: number
  pendingCount: number
  failedCancelledCount: number
}
