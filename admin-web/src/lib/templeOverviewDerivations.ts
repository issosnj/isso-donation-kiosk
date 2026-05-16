import {
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns'
import type { Donation } from '@/types/donation'
import type { DonorStats } from '@/types/donor'
import type { DeviceListItem } from '@/types/device'
import type { TrendDataPoint } from '@/hooks/useOverviewData'
import { safeNumber, sanitizeSparkline } from '@/lib/formatters'
import type {
  CategoryBreakdownRow,
  DeviceHealthRow,
  DonationPerformanceSummary,
  DonorInsightSummary,
  RecentDonationActivity,
  ReceiptOpsSummary,
  TempleChartPeriod,
  TempleDashboardAlert,
  TempleOverviewMetrics,
  TempleOverviewStatusChips,
} from '@/types/templeOverview'

interface StatsSlice {
  total?: unknown
  count?: unknown
}

interface TempleStripeFields {
  stripeAccountId?: string | null
  stripePublishableKey?: string | null
  gmailRefreshToken?: string | null
  fromEmail?: string | null
}

interface ChangeRequestRow {
  id: string
  status?: string
}

export function filterDailyByPeriod(
  daily: TrendDataPoint[],
  period: TempleChartPeriod,
  referenceDate: Date = new Date(),
): TrendDataPoint[] {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  const todayKey = format(startOfDay(referenceDate), 'yyyy-MM-dd')

  if (period === 'today') {
    return sorted.filter((d) => d.date.startsWith(todayKey) || d.date === todayKey)
  }

  if (period === 'ytd') {
    const year = referenceDate.getFullYear()
    return sorted.filter((d) => d.date.startsWith(String(year)))
  }

  const days = period === '7d' ? 7 : 30
  const cutoff = subDays(startOfDay(referenceDate), days - 1)
  return sorted.filter((d) => {
    try {
      const parsed = parseISO(d.date)
      return isValid(parsed) && parsed >= cutoff
    } catch {
      return false
    }
  })
}

export function buildPerformanceSummary(
  daily: TrendDataPoint[],
  donations: Donation[],
): DonationPerformanceSummary {
  let bestDay = '—'
  let bestAmount = 0
  for (const row of daily) {
    const amount = safeNumber(row.amount)
    if (amount > bestAmount) {
      bestAmount = amount
      try {
        bestDay = format(parseISO(row.date), 'MMM d, yyyy')
      } catch {
        bestDay = row.date
      }
    }
  }

  const hourCounts = new Map<number, number>()
  for (const d of donations) {
    if (d.status !== 'SUCCEEDED') continue
    const hour = new Date(d.createdAt).getHours()
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1)
  }
  let peakHour = '—'
  let peakCount = 0
  for (const [hour, count] of Array.from(hourCounts.entries())) {
    if (count > peakCount) {
      peakCount = count
      const h12 = hour % 12 || 12
      const ampm = hour < 12 ? 'AM' : 'PM'
      peakHour = `${h12}:00 ${ampm}`
    }
  }

  const categoryTotals = new Map<string, number>()
  for (const d of donations) {
    if (d.status !== 'SUCCEEDED') continue
    const name = d.category?.name ?? 'General'
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + safeNumber(d.amount))
  }
  let highestCategory = '—'
  let topCatAmount = 0
  for (const [name, amount] of Array.from(categoryTotals.entries())) {
    if (amount > topCatAmount) {
      topCatAmount = amount
      highestCategory = name
    }
  }

  return { bestDay, peakHour, highestCategory }
}

function pctChange(current: number, previous: number): number {
  const c = safeNumber(current)
  const p = safeNumber(previous)
  if (p === 0) return c > 0 ? 100 : 0
  return safeNumber(((c - p) / p) * 100)
}

export function buildTempleMetrics(input: {
  statsYtd: StatsSlice | undefined
  statsMonth: StatsSlice | undefined
  statsToday: StatsSlice | undefined
  statsPrevMonth: StatsSlice | undefined
  donorStats: DonorStats | null | undefined
  deviceOnline: number
  deviceTotal: number
  recentDonations: Donation[]
  dailySpark: TrendDataPoint[]
}): TempleOverviewMetrics {
  const raisedYtd = safeNumber(input.statsYtd?.total)
  const countYtd = safeNumber(input.statsYtd?.count)
  const raisedThisMonth = safeNumber(input.statsMonth?.total)
  const countMonth = safeNumber(input.statsMonth?.count)
  const raisedToday = safeNumber(input.statsToday?.total)
  const countToday = safeNumber(input.statsToday?.count)
  const prevMonthTotal = safeNumber(input.statsPrevMonth?.total)
  const prevMonthCount = safeNumber(input.statsPrevMonth?.count)

  const failedPending = input.recentDonations.filter(
    (d) => d.status === 'FAILED' || d.status === 'PENDING',
  ).length

  const last7 = input.dailySpark.slice(-7)
  const sparkFromDaily = (key: 'amount' | 'count') =>
    sanitizeSparkline(last7.map((d) => safeNumber(d[key])))

  return {
    raisedYtd,
    raisedThisMonth,
    raisedToday,
    totalDonations: countYtd,
    averageGift: countYtd > 0 ? raisedYtd / countYtd : 0,
    activeDonors: safeNumber(input.donorStats?.activeCount),
    onlineDevices: input.deviceOnline,
    failedPendingPayments: failedPending,
    trends: {
      raisedYtd: pctChange(raisedYtd, prevMonthTotal * 12),
      raisedThisMonth: pctChange(raisedThisMonth, prevMonthTotal),
      raisedToday: pctChange(countToday, Math.max(1, prevMonthCount / 30)),
      totalDonations: pctChange(countMonth, prevMonthCount),
      averageGift: pctChange(
        countMonth > 0 ? raisedThisMonth / countMonth : 0,
        prevMonthCount > 0 ? prevMonthTotal / prevMonthCount : 0,
      ),
      activeDonors: pctChange(
        safeNumber(input.donorStats?.activeCount),
        Math.max(1, safeNumber(input.donorStats?.total) - safeNumber(input.donorStats?.activeCount)),
      ),
      onlineDevices: pctChange(
        input.deviceOnline,
        Math.max(1, input.deviceTotal - input.deviceOnline),
      ),
      failedPendingPayments: 0,
    },
    sparklines: {
      raisedYtd: sparkFromDaily('amount'),
      raisedThisMonth: sparkFromDaily('amount'),
      raisedToday: sparkFromDaily('count'),
      totalDonations: sparkFromDaily('count'),
      averageGift: sanitizeSparkline(
        last7.map((d) =>
          safeNumber(d.count) > 0 ? safeNumber(d.amount) / safeNumber(d.count) : 0,
        ),
      ),
      activeDonors: sparkFromDaily('count'),
      onlineDevices: sanitizeSparkline(last7.map(() => input.deviceOnline)),
      failedPendingPayments: sanitizeSparkline(last7.map(() => failedPending)),
    },
  }
}

export function buildRecentActivity(donations: Donation[]): RecentDonationActivity[] {
  return [...donations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((d) => {
      const anonymous = d.submittedAsAnonymous || !d.donorName?.trim()
      const hasReceipt = Boolean(d.receiptNumber)
      const hasEmail = Boolean(d.donorEmail?.trim())
      let receiptStatus: RecentDonationActivity['receiptStatus'] = 'unavailable'
      if (d.status === 'SUCCEEDED') {
        receiptStatus = hasReceipt && hasEmail ? 'sent' : 'pending'
      }
      let timeAgo = '—'
      try {
        timeAgo = formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })
      } catch {
        timeAgo = '—'
      }
      return {
        id: d.id,
        donorLabel: anonymous ? 'Anonymous' : (d.donorName?.trim() ?? 'Donor'),
        amount: safeNumber(d.amount),
        categoryName: d.category?.name ?? 'General',
        paymentStatus: d.status,
        timeAgo,
        receiptStatus,
        createdAt: d.createdAt,
      }
    })
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never'
  try {
    const d = new Date(iso)
    if (!isValid(d)) return 'Unknown'
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return 'Unknown'
  }
}

export function buildDeviceHealthRows(devices: DeviceListItem[]): DeviceHealthRow[] {
  return devices.slice(0, 6).map((d) => {
    let statusLabel: DeviceHealthRow['statusLabel'] = 'Offline'
    if (d.operationalStatus === 'online') statusLabel = 'Online'
    else if (d.operationalStatus === 'pending') statusLabel = 'Needs setup'
    else if (d.operationalStatus === 'warning') statusLabel = 'Warning'

    let readerStatus: DeviceHealthRow['readerStatus'] = 'n/a'
    if (d.readerConnected === true) readerStatus = 'connected'
    else if (d.readerConnected === false) readerStatus = 'disconnected'
    else if (d.status === 'ACTIVE') readerStatus = 'unknown'

    return {
      id: d.id,
      name: d.label || d.deviceCode || 'Kiosk',
      statusLabel,
      lastHeartbeat: d.lastSeenAt,
      lastHeartbeatLabel: formatRelativeTime(d.lastSeenAt),
      lastDonationLabel: formatRelativeTime(d.lastActivityAt ?? null),
      readerStatus,
    }
  })
}

export function buildCategoryBreakdown(donations: Donation[]): CategoryBreakdownRow[] {
  const map = new Map<string, { name: string; amount: number; count: number }>()
  let grandTotal = 0

  for (const d of donations) {
    if (d.status !== 'SUCCEEDED') continue
    const id = d.category?.id ?? '__general__'
    const name = d.category?.name ?? 'General'
    const amount = safeNumber(d.amount)
    grandTotal += amount
    const existing = map.get(id) ?? { name, amount: 0, count: 0 }
    map.set(id, {
      name,
      amount: existing.amount + amount,
      count: existing.count + 1,
    })
  }

  return Array.from(map.entries())
    .map(([categoryId, { name, amount, count }]) => ({
      categoryId,
      categoryName: name,
      amountRaised: amount,
      donationCount: count,
      percentage: grandTotal > 0 ? (amount / grandTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amountRaised - a.amountRaised)
    .slice(0, 6)
}

export function buildDonorInsights(
  donorStats: DonorStats | null | undefined,
  donations: Donation[],
): DonorInsightSummary {
  const succeeded = donations.filter((d) => d.status === 'SUCCEEDED')
  const donorGiftCounts = new Map<string, number>()
  for (const d of succeeded) {
    const key = d.donorId ?? d.donorPhone ?? d.id
    donorGiftCounts.set(key, (donorGiftCounts.get(key) ?? 0) + 1)
  }
  const frequencies = Array.from(donorGiftCounts.values())
  const averageDonorFrequency =
    frequencies.length > 0
      ? frequencies.reduce((a, b) => a + b, 0) / frequencies.length
      : 0

  const categoryTotals = new Map<string, number>()
  for (const d of succeeded) {
    const name = d.category?.name ?? 'General'
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + safeNumber(d.amount))
  }
  let topDonorCategory = '—'
  let top = 0
  for (const [name, amount] of Array.from(categoryTotals.entries())) {
    if (amount > top) {
      top = amount
      topDonorCategory = name
    }
  }

  return {
    newDonorsThisMonth: safeNumber(donorStats?.newThisMonth),
    returningDonors: safeNumber(donorStats?.repeatCount),
    topDonorCategory,
    averageDonorFrequency: Math.round(averageDonorFrequency * 10) / 10,
  }
}

export function buildReceiptOps(
  donations: Donation[],
  temple: TempleStripeFields | null | undefined,
): ReceiptOpsSummary {
  const succeeded = donations.filter((d) => d.status === 'SUCCEEDED')
  const withEmail = succeeded.filter((d) => Boolean(d.donorEmail?.trim()))
  const receiptsSent = withEmail.filter((d) => Boolean(d.receiptNumber)).length
  const pendingResend = withEmail.filter((d) => !d.receiptNumber).length
  const failedReceipts = donations.filter((d) => d.status === 'FAILED').length

  const recentWithReceipt = succeeded
    .filter((d) => d.receiptNumber)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  let recentResendLabel = 'No recent receipt activity'
  if (recentWithReceipt) {
    recentResendLabel = `Last receipt #${recentWithReceipt.receiptNumber} · ${formatRelativeTime(recentWithReceipt.createdAt)}`
  } else if (!temple?.gmailRefreshToken && !temple?.fromEmail) {
    recentResendLabel = 'Configure Gmail or sender email in Receipts'
  }

  return {
    receiptsSent,
    failedReceipts,
    pendingResend,
    recentResendLabel,
  }
}

export function buildTempleAlerts(input: {
  metrics: TempleOverviewMetrics
  devices: DeviceListItem[]
  temple: TempleStripeFields | null | undefined
  donations: Donation[]
  changeRequests: ChangeRequestRow[]
}): TempleDashboardAlert[] {
  const alerts: TempleDashboardAlert[] = []

  const failedCount = input.donations.filter((d) => d.status === 'FAILED').length
  if (failedCount > 0) {
    alerts.push({
      id: 'failed-payments',
      severity: 'critical',
      title: `${failedCount} failed payment${failedCount === 1 ? '' : 's'}`,
      description: 'Review failed transactions and retry or cancel as needed.',
      tab: 'donations',
    })
  }

  const offline = input.devices.filter((d) => d.operationalStatus === 'offline').length
  if (offline > 0) {
    alerts.push({
      id: 'offline-kiosks',
      severity: 'warning',
      title: `${offline} kiosk${offline === 1 ? '' : 's'} offline`,
      description: 'Check power, network, and device heartbeat.',
      tab: 'devices',
    })
  }

  const stripeOk =
    Boolean(input.temple?.stripeAccountId) || Boolean(input.temple?.stripePublishableKey)
  if (!stripeOk) {
    alerts.push({
      id: 'stripe-disconnected',
      severity: 'critical',
      title: 'Stripe not connected',
      description: 'Connect Stripe to accept card payments on kiosks.',
      tab: 'stripe',
    })
  }

  const receiptIssues = input.donations.filter(
    (d) => d.status === 'SUCCEEDED' && d.donorEmail && !d.receiptNumber,
  ).length
  if (receiptIssues > 0) {
    alerts.push({
      id: 'receipt-failures',
      severity: 'warning',
      title: `${receiptIssues} receipt${receiptIssues === 1 ? '' : 's'} pending`,
      description: 'Succeeded donations with email but no receipt number.',
      tab: 'receipts',
    })
  }

  const pendingChanges = input.changeRequests.filter((r) => r.status === 'PENDING').length
  if (pendingChanges > 0) {
    alerts.push({
      id: 'donor-corrections',
      severity: 'info',
      title: `${pendingChanges} donor change request${pendingChanges === 1 ? '' : 's'}`,
      description: 'Pending master approval for receipt or name corrections.',
      tab: 'donations',
    })
  }

  const unassigned = input.donations.filter(
    (d) => d.submittedAsAnonymous && !d.donorId && d.status === 'SUCCEEDED',
  ).length
  if (unassigned > 3) {
    alerts.push({
      id: 'unassigned-donors',
      severity: 'info',
      title: `${unassigned} anonymous gifts unassigned`,
      description: 'Link anonymous donations to donor profiles for reporting.',
      tab: 'donations',
    })
  }

  return alerts
}

export function buildStatusChips(input: {
  temple: TempleStripeFields | null | undefined
  deviceOnline: number
  deviceTotal: number
  lastSyncedAt: Date | null
}): TempleOverviewStatusChips {
  const stripeOk =
    Boolean(input.temple?.stripeAccountId) || Boolean(input.temple?.stripePublishableKey)
  const stripeStatus = stripeOk ? 'connected' : 'needs_attention'
  const stripeLabel = stripeOk ? 'Stripe connected' : 'Stripe needs attention'

  const kiosksOnlineLabel =
    input.deviceTotal > 0
      ? `${input.deviceOnline} of ${input.deviceTotal} kiosks online`
      : 'No kiosks registered'

  let lastSyncedLabel = 'Just now'
  if (input.lastSyncedAt) {
    try {
      lastSyncedLabel = `Synced ${formatDistanceToNow(input.lastSyncedAt, { addSuffix: true })}`
    } catch {
      lastSyncedLabel = 'Synced recently'
    }
  }

  return { stripeStatus, stripeLabel, kiosksOnlineLabel, lastSyncedLabel }
}

export function exportTempleSummaryCsv(
  templeName: string,
  metrics: TempleOverviewMetrics,
  performance: DonationPerformanceSummary,
): void {
  const rows = [
    ['Metric', 'Value'],
    ['Temple', templeName],
    ['Raised YTD', metrics.raisedYtd.toFixed(2)],
    ['Raised This Month', metrics.raisedThisMonth.toFixed(2)],
    ['Raised Today', metrics.raisedToday.toFixed(2)],
    ['Total Donations', String(metrics.totalDonations)],
    ['Average Gift', metrics.averageGift.toFixed(2)],
    ['Active Donors', String(metrics.activeDonors)],
    ['Online Devices', String(metrics.onlineDevices)],
    ['Failed / Pending Payments', String(metrics.failedPendingPayments)],
    ['Best Day', performance.bestDay],
    ['Peak Hour', performance.peakHour],
    ['Top Category', performance.highestCategory],
    ['Exported At', new Date().toISOString()],
  ]
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${templeName.replace(/\s+/g, '-').toLowerCase()}-overview-summary.csv`
  a.click()
  URL.revokeObjectURL(url)
}
