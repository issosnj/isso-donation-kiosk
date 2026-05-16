'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTempleOverviewData } from '@/hooks/useTempleOverviewData'
import { exportTempleSummaryCsv } from '@/lib/templeOverviewDerivations'
import type { TempleChartPeriod } from '@/types/templeOverview'
import TempleOverviewHeader from './TempleOverviewHeader'
import TempleKPIGrid from './TempleKPIGrid'
import TempleDonationPerformanceChart from './TempleDonationPerformanceChart'
import TempleRecentActivity from './TempleRecentActivity'
import TempleDeviceHealthTable from './TempleDeviceHealthTable'
import TempleCategoryBreakdown from './TempleCategoryBreakdown'
import TempleDonorInsights from './TempleDonorInsights'
import TempleReceiptOps from './TempleReceiptOps'
import TempleNeedsAttention from './TempleNeedsAttention'

interface TempleOverviewDashboardProps {
  templeId: string
}

export default function TempleOverviewDashboard({ templeId }: TempleOverviewDashboardProps) {
  const router = useRouter()
  const [chartPeriod, setChartPeriod] = useState<TempleChartPeriod>('30d')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const {
    templeName,
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
    isLoading,
    hasError,
    refresh,
  } = useTempleOverviewData(templeId, chartPeriod)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    refresh()
    setTimeout(() => setIsRefreshing(false), 800)
  }

  const handleExport = () => {
    exportTempleSummaryCsv(templeName, metrics, performanceSummary)
  }

  const navigateTab = (tab: string) => router.push(`/dashboard?tab=${tab}`)

  if (hasError && !isLoading) {
    return (
      <div className="dashboard-card p-12 text-center max-w-lg mx-auto">
        <p className="text-sm font-medium text-gray-800">Unable to load temple overview</p>
        <p className="text-xs text-gray-500 mt-2">
          Check your connection and try again. Your temple data is scoped to your account.
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const displayTitle = isLoading ? 'Temple Overview' : `${templeName} Overview`

  return (
    <div className="space-y-5 -mt-1 min-w-0 pb-6">
      <TempleOverviewHeader
        title={displayTitle}
        subtitle="Track donations, kiosk health, donor activity, and receipt operations."
        statusChips={statusChips}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onViewDonations={() => navigateTab('donations')}
        isRefreshing={isRefreshing}
      />

      <TempleKPIGrid metrics={metrics} isLoading={isLoading} isError={hasError} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 min-w-0">
        <div className="xl:col-span-8 min-w-0">
          <TempleDonationPerformanceChart
            data={chartData}
            period={chartPeriod}
            onPeriodChange={setChartPeriod}
            summary={performanceSummary}
            isLoading={isLoading}
            isError={hasError}
          />
        </div>
        <div className="xl:col-span-4 min-w-0">
          <TempleRecentActivity
            items={recentActivity}
            isLoading={isLoading}
            isError={hasError}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
        <TempleDeviceHealthTable
          rows={deviceHealth}
          isLoading={isLoading}
          isError={hasError}
        />
        <TempleCategoryBreakdown
          rows={categoryBreakdown}
          isLoading={isLoading}
          isError={hasError}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 min-w-0">
        <TempleDonorInsights
          insights={donorInsights}
          isLoading={isLoading}
          isError={hasError}
        />
        <TempleReceiptOps summary={receiptOps} isLoading={isLoading} isError={hasError} />
        <TempleNeedsAttention alerts={alerts} isLoading={isLoading} />
      </div>
    </div>
  )
}
