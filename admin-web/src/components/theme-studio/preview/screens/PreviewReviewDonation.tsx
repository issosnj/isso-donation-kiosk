'use client'

import { memo } from 'react'
import type { KioskTheme } from '@/types/theme'

interface PreviewReviewDonationProps {
  theme: KioskTheme
}

/**
 * Replicates ModernDonationDetailsView structure:
 * - Left: summary card (amount, total)
 * - Right: form fields (name, phone, etc.)
 * - Buttons: Back to Donation, Proceed to Payment
 */
function PreviewReviewDonation({ theme }: PreviewReviewDonationProps) {
  const { fonts, colors, layout } = theme
  const radius = layout.cornerRadius || 12

  const detailsBg = 'rgba(255,255,255,0.85)'
  const detailsBorder = layout.detailsInputBorderColor || '#CCCCCC'

  return (
    <div
      className="flex h-full w-full flex-col overflow-auto"
      style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fc 100%)',
        fontFamily: `${fonts.bodyFamily || 'Inter'}, sans-serif`,
      }}
    >
      <div
        className="flex flex-1 gap-6 overflow-hidden p-4"
        style={{
          padding: `${(layout.detailsPageTopPadding || 80) / 16}rem ${(layout.detailsPageSidePadding || 60) / 16}rem`,
          gap: `${(layout.detailsPageHorizontalSpacing || 40) / 16}rem`,
        }}
      >
        {/* Left: Summary card */}
        <div
          className="flex shrink-0 flex-col"
          style={{
            maxWidth: layout.detailsCardMaxWidth || 420,
            gap: `${(layout.detailsCardSpacing || 16) / 16}rem`,
          }}
        >
          <h2
            style={{
              fontSize: `${layout.detailsAmountFontSize || 56}px`,
              fontWeight: 600,
              color: layout.detailsAmountColor || colors.headingColor,
              fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
            }}
          >
            Review Donation
          </h2>
          <div
            className="rounded-2xl p-4"
            style={{
              background: detailsBg,
              border: `1px solid ${detailsBorder}`,
              borderRadius: `${radius + 4}px`,
              padding: `${(layout.detailsCardPadding || 24) / 16}rem`,
            }}
          >
            <div className="flex justify-between py-2">
              <span style={{ fontSize: `${layout.detailsLabelFontSize || 18}px`, color: colors.subtitleColor }}>
                Donation
              </span>
              <span
                style={{
                  fontSize: `${layout.detailsAmountFontSize || 56}px`,
                  fontWeight: 600,
                  color: layout.detailsAmountColor,
                  fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
                }}
              >
                $100.00
              </span>
            </div>
            <div style={{ borderTop: `1px solid ${detailsBorder}`, margin: '0.5rem 0' }} />
            <div className="flex justify-between py-2">
              <span
                style={{
                  fontSize: `${layout.detailsLabelFontSize || 18}px`,
                  fontWeight: 600,
                  color: layout.detailsTextColor,
                }}
              >
                Total
              </span>
              <span
                style={{
                  fontSize: `${layout.detailsAmountFontSize || 56}px`,
                  fontWeight: 600,
                  color: layout.detailsAmountColor,
                  fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
                }}
              >
                $100.00
              </span>
            </div>
          </div>
          <p
            style={{
              fontSize: `${fonts.bodySize || 14}px`,
              color: layout.detailsButtonColor || colors.proceedToPaymentButtonColor,
              fontWeight: 500,
            }}
          >
            Change Amount →
          </p>
        </div>

        {/* Right: Form fields */}
        <div
          className="flex flex-1 flex-col"
          style={{
            maxWidth: layout.donorFormMaxWidth || 420,
            gap: `${(layout.detailsCardSpacing || 16) / 16}rem`,
          }}
        >
          <p
            style={{
              fontSize: `${layout.detailsLabelFontSize || 18}px`,
              color: colors.subtitleColor,
              marginBottom: '0.25rem',
            }}
          >
            Optional Information
          </p>
          {['Name', 'Phone', 'Email', 'Address'].map((label) => (
            <div
              key={label}
              className="rounded-xl px-4 py-3"
              style={{
                background: detailsBg,
                border: `1px solid ${detailsBorder}`,
                borderRadius: `${radius}px`,
              }}
            >
              <span style={{ fontSize: `${layout.detailsInputFontSize || 18}px`, color: colors.subtitleColor }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom buttons */}
      <div
        className="flex gap-3 px-4 pb-4"
        style={{
          padding: `0 ${(layout.detailsPageSidePadding || 60) / 16}rem ${(layout.detailsPageBottomPadding || 40) / 16}rem`,
          gap: `${(layout.buttonSpacing || 12) / 16}rem`,
        }}
      >
        <div
          className="flex flex-1 items-center justify-center rounded-xl py-3 font-medium"
          style={{
            background: 'transparent',
            border: `2px solid ${layout.detailsButtonColor}`,
            color: layout.detailsButtonColor,
            fontSize: `${layout.detailsButtonFontSize || 22}px`,
            fontFamily: `${fonts.buttonFamily || 'Inter'}, sans-serif`,
            borderRadius: `${radius}px`,
          }}
        >
          Back to Donation
        </div>
        <div
          className="flex flex-1 items-center justify-center rounded-xl py-3 font-medium"
          style={{
            background: colors.proceedToPaymentButtonColor,
            color: colors.buttonTextColor || layout.detailsButtonTextColor || '#fff',
            fontSize: `${layout.detailsButtonFontSize || 22}px`,
            fontFamily: `${fonts.buttonFamily || 'Inter'}, sans-serif`,
            borderRadius: `${radius}px`,
          }}
        >
          Proceed to Payment
        </div>
      </div>
    </div>
  )
}

export default memo(PreviewReviewDonation)
