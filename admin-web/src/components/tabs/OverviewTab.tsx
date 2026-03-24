'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { apiBaseURL } from '@/lib/api'
import { AlertCenter } from '@/components/alerts'
import { useOverviewData } from '@/hooks/useOverviewData'
import {
  ExecutiveHero,
  OverviewStatCards,
  DonationTrendsChart,
  TemplePerformanceSection,
  DeviceHealthSection,
} from '@/components/overview'

interface OverviewTabProps {
  templeId?: string
}

export default function OverviewTab({ templeId }: OverviewTabProps) {
  const isMasterAdmin = !templeId
  const [chartGranularity, setChartGranularity] = useState<
    'day' | 'week' | 'month'
  >('day')

  const {
    stats,
    trendData,
    templePerformance,
    deviceSummary,
    alertSummary,
    alerts,
    isLoading,
    devicesLoading,
    statsError,
    donationsError,
    devicesError,
  } = useOverviewData(chartGranularity)

  // Temple Admin: show simpler view
  if (!isMasterAdmin && templeId) {
    return (
      <TempleAdminOverview templeId={templeId} />
    )
  }

  // Warn when API may be misconfigured (production URL but API points to localhost)
  const apiMayBeMisconfigured =
    typeof window !== 'undefined' &&
    !window.location.hostname.includes('localhost') &&
    apiBaseURL.includes('localhost') &&
    (statsError || donationsError)

  // Master Admin: full executive dashboard
  return (
    <div className="space-y-8">
      {apiMayBeMisconfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <p className="text-sm font-medium">API may be misconfigured</p>
          <p className="text-xs mt-1">
            Set <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_API_URL</code> in Netlify environment variables to your backend URL (e.g. https://kiosk-backend.issousa.org/api).
          </p>
        </div>
      )}
      {/* 1. Executive hero */}
      <ExecutiveHero
        totalYtd={stats.totalYtd}
        trendDirection={stats.trendDirection}
        countYtd={stats.countYtd}
        isLoading={isLoading}
        isError={statsError}
      />

      {/* 2. Operational alerts */}
      {alertSummary.total > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            What needs attention
          </h2>
          <AlertCenter
            alerts={alerts}
            isLoading={false}
            emptyMessage="All systems normal"
          />
        </section>
      )}

      {alertSummary.total === 0 && (
        <section>
          <AlertCenter alerts={[]} isLoading={false} emptyMessage="All systems normal" />
        </section>
      )}

      {/* 3. Key metrics row */}
      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Key metrics</h2>
        <OverviewStatCards
          totalYtd={stats.totalYtd}
          countYtd={stats.countYtd}
          avgGift={stats.avgGift}
          isLoading={isLoading}
          isError={statsError}
        />
      </section>

      {/* 4. Donation trends + Temple performance + Device health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <DonationTrendsChart
            data={trendData}
            granularity={chartGranularity}
            onGranularityChange={setChartGranularity}
            isLoading={isLoading}
            isError={donationsError}
          />
        </div>
        <div className="lg:col-span-5 space-y-6">
          <DeviceHealthSection
            total={deviceSummary.total}
            online={deviceSummary.online}
            offline={deviceSummary.offline}
            needingAttention={deviceSummary.needingAttention}
            setupIssuesCount={alertSummary.warning + alertSummary.critical}
            isLoading={devicesLoading}
            isError={devicesError}
          />
          <TemplePerformanceSection
            temples={templePerformance}
            isLoading={isLoading}
            isError={donationsError}
          />
        </div>
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
      const endDate = new Date()
      const response = await api.get('/donations/stats', {
        params: {
          startDate: startOfYear.toISOString(),
          endDate: endDate.toISOString(),
        },
      })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (statsError) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-gray-600 font-medium">Unable to load statistics</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No statistics available</p>
        <p className="text-sm text-gray-400 mt-1">Statistics will appear here once donations are processed</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-100 text-sm font-medium mb-1">Congratulations! You have raised</p>
            <p className="text-4xl font-bold mb-1">${stats?.total?.toFixed(2) || '0.00'}</p>
            <p className="text-purple-100 text-sm">year to date</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Donations</h3>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.count || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Year to date</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Average Gift</h3>
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${stats?.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-gray-500 mt-2">Per donation</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-600 text-sm font-semibold uppercase tracking-wide">Total Donors</h3>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats?.count || 0}</p>
          <p className="text-xs text-gray-500 mt-2">Active donors</p>
        </div>
      </div>
    </div>
  )
}
