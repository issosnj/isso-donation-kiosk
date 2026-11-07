'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { normalizeApiList } from '@/lib/apiHelpers'
import { useDevices } from '@/hooks/useDevices'
import type { Donation } from '@/types/donation'
import {
  dashboardQueryDefaults,
  getOverviewTrendRange,
  overviewQueryDefaults,
} from '@/lib/queryHelpers'
import { format, subDays, startOfDay, endOfDay, parseISO, isValid } from 'date-fns'
import { safeNumber, sanitizeSparkline } from '@/lib/formatters'
import type { HealthMetric } from '@/components/ops-dashboard/SystemHealthPanel'

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
    const endOfToday = endOfDay(now)
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

  const statsQueryOpts = dashboardQueryDefaults

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

  const { data: temples = [], isLoading: templesLoading } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const res = await api.get('/temples')
      return normalizeApiList<{ id: string; name: string }>(res.data)
    },
    refetchInterval: 60_000,
    ...dashboardQueryDefaults,
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

  const {
    data: recentDonations = [],
    isLoading: recentDonationsLoading,
    isError: recentDonationsError,
  } = useQuery({
    queryKey: ['overview-recent-donations'],
    queryFn: async () => {
      const res = await api.get('/donations', {
        params: {
          startDate: last30Start.toISOString(),
          endDate: endOfToday.toISOString(),
        },
      })
      return normalizeApiList<Donation>(res.data)
    },
    refetchInterval: 30_000,
    ...dashboardQueryDefaults,
  })

  const {
    devices,
    summary: deviceSummary,
    isLoading: devicesLoading,
    isError: devicesError,
  } = useDevices(undefined, { refetchInterval: 60_000 })

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
  const monthTotal = safeNumber(statsMonth?.total)
  const prevMonthTotal = safeNumber(statsPrevMonth?.total)
  const monthCount = safeNumber(statsMonth?.count)
  const prevMonthCount = safeNumber(statsPrevMonth?.count)
  const trendDirection: 'up' | 'down' | 'neutral' =
    last30 > 0 || prev30 > 0 ? (last30 >= prev30 ? 'up' : 'down') : 'neutral'

  const failedTransactions = recentDonations.filter((d) => d.status === 'FAILED').length

  const templesWithDonations = new Set(
    recentDonations
      .filter((d) => d.status === 'SUCCEEDED' || d.status === 'COMPLETED')
      .map((d) => d.templeId)
      .filter(Boolean),
  )
  const activeTemples = recentDonationsError ? 0 : templesWithDonations.size

  const executiveKpis: ExecutiveKpis = {
    totalDonations: totalYtd,
    donationsToday: safeNumber(statsToday?.count),
    monthlyRevenue: safeNumber(statsMonth?.total),
    activeTemples,
    onlineKiosks: safeNumber(deviceSummary.online),
    failedTransactions,
    avgDonation: monthCount > 0 ? safeNumber(monthTotal / monthCount) : 0,
    activeDonors: statsError ? 0 : countYtd,
  }

  const last7 = daily.slice(-7)
  const sparkFromDaily = (key: 'amount' | 'count') =>
    sanitizeSparkline(last7.map((d) => safeNumber(d[key])))

  const sparklines: Record<string, number[]> = {
    totalDonations: sparkFromDaily('amount'),
    donationsToday: sparkFromDaily('count'),
    monthlyRevenue: sparkFromDaily('amount'),
    activeTemples: sanitizeSparkline(last7.map(() => activeTemples)),
    onlineKiosks: sanitizeSparkline(last7.map(() => safeNumber(deviceSummary.online))),
    failedTransactions: sanitizeSparkline(
      last7.map(() => Math.max(0, Math.floor(failedTransactions / 7))),
    ),
    avgDonation: sanitizeSparkline(
      last7.map((d) => (safeNumber(d.count) > 0 ? safeNumber(d.amount) / safeNumber(d.count) : 0)),
    ),
    activeDonors: sparkFromDaily('count'),
  }

  const kpiTrends: Record<string, number> = {
    totalDonations: pctChange(last30, prev30),
    donationsToday:
      safeNumber(statsPrev30?.count) > 0
        ? pctChange(safeNumber(statsToday?.count), safeNumber(statsPrev30?.count) / 30)
        : 0,
    monthlyRevenue: pctChange(monthTotal, prevMonthTotal),
    activeTemples: 0,
    onlineKiosks: 0,
    failedTransactions: 0,
    avgDonation: pctChange(
      monthCount > 0 ? monthTotal / monthCount : 0,
      prevMonthCount > 0 ? prevMonthTotal / prevMonthCount : 0,
    ),
    activeDonors: 0,
  }

  const deployedDevices = devices.filter(
    (d) => d.operationalStatus !== 'pending' && d.operationalStatus !== 'deactivated',
  )
  const reportingDevices = deployedDevices.filter(
    (d) => d.operationalStatus === 'online' || d.operationalStatus === 'warning',
  )
  const uptimePct =
    deployedDevices.length > 0
      ? Math.round((reportingDevices.length / deployedDevices.length) * 1000) / 10
      : null

  const settledDonations = recentDonations.filter(
    (d) => d.status === 'SUCCEEDED' || d.status === 'COMPLETED' || d.status === 'FAILED',
  )
  const donationSuccessPct =
    !recentDonationsError && settledDonations.length > 0
      ? Math.round(
          ((settledDonations.length - failedTransactions) / settledDonations.length) * 1000,
        ) / 10
      : null

  const systemHealth: HealthMetric[] = []
  if (donationSuccessPct != null) {
    systemHealth.push({
      id: 'donations',
      label: 'Donation success',
      value: donationSuccessPct,
      unit: '%',
      status: donationSuccessPct < 50 ? 'critical' : donationSuccessPct < 95 ? 'warning' : 'healthy',
    })
  }
  if (!devicesLoading && !devicesError && uptimePct != null) {
    systemHealth.push({
      id: 'kiosks',
      label: 'Kiosk uptime',
      value: uptimePct,
      unit: '%',
      status: uptimePct < 50 ? 'critical' : uptimePct < 95 ? 'warning' : 'healthy',
    })
    systemHealth.push({
      id: 'sync',
      label: 'Kiosks needing attention',
      value: safeNumber(deviceSummary.needingAttention),
      unit: '',
      status: deviceSummary.needingAttention > 3 ? 'warning' : 'healthy',
    })
  }

  const kpiPending = {
    activeTemples: templesLoading || recentDonationsLoading || recentDonationsError,
    onlineKiosks: devicesLoading || devicesError,
    failedTransactions: recentDonationsLoading || recentDonationsError,
    activeDonors: statsLoading || statsError,
  }

  return {
    executiveKpis,
    sparklines,
    kpiTrends,
    kpiPending,
    recentDonations,
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
    kpiGridLoading: statsLoading || templesLoading || devicesLoading,
    statsLoading,
    templesLoading,
    recentDonationsLoading,
    /** Charts + temple table: driven by `/donations/overview`. */
    donationsLoading: overviewLoading,
    devicesLoading,
    statsError: !!statsError,
    donationsError: !!overviewError,
    devicesError: !!devicesError,
  }
}
