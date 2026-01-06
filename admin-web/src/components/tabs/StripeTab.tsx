'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import api from '@/lib/api'

interface StripeTabProps {
  templeId: string
}

export default function StripeTab({ templeId }: StripeTabProps) {
  const queryClient = useQueryClient()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [publishableKey, setPublishableKey] = useState('')
  const [locationId, setLocationId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const { data: temple, isLoading } = useQuery({
    queryKey: ['temple', templeId],
    queryFn: async () => {
      const response = await api.get(`/temples/${templeId}`)
      const templeData = response.data
      console.log('[StripeTab] Fetched temple data:', {
        id: templeData?.id,
        stripeAccountId: templeData?.stripeAccountId,
        stripePublishableKey: templeData?.stripePublishableKey ? 'present' : 'null/empty',
        stripeLocationId: templeData?.stripeLocationId,
      })
      if (templeData?.stripePublishableKey) {
        setPublishableKey(templeData.stripePublishableKey)
      }
      if (templeData?.stripeLocationId) {
        setLocationId(templeData.stripeLocationId)
      }
      return templeData
    },
  })

  const saveStripeMutation = useMutation({
    mutationFn: async (data: { stripePublishableKey: string; stripeLocationId?: string }) => {
      const response = await api.patch(`/temples/${templeId}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      queryClient.invalidateQueries({ queryKey: ['temples'] })
      setSuccessMessage('Stripe configuration saved successfully!')
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to save Stripe configuration')
      setTimeout(() => setErrorMessage(null), 10000)
    },
  })

  const disconnectStripeMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/temples/${templeId}`, {
        stripeAccountId: null,
        stripePublishableKey: null,
        stripeLocationId: null,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temple', templeId] })
      queryClient.invalidateQueries({ queryKey: ['temples'] })
      setPublishableKey('')
      setLocationId('')
      setSuccessMessage('Stripe disconnected successfully')
      setTimeout(() => setSuccessMessage(null), 5000)
    },
    onError: (error: any) => {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to disconnect Stripe')
      setTimeout(() => setErrorMessage(null), 10000)
    },
  })

  const handleSave = async () => {
    if (!publishableKey.trim()) {
      setErrorMessage('Please enter a Stripe Publishable Key')
      setTimeout(() => setErrorMessage(null), 5000)
      return
    }

    setIsSaving(true)
    try {
      await saveStripeMutation.mutateAsync({ 
        stripePublishableKey: publishableKey.trim(),
        stripeLocationId: locationId.trim() || undefined
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnect = () => {
    if (confirm('Are you sure you want to disconnect Stripe? Payment processing will be disabled.')) {
      disconnectStripeMutation.mutate()
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

  const isConnected = !!(
    temple?.stripePublishableKey &&
    temple.stripePublishableKey !== null &&
    temple.stripePublishableKey !== ''
  )

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
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 2.506.979 4.273 2.963 5.342 2.117 1.168 4.84 1.988 6.976 2.843 2.088.807 3.09 1.432 3.09 2.43 0 .98-.84 1.545-2.354 1.545-1.905 0-4.357-.915-5.93-1.738l-.9 5.555C8.219 22.99 10.059 24 13.997 24c2.652 0 4.855-.624 6.538-1.814 1.88-1.353 2.859-3.29 2.859-5.646 0-2.372-.942-4.15-2.861-5.392-1.931-1.24-4.766-2.105-6.557-2.608z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Stripe Integration</h2>
            <p className="text-sm text-gray-600 mt-1">Connect your Stripe account to process payments with M2 reader</p>
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
                <p className="font-semibold text-green-900">Stripe Configured</p>
                <p className="text-sm text-green-700">Your Stripe account is configured for Terminal payments</p>
              </div>
            </div>
            
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Publishable Key</p>
                <p className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                  {temple.stripePublishableKey?.substring(0, 20)}...
                </p>
              </div>
              {temple.stripeLocationId && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Terminal Location ID</p>
                  <p className="text-sm font-mono text-gray-900 bg-white px-3 py-2 rounded border border-gray-200">
                    {temple.stripeLocationId}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Update Configuration</h3>
              <div className="space-y-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stripe Publishable Key
                  </label>
                  <input
                    type="text"
                    value={publishableKey}
                    onChange={(e) => setPublishableKey(e.target.value)}
                    placeholder="pk_test_... or pk_live_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terminal Location ID <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    placeholder="tml_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Location ID from Stripe Dashboard → Terminal → Locations. If not set, one will be created automatically.
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !publishableKey.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isSaving ? 'Saving...' : 'Update Configuration'}
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleDisconnect}
                disabled={disconnectStripeMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {disconnectStripeMutation.isPending ? 'Disconnecting...' : 'Disconnect Stripe'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Configure Stripe</h3>
              <p className="text-gray-700 mb-4">Enter your Stripe Publishable Key to enable Terminal payments with M2 reader.</p>
              
              <div className="space-y-3 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stripe Publishable Key
                  </label>
                  <input
                    type="text"
                    value={publishableKey}
                    onChange={(e) => setPublishableKey(e.target.value)}
                    placeholder="pk_test_... or pk_live_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get this from <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Stripe Dashboard</a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terminal Location ID <span className="text-gray-500">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    placeholder="tml_..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Location ID from Stripe Dashboard → Terminal → Locations. If not set, one will be created automatically.
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !publishableKey.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 text-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Setup Instructions</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>Create a Stripe account at <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">dashboard.stripe.com</a></li>
                <li>Go to <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">API Keys</a> in Stripe Dashboard</li>
                <li>Copy your <strong>Publishable key</strong> (starts with <code className="bg-white px-1 py-0.5 rounded text-xs">pk_test_</code> or <code className="bg-white px-1 py-0.5 rounded text-xs">pk_live_</code>)</li>
                <li>Add your <strong>Secret key</strong> to backend environment: <code className="bg-white px-1 py-0.5 rounded text-xs">STRIPE_SECRET_KEY</code></li>
                <li>Paste the Publishable key above and click "Save Configuration"</li>
                <li>Register your M2 reader in Stripe Dashboard → Terminal → Readers</li>
                <li>Connect the reader through your iOS app - it will register automatically</li>
              </ol>
            </div>

            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-semibold text-yellow-900 mb-2 flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Important Notes</span>
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-yellow-800 mt-2">
                <li>Use <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs">pk_test_</code> keys for testing</li>
                <li>Use <code className="bg-yellow-100 px-1 py-0.5 rounded text-xs">pk_live_</code> keys for production</li>
                <li>M2 readers register automatically when connected via iOS app</li>
                <li>No manual registration needed in Dashboard (reader has no screen)</li>
                <li>Backend automatically creates Terminal locations for each temple</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
