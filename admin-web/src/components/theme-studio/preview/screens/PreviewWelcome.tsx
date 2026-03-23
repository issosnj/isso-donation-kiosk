'use client'

import { memo } from 'react'
import type { KioskTheme } from '@/types/theme'

interface PreviewWelcomeProps {
  theme: KioskTheme
}

/**
 * Replicates KioskHomeView structure:
 * - Temple background
 * - Top status area (battery, time)
 * - Centered title + subtitle
 * - Large CTA "Tap to Donate"
 * - Bottom utilities (WhatsApp, Observances)
 */
function PreviewWelcome({ theme }: PreviewWelcomeProps) {
  const { fonts, colors, layout } = theme
  const visible = (key: keyof typeof layout) => layout[key] !== false

  const headingColor = colors.headingColor || '#423232'
  const tapColor = colors.tapToDonateButtonColor || '#D4AF37'

  return (
    <div
      className="relative flex h-full w-full flex-col items-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f5f0e8 0%, #e8dfd0 50%, #d4c4a8 100%)',
        fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
      }}
    >
      {/* Legibility overlay (matches real app) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.01) 40%, transparent 100%)',
        }}
      />

      {/* Top red/gold header strip (temple brand bar) */}
      <div
        className="w-full"
        style={{
          height: '0.5rem',
          background: `linear-gradient(90deg, #8B2500 0%, #B22222 30%, ${colors.tapToDonateButtonColor || '#D4AF37'} 70%, #D4AF37 100%)`,
        }}
      />

      {/* Top status bar area */}
      <div className="flex w-full items-center justify-between px-[2%] pt-[1%]">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: headingColor, opacity: 0.6 }}
          />
          <span
            className="text-[0.9rem] font-medium"
            style={{ color: headingColor, opacity: 0.9 }}
          >
            10:42
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: '#22c55e' }}
          />
          <span
            className="text-[0.9rem] font-medium"
            style={{ color: headingColor, opacity: 0.9 }}
          >
            Connected
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-between w-full max-w-[85%] py-[2%]">
        {/* Title block */}
        {visible('homeScreenWelcomeTextVisible') && (
          <div
            className="text-center"
            style={{
              paddingTop: `${(layout.homeScreenHeaderTopPadding || 60) / 16}rem`,
            }}
          >
            <h1
              className="leading-tight"
              style={{
                fontSize: `${(fonts.headingSize || 32) + 4}px`,
                fontWeight: 700,
                color: headingColor,
                fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
              }}
            >
              Welcome to Shree Swaminarayan Temple
            </h1>
            {visible('homeScreenHeader1Visible') && (
              <p
                className="mt-1"
                style={{
                  fontSize: `${fonts.bodySize || 16}px`,
                  fontWeight: 600,
                  color: headingColor,
                  fontFamily: `${fonts.bodyFamily || 'Inter'}, sans-serif`,
                }}
              >
                ISSO · International Swaminarayan Satsang
              </p>
            )}
          </div>
        )}

        <div
          style={{
            minHeight: `${(layout.homeScreenSpacerMaxHeight || 80) / 16}rem`,
          }}
        />

        {/* Tap to Donate CTA */}
        {visible('homeScreenTapToDonateVisible') && (
          <div
            className="w-full max-w-[85%] rounded-[1.25rem] px-[4%] py-[3%] text-center shadow-lg transition-transform hover:scale-[1.02]"
            style={{
              background: layout.cornerRadius ? `linear-gradient(135deg, ${tapColor} 0%, ${tapColor}dd 100%)` : tapColor,
              color: colors.buttonTextColor || '#ffffff',
              fontSize: `${(fonts.buttonSize || 18) + 24}px`,
              fontWeight: 700,
              letterSpacing: '0.08em',
              fontFamily: `${fonts.buttonFamily || 'Inter'}, sans-serif`,
              boxShadow: `0 6px 24px ${tapColor}40`,
            }}
          >
            Tap to Donate
          </div>
        )}

        <div className="flex-1" />
      </div>

      {/* Bottom utilities: WhatsApp, Observances */}
      {visible('homeScreenWhatsAppButtonsVisible') && (
        <div
          className="absolute bottom-[3%] left-[2%] flex items-center gap-3 rounded-full px-[2%] py-[1%]"
          style={{
            background: 'rgba(255,255,255,0.25)',
            fontFamily: `${fonts.bodyFamily || 'Inter'}, sans-serif`,
          }}
        >
          <span
            className="text-[0.85rem] font-medium"
            style={{ color: headingColor }}
          >
            WhatsApp
          </span>
          <span
            className="text-sm opacity-60"
            style={{ color: headingColor }}
          >
            |
          </span>
          <span
            className="text-[0.85rem] font-medium"
            style={{ color: headingColor }}
          >
            Observances
          </span>
        </div>
      )}
    </div>
  )
}

export default memo(PreviewWelcome)
