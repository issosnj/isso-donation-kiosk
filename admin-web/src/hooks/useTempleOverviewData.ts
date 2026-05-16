'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { subDays, startOfDay } from 'date-fns'
import api from '@/lib/api'
import { useDevices } from '@/hooks/useDevices'
import type { Donation } from '@/types/donation'
import type { DonorStats } from '@/types/donor'
import type { TrendDataPoint } from '@/hooks/useOverviewData'
import {
  buildCategoryBreakdown,
  buildDeviceHealthRows,
  buildDonorInsights,
  buildPerformanceSummary,
  buildRecentActivity,
  buildReceiptOps,
  buildStatusChips,
  buildTempleAlerts,
  buildTempleMetrics,
  filterDailyByPeriod,
} from '@/lib/templeOverviewDerivations'
import type { TempleChartPeriod } from '@/types/templeOverview'

interface OverviewApiResponse {
  daily: { date: string; amount: number; count: number }[]
  byTemple: { templeId: string; templeName: string; total: number; count: number }[]
}

interface StatsResponse {
  total: number
  count: number
}

interface TempleRecord {
  id: string
  name: string
  stripeAccountId?: string | null
  stripePublishableKey?: string | null
  gmailRefreshToken?: string | null
  fromEmail?: string | null
}

interface ChangeRequest {
  id: string
  status?: string
}

export function useTempleOverviewData(templeId: string, chartPeriod: TempleChartPeriod) {
  const queryClient = useQueryClient()
  const today = new Date()
  const startOfYear = new Date(today.getFullYear(), 0, 1)
  const endOfToday = new Date()
  const ninetyDaysAgo = subDays(today, 90)
  const startOfToday = startOfDay(today)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const startOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const endOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59)
  const last30Start = subDays(today, 30)

  const { data: temple, isLoading: templeLoading, isError: templeError } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const res = await api.get<TempleRecord>(`/temples/${templeId}`)
      return res.data
    },
  })

  const { data: statsYtd, isLoading: statsYtdLoading, isError: statsYtdError } = useQuery({
    queryKey: ['temple-overview-stats-ytd', templeId],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: { startDate: startOfYear.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
    retry: 1,
  })

  const { data: statsMonth, isLoading: statsMonthLoading } = useQuery({
    queryKey: ['temple-overview-stats-month', templeId],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: { startDate: startOfMonth.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
  })

  const { data: statsToday, isLoading: statsTodayLoading } = useQuery({
    queryKey: ['temple-overview-stats-today', templeId],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: { startDate: startOfToday.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
  })

  const { data: statsPrevMonth } = useQuery({
    queryKey: ['temple-overview-stats-prev-month', templeId],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: {
          startDate: startOfPrevMonth.toISOString(),
          endDate: endOfPrevMonth.toISOString(),
        },
      })
      return res.data
    },
  })

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    dataUpdatedAt: overviewUpdatedAt,
  } = useQuery({
    queryKey: ['temple-donations-overview', templeId, ninetyDaysAgo.toISOString()],
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

  const { data: recentDonations = [], isLoading: donationsLoading, isError: donationsError } =
    useQuery({
      queryKey: ['temple-overview-recent-donations', templeId],
      queryFn: async () => {
        const res = await api.get<Donation[]>('/donations', {
          params: {
            startDate: last30Start.toISOString(),
            endDate: endOfToday.toISOString(),
          },
        })
        return Array.isArray(res.data) ? res.data : []
      },
      staleTime: 60_000,
    })

  const { data: donorStats, isLoading: donorStatsLoading, isError: donorStatsError } = useQuery({
    queryKey: ['donor-stats', templeId],
    queryFn: async () => {
      const res = await api.get<DonorStats>(`/donors/temple/${templeId}/stats`)
      return res.data
    },
  })

  const { data: changeRequests = [] } = useQuery({
    queryKey: ['donation-change-requests', 'my-temple', templeId],
    queryFn: async () => {
      const res = await api.get<ChangeRequest[]>('/donation-change-requests/my-temple')
      return Array.isArray(res.data) ? res.data : []
    },
  })

  const {
    devices,
    summary: deviceSummary,
    isLoading: devicesLoading,
    isError: devicesError,
  } = useDevices({ templeId })

  const daily: TrendDataPoint[] = useMemo(
    () =>
      (overview?.daily ?? []).map((row) => ({
        date: row.date,
        amount: Number(row.amount) || 0,
        count: Number(row.count) || 0,
      })),
    [overview?.daily],
  )

  const chartData = useMemo(
    () => filterDailyByPeriod(daily, chartPeriod, today),
    [daily, chartPeriod, today],
  )

  const metrics = useMemo(
    () =>
      buildTempleMetrics({
        statsYtd,
        statsMonth,
        statsToday,
        statsPrevMonth,
        donorStats,
        deviceOnline: deviceSummary.online,
        deviceTotal: deviceSummary.total,
        recentDonations,
        dailySpark: daily,
      }),
    [
      statsYtd,
      statsMonth,
      statsToday,
      statsPrevMonth,
      donorStats,
      deviceSummary.online,
      deviceSummary.total,
      recentDonations,
      daily,
    ],
  )

  const recentActivity = useMemo(() => buildRecentActivity(recentDonations), [recentDonations])
  const deviceHealth = useMemo(() => buildDeviceHealthRows(devices), [devices])
  const categoryBreakdown = useMemo(
    () => buildCategoryBreakdown(recentDonations),
    [recentDonations],
  )
  const donorInsights = useMemo(
    () => buildDonorInsights(donorStats, recentDonations),
    [donorStats, recentDonations],
  )
  const receiptOps = useMemo(
    () => buildReceiptOps(recentDonations, temple),
    [recentDonations, temple],
  )
  const performanceSummary = useMemo(
    () => buildPerformanceSummary(chartData, recentDonations),
    [chartData, recentDonations],
  )
  const alerts = useMemo(
    () =>
      buildTempleAlerts({
        metrics,
        devices,
        temple,
        donations: recentDonations,
        changeRequests,
      }),
    [metrics, devices, temple, recentDonations, changeRequests],
  )
  const statusChips = useMemo(
    () =>
      buildStatusChips({
        temple,
        deviceOnline: deviceSummary.online,
        deviceTotal: deviceSummary.total,
        lastSyncedAt: overviewUpdatedAt ? new Date(overviewUpdatedAt) : null,
      }),
    [temple, deviceSummary.online, deviceSummary.total, overviewUpdatedAt],
  )

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-overview-stats-ytd', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-overview-stats-month', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-overview-stats-today', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-donations-overview', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-overview-recent-donations', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['donor-stats', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['devices-all', templeId] })
  }

  const isLoading =
    templeLoading ||
    statsYtdLoading ||
    statsMonthLoading ||
    statsTodayLoading ||
    overviewLoading ||
    donationsLoading ||
    devicesLoading ||
    donorStatsLoading

  const hasError =
    templeError ||
    statsYtdError ||
    overviewError ||
    donationsError ||
    devicesError ||
    donorStatsError

  return {
    templeName: temple?.name ?? 'Temple',
    metrics,
    chartData,
    recentActivity,
    deviceHealth,
    categoryBreakdown,
    donorInsights,
    receiptOps,
    performanceSummary,
    alerts,
    statusChips,
    deviceSummary,
    isLoading,
    hasError,
    refresh,
  }
}
