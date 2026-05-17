'use client'

import { useState } from 'react'
import { apiBaseURL } from '@/lib/api'
import { TempleOverviewDashboard } from '@/components/temple-overview'
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

interface OverviewTabProps {
  templeId?: string
}

export default function OverviewTab({ templeId }: OverviewTabProps) {
  if (templeId) {
    return <TempleOverviewDashboard templeId={templeId} />
  }

  return <MasterOverviewTab />
}

function MasterOverviewTab() {
  const [chartGranularity, setChartGranularity] = useState<ChartGranularity>('day')
  const [alertFilter, setAlertFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all')
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

      <ExecutiveKPIGrid
        kpis={executiveKpis}
        sparklines={sparklines}
        trends={kpiTrends}
        isLoading={statsLoading}
        isError={statsError}
      />

      <div className="ops-chart-row min-w-0">
        <div className="min-w-0">
          <DonationTrendsChart
            data={trendData}
            granularity={chartGranularity}
            onGranularityChange={setChartGranularity}
            isLoading={donationsLoading}
            isError={donationsError}
          />
        </div>
        <div className="min-w-0" id="live-activity">
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
