'use client'

import { useState } from 'react'
import type { KioskTheme } from '@/types/theme'
import PreviewWelcome from './screens/PreviewWelcome'
import PreviewDonationSelection from './screens/PreviewDonationSelection'
import PreviewReviewDonation from './screens/PreviewReviewDonation'
import PreviewProcessing from './screens/PreviewProcessing'
import PreviewSuccess from './screens/PreviewSuccess'

export type PreviewScreen = 'welcome' | 'donation' | 'review' | 'processing' | 'success'

const SCREENS: { id: PreviewScreen; label: string }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'donation', label: 'Donation' },
  { id: 'review', label: 'Review' },
  { id: 'processing', label: 'Processing' },
  { id: 'success', label: 'Success' },
]

interface KioskPreviewPanelProps {
  theme: KioskTheme
  className?: string
}

export default function KioskPreviewPanel({ theme, className = '' }: KioskPreviewPanelProps) {
  const [screen, setScreen] = useState<PreviewScreen>('welcome')
  const [scale, setScale] = useState(0.5)

  return (
    <div className={`flex flex-col rounded-xl border border-gray-200 bg-gray-50 shadow-lg ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <div className="flex flex-wrap gap-1">
          {SCREENS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScreen(s.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                screen === s.id
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Zoom</span>
          <select
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="rounded border border-gray-300 px-2 py-1 text-sm"
          >
            <option value={0.35}>35%</option>
            <option value={0.5}>50%</option>
            <option value={0.65}>65%</option>
            <option value={0.8}>80%</option>
          </select>
        </div>
      </div>

      {/* Device frame + preview */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-6">
        <div
          className="relative overflow-hidden rounded-[2rem] border-8 border-gray-800 shadow-2xl"
          style={{
            width: 390 * scale,
            height: 844 * scale,
            minWidth: 200,
            minHeight: 400,
          }}
        >
          <div
            className="absolute inset-0 overflow-hidden bg-white"
            style={{
              width: '100%',
              height: '100%',
            }}
          >
            {screen === 'welcome' && <PreviewWelcome theme={theme} scale={scale} />}
            {screen === 'donation' && <PreviewDonationSelection theme={theme} scale={scale} />}
            {screen === 'review' && <PreviewReviewDonation theme={theme} scale={scale} />}
            {screen === 'processing' && <PreviewProcessing theme={theme} scale={scale} />}
            {screen === 'success' && <PreviewSuccess theme={theme} scale={scale} />}
          </div>
        </div>
      </div>
    </div>
  )
}
