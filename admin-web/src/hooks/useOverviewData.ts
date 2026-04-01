'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useDevices } from '@/hooks/useDevices'
import { format, subDays, startOfDay, parseISO } from 'date-fns'

export interface TemplePerformance {
  templeId: string
  templeName: string
  total: number
  count: number
}

export type ChartGranularity = 'day' | 'week' | 'month'

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
  if (granularity === 'day') {
    return [...daily]
      .map((d) => ({ date: d.date, amount: d.amount, count: d.count }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  const map = new Map<string, { amount: number; count: number }>()

  for (const row of daily) {
    const date = parseISO(row.date)
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
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const endOfToday = new Date()
  const ninetyDaysAgo = subDays(today, 90)
  const last30Start = subDays(today, 30)
  const prev30Start = subDays(today, 60)

  const { data: statsYtd, isLoading: statsLoading, isError: statsError } = useQuery({
    queryKey: ['overview-stats-ytd'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: { startDate: startOfYear.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
    retry: 1,
  })

  const { data: statsLast30 } = useQuery({
    queryKey: ['overview-stats-last-30'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: {
          startDate: last30Start.toISOString(),
          endDate: today.toISOString(),
        },
      })
      return res.data
    },
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
  })

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
  } = useQuery({
    queryKey: [
      'donations-overview',
      ninetyDaysAgo.toISOString(),
      endOfToday.toISOString(),
    ],
    queryFn: async () => {
      const res = await api.get<OverviewApiResponse>('/donations/overview', {
        params: {
          startDate: ninetyDaysAgo.toISOString(),
          endDate: endOfToday.toISOString(),
        },
      })
      return res.data
    },
    retry: 1,
  })

  const { data: temples = [] } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const res = await api.get('/temples')
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { summary: deviceSummary, isLoading: devicesLoading, isError: devicesError } =
    useDevices()

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

  const totalYtd = statsYtd?.total ?? 0
  const countYtd = statsYtd?.count ?? 0
  const last30 = statsLast30?.total ?? 0
  const prev30 = statsPrev30?.total ?? 0
  const trendDirection: 'up' | 'down' | 'neutral' =
    last30 > 0 || prev30 > 0 ? (last30 >= prev30 ? 'up' : 'down') : 'neutral'

  return {
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
