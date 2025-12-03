'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'

interface OverviewTabProps {
  templeId?: string
}

export default function OverviewTab({ templeId }: OverviewTabProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['donation-stats', templeId],
    queryFn: async () => {
      const today = new Date()
      const startOfWeek = new Date(today.setDate(today.getDate() - 7))
      const response = await api.get('/donations/stats', {
        params: {
          startDate: startOfWeek.toISOString(),
          endDate: new Date().toISOString(),
          ...(templeId && { templeId }),
        },
      })
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
        No statistics available for the selected period.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
        <h3 className="text-gray-500 text-sm font-medium">Total Donations (7 days)</h3>
        <p className="text-3xl font-bold mt-2 text-blue-600">${stats?.total?.toFixed(2) || '0.00'}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
        <h3 className="text-gray-500 text-sm font-medium">Number of Donations</h3>
        <p className="text-3xl font-bold mt-2 text-green-600">{stats?.count || 0}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
        <h3 className="text-gray-500 text-sm font-medium">Average Donation</h3>
        <p className="text-3xl font-bold mt-2 text-purple-600">
          ${stats?.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}
        </p>
      </div>
    </div>
  )
}

