'use client'

import type { KioskTheme } from '@/types/theme'

interface PreviewProcessingProps {
  theme: KioskTheme
  scale: number
}

export default function PreviewProcessing({ theme, scale }: PreviewProcessingProps) {
  const { fonts, colors } = theme
  const s = (n: number) => n * scale

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-6"
      style={{
        background: 'linear-gradient(to bottom, #ffffff, #f8f9fc)',
        fontFamily: fonts.bodyFamily || 'Inter, sans-serif',
      }}
    >
      <div
        className="mb-6 flex h-24 w-24 animate-spin items-center justify-center rounded-full border-4 border-t-transparent"
        style={{
          borderColor: `${colors.proceedToPaymentButtonColor}40`,
          borderTopColor: colors.proceedToPaymentButtonColor,
        }}
      />
      <p
        style={{
          fontSize: s(24),
          fontWeight: 600,
          color: colors.headingColor,
          marginBottom: s(8),
        }}
      >
        Completing your donation
      </p>
      <p
        style={{
          fontSize: s(48),
          fontWeight: 600,
          color: colors.proceedToPaymentButtonColor,
          marginBottom: s(8),
        }}
      >
        $100.00
      </p>
      <p style={{ fontSize: s(14), color: colors.subtitleColor }}>
        This usually takes a few seconds
      </p>
    </div>
  )
}
