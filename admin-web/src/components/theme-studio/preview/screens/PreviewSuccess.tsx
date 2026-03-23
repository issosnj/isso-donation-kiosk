'use client'

import type { KioskTheme } from '@/types/theme'

interface PreviewSuccessProps {
  theme: KioskTheme
  scale: number
}

export default function PreviewSuccess({ theme, scale }: PreviewSuccessProps) {
  const { fonts, colors } = theme
  const s = (n: number) => n * scale

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center p-6"
      style={{
        background: 'linear-gradient(to bottom, #ffffff, #f0fdf4)',
        fontFamily: fonts.bodyFamily || 'Inter, sans-serif',
      }}
    >
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: '#22c55e' }}
      >
        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p
        style={{
          fontSize: s(28),
          fontWeight: 700,
          color: colors.headingColor,
          marginBottom: s(4),
        }}
      >
        Thank You
      </p>
      <p
        style={{
          fontSize: s(42),
          fontWeight: 600,
          color: colors.proceedToPaymentButtonColor,
          marginBottom: s(8),
        }}
      >
        $100.00
      </p>
      <p style={{ fontSize: s(14), color: colors.subtitleColor, textAlign: 'center' }}>
        Receipt has been sent to your email
      </p>
      <div
        className="mt-8 w-full max-w-[200px] rounded-xl py-3 text-center text-sm font-medium"
        style={{ background: colors.returnToHomeButtonColor, color: '#fff' }}
      >
        Return Home
      </div>
    </div>
  )
}
