'use client'

import { useEffect } from 'react'
import { format } from 'date-fns'

interface ReceiptViewProps {
  donation: any
  temple: any
  receiptConfig: any
}

// Helper function to convert number to words
function numberToWords(num: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
  
  if (num === 0) return 'zero'
  if (num < 20) return ones[num]
  if (num < 100) {
    const ten = Math.floor(num / 10)
    const one = num % 10
    return tens[ten] + (one > 0 ? ' ' + ones[one] : '')
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100)
    const remainder = num % 100
    return ones[hundred] + ' hundred' + (remainder > 0 ? ' ' + numberToWords(remainder) : '')
  }
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000)
    const remainder = num % 1000
    return numberToWords(thousand) + ' thousand' + (remainder > 0 ? ' ' + numberToWords(remainder) : '')
  }
  return num.toString()
}

export default function ReceiptView({ donation, temple, receiptConfig }: ReceiptViewProps) {
  useEffect(() => {
    // Set up print styles
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .receipt-container, .receipt-container * {
          visibility: visible;
        }
        .receipt-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const config = receiptConfig || {}
  const amount = Number(donation.amount)
  const amountInWords = config.showAmountInWords !== false 
    ? `${numberToWords(Math.floor(amount))} dollars${amount % 1 > 0 ? ` and ${Math.floor((amount % 1) * 100)} cents` : ''} only.`
    : ''

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="no-print mb-4 flex justify-between items-center">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={handlePrint}
          className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          🖨️ Print Receipt
        </button>
      </div>

      <div className="receipt-container bg-white max-w-4xl mx-auto p-8 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          {config.logoUrl && (
            <div className="flex-shrink-0">
              <img 
                src={config.logoUrl} 
                alt="Logo" 
                className="w-24 h-24 object-contain"
              />
            </div>
          )}
          <div className="flex-1 text-center">
            {config.headerTitle && (
              <h1 className="text-2xl font-bold mb-2">{config.headerTitle}</h1>
            )}
            {config.organizationName && (
              <h2 className="text-xl font-semibold mb-1">{config.organizationName}</h2>
            )}
            {config.organizationSubtitle && (
              <p className="text-sm text-gray-600 mb-2">{config.organizationSubtitle}</p>
            )}
            {temple.address && (
              <p className="text-sm text-gray-600 mt-1">{temple.address}</p>
            )}
            {config.showContactInfo !== false && (
              <div className="text-sm text-gray-600 mt-2">
                {config.phone && config.phone.trim() && <span>Phone: {config.phone}</span>}
                {config.phone && config.phone.trim() && config.email && config.email.trim() && <span> | </span>}
                {config.email && config.email.trim() && <span>Email: {config.email}</span>}
                {config.website && config.website.trim() && (
                  <>
                    {((config.phone && config.phone.trim()) || (config.email && config.email.trim())) && <span> | </span>}
                    <span>Visit: {config.website}</span>
                  </>
                )}
                {(!config.phone || !config.phone.trim()) && (!config.email || !config.email.trim()) && (!config.website || !config.website.trim()) && (
                  <span className="text-gray-400 italic">No contact information provided</span>
                )}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 w-24"></div>
        </div>

        {/* Receipt Number and Date */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <p className="text-sm text-gray-600">Receipt No:</p>
            <p className="text-lg font-semibold">{donation.receiptNumber || donation.id.substring(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Date:</p>
            <p className="text-lg font-semibold">{format(new Date(donation.createdAt), 'MM/dd/yyyy')}</p>
          </div>
        </div>

        {/* Recipient Information */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-1">Received From:</p>
          <p className="text-base font-semibold">{donation.donorName || 'Anonymous'}</p>
          {donation.donorName && donation.donorPhone && (
            <p className="text-sm text-gray-600 mt-1">
              {donation.donorPhone}
              {donation.donorEmail && ` | ${donation.donorEmail}`}
            </p>
          )}
        </div>

        {/* Transaction Details Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left py-2 px-4 font-semibold">Particulars</th>
                <th className="text-right py-2 px-4 font-semibold">Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2 px-4">{donation.category?.name || 'Donation/Aarti'}</td>
                <td className="py-2 px-4 text-right">{amount.toFixed(2)}</td>
              </tr>
              <tr className="border-t-2 border-gray-800 font-semibold">
                <td className="py-2 px-4">Total</td>
                <td className="py-2 px-4 text-right">${amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Amount in Words */}
        {amountInWords && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-1">Amount in Words:</p>
            <p className="text-base font-semibold capitalize">{amountInWords}</p>
          </div>
        )}

        {/* Payment Method */}
        {config.showPaymentMethod !== false && (
          <div className="mb-6">
            <p className="text-sm text-gray-600">Payment Method: Paid by Square</p>
            {donation.cardType && donation.cardLast4 && (
              <p className="text-sm text-gray-600 mt-1">
                Card: {donation.cardType} ending in {donation.cardLast4}
              </p>
            )}
            {config.showPreparedBy && config.preparedBy && (
              <p className="text-sm text-gray-600 mt-1">Prepared by: {config.preparedBy}</p>
            )}
          </div>
        )}

        {/* Custom Message */}
        {config.customMessage && (
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <p className="text-sm">{config.customMessage}</p>
          </div>
        )}

        {/* Thank You Message */}
        {config.thankYouMessage && (
          <div className="mb-6">
            <p className="text-sm text-center">{config.thankYouMessage}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t">
          {config.footerText && (
            <p className="text-sm text-center text-gray-600 mb-4">{config.footerText}</p>
          )}
          
          {/* Tax Exempt Information */}
          {config.includeTaxId && config.taxId && (
            <div className="text-center">
              <p className="text-xs text-gray-600">
                {config.organizationName || 'This organization'} (EIN#{config.taxId}) is recognized by IRS as 501(c)(3) tax exempt organization
                {config.website && `, please visit us at ${config.website}`}
              </p>
            </div>
          )}
          {config.taxExemptMessage && (
            <p className="text-xs text-center text-gray-600 mt-2">{config.taxExemptMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}

