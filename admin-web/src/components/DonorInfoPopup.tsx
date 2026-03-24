'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'
import ReceiptView from './ReceiptView'

interface DonorInfoPopupProps {
  donorPhone: string
  donorName?: string | null
  donorEmail?: string | null
  donorAddress?: string | null
  donorId?: string
  templeId?: string
  isMasterAdmin?: boolean
  onClose: () => void
}

export default function DonorInfoPopup({
  donorPhone,
  donorName,
  donorEmail,
  donorAddress,
  donorId,
  templeId,
  isMasterAdmin = false,
  onClose,
}: DonorInfoPopupProps) {
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [resendingId, setResendingId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: donorName || '',
    email: donorEmail || '',
    address: donorAddress || '',
    phone: donorPhone,
  })
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([])
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const addressInputRef = useRef<HTMLInputElement>(null)
  const addressDropdownRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Fetch donations for this donor (pass donorId when available for better matching)
  const { data: donations = [], isLoading } = useQuery({
    queryKey: ['donations-by-donor', donorPhone, templeId, donorId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (templeId && isMasterAdmin) {
        params.append('templeId', templeId)
      }
      if (donorId) {
        params.append('donorId', donorId)
      }
      const response = await api.get(`/donations/by-donor/${encodeURIComponent(donorPhone)}?${params.toString()}`)
      return response.data
    },
    enabled: !!donorPhone,
  })

  // Fetch receipt data when viewing receipt
  const { data: receiptDetails } = useQuery({
    queryKey: ['receipt', viewingReceiptId],
    queryFn: async () => {
      const response = await api.get(`/donations/${viewingReceiptId}/receipt`)
      return response.data
    },
    enabled: !!viewingReceiptId,
  })

  const handleViewReceipt = async (donationId: string) => {
    setViewingReceiptId(donationId)
    try {
      const response = await api.get(`/donations/${donationId}/receipt`)
      setReceiptData(response.data)
    } catch (error) {
      console.error('Failed to load receipt:', error)
      alert('Failed to load receipt')
    }
  }

  const resendReceiptMutation = useMutation({
    mutationFn: async (donationId: string) => {
      const response = await api.post(`/donations/${donationId}/resend-receipt`)
      return response.data
    },
    onSuccess: () => {
      alert('Receipt email sent successfully!')
      setResendingId(null)
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to send receipt email')
      setResendingId(null)
    },
  })

  const handleResendReceipt = (donationId: string) => {
    if (confirm('Resend receipt email to this donor?')) {
      setResendingId(donationId)
      resendReceiptMutation.mutate(donationId)
    }
  }

  // Generate session token for Google Places API
  useEffect(() => {
    setSessionToken(crypto.randomUUID())
  }, [])

  // Update edit form when donor info changes
  useEffect(() => {
    setEditForm({
      name: donorName || '',
      email: donorEmail || '',
      address: donorAddress || '',
      phone: donorPhone,
    })
  }, [donorPhone, donorName, donorEmail, donorAddress])

  // Close address suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        addressInputRef.current &&
        !addressInputRef.current.contains(target) &&
        addressDropdownRef.current &&
        !addressDropdownRef.current.contains(target)
      ) {
        setAddressSuggestions([])
      }
    }

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isEditing])

  // Search addresses using Google Places API
  const searchAddresses = async (input: string) => {
    if (!input || input.length < 3) {
      setAddressSuggestions([])
      return
    }

    setIsSearchingAddresses(true)
    try {
      // Use the backend proxy endpoint (device endpoint, but we can use it from admin too)
      // Or create a public/admin endpoint for Places API
      const params = new URLSearchParams({
        input,
      })
      if (sessionToken) {
        params.append('sessionToken', sessionToken)
      }

      // For admin, we might need a different endpoint or use the device endpoint
      // Let's check if we need to create an admin endpoint or use the existing one
      const response = await api.get(`/places/autocomplete?${params.toString()}`)
      const predictions = response.data.predictions || []
      setAddressSuggestions(predictions.map((p: any) => p.description))
    } catch (error) {
      console.error('Failed to search addresses:', error)
      setAddressSuggestions([])
    } finally {
      setIsSearchingAddresses(false)
    }
  }

  // Get place details and update address
  const selectAddress = async (address: string) => {
    setEditForm({ ...editForm, address })
    setAddressSuggestions([])
    
    // Optionally get full place details
    try {
      // Find the place_id from the prediction
      const params = new URLSearchParams({ input: address })
      if (sessionToken) {
        params.append('sessionToken', sessionToken)
      }
      const autocompleteResponse = await api.get(`/places/autocomplete?${params.toString()}`)
      const prediction = autocompleteResponse.data.predictions?.find(
        (p: any) => p.description === address
      )
      
      if (prediction?.place_id) {
        const detailsParams = new URLSearchParams({
          placeId: prediction.place_id,
        })
        if (sessionToken) {
          detailsParams.append('sessionToken', sessionToken)
        }
        const detailsResponse = await api.get(`/places/details?${detailsParams.toString()}`)
        if (detailsResponse.data?.formatted_address) {
          setEditForm({ ...editForm, address: detailsResponse.data.formatted_address })
        }
      }
    } catch (error) {
      console.error('Failed to get place details:', error)
    }
  }

  // Update donor mutation
  const updateDonorMutation = useMutation({
    mutationFn: async (updates: { name?: string; email?: string; address?: string; phone?: string }) => {
      let id = donorId
      if (!id) {
        const endpoint = isMasterAdmin && templeId
          ? `/donors/temple/${templeId}`
          : '/donors/my-temple'
        const donorsResponse = await api.get(`${endpoint}?search=${encodeURIComponent(donorPhone)}`)
        const donors = donorsResponse.data.donors || []
        const donor = donors.find((d: any) => String(d.phone) === String(donorPhone).replace(/\D/g, ''))
        if (!donor) throw new Error('Donor not found')
        id = donor.id
      }
      const response = await api.put(`/donors/${id}`, updates)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations-by-donor', donorPhone] })
      queryClient.invalidateQueries({ queryKey: ['donors'] })
      queryClient.invalidateQueries({ queryKey: ['donor-stats'] })
      setIsEditing(false)
      alert('Donor information updated successfully!')
    },
    onError: (error: any) => {
      alert(error.response?.data?.message || 'Failed to update donor information')
    },
  })

  const handleSave = () => {
    updateDonorMutation.mutate(editForm)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (viewingReceiptId && receiptData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
            <h2 className="text-xl font-semibold text-gray-900">Receipt</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
              <a
                href={`/receipt?id=${viewingReceiptId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 flex items-center gap-2"
              >
                Open in new tab
              </a>
              <button
                onClick={() => {
                  setViewingReceiptId(null)
                  setReceiptData(null)
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="p-6">
            <ReceiptView
              donation={receiptData.donation}
              temple={receiptData.temple}
              receiptConfig={receiptData.receiptConfig}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-xl z-10">
          <h2 className="text-xl font-semibold text-gray-900">Donor Information</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Donor Info */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Edit
                </button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mailing Address</label>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={editForm.address}
                    onChange={(e) => {
                      setEditForm({ ...editForm, address: e.target.value })
                      searchAddresses(e.target.value)
                    }}
                    placeholder="Start typing an address..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  {addressSuggestions.length > 0 && (
                    <div
                      ref={addressDropdownRef}
                      className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {addressSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => selectAddress(suggestion)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-sm text-gray-900">{suggestion}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {isSearchingAddresses && (
                    <div className="absolute right-3 top-9">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    </div>
                  )}
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={updateDonorMutation.isPending}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {updateDonorMutation.isPending ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false)
                      setEditForm({
                        name: donorName || '',
                        email: donorEmail || '',
                        address: donorAddress || '',
                        phone: donorPhone,
                      })
                      setAddressSuggestions([])
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Name</label>
                  <p className="text-base text-gray-900">{donorName || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Phone</label>
                  <p className="text-base text-gray-900">{donorPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-base text-gray-900">{donorEmail || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Address</label>
                  <p className="text-base text-gray-900">{donorAddress || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Donation History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Donation History</h3>
              {!isLoading && donations.length > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600">
                    <span className="font-semibold text-gray-900">{donations.length}</span> donation{donations.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(donations.reduce((sum: number, d: any) => sum + Number(d.amount), 0))} total
                  </span>
                </div>
              )}
            </div>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-gray-600">Loading donations...</p>
              </div>
            ) : donations.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-500">No past donations found for this donor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Receipt #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {donations.map((donation: any) => (
                      <tr key={donation.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(donation.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 tabular-nums">
                          {donation.receiptNumber || (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 tabular-nums">
                          {formatCurrency(Number(donation.amount))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {donation.category?.name || 'General'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-3">
                            {donation.receiptNumber && (
                              <>
                                <button
                                  onClick={() => handleViewReceipt(donation.id)}
                                  className="text-purple-600 hover:text-purple-800 font-medium"
                                >
                                  View Receipt
                                </button>
                                <button
                                  onClick={() => handleResendReceipt(donation.id)}
                                  disabled={resendingId === donation.id}
                                  className="text-gray-600 hover:text-gray-800 text-sm disabled:opacity-50"
                                >
                                  {resendingId === donation.id ? 'Sending...' : 'Resend email'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

