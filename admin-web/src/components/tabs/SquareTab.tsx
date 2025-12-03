'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'

interface SquareTabProps {
  templeId: string
}

export default function SquareTab({ templeId }: SquareTabProps) {
  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      return response.data
    },
  })

  const handleConnectSquare = async () => {
    try {
      const response = await api.get('/square/connect', {
        params: { templeId },
      })
      window.location.href = response.data.oauthUrl
    } catch (error) {
      console.error('Failed to connect Square:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const isConnected = !!temple?.squareMerchantId

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Square Integration</h2>
      
      {isConnected ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-green-600">✓</span>
            <span className="font-medium">Connected to Square</span>
          </div>
          <div className="text-sm text-gray-600">
            <p>Merchant ID: {temple.squareMerchantId}</p>
            {temple.squareLocationId && (
              <p>Location ID: {temple.squareLocationId}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">Connect your Square account to process payments.</p>
          <button
            onClick={handleConnectSquare}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Connect Square
          </button>
        </div>
      )}
    </div>
  )
}

