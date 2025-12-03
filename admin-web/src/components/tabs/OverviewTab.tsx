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
    return <div>Loading...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm font-medium">Total Donations (7 days)</h3>
        <p className="text-3xl font-bold mt-2">${stats?.total?.toFixed(2) || '0.00'}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm font-medium">Number of Donations</h3>
        <p className="text-3xl font-bold mt-2">{stats?.count || 0}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-gray-500 text-sm font-medium">Average Donation</h3>
        <p className="text-3xl font-bold mt-2">
          ${stats?.count > 0 ? (stats.total / stats.count).toFixed(2) : '0.00'}
        </p>
      </div>
    </div>
  )
}

