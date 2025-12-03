'use client'

import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'

export default function TemplesTab() {
  const { data: temples, isLoading } = useQuery({
    queryKey: ['temples'],
    queryFn: async () => {
      const response = await api.get('/temples')
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Square Connected</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Devices</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {temples?.map((temple: any) => (
            <tr key={temple.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{temple.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{temple.address || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  temple.squareMerchantId ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {temple.squareMerchantId ? 'Yes' : 'No'}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {temple.devices?.length || 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

