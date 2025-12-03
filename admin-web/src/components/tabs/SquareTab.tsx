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
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Square Integration</h2>
          <p className="text-sm text-gray-600 mt-1">Connect your Square account to process payments</p>
        </div>
      </div>
      
      {isConnected ? (
        <div className="space-y-6">
          <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-green-900">Connected to Square</p>
              <p className="text-sm text-green-700">Your account is successfully connected</p>
            </div>
          </div>
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Merchant ID</p>
              <p className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">{temple.squareMerchantId}</p>
            </div>
            {temple.squareLocationId && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Location ID</p>
                <p className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">{temple.squareLocationId}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-gray-700 mb-4">Connect your Square account to enable payment processing for donations.</p>
            <button
              onClick={handleConnectSquare}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 font-medium shadow-lg shadow-blue-500/20 transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Connect Square</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

