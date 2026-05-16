'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { apiBaseURL } from '@/lib/api'
import { useLastUpdated } from '@/hooks/useLastUpdated'
import { useOverviewData, type ChartGranularity } from '@/hooks/useOverviewData'
import { useLiveActivity } from '@/hooks/useLiveActivity'
import { usePlatformAlerts } from '@/hooks/usePlatformAlerts'
import {
  ExecutiveKPIGrid,
  LiveActivityFeed,
  KioskFleetPanel,
  SystemHealthPanel,
  PlatformAlertsPanel,
} from '@/components/ops-dashboard'
import { DonationTrendsChart, TemplePerformanceSection } from '@/components/overview'
import { formatCurrency, safeNumber } from '@/lib/formatters'

interface OverviewTabProps {
  templeId?: string
}

export default function OverviewTab({ templeId }: OverviewTabProps) {
  const isMasterAdmin = !templeId
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day')
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
  const lastUpdated = useLastUpdated()

  const {
    executiveKpis,
    sparklines,
    kpiTrends,
    systemHealth,
    devices,
    trendData,
    templePerformance,
    deviceSummary,
    statsLoading,
    donationsLoading,
    devicesLoading,
    statsError,
    donationsError,
    devicesError,
  } = useOverviewData(chartGranularity)

  const { alerts, dismiss, snooze } = usePlatformAlerts(devices)
  const activityEvents = useLiveActivity(devices, trendData, {
    failedCount: executiveKpis.failedTransactions,
    offlineCount: deviceSummary.offline,
  })

  if (!isMasterAdmin && templeId) {
    return <TempleAdminOverview templeId={templeId} />
  }

  const apiMayBeMisconfigured =
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    apiBaseURL.includes('localhost') &&
    (statsError || donationsError)

  return (
    <div className="space-y-5 -mt-1 min-w-0">
      {apiMayBeMisconfigured && (
        <div className="dashboard-card border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="text-sm font-medium">API may be misconfigured</p>
          <p className="text-xs mt-1">
            Set <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_API_URL</code> in environment
            variables to your backend URL.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Operations dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Nationwide kiosk fleet · donations · platform health
          </p>
        </div>
        {lastUpdated && (
          <p className="text-xs text-gray-400 font-medium tabular-nums">Last updated {lastUpdated}</p>
        )}
      </div>

      <ExecutiveKPIGrid
        kpis={executiveKpis}
        sparklines={sparklines}
        trends={kpiTrends}
        isLoading={statsLoading}
        isError={statsError}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        <div className="xl:col-span-8 min-w-0">
          <DonationTrendsChart
            data={trendData}
            granularity={chartGranularity}
            onGranularityChange={setChartGranularity}
            isLoading={donationsLoading}
            isError={donationsError}
          />
        </div>
        <div className="xl:col-span-4 min-w-0" id="live-activity">
          <LiveActivityFeed events={activityEvents} isLoading={donationsLoading || devicesLoading} />
        </div>
      </div>

      <KioskFleetPanel devices={devices} isLoading={devicesLoading} isError={devicesError} />

      <TemplePerformanceSection
        temples={templePerformance}
        isLoading={donationsLoading}
        isError={donationsError}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        <SystemHealthPanel metrics={systemHealth} isLoading={statsLoading || devicesLoading} />
        <PlatformAlertsPanel
          alerts={alerts}
          onDismiss={dismiss}
          onSnooze={snooze}
          filter={alertFilter}
          onFilterChange={setAlertFilter}
          isLoading={devicesLoading}
        />
      </div>
    </div>
  )
}

function TempleAdminOverview({ templeId }: { templeId: string }) {
  const { data: stats, isLoading, isError: statsError } = useQuery({
    queryKey: ['donation-stats', templeId],
    queryFn: async () => {
      const today = new Date()
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      const response = await api.get('/donations/stats', {
        params: {
          startDate: startOfYear.toISOString(),
          endDate: today.toISOString(),
        },
      })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="dashboard-card p-5 animate-pulse h-28" />
        ))}
      </div>
    )
  }

  if (statsError || !stats) {
    return (
      <div className="dashboard-card p-12 text-center text-gray-500">
        Unable to load temple overview.
      </div>
    )
  }

  const total = safeNumber(stats.total)
  const count = safeNumber(stats.count)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="dashboard-card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Raised YTD</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(total)}</p>
        </div>
        <div className="dashboard-card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Donations</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{count.toLocaleString()}</p>
        </div>
        <div className="dashboard-card p-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Average gift</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {count > 0 ? formatCurrency(total / count) : formatCurrency(0)}
          </p>
        </div>
      </div>
    </div>
  )
}
