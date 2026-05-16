'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { startOfDay, subDays } from 'date-fns'
import api from '@/lib/api'
import {
  getOverviewTrendRange,
  overviewQueryDefaults,
  shouldRetryQuery,
} from '@/lib/queryHelpers'
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

  const dateRanges = useMemo(() => {
    const now = new Date()
    const endOfToday = startOfDay(now)
    return {
      startOfYear: new Date(now.getFullYear(), 0, 1),
      endOfToday,
      startOfToday: startOfDay(now),
      startOfMonth: new Date(now.getFullYear(), now.getMonth(), 1),
      startOfPrevMonth: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endOfPrevMonth: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      last30Start: subDays(endOfToday, 30),
    }
  }, [])

  const { data: temple, isLoading: templeLoading, isError: templeError } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const res = await api.get<TempleRecord>(`/temples/${templeId}`)
      return res.data
    },
  })

  const {
    startOfYear,
    endOfToday,
    startOfToday,
    startOfMonth,
    startOfPrevMonth,
    endOfPrevMonth,
    last30Start,
  } = dateRanges

  const statsQueryOpts = {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: shouldRetryQuery,
  } as const

  const { data: statsYtd, isLoading: statsYtdLoading, isError: statsYtdError } = useQuery({
    queryKey: ['temple-overview-stats-ytd', templeId],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: { startDate: startOfYear.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsMonth, isLoading: statsMonthLoading } = useQuery({
    queryKey: ['temple-overview-stats-month', templeId],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: { startDate: startOfMonth.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsToday, isLoading: statsTodayLoading } = useQuery({
    queryKey: ['temple-overview-stats-today', templeId],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: { startDate: startOfToday.toISOString(), endDate: endOfToday.toISOString() },
      })
      return res.data
    },
    ...statsQueryOpts,
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
    ...statsQueryOpts,
  })

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    dataUpdatedAt: overviewUpdatedAt,
  } = useQuery({
    queryKey: ['temple-donations-overview', templeId],
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
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
    })

  const { data: donorStats, isLoading: donorStatsLoading, isError: donorStatsError } = useQuery({
    queryKey: ['donor-stats', templeId],
    queryFn: async () => {
      const res = await api.get<DonorStats>(`/donors/temple/${templeId}/stats`)
      return res.data
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: shouldRetryQuery,
  })

  const { data: changeRequests = [] } = useQuery({
    queryKey: ['donation-change-requests', 'my-temple', templeId],
    queryFn: async () => {
      const res = await api.get<ChangeRequest[]>('/donation-change-requests/my-temple')
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
    () => filterDailyByPeriod(daily, chartPeriod),
    [daily, chartPeriod],
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
