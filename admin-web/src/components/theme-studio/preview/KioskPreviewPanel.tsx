'use client'

import { useState, useRef, useEffect, useDeferredValue } from 'react'
import type { KioskTheme } from '@/types/theme'
import KioskPreviewRenderer, { type PreviewScreen } from './KioskPreviewRenderer'

const SCREENS: { id: PreviewScreen; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'donation-selection', label: 'Donation' },
  { id: 'review', label: 'Review' },
  { id: 'payment-processing', label: 'Payment' },
  { id: 'success', label: 'Success' },
]

const DESIGN_WIDTH = 1024
const DESIGN_HEIGHT = 640

interface KioskPreviewPanelProps {
  theme: KioskTheme
  className?: string
}

export default function KioskPreviewPanel({ theme, className = '' }: KioskPreviewPanelProps) {
  const [screen, setScreen] = useState<PreviewScreen>('welcome')
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  const deferredTheme = useDeferredValue(theme)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateScale = () => {
      const { clientWidth, clientHeight } = el
      if (clientWidth > 0 && clientHeight > 0) {
        const s = Math.min(clientWidth / DESIGN_WIDTH, clientHeight / DESIGN_HEIGHT)
        setScale(Math.min(1, Math.max(0.3, s)))
      }
    }

    updateScale()
    const ro = new ResizeObserver(updateScale)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-lg ${className}`}
    >
      {/* Screen switcher tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white px-4 py-2">
        {SCREENS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setScreen(s.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              screen === s.id
                ? 'bg-amber-100 text-amber-800'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* iPad landscape preview container */}
      <div
        ref={containerRef}
        className="flex flex-1 items-center justify-center overflow-hidden p-6"
        style={{ minHeight: 420 }}
      >
        <div
          className="relative flex overflow-hidden rounded-[24px] shadow-2xl"
          style={{
            width: '100%',
            maxWidth: DESIGN_WIDTH,
            aspectRatio: '16 / 10',
            background: deferredTheme.colors?.headingColor ? `${deferredTheme.colors.headingColor}08` : '#0a0a0a',
          }}
        >
          <div
            className="absolute overflow-hidden rounded-[24px]"
            style={{
              width: DESIGN_WIDTH,
              height: DESIGN_HEIGHT,
              left: '50%',
              top: '50%',
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
          >
            <KioskPreviewRenderer theme={deferredTheme} screen={screen} />
          </div>
        </div>
      </div>
    </div>
  )
}
