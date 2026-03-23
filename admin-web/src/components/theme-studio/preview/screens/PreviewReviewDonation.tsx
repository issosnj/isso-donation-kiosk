'use client'

import type { KioskTheme } from '@/types/theme'

interface PreviewReviewDonationProps {
  theme: KioskTheme
  scale: number
}

export default function PreviewReviewDonation({ theme, scale }: PreviewReviewDonationProps) {
  const { fonts, colors, layout } = theme
  const s = (n: number) => n * scale

  return (
    <div
      className="flex h-full w-full flex-col p-4"
      style={{
        background: 'linear-gradient(to bottom, #ffffff, #f8f9fc)',
        fontFamily: fonts.bodyFamily || 'Inter, sans-serif',
      }}
    >
      <p
        style={{
          fontSize: s(layout.detailsAmountFontSize || 24),
          fontWeight: 600,
          color: layout.detailsTextColor,
          marginBottom: s(16),
        }}
      >
        Review Donation
      </p>
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(255,255,255,0.7)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex justify-between py-2">
          <span style={{ fontSize: s(14), color: colors.subtitleColor }}>Donation</span>
          <span style={{ fontSize: s(18), fontWeight: 600, color: layout.detailsAmountColor }}>
            $100.00
          </span>
        </div>
        <div className="border-t border-gray-200" />
        <div className="flex justify-between py-2">
          <span style={{ fontSize: s(14), fontWeight: 600, color: layout.detailsTextColor }}>
            Total
          </span>
          <span style={{ fontSize: s(28), fontWeight: 600, color: layout.detailsAmountColor }}>
            $100.00
          </span>
        </div>
      </div>
      <p
        className="mt-2 text-purple-600"
        style={{ fontSize: s(14) }}
      >
        Change Amount →
      </p>
      <div className="mt-4 flex-1 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.5)' }}>
        <p style={{ fontSize: s(14), color: colors.subtitleColor, marginBottom: s(8) }}>
          Optional Information
        </p>
        <div
          className="mb-2 rounded-xl px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.8)',
            border: `1px solid ${layout.detailsInputBorderColor}`,
          }}
        >
          <span style={{ fontSize: s(14), color: colors.subtitleColor }}>Name</span>
        </div>
        <div
          className="rounded-xl px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.8)',
            border: `1px solid ${layout.detailsInputBorderColor}`,
          }}
        >
          <span style={{ fontSize: s(14), color: colors.subtitleColor }}>Phone</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <div
          className="flex-1 rounded-xl py-3 text-center text-sm font-medium"
          style={{
            background: 'rgba(255,255,255,0.8)',
            border: `2px solid ${layout.detailsButtonColor}`,
            color: layout.detailsButtonColor,
          }}
        >
          Back to Donation
        </div>
        <div
          className="flex-1 rounded-xl py-3 text-center text-sm font-medium"
          style={{ background: colors.proceedToPaymentButtonColor, color: '#fff' }}
        >
          Proceed to Payment
        </div>
      </div>
    </div>
  )
}
