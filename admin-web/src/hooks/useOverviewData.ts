'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useDevices } from '@/hooks/useDevices'
import {
  getOverviewTrendRange,
  overviewQueryDefaults,
  shouldRetryQuery,
} from '@/lib/queryHelpers'
import { format, subDays, startOfDay, parseISO, isValid } from 'date-fns'
import { safeNumber, sanitizeSparkline } from '@/lib/formatters'

export interface TemplePerformance {
  templeId: string
  templeName: string
  total: number
  count: number
}

export type ChartGranularity = 'hour' | 'day' | 'week' | 'month' | 'year'

export interface ExecutiveKpis {
  totalDonations: number
  donationsToday: number
  monthlyRevenue: number
  activeTemples: number
  onlineKiosks: number
  failedTransactions: number
  avgDonation: number
  activeDonors: number
}

function pctChange(current: number, previous: number): number {
  const c = safeNumber(current)
  const p = safeNumber(previous)
  if (p === 0) return c > 0 ? 100 : 0
  const result = ((c - p) / p) * 100
  return safeNumber(result)
}

function sanitizeTrendRow(row: { date: string; amount: unknown; count: unknown }): TrendDataPoint {
  return {
    date: row.date,
    amount: safeNumber(row.amount),
    count: safeNumber(row.count),
  }
}

export interface TrendDataPoint {
  date: string
  amount: number
  count: number
}

interface OverviewApiResponse {
  daily: { date: string; amount: number; count: number }[]
  byTemple: { templeId: string; templeName: string; total: number; count: number }[]
}

function bucketDailyMetrics(
  daily: { date: string; amount: number; count: number }[],
  granularity: ChartGranularity
): TrendDataPoint[] {
  if (granularity === 'hour') {
    return [...daily].slice(-24).map(sanitizeTrendRow)
  }

  if (granularity === 'year') {
    const map = new Map<string, { amount: number; count: number }>()
    for (const row of daily) {
      let date: Date
      try {
        date = parseISO(row.date)
        if (!isValid(date)) continue
      } catch {
        continue
      }
      const key = format(date, 'yyyy')
      const existing = map.get(key) || { amount: 0, count: 0 }
      map.set(key, { amount: existing.amount + row.amount, count: existing.count + row.count })
    }
    return Array.from(map.entries())
      .map(([date, { amount, count }]) => ({ date: `${date}-01-01`, amount, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  if (granularity === 'day') {
    return [...daily].map(sanitizeTrendRow).sort((a, b) => a.date.localeCompare(b.date))
  }

  const map = new Map<string, { amount: number; count: number }>()

  for (const row of daily) {
    let date: Date
    try {
      date = parseISO(row.date)
      if (!isValid(date)) continue
    } catch {
      continue
    }
    let key: string
    if (granularity === 'week') {
      const weekStart = startOfDay(date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      key = format(weekStart, 'yyyy-MM-dd')
    } else {
      key = format(date, 'yyyy-MM')
    }
    const existing = map.get(key) || { amount: 0, count: 0 }
    map.set(key, {
      amount: existing.amount + row.amount,
      count: existing.count + row.count,
    })
  }

  return Array.from(map.entries())
    .map(([date, { amount, count }]) => ({ date, amount, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export function useOverviewData(chartGranularity: ChartGranularity = 'day') {
  const dateRanges = useMemo(() => {
    const now = new Date()
    const endOfToday = startOfDay(now)
    return {
      startOfYear: new Date(now.getFullYear(), 0, 1),
      endOfToday,
      last30Start: subDays(endOfToday, 30),
      prev30Start: subDays(endOfToday, 60),
      startOfToday: startOfDay(now),
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      startOfPrevMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endOfPrevMonth: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
    }
  }, [])

  const {
    startOfYear,
    endOfToday,
    last30Start,
    prev30Start,
    startOfToday,
    startOfMonth,
    startOfPrevMonth,
    endOfPrevMonth,
  } = dateRanges

  const statsQueryOpts = {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: shouldRetryQuery,
  } as const

  const { data: statsYtd, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['overview-stats-ytd'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: { startDate: startOfYear.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsLast30 } = useQuery({
    queryKey: ['overview-stats-last-30'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: {
          startDate: last30Start.toISOString(),
          endDate: endOfToday.toISOString(),
        },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsPrev30 } = useQuery({
    queryKey: ['overview-stats-prev-30'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: {
          startDate: prev30Start.toISOString(),
          endDate: last30Start.toISOString(),
        },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useQuery({
    queryKey: ['donations-overview'],
    queryFn: async () => {
      const { start, end } = getOverviewTrendRange()
      const res = await api.get<OverviewApiResponse>('/donations/overview', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      })
      return res.data
    },
    ...overviewQueryDefaults,
  })

  const { data: temples = [] } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const res = await api.get('/temples')
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: shouldRetryQuery,
  })

  const { data: statsToday } = useQuery({
    queryKey: ['overview-stats-today'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: { startDate: startOfToday.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsMonth } = useQuery({
    queryKey: ['overview-stats-month'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: { startDate: startOfMonth.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsPrevMonth } = useQuery({
    queryKey: ['overview-stats-prev-month'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: {
          startDate: startOfPrevMonth.toISOString(),
          endDate: endOfPrevMonth.toISOString(),
        },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: recentDonations = [] } = useQuery({
    queryKey: ['overview-recent-donations'],
    queryFn: async () => {
      const res = await api.get('/donations', {
        params: {
          startDate: last30Start.toISOString(),
          endDate: endOfToday.toISOString(),
        },
      })
      return Array.isArray(res.data) ? res.data : []
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: shouldRetryQuery,
  })

  const {
    devices,
    summary: deviceSummary,
    isLoading: devicesLoading,
    isError: devicesError,
  } = useDevices()

  const daily = overview?.daily ?? []
  const byTemple = overview?.byTemple ?? []

  const trendData = bucketDailyMetrics(daily, chartGranularity)

  const allTempleIds = new Set(byTemple.map((t) => t.templeId))
  const templesWithZero = (temples as { id: string; name: string }[])
    .filter((t) => !allTempleIds.has(t.id))
    .map((t) => ({
      templeId: t.id,
      templeName: t.name,
      total: 0,
      count: 0,
    }))
  const templePerformanceFull = [...byTemple, ...templesWithZero].sort(
    (a, b) => b.total - a.total
  )

  const totalYtd = safeNumber(statsYtd?.total)
  const countYtd = safeNumber(statsYtd?.count)
  const last30 = safeNumber(statsLast30?.total)
  const prev30 = safeNumber(statsPrev30?.total)
  const trendDirection: 'up' | 'down' | 'neutral' =
    last30 > 0 || prev30 > 0 ? (last30 >= prev30 ? 'up' : 'down') : 'neutral'

  const failedTransactions = (recentDonations as { status?: string }[]).filter(
    (d) => d.status === 'FAILED',
  ).length

  const templeCount = Array.isArray(temples) ? temples.length : 0

  const executiveKpis: ExecutiveKpis = {
    totalDonations: totalYtd,
    donationsToday: safeNumber(statsToday?.count),
    monthlyRevenue: safeNumber(statsMonth?.total),
    activeTemples: templeCount,
    onlineKiosks: safeNumber(deviceSummary.online),
    failedTransactions,
    avgDonation: countYtd > 0 ? safeNumber(totalYtd / countYtd) : 0,
    activeDonors: countYtd,
  }

  const last7 = daily.slice(-7)
  const sparkFromDaily = (key: 'amount' | 'count') =>
    sanitizeSparkline(last7.map((d) => safeNumber(d[key])))

  const sparklines: Record<string, number[]> = {
    totalDonations: sparkFromDaily('amount'),
    donationsToday: sparkFromDaily('count'),
    monthlyRevenue: sparkFromDaily('amount'),
    activeTemples: sanitizeSparkline(last7.map(() => templeCount)),
    onlineKiosks: sanitizeSparkline(last7.map(() => deviceSummary.online)),
    failedTransactions: sanitizeSparkline(
      last7.map(() => Math.max(0, Math.floor(failedTransactions / 7))),
    ),
    avgDonation: sanitizeSparkline(
      last7.map((d) => (safeNumber(d.count) > 0 ? safeNumber(d.amount) / safeNumber(d.count) : 0)),
    ),
    activeDonors: sparkFromDaily('count'),
  }

  const monthTotal = safeNumber(statsMonth?.total)
  const prevMonthTotal = safeNumber(statsPrevMonth?.total)
  const monthCount = safeNumber(statsMonth?.count)
  const prevMonthCount = safeNumber(statsPrevMonth?.count)

  const kpiTrends: Record<string, number> = {
    totalDonations: pctChange(last30, prev30),
    donationsToday: pctChange(safeNumber(statsToday?.count), Math.max(1, safeNumber(statsPrev30?.count) / 30)),
    monthlyRevenue: pctChange(monthTotal, prevMonthTotal),
    activeTemples: 0,
    onlineKiosks: pctChange(deviceSummary.online, Math.max(1, deviceSummary.total - deviceSummary.online)),
    failedTransactions: 0,
    avgDonation: pctChange(
      monthCount > 0 ? monthTotal / monthCount : 0,
      prevMonthCount > 0 ? prevMonthTotal / prevMonthCount : 0,
    ),
    activeDonors: pctChange(monthCount, prevMonthCount),
  }

  const uptimePct =
    deviceSummary.total > 0
      ? Math.round((deviceSummary.online / deviceSummary.total) * 1000) / 10
      : 100

  const systemHealth = [
    // TODO: Replace with GET /api/health or monitoring service (Datadog/Sentry uptime).
    { id: 'api', label: 'API uptime', value: 99.9, unit: '%' as const, status: 'healthy' as const },
    {
      id: 'donations',
      label: 'Donation success',
      value: failedTransactions > 5 ? 96.5 : 99.2,
      unit: '%' as const,
      status: failedTransactions > 5 ? ('warning' as const) : ('healthy' as const),
    },
    // TODO: Replace with GET /api/receipts/metrics (delivery success rate from email/logs).
    { id: 'receipts', label: 'Receipt delivery', value: 98.4, unit: '%' as const, status: 'healthy' as const },
    {
      id: 'kiosks',
      label: 'Kiosk uptime',
      value: uptimePct,
      unit: '%' as const,
      status: uptimePct < 90 ? ('critical' as const) : uptimePct < 97 ? ('warning' as const) : ('healthy' as const),
    },
    // TODO: Replace with GET /api/sync/queue health (pending/failed sync jobs).
    {
      id: 'sync',
      label: 'Sync queue',
      value: safeNumber(deviceSummary.needingAttention),
      unit: '' as const,
      status: deviceSummary.needingAttention > 3 ? ('warning' as const) : ('healthy' as const),
    },
    // TODO: Replace with Stripe Connect / Terminal health endpoint.
    { id: 'payments', label: 'Payment processor', value: 99.8, unit: '%' as const, status: 'healthy' as const },
  ]

  return {
    executiveKpis,
    sparklines,
    kpiTrends,
    systemHealth,
    devices,
    stats: {
      totalYtd,
      countYtd,
      avgGift: countYtd > 0 ? totalYtd / countYtd : 0,
      trendDirection,
    },
    trendData,
    templePerformance: templePerformanceFull,
    deviceSummary,
    /** True while either stats or overview query has no data yet (first load). */
    isLoading: statsLoading || overviewLoading,
    statsLoading,
    /** Charts + temple table: driven by `/donations/overview`. */
    donationsLoading: overviewLoading,
    devicesLoading,
    statsError: !!statsError,
    donationsError: !!overviewError,
    devicesError: !!devicesError,
  }
}
