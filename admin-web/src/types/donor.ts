export interface Donor {
  id: string
  name: string | null
  phone: string
  email: string | null
  address: string | null
  totalDonations: number
  totalAmount: number
  lastDonationDate: string | null
  templeId?: string
  temple?: { name: string }
  createdAt: string
  updatedAt: string
}

export interface DonorStats {
  total: number
  totalDonated: number
  newThisMonth: number
  repeatCount: number
  activeCount: number
}

export interface DonorKpis extends DonorStats {
  averageDonation: number
  recurringCount: number
}

export type DonorSegment =
  | 'all'
  | 'vip'
  | 'recurring'
  | 'new'
  | 'inactive'
  | 'high_value'
  | 'anonymous'

export type DonorSortKey =
  | 'last_donation'
  | 'name'
  | 'total_amount'
  | 'donation_count'
  | 'created'
