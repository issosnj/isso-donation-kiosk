import { formatDistanceToNow, isValid } from 'date-fns'
import type { Donation } from '@/types/donation'
import type { DonorStats } from '@/types/donor'
import type { DeviceListItem } from '@/types/device'
import type { TrendDataPoint } from '@/hooks/useOverviewData'
import { keptDonationAmount, safeNumber } from '@/lib/formatters'
import { formatCalendarDay, shiftYmd } from '@/lib/zonedRange'
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
  todayYmd: string,
): TrendDataPoint[] {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  const dayKey = (value: string) => value.slice(0, 10)

  if (period === 'today') {
    return sorted.filter((row) => dayKey(row.date) === todayYmd)
  }

  if (period === 'ytd') {
    const year = todayYmd.slice(0, 4)
    return sorted.filter((row) => {
      const key = dayKey(row.date)
      return key.startsWith(year) && key <= todayYmd
    })
  }

  const days = period === '7d' ? 7 : 30
  const cutoff = shiftYmd(todayYmd, -(days - 1))
  return sorted.filter((row) => {
    const key = dayKey(row.date)
    return key >= cutoff && key <= todayYmd
  })
}

function hourInTimeZone(iso: string, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso))
  const raw = parts.find((part) => part.type === 'hour')?.value ?? '0'
  const hour = Number(raw === '24' ? '0' : raw)
  return Number.isFinite(hour) ? hour : 0
}

export function buildPerformanceSummary(
  daily: TrendDataPoint[],
  donations: Donation[],
  timeZone: string,
): DonationPerformanceSummary {
  let bestDay = '—'
  let bestAmount = 0
  for (const row of daily) {
    const amount = safeNumber(row.amount)
    if (amount > bestAmount) {
      bestAmount = amount
      bestDay = formatCalendarDay(row.date)
    }
  }

  const hourCounts = new Map<number, number>()
  for (const d of donations) {
    if (d.status !== 'SUCCEEDED') continue
    const hour = hourInTimeZone(d.createdAt, timeZone)
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
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + keptDonationAmount(d))
  }
  let highestCategory = '—'
  let topCatAmount = 0
  for (const [name, amount] of Array.from(categoryTotals.entries())) {
    if (amount > topCatAmount) {
      topCatAmount = amount
      highestCategory = name
    }
  }

  return { bestDay, bestAmount, peakHour, highestCategory }
}

function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous == null || !Number.isFinite(previous)) return null
  const c = safeNumber(current)
  const p = safeNumber(previous)
  if (p === 0) return c === 0 ? 0 : null
  return safeNumber(((c - p) / p) * 100)
}

export function buildTempleMetrics(input: {
  statsYtd: StatsSlice | undefined
  statsMonth: StatsSlice | undefined
  statsToday: StatsSlice | undefined
  statsPrevMonth: StatsSlice | undefined
  statsYesterday: StatsSlice | undefined
  statsPriorYtd: StatsSlice | undefined
  donorStats: DonorStats | null | undefined
  deviceOnline: number
  recentDonations: Donation[]
}): TempleOverviewMetrics {
  const raisedYtd = safeNumber(input.statsYtd?.total)
  const countYtd = safeNumber(input.statsYtd?.count)
  const raisedThisMonth = safeNumber(input.statsMonth?.total)
  const raisedToday = safeNumber(input.statsToday?.total)
  const prevMonthTotal = input.statsPrevMonth ? safeNumber(input.statsPrevMonth.total) : null
  const yesterdayTotal = input.statsYesterday ? safeNumber(input.statsYesterday.total) : null
  const priorYtdTotal = input.statsPriorYtd ? safeNumber(input.statsPriorYtd.total) : null
  const priorYtdCount = input.statsPriorYtd ? safeNumber(input.statsPriorYtd.count) : null
  const averageGift = countYtd > 0 ? raisedYtd / countYtd : 0
  const priorAverage =
    priorYtdCount != null && priorYtdCount > 0 && priorYtdTotal != null
      ? priorYtdTotal / priorYtdCount
      : priorYtdCount === 0
        ? 0
        : null

  const failedPending = input.recentDonations.filter(
    (d) => d.status === 'FAILED' || d.status === 'PENDING',
  ).length

  return {
    raisedYtd,
    raisedThisMonth,
    raisedToday,
    totalDonations: countYtd,
    averageGift,
    activeDonors: safeNumber(input.donorStats?.activeCount),
    onlineDevices: input.deviceOnline,
    failedPendingPayments: failedPending,
    trends: {
      raisedYtd: pctChange(raisedYtd, priorYtdTotal),
      raisedThisMonth: pctChange(raisedThisMonth, prevMonthTotal),
      raisedToday: pctChange(raisedToday, yesterdayTotal),
      totalDonations: pctChange(countYtd, priorYtdCount),
      averageGift: pctChange(averageGift, priorAverage),
      activeDonors: null,
      onlineDevices: null,
      failedPendingPayments: null,
    },
  }
}

export function buildRecentActivity(donations: Donation[]): RecentDonationActivity[] {
  return [...donations]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8)
    .map((d) => {
      const anonymous = d.submittedAsAnonymous || !d.donorName?.trim()
      let receiptStatus: RecentDonationActivity['receiptStatus'] = 'unavailable'
      if (d.status === 'SUCCEEDED') {
        receiptStatus = d.receiptNumber ? 'issued' : 'missing'
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
        amount: keptDonationAmount(d),
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

export function buildDeviceHealthRows(
  devices: DeviceListItem[],
  donations: Donation[] = [],
): DeviceHealthRow[] {
  const lastGiftByDevice = new Map<string, string>()
  for (const donation of donations) {
    if (donation.status !== 'SUCCEEDED' || !donation.deviceId) continue
    const previous = lastGiftByDevice.get(donation.deviceId)
    if (!previous || donation.createdAt > previous) {
      lastGiftByDevice.set(donation.deviceId, donation.createdAt)
    }
  }

  return devices.map((d) => {
    let statusLabel: DeviceHealthRow['statusLabel'] = 'Offline'
    if (d.operationalStatus === 'online') statusLabel = 'Online'
    else if (d.operationalStatus === 'pending') statusLabel = 'Needs setup'
    else if (d.operationalStatus === 'warning') statusLabel = 'Warning'
    else if (d.operationalStatus === 'deactivated') statusLabel = 'Deactivated'

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
      lastDonationLabel: lastGiftByDevice.has(d.id)
        ? formatRelativeTime(lastGiftByDevice.get(d.id))
        : 'None in 30 days',
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
    const amount = keptDonationAmount(d)
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
}

export function buildDonorInsights(
  donorStats: DonorStats | null | undefined,
  donations: Donation[],
): DonorInsightSummary {
  const succeeded = donations.filter((d) => d.status === 'SUCCEEDED')
  const categoryTotals = new Map<string, number>()
  for (const d of succeeded) {
    const name = d.category?.name ?? 'General'
    categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + keptDonationAmount(d))
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
    newDonorsThisMonth: safeNumber(donorStats?.firstGiftThisMonth),
    returningDonors: safeNumber(donorStats?.repeatCount),
    topDonorCategory,
    averageDonorFrequency: safeNumber(donorStats?.averageGiftsPerDonor),
  }
}

export function buildReceiptOps(
  donations: Donation[],
  temple: TempleStripeFields | null | undefined,
): ReceiptOpsSummary {
  const succeeded = donations.filter((d) => d.status === 'SUCCEEDED')
  const receiptsIssued = succeeded.filter((d) => Boolean(d.receiptNumber)).length
  const missingReceiptNumbers = succeeded.filter((d) => !d.receiptNumber).length
  const receiptsWithoutEmail = succeeded.filter(
    (d) => Boolean(d.receiptNumber) && !d.donorEmail?.trim(),
  ).length

  const recentWithReceipt = succeeded
    .filter((d) => d.receiptNumber)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  let recentReceiptLabel = 'No receipt number in the last 30 days'
  if (recentWithReceipt) {
    recentReceiptLabel = `Last receipt #${recentWithReceipt.receiptNumber} · ${formatRelativeTime(recentWithReceipt.createdAt)}`
  } else if (!temple?.gmailRefreshToken && !temple?.fromEmail) {
    recentReceiptLabel = 'Configure Gmail or sender email in Receipts'
  }

  return {
    receiptsIssued,
    missingReceiptNumbers,
    receiptsWithoutEmail,
    recentReceiptLabel,
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
      description: 'Failed payments in the last 30 days. Review them in Donations.',
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

  const warning = input.devices.filter((d) => d.operationalStatus === 'warning').length
  if (warning > 0) {
    alerts.push({
      id: 'warning-kiosks',
      severity: 'warning',
      title: warning === 1 ? '1 kiosk needs a check' : `${warning} kiosks need a check`,
      description: 'Heartbeat is older than 30 minutes. Confirm the kiosk is still running.',
      tab: 'devices',
    })
  }

  const stripeOk =
    Boolean(input.temple?.stripeAccountId) || Boolean(input.temple?.stripePublishableKey)
  if (!stripeOk) {
    alerts.push({
      id: 'stripe-disconnected',
      severity: 'critical',
      title: 'Stripe is not connected',
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
      title:
        receiptIssues === 1
          ? '1 receipt missing a number'
          : `${receiptIssues} receipts missing a number`,
      description: 'Succeeded gifts have an email address but no receipt number.',
      tab: 'receipts',
    })
  }

  const pendingChanges = input.changeRequests.filter((r) => r.status === 'PENDING').length
  if (pendingChanges > 0) {
    alerts.push({
      id: 'donor-corrections',
      severity: 'info',
      title:
        pendingChanges === 1
          ? '1 receipt name change'
          : `${pendingChanges} receipt name changes`,
      description: 'Waiting for Master Admin approval.',
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
      description: 'Anonymous succeeded gifts from the last 30 days that are not linked to a donor.',
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
  const stripeLabel = stripeOk ? 'Stripe Connected' : 'Stripe Needs Attention'

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
    ['Failed & Pending Payments', String(metrics.failedPendingPayments)],
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
