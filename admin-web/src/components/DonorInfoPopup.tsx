'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { format } from 'date-fns'
import ReceiptView from './ReceiptView'

interface DonorInfoPopupProps {
  donorPhone: string
  donorName?: string | null
  donorEmail?: string | null
  donorAddress?: string | null
  templeId?: string
  isMasterAdmin?: boolean
  onClose: () => void
}

export default function DonorInfoPopup({
  donorPhone,
  donorName,
  donorEmail,
  donorAddress,
  templeId,
  isMasterAdmin = false,
  onClose,
}: DonorInfoPopupProps) {
  const [viewingReceiptId, setViewingReceiptId] = useState<string | null>(null)
  const [receiptData, setReceiptData] = useState<any>(null)

  // Fetch donations for this donor
  const { data: donations = [], isLoading } = useQuery({
    queryKey: ['donations-by-donor', donorPhone, templeId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (templeId && isMasterAdmin) {
        params.append('templeId', templeId)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (viewingReceiptId && receiptData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold">Receipt</h2>
            <button
              onClick={() => {
                setViewingReceiptId(null)
                setReceiptData(null)
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Donor Information</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Donor Info */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
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
          </div>

          {/* Past Donations */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Past Donations</h3>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="mt-2 text-gray-600">Loading donations...</p>
              </div>
            ) : donations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No past donations found for this donor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Receipt #
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {donations.map((donation: any) => (
                      <tr key={donation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {format(new Date(donation.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {donation.receiptNumber || (
                            <span className="text-gray-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-600">
                          {formatCurrency(Number(donation.amount))}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {donation.category?.name || 'General'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {donation.receiptNumber && (
                            <button
                              onClick={() => handleViewReceipt(donation.id)}
                              className="text-purple-600 hover:text-purple-800 hover:underline"
                            >
                              View Receipt
                            </button>
                          )}
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

