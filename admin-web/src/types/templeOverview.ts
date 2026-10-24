import type { DonationStatus } from '@/types/donation'

export type TempleChartPeriod = 'today' | '7d' | '30d' | 'ytd'

export type StripeConnectionStatus = 'connected' | 'needs_attention' | 'unknown'

export interface TempleOverviewMetrics {
  raisedYtd: number
  raisedThisMonth: number
  raisedToday: number
  totalDonations: number
  averageGift: number
  activeDonors: number
  onlineDevices: number
  failedPendingPayments: number
  trends: {
    raisedYtd: number | null
    raisedThisMonth: number | null
    raisedToday: number | null
    totalDonations: number | null
    averageGift: number | null
    activeDonors: number | null
    onlineDevices: number | null
    failedPendingPayments: number | null
  }
}

export interface RecentDonationActivity {
  id: string
  donorLabel: string
  amount: number
  categoryName: string
  paymentStatus: DonationStatus | string
  timeAgo: string
  receiptStatus: 'issued' | 'missing' | 'unavailable'
  createdAt: string
}

export interface DeviceHealthRow {
  id: string
  name: string
  statusLabel: 'Online' | 'Offline' | 'Needs setup' | 'Warning' | 'Deactivated'
  lastHeartbeat: string | null
  lastHeartbeatLabel: string
  lastDonationLabel: string
  readerStatus: 'connected' | 'disconnected' | 'unknown' | 'n/a'
}

export interface CategoryBreakdownRow {
  categoryId: string
  categoryName: string
  amountRaised: number
  donationCount: number
  percentage: number
}

export interface DonorInsightSummary {
  newDonorsThisMonth: number
  returningDonors: number
  topDonorCategory: string
  averageDonorFrequency: number
}

export interface ReceiptOpsSummary {
  receiptsIssued: number
  missingReceiptNumbers: number
  receiptsWithoutEmail: number
  recentReceiptLabel: string
}

export type TempleAlertSeverity = 'critical' | 'warning' | 'info'

export interface TempleDashboardAlert {
  id: string
  severity: TempleAlertSeverity
  title: string
  description: string
  tab: string
}

export interface DonationPerformanceSummary {
  bestDay: string
  bestAmount: number
  peakHour: string
  highestCategory: string
}

export interface TempleOverviewStatusChips {
  stripeStatus: StripeConnectionStatus
  stripeLabel: string
  kiosksOnlineLabel: string
  lastSyncedLabel: string
}
