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
    raisedYtd: number
    raisedThisMonth: number
    raisedToday: number
    totalDonations: number
    averageGift: number
    activeDonors: number
    onlineDevices: number
    failedPendingPayments: number
  }
  sparklines: Record<string, number[]>
}

export interface RecentDonationActivity {
  id: string
  donorLabel: string
  amount: number
  categoryName: string
  paymentStatus: DonationStatus | string
  timeAgo: string
  receiptStatus: 'sent' | 'pending' | 'unavailable'
  createdAt: string
}

export interface DeviceHealthRow {
  id: string
  name: string
  statusLabel: 'Online' | 'Offline' | 'Needs setup' | 'Warning'
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
  receiptsSent: number
  failedReceipts: number
  pendingResend: number
  recentResendLabel: string
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
  peakHour: string
  highestCategory: string
}

export interface TempleOverviewStatusChips {
  stripeStatus: StripeConnectionStatus
  stripeLabel: string
  kiosksOnlineLabel: string
  lastSyncedLabel: string
}
