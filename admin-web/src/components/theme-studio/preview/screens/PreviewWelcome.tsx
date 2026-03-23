'use client'

import type { KioskTheme } from '@/types/theme'

interface PreviewWelcomeProps {
  theme: KioskTheme
  scale: number
}

export default function PreviewWelcome({ theme, scale }: PreviewWelcomeProps) {
  const { fonts, colors, layout } = theme
  const s = (n: number) => n * scale
  const visible = (key: keyof typeof layout) => layout[key] !== false

  return (
    <div
      className="flex h-full w-full flex-col items-center"
      style={{
        background: 'linear-gradient(to bottom, #ffffff, #f2f4f8)',
        fontFamily: fonts.bodyFamily || 'Inter, sans-serif',
      }}
    >
      {/* Top red/gold bar placeholder */}
      <div
        className="w-full"
        style={{
          height: s(60),
          background: 'linear-gradient(135deg, #8B4513, #D4AF37)',
        }}
      />
      <div className="flex-1 w-full flex flex-col items-center justify-between py-4 px-4">
        {visible('homeScreenWelcomeTextVisible') && (
          <div className="text-center" style={{ marginTop: s(layout.homeScreenHeaderTopPadding || 44) }}>
            <p
              style={{
                fontSize: s(28),
                fontWeight: 700,
                color: colors.headingColor,
                lineHeight: 1.2,
              }}
            >
              Welcome to Shree Swaminarayan Temple
            </p>
            {visible('homeScreenHeader1Visible') && (
              <p
                style={{
                  fontSize: s(22),
                  fontWeight: 600,
                  color: colors.headingColor,
                  marginTop: s(6),
                }}
              >
                ISSO · International Swaminarayan Satsang
              </p>
            )}
          </div>
        )}
        <div className="flex-1" style={{ minHeight: s(layout.homeScreenSpacerMaxHeight || 56) }} />
        {visible('homeScreenTapToDonateVisible') && (
          <div
            className="rounded-xl px-8 py-4 text-center shadow-lg"
            style={{
              background: colors.tapToDonateButtonColor,
              color: '#fff',
              fontSize: s(fonts.buttonSize + 20),
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            Tap To Donate
          </div>
        )}
        {visible('homeScreenWhatsAppButtonsVisible') && (
          <div
            className="mt-4 flex gap-2 rounded-full px-4 py-2"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <span style={{ fontSize: s(12), color: colors.headingColor }}>WhatsApp</span>
            <span style={{ fontSize: s(12), color: colors.headingColor }}>Observances</span>
          </div>
        )}
      </div>
    </div>
  )
}
