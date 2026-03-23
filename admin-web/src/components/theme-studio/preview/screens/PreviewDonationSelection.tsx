'use client'

import { memo } from 'react'
import type { KioskTheme } from '@/types/theme'

interface PreviewDonationSelectionProps {
  theme: KioskTheme
}

/**
 * Replicates DonationHomeView structure:
 * - Left: category list
 * - Right: amount grid + total + buttons
 * - Theme-driven colors and spacing
 */
function PreviewDonationSelection({ theme }: PreviewDonationSelectionProps) {
  const { fonts, colors, layout } = theme
  const radius = layout.cornerRadius || 12

  const categories = [
    { name: 'General Donation', selected: true },
    { name: 'Yajman Puja', selected: false },
  ]
  const amounts = [25, 50, 100, 250]
  const selectedAmount = 50

  return (
    <div
      className="flex h-full w-full"
      style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fc 100%)',
        fontFamily: `${fonts.bodyFamily || 'Inter'}, sans-serif`,
      }}
    >
      {/* Left: Categories */}
      <div
        className="flex flex-1 flex-col overflow-hidden"
        style={{
          maxWidth: layout.categoryBoxMaxWidth || 400,
          paddingLeft: `${(layout.donationSelectionPageLeftPadding || 40) / 16}rem`,
          paddingRight: `${(layout.categoryAmountSectionSpacing || 40) / 32}rem`,
        }}
      >
        <div
          className="mb-2"
          style={{
            paddingTop: `${(layout.categoryHeaderTopPadding || 80) / 16}rem`,
          }}
        >
          <h2
            style={{
              fontSize: `${fonts.headingSize || 32}px`,
              fontWeight: 600,
              color: colors.headingColor || '#423232',
              fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
            }}
          >
            Select Category
          </h2>
          <p
            className="mt-0.5"
            style={{
              fontSize: `${fonts.bodySize || 14}px`,
              color: colors.subtitleColor || '#808080',
            }}
          >
            Choose your donation category
          </p>
        </div>
        <div
          className="flex flex-col gap-2 overflow-auto"
          style={{ gap: `${(layout.buttonSpacing || 12) / 16}rem` }}
        >
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{
                background: cat.selected ? colors.categorySelectedColor : colors.categoryUnselectedColor,
                color: colors.buttonTextColor || '#fff',
                fontSize: `${fonts.bodySize || 14 + 2}px`,
                fontFamily: `${fonts.buttonFamily || 'Inter'}, sans-serif`,
                borderRadius: `${radius}px`,
                opacity: cat.selected ? 1 : 0.85,
              }}
            >
              {cat.name}
              <span className="opacity-70">›</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Amounts + total + buttons */}
      <div
        className="flex flex-1 flex-col"
        style={{
          paddingRight: `${(layout.donationSelectionPageRightPadding || 40) / 16}rem`,
          paddingLeft: `${(layout.categoryAmountSectionSpacing || 40) / 32}rem`,
        }}
      >
        <div
          style={{
            paddingTop: `${(layout.headerTopPadding || 80) / 16}rem`,
            paddingBottom: `${12 / 16}rem`,
          }}
        >
          <h2
            style={{
              fontSize: `${fonts.headingSize || 32}px`,
              fontWeight: 600,
              color: colors.headingColor || '#423232',
              fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
            }}
          >
            Select Amount
          </h2>
          <p
            className="mt-0.5"
            style={{
              fontSize: `${fonts.bodySize || 14}px`,
              color: colors.subtitleColor || '#808080',
            }}
          >
            Choose a preset donation amount
          </p>
        </div>

        {/* Amount grid */}
        <div
          className="grid flex-1 content-start gap-2"
          style={{
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: `${(layout.buttonSpacing || 12) / 16}rem`,
          }}
        >
          {amounts.map((amt) => (
            <div
              key={amt}
              className="flex items-center justify-center rounded-xl font-medium"
              style={{
                height: `${layout.amountButtonHeight || 70}px`,
                background: amt === selectedAmount ? colors.amountSelectedColor : colors.amountUnselectedColor,
                color: colors.buttonTextColor || '#fff',
                fontSize: `${fonts.buttonSize || 18}px`,
                fontFamily: `${fonts.buttonFamily || 'Inter'}, sans-serif`,
                borderRadius: `${radius}px`,
                opacity: amt === selectedAmount ? 1 : 0.85,
              }}
            >
              ${amt}
            </div>
          ))}

          {/* Custom amount row */}
          <div
            className="col-span-2 flex items-center justify-between rounded-xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: `1px solid ${colors.subtitleColor}30`,
              borderRadius: `${radius}px`,
            }}
          >
            <span style={{ fontSize: `${fonts.bodySize || 14}px`, color: colors.subtitleColor }}>
              Custom Amount
            </span>
            <span style={{ fontSize: `${fonts.bodySize || 14}px`, color: colors.subtitleColor, opacity: 0.6 }}>
              ✎
            </span>
          </div>
        </div>

        {/* Total + buttons */}
        <div
          className="mt-2 flex flex-col gap-2 pb-4"
          style={{
            gap: `${(layout.buttonSpacing || 12) / 16}rem`,
            paddingBottom: `${32 / 16}rem`,
          }}
        >
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: `${radius}px`,
            }}
          >
            <span style={{ fontSize: `${fonts.bodySize || 14}px`, color: colors.subtitleColor }}>
              Total
            </span>
            <span
              style={{
                fontSize: `${(fonts.headingSize || 32)}px`,
                fontWeight: 600,
                color: colors.quantityTotalColor || colors.headingColor,
                fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
              }}
            >
              $50.00
            </span>
          </div>
          <div className="flex gap-2" style={{ gap: `${(layout.buttonSpacing || 12) / 16}rem` }}>
            <div
              className="flex flex-1 items-center justify-center rounded-xl py-3 font-medium"
              style={{
                background: colors.returnToHomeButtonColor,
                color: colors.buttonTextColor || '#fff',
                fontSize: `${fonts.buttonSize || 18}px`,
                fontFamily: `${fonts.buttonFamily || 'Inter'}, sans-serif`,
                borderRadius: `${radius}px`,
              }}
            >
              Return Home
            </div>
            <div
              className="flex flex-1 items-center justify-center rounded-xl py-3 font-medium"
              style={{
                background: colors.proceedToPaymentButtonColor,
                color: colors.buttonTextColor || '#fff',
                fontSize: `${fonts.buttonSize || 18}px`,
                fontFamily: `${fonts.buttonFamily || 'Inter'}, sans-serif`,
                borderRadius: `${radius}px`,
              }}
            >
              Review Donation
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default memo(PreviewDonationSelection)
