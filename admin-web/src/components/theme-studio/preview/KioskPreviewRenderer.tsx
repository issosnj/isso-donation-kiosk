'use client'

import { memo } from 'react'
import type { KioskTheme } from '@/types/theme'
import PreviewWelcome from './screens/PreviewWelcome'
import PreviewDonationSelection from './screens/PreviewDonationSelection'
import PreviewReviewDonation from './screens/PreviewReviewDonation'
import PreviewProcessing from './screens/PreviewProcessing'
import PreviewSuccess from './screens/PreviewSuccess'

export type PreviewScreen = 'welcome' | 'donation-selection' | 'review' | 'payment-processing' | 'success'

interface KioskPreviewRendererProps {
  theme: KioskTheme
  screen: PreviewScreen
}

/**
 * Renders the actual kiosk UI for a given screen using theme tokens.
 * Matches production app structure—no hardcoded styles.
 */
function KioskPreviewRenderer({ theme, screen }: KioskPreviewRendererProps) {
  switch (screen) {
    case 'welcome':
      return <PreviewWelcome theme={theme} />
    case 'donation-selection':
      return <PreviewDonationSelection theme={theme} />
    case 'review':
      return <PreviewReviewDonation theme={theme} />
    case 'payment-processing':
      return <PreviewProcessing theme={theme} />
    case 'success':
      return <PreviewSuccess theme={theme} />
    default:
      return <PreviewWelcome theme={theme} />
  }
}

export default memo(KioskPreviewRenderer)
