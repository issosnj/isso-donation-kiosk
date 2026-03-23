'use client'

import { memo } from 'react'
import type { KioskTheme } from '@/types/theme'

interface PreviewProcessingProps {
  theme: KioskTheme
}

/**
 * Replicates ModernProcessingView:
 * - Loading spinner
 * - Amount display
 * - "Completing your donation" message
 */
function PreviewProcessing({ theme }: PreviewProcessingProps) {
  const { fonts, colors } = theme
  const accentColor = colors.proceedToPaymentButtonColor || '#FF9500'

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center"
      style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9fc 100%)',
        fontFamily: `${fonts.bodyFamily || 'Inter'}, sans-serif`,
      }}
    >
      {/* Spinner */}
      <div
        className="mb-6 h-24 w-24 animate-spin rounded-full border-4 border-t-transparent"
        style={{
          borderColor: `${accentColor}40`,
          borderTopColor: accentColor,
        }}
      />

      <p
        className="mb-2 text-center"
        style={{
          fontSize: `${fonts.headingSize || 32}px`,
          fontWeight: 600,
          color: colors.headingColor || '#423232',
          fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
        }}
      >
        Completing your donation
      </p>

      <p
        className="mb-2 text-center"
        style={{
          fontSize: `${(fonts.headingSize || 32) + 20}px`,
          fontWeight: 700,
          color: accentColor,
          fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
        }}
      >
        $100.00
      </p>

      <p
        style={{
          fontSize: `${fonts.bodySize || 14}px`,
          color: colors.subtitleColor || '#808080',
        }}
      >
        This usually takes a few seconds
      </p>
    </div>
  )
}

export default memo(PreviewProcessing)
