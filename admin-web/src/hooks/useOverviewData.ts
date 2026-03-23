'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useDevices } from '@/hooks/useDevices'
import { useAlerts } from '@/hooks/useAlerts'
import { format, subDays, startOfDay } from 'date-fns'

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

function groupDonationsByDate(
  donations: { createdAt: string; amount: number }[],
  granularity: ChartGranularity
): TrendDataPoint[] {
  const succeeded = donations.filter((d: any) => d.status === 'SUCCEEDED')
  const map = new Map<string, { amount: number; count: number }>()

  for (const d of succeeded) {
    const date = new Date(d.createdAt)
    let key: string
    if (granularity === 'day') {
      key = format(startOfDay(date), 'yyyy-MM-dd')
    } else if (granularity === 'week') {
      const weekStart = startOfDay(date)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      key = format(weekStart, 'yyyy-MM-dd')
    } else {
      key = format(date, 'yyyy-MM')
    }
    const existing = map.get(key) || { amount: 0, count: 0 }
    const amt = Number(d.amount) || 0
    map.set(key, { amount: existing.amount + amt, count: existing.count + 1 })
  }

  return Array.from(map.entries())
    .map(([date, { amount, count }]) => ({ date, amount, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateByTemple(donations: any[]): TemplePerformance[] {
  const succeeded = donations.filter((d: any) => d.status === 'SUCCEEDED')
  const map = new Map<string, { name: string; amount: number; count: number }>()

  for (const d of succeeded) {
    const tid = d.templeId || 'unknown'
    const name = d.temple?.name || 'Unknown'
    const existing = map.get(tid) || { name, amount: 0, count: 0 }
    const amt = Number(d.amount) || 0
    map.set(tid, {
      name,
      amount: existing.amount + amt,
      count: existing.count + 1,
    })
  }

  return Array.from(map.entries())
    .map(([templeId, { name, amount, count }]) => ({
      templeId,
      templeName: name,
      total: amount,
      count,
    }))
    .sort((a, b) => b.total - a.total)
}

export function useOverviewData(chartGranularity: ChartGranularity = 'day') {
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const endOfToday = new Date()
  const ninetyDaysAgo = subDays(today, 90)
  const last30Start = subDays(today, 30)
  const prev30Start = subDays(today, 60)

  const { data: statsYtd, isLoading: statsLoading } = useQuery({
    queryKey: ['overview-stats-ytd'],
    queryFn: async () => {
      const res = await api.get('/donations/stats', {
        params: { startDate: startOfYear.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
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

  const { data: donations = [], isLoading: donationsLoading } = useQuery({
    queryKey: ['overview-donations', ninetyDaysAgo.toISOString(), endOfToday.toISOString()],
    queryFn: async () => {
      const res = await api.get('/donations', {
        params: {
          startDate: ninetyDaysAgo.toISOString(),
          endDate: endOfToday.toISOString(),
        },
      })
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { data: temples = [] } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const res = await api.get('/temples')
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const { summary: deviceSummary, isLoading: devicesLoading } = useDevices()
  const { summary: alertSummary, alerts } = useAlerts()

  const trendData = groupDonationsByDate(donations, chartGranularity)
  const templePerformance = aggregateByTemple(donations)

  // Merge in temples with zero donations
  const allTempleIds = new Set(templePerformance.map((t) => t.templeId))
  const templesWithZero = (temples as { id: string; name: string }[])
    .filter((t) => !allTempleIds.has(t.id))
    .map((t) => ({
      templeId: t.id,
      templeName: t.name,
      total: 0,
      count: 0,
    }))
  const templePerformanceFull = [...templePerformance, ...templesWithZero].sort(
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
    alertSummary,
    alerts,
    isLoading: statsLoading || donationsLoading,
    devicesLoading,
  }
}
