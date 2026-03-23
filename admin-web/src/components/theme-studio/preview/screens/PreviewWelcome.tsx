'use client'

import { memo } from 'react'
import type { KioskTheme } from '@/types/theme'
import { heroTopPadding, ctaSpacerHeight } from '@/lib/home-screen-presets'

interface PreviewWelcomeProps {
  theme: KioskTheme
}

/**
 * Replicates KioskHomeView structure for iPad landscape.
 * Uses preset-based layout — no raw x/y.
 */
function PreviewWelcome({ theme }: PreviewWelcomeProps) {
  const { fonts, colors, layout } = theme
  const heroPos = layout.homeScreenHeroTextPosition ?? 'slightly-higher'
  const ctaPos = layout.homeScreenCtaPosition ?? 'centered'
  const utilityLayout = layout.homeScreenUtilityBarLayout ?? 'split'

  const showWhatsApp = layout.homeScreenWhatsAppVisible ?? true
  const showObservance = layout.homeScreenObservanceVisible ?? true
  const showLanguage = layout.homeScreenLanguageSelectorVisible ?? true
  const hasLeftUtilities = showWhatsApp || showObservance

  const headingColor = colors.headingColor || '#423232'
  const tapColor = colors.tapToDonateButtonColor || '#D4AF37'

  const heroTop = heroTopPadding(heroPos)
  const spacerHeight = ctaSpacerHeight(ctaPos)

  return (
    <div
      className="relative flex h-full w-full flex-col items-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #f5f0e8 0%, #e8dfd0 50%, #d4c4a8 100%)',
        fontFamily: `${fonts.headingFamily || 'Inter'}, sans-serif`,
      }}
    >
      {/* Legibility overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.01) 40%, transparent 100%)',
        }}
      />

      {/* Top brand strip */}
      <div
        className="w-full"
        style={{
          height: '0.5rem',
          background: `linear-gradient(90deg, #8B2500 0%, #B22222 30%, ${colors.tapToDonateButtonColor || '#D4AF37'} 70%, #D4AF37 100%)`,
        }}
      />

      {/* Top status bar */}
      <div className="flex w-full items-center justify-between px-[2%] pt-[1%]">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: headingColor, opacity: 0.6 }} />
          <span className="text-[0.9rem] font-medium" style={{ color: headingColor, opacity: 0.9 }}>10:42</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-[0.9rem] font-medium" style={{ color: headingColor, opacity: 0.9 }}>Connected</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-between w-full max-w-[85%] py-[2%]">
        {layout.homeScreenWelcomeTextVisible !== false && (
          <div className="text-center" style={{ paddingTop: `${heroTop / 16}rem` }}>
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
            {layout.homeScreenHeader1Visible !== false && (
              <p className="mt-1" style={{ fontSize: `${fonts.bodySize || 16}px`, fontWeight: 600, color: headingColor }}>
                ISSO · International Swaminarayan Satsang
              </p>
            )}
          </div>
        )}

        <div style={{ minHeight: `${spacerHeight / 16}rem` }} />

        {layout.homeScreenTapToDonateVisible !== false && (
          <div
            className="w-full max-w-[85%] rounded-[1.25rem] px-[4%] py-[3%] text-center shadow-lg"
            style={{
              background: `linear-gradient(135deg, ${tapColor} 0%, ${tapColor}dd 100%)`,
              color: colors.buttonTextColor || '#ffffff',
              fontSize: `${(fonts.buttonSize || 18) + 24}px`,
              fontWeight: 700,
              letterSpacing: '0.08em',
              boxShadow: `0 6px 24px ${tapColor}40`,
            }}
          >
            Tap to Donate
          </div>
        )}

        <div className="flex-1" />
      </div>

      {/* Utility bar — preset-driven layout */}
      {(hasLeftUtilities || showLanguage) && (
        <div
          className={`absolute bottom-[3%] left-[2%] right-[2%] flex items-center gap-3 rounded-full px-[2%] py-[1%] ${
            utilityLayout === 'grouped-left' ? 'justify-start' : utilityLayout === 'grouped-right' ? 'justify-end' : 'justify-between'
          }`}
          style={{
            background: 'rgba(255,255,255,0.25)',
            fontFamily: `${fonts.bodyFamily || 'Inter'}, sans-serif`,
          }}
        >
          {hasLeftUtilities && (
            <div className="flex items-center gap-3">
              {showWhatsApp && <span className="text-[0.85rem] font-medium" style={{ color: headingColor }}>WhatsApp</span>}
              {showWhatsApp && showObservance && <span className="opacity-60">|</span>}
              {showObservance && <span className="text-[0.85rem] font-medium" style={{ color: headingColor }}>Observances</span>}
            </div>
          )}
          {utilityLayout === 'split' && <div className="flex-1" />}
          {showLanguage && <span className="text-[0.85rem] font-medium" style={{ color: headingColor }}>EN | ગુજરાતી</span>}
        </div>
      )}
    </div>
  )
}

export default memo(PreviewWelcome)
