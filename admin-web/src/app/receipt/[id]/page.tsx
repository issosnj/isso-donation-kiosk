'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import ReceiptView from '@/components/ReceiptView'

export default function ReceiptPage() {
  const params = useParams()
  const donationId = params.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ['receipt', donationId],
    queryFn: async () => {
      const response = await api.get(`/donations/${donationId}/receipt`)
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load receipt</p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <ReceiptView
      donation={data.donation}
      temple={data.temple}
      receiptConfig={data.receiptConfig}
    />
  )
}

