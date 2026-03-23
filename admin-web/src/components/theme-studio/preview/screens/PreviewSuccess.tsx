'use client'

import { memo } from 'react'
import type { KioskTheme } from '@/types/theme'

interface PreviewSuccessProps {
  theme: KioskTheme
}

/**
 * Replicates payment success state:
 * - Checkmark
 * - Thank you + amount
 * - Return Home button
 */
function PreviewSuccess({ theme }: PreviewSuccessProps) {
  const { fonts, colors } = theme

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #f0fdf4 100%)',
        fontFamily: `${fonts.bodyFamily || 'Inter'}, sans-serif`,
      }}
    >
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: colors.proceedToPaymentButtonColor || '#22c55e' }}
      >
        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <p
        className="mb-1"
        style={{
          fontSize: `${fonts.headingSize || 32}px`,
          fontWeight: 700,
          color: colors.headingColor || '#423232',
          fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
        }}
      >
        Thank You
      </p>

      <p
        className="mb-2"
        style={{
          fontSize: `${(fonts.headingSize || 32) + 16}px`,
          fontWeight: 600,
          color: colors.proceedToPaymentButtonColor || '#22c55e',
          fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
        }}
      >
        $100.00
      </p>

      <p
        className="mb-6 text-center"
        style={{
          fontSize: `${fonts.bodySize || 14}px`,
          color: colors.subtitleColor || '#808080',
        }}
      >
        Receipt has been sent to your email
      </p>

      <div
        className="rounded-xl px-8 py-3 text-center font-medium"
        style={{
          background: colors.returnToHomeButtonColor,
          color: colors.buttonTextColor || '#fff',
          fontSize: `${fonts.buttonSize || 18}px`,
          fontFamily: `${fonts.buttonFamily || 'Inter'}, sans-serif`,
        }}
      >
        Return Home
      </div>
    </div>
  )
}

export default memo(PreviewSuccess)
