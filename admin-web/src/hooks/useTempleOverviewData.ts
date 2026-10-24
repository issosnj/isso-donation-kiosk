'use client'

import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { dashboardQueryDefaults, overviewQueryDefaults } from '@/lib/queryHelpers'
import { buildTempleRanges, isValidTimeZone } from '@/lib/zonedRange'
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
  timezone?: string | null
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

  const { data: temple, isLoading: templeLoading, isError: templeError } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const res = await api.get<TempleRecord>(`/temples/${templeId}`)
      return res.data
    },
    ...dashboardQueryDefaults,
  })

  const timeZone = isValidTimeZone(temple?.timezone)
    ? temple.timezone
    : Intl.DateTimeFormat().resolvedOptions().timeZone
  const ranges = useMemo(
    () => buildTempleRanges(timeZone),
    [timeZone],
  )
  const statsReady = Boolean(temple)
  const statsQueryOpts = { ...dashboardQueryDefaults, enabled: statsReady }

  const { data: statsYtd, isLoading: statsYtdLoading, isError: statsYtdError } = useQuery({
    queryKey: ['temple-overview-stats-ytd', templeId, ranges.startOfYear.toISOString(), ranges.endOfToday.toISOString()],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: {
          templeId,
          startDate: ranges.startOfYear.toISOString(),
          endDate: ranges.endOfToday.toISOString(),
        },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsMonth, isLoading: statsMonthLoading, isError: statsMonthError } = useQuery({
    queryKey: ['temple-overview-stats-month', templeId, ranges.startOfMonth.toISOString(), ranges.endOfToday.toISOString()],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: {
          templeId,
          startDate: ranges.startOfMonth.toISOString(),
          endDate: ranges.endOfToday.toISOString(),
        },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsToday, isLoading: statsTodayLoading, isError: statsTodayError } = useQuery({
    queryKey: ['temple-overview-stats-today', templeId, ranges.startOfToday.toISOString(), ranges.endOfToday.toISOString()],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: {
          templeId,
          startDate: ranges.startOfToday.toISOString(),
          endDate: ranges.endOfToday.toISOString(),
        },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsPrevMonth, isLoading: statsPrevMonthLoading, isError: statsPrevMonthError } = useQuery({
    queryKey: ['temple-overview-stats-prev-month', templeId, ranges.startOfPrevMonth.toISOString(), ranges.endOfPrevMonth.toISOString()],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: {
          templeId,
          startDate: ranges.startOfPrevMonth.toISOString(),
          endDate: ranges.endOfPrevMonth.toISOString(),
        },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsYesterday, isLoading: statsYesterdayLoading, isError: statsYesterdayError } = useQuery({
    queryKey: ['temple-overview-stats-yesterday', templeId, ranges.startOfYesterday.toISOString(), ranges.endOfYesterday.toISOString()],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: {
          templeId,
          startDate: ranges.startOfYesterday.toISOString(),
          endDate: ranges.endOfYesterday.toISOString(),
        },
      })
      return res.data
    },
    ...statsQueryOpts,
  })

  const { data: statsPriorYtd, isLoading: statsPriorYtdLoading, isError: statsPriorYtdError } = useQuery({
    queryKey: ['temple-overview-stats-prior-ytd', templeId, ranges.startOfPriorYtd.toISOString(), ranges.endOfPriorYtd.toISOString()],
    queryFn: async () => {
      const res = await api.get<StatsResponse>('/donations/stats', {
        params: {
          templeId,
          startDate: ranges.startOfPriorYtd.toISOString(),
          endDate: ranges.endOfPriorYtd.toISOString(),
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
    queryKey: ['temple-donations-overview', templeId, ranges.startOfYear.toISOString(), ranges.endOfToday.toISOString(), ranges.timeZone],
    queryFn: async () => {
      const res = await api.get<OverviewApiResponse>('/donations/overview', {
        params: {
          templeId,
          startDate: ranges.startOfYear.toISOString(),
          endDate: ranges.endOfToday.toISOString(),
          timeZone: ranges.timeZone,
        },
      })
      return res.data
    },
    ...overviewQueryDefaults,
    enabled: statsReady,
  })

  const { data: recentDonations = [], isLoading: donationsLoading, isError: donationsError } =
    useQuery({
      queryKey: ['temple-overview-recent-donations', templeId, ranges.last30Start.toISOString(), ranges.endOfToday.toISOString()],
      queryFn: async () => {
        const res = await api.get<Donation[]>('/donations', {
          params: {
            templeId,
            startDate: ranges.last30Start.toISOString(),
            endDate: ranges.endOfToday.toISOString(),
          },
        })
        return Array.isArray(res.data) ? res.data : []
      },
      ...dashboardQueryDefaults,
      enabled: statsReady,
    })

  const { data: donorStats, isLoading: donorStatsLoading, isError: donorStatsError } = useQuery({
    queryKey: ['donor-stats', templeId, ranges.startOfMonth.toISOString()],
    queryFn: async () => {
      const res = await api.get<DonorStats>(`/donors/temple/${templeId}/stats`, {
        params: { monthStart: ranges.startOfMonth.toISOString() },
      })
      return res.data
    },
    ...dashboardQueryDefaults,
    enabled: statsReady,
  })

  const { data: changeRequests = [] } = useQuery({
    queryKey: ['donation-change-requests', 'my-temple', templeId],
    queryFn: async () => {
      const res = await api.get<ChangeRequest[]>('/donation-change-requests/my-temple')
      return Array.isArray(res.data) ? res.data : []
    },
    ...dashboardQueryDefaults,
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
    () => filterDailyByPeriod(daily, chartPeriod, ranges.todayYmd),
    [daily, chartPeriod, ranges.todayYmd],
  )

  const metrics = useMemo(
    () =>
      buildTempleMetrics({
        statsYtd,
        statsMonth,
        statsToday,
        statsPrevMonth,
        statsYesterday,
        statsPriorYtd,
        donorStats,
        deviceOnline: deviceSummary.online,
        recentDonations,
      }),
    [
      statsYtd,
      statsMonth,
      statsToday,
      statsPrevMonth,
      statsYesterday,
      statsPriorYtd,
      donorStats,
      deviceSummary.online,
      recentDonations,
    ],
  )

  const recentActivity = useMemo(() => buildRecentActivity(recentDonations), [recentDonations])
  const deviceHealth = useMemo(
    () => buildDeviceHealthRows(devices, recentDonations),
    [devices, recentDonations],
  )
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
    () => buildPerformanceSummary(chartData, recentDonations, ranges.timeZone),
    [chartData, recentDonations, ranges.timeZone],
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
    void queryClient.invalidateQueries({ queryKey: ['temple-overview-stats-prev-month', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-overview-stats-yesterday', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-overview-stats-prior-ytd', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-donations-overview', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['temple-overview-recent-donations', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['donor-stats', templeId] })
    void queryClient.invalidateQueries({ queryKey: ['devices-all', templeId] })
  }

  const isLoading =
    templeLoading ||
    (statsReady &&
      (statsYtdLoading ||
        statsMonthLoading ||
        statsTodayLoading ||
        statsPrevMonthLoading ||
        statsYesterdayLoading ||
        statsPriorYtdLoading ||
        overviewLoading ||
        donationsLoading ||
        devicesLoading ||
        donorStatsLoading))

  const hasError =
    templeError ||
    statsYtdError ||
    statsMonthError ||
    statsTodayError ||
    statsPrevMonthError ||
    statsYesterdayError ||
    statsPriorYtdError ||
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
