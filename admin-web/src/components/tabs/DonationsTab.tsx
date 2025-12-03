'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'

interface DonationsTabProps {
  templeId?: string
}

export default function DonationsTab({ templeId }: DonationsTabProps) {
  const { data: donations, isLoading } = useQuery({
    queryKey: ['donations', templeId],
    queryFn: async () => {
      const response = await api.get('/donations', {
        params: templeId ? { templeId } : {},
      })
      return response.data
    },
  })

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Donor</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {donations?.map((donation: any) => (
            <tr key={donation.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {format(new Date(donation.createdAt), 'MMM dd, yyyy HH:mm')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                ${donation.amount.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {donation.category?.name || 'General'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  donation.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' :
                  donation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {donation.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {donation.donorName || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

