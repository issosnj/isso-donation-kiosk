'use client'

import type { KioskTheme } from '@/types/theme'

interface PreviewDonationSelectionProps {
  theme: KioskTheme
  scale: number
}

export default function PreviewDonationSelection({ theme, scale }: PreviewDonationSelectionProps) {
  const { fonts, colors, layout } = theme
  const s = (n: number) => n * scale
  const radius = layout.cornerRadius || 12

  return (
    <div
      className="flex h-full w-full"
      style={{
        background: 'linear-gradient(to bottom, #ffffff, #f8f9fc)',
        fontFamily: fonts.bodyFamily || 'Inter, sans-serif',
      }}
    >
      {/* Left: Categories */}
      <div
        className="flex flex-1 flex-col p-3"
        style={{ maxWidth: s(layout.categoryBoxMaxWidth || 400) }}
      >
        <p
          style={{
            fontSize: s(fonts.headingSize || 24),
            fontWeight: 600,
            color: colors.headingColor,
            marginBottom: s(8),
          }}
        >
          Select Category
        </p>
        <div className="space-y-2">
          {['General Donation', 'Yajman Puja'].map((name, i) => (
            <div
              key={name}
              style={{
                padding: s(12),
                borderRadius: s(radius),
                background: i === 0 ? colors.categorySelectedColor : colors.categoryUnselectedColor,
                color: '#fff',
                fontSize: s(fonts.bodySize + 2),
              }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
      {/* Right: Amounts */}
      <div className="flex flex-1 flex-col p-3">
        <p
          style={{
            fontSize: s(fonts.headingSize || 24),
            fontWeight: 600,
            color: colors.headingColor,
            marginBottom: s(8),
          }}
        >
          Select Amount
        </p>
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: s(layout.buttonSpacing || 12),
          }}
        >
          {['$25', '$50', '$100', '$250'].map((amt, i) => (
            <div
              key={amt}
              style={{
                height: s(layout.amountButtonHeight || 56),
                borderRadius: s(radius),
                background: i === 1 ? colors.amountSelectedColor : colors.amountUnselectedColor,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: s(fonts.buttonSize + 2),
                fontWeight: 500,
              }}
            >
              {amt}
            </div>
          ))}
        </div>
        <div
          className="mt-4 flex items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
        >
          <span style={{ fontSize: s(14), color: colors.subtitleColor }}>Custom Amount</span>
        </div>
        <div className="mt-4 flex gap-2">
          <div
            className="flex-1 rounded-xl py-3 text-center text-sm font-medium"
            style={{ background: colors.returnToHomeButtonColor, color: '#fff' }}
          >
            Return Home
          </div>
          <div
            className="flex-1 rounded-xl py-3 text-center text-sm font-medium"
            style={{ background: colors.proceedToPaymentButtonColor, color: '#fff' }}
          >
            Review Donation
          </div>
        </div>
      </div>
    </div>
  )
}
