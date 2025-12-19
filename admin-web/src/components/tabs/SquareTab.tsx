'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface SquareTabProps {
  templeId: string
}

export default function SquareTab({ templeId }: SquareTabProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      const templeData = response.data
      console.log('[SquareTab] Fetched temple data:', {
        id: templeData?.id,
        squareMerchantId: templeData?.squareMerchantId,
        squareAccessToken: templeData?.squareAccessToken ? 'present' : 'null/empty',
        squareLocationId: templeData?.squareLocationId,
      })
      return templeData
    },
  })

  // Check for OAuth callback success/error from URL params
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const urlParams = new URLSearchParams(window.location.search)
    const squareConnected = urlParams.get('squareConnected')
    const squareError = urlParams.get('squareError')
    const connectedTempleId = urlParams.get('templeId')
    
    // Only show message if it's for this temple
    if (squareConnected === 'true' && connectedTempleId === templeId) {
      setSuccessMessage('Square account connected successfully!')
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      queryClient.invalidateQueries({ queryKey: ['temples'] })
      
      // Clean up URL params
      urlParams.delete('squareConnected')
      urlParams.delete('templeId')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      router.replace(newUrl)
      
      // Clear the message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    }
    
    if (squareError) {
      setErrorMessage(decodeURIComponent(squareError))
      
      // Clean up URL params
      urlParams.delete('squareError')
      const newUrl = window.location.pathname + (urlParams.toString() ? `?${urlParams.toString()}` : '')
      router.replace(newUrl)
      
      // Clear the message after 10 seconds
      setTimeout(() => setErrorMessage(null), 10000)
    }
  }, [templeId, queryClient, router])

  const handleConnectSquare = async () => {
    try {
      const response = await api.get('/square/connect', {
        params: { templeId },
      })
      window.location.href = response.data.oauthUrl
    } catch (error: any) {
      console.error('Failed to connect Square:', error)
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to initiate Square connection')
    }
  }

  const disconnectSquareMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/temples/${templeId}`, {
        squareMerchantId: null,
        squareAccessToken: null,
        squareRefreshToken: null,
        squareLocationId: null,
      })
    },
    onSuccess: async () => {
      // Invalidate queries first
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      queryClient.invalidateQueries({ queryKey: ['temples'] })
      
      // Force immediate refetch and wait for it to complete
      await queryClient.refetchQueries({ 
        queryKey: ['temple', templeId],
        exact: true 
      })
      
      setSuccessMessage('Square account disconnected successfully')
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to disconnect Square')
    },
  })

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect Square? Payment processing will be disabled.')) {
      disconnectSquareMutation.mutate()
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

  // Check if Square is connected - must have both merchant ID and access token (not null/empty)
  const isConnected = !!(
    temple?.squareMerchantId && 
    temple?.squareAccessToken && 
    temple.squareMerchantId !== null && 
    temple.squareAccessToken !== null &&
    temple.squareMerchantId !== '' &&
    temple.squareAccessToken !== ''
  )
  
  // Debug logging
  useEffect(() => {
    if (temple) {
      console.log('[SquareTab] Connection status check:', {
        squareMerchantId: temple.squareMerchantId,
        squareAccessToken: temple.squareAccessToken ? 'present' : 'null/empty',
        isConnected,
      })
    }
  }, [temple, isConnected])

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-green-800 font-medium">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <p className="text-red-800 font-medium">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white p-8 rounded-lg border border-gray-200">
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
          
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={handleDisconnect}
              disabled={disconnectSquareMutation.isPending}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              {disconnectSquareMutation.isPending ? 'Disconnecting...' : 'Disconnect Square'}
            </button>
          </div>
        </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Connect Square Account</h3>
              <p className="text-gray-700 mb-4">Connect your Square account to enable payment processing for donations. You'll be redirected to Square to authorize the connection.</p>
              <button
                onClick={handleConnectSquare}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors flex items-center space-x-2 text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Connect Square</span>
              </button>
            </div>
            
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Setup Instructions</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Create a Square Developer account at <a href="https://developer.squareup.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">developer.squareup.com</a></li>
                <li>Create a new application in the Square Developer Dashboard</li>
                <li>Configure the OAuth redirect URI: <code className="bg-white px-2 py-1 rounded text-xs font-mono">{typeof window !== 'undefined' ? `${window.location.origin}/api/square/callback` : 'YOUR_BACKEND_URL/api/square/callback'}</code></li>
                <li>Copy your Application ID and Application Secret</li>
                <li>Add them to your backend environment variables (Railway)</li>
                <li>Click "Connect Square" above to authorize</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

