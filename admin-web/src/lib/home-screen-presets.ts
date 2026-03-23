/**
 * Maps structured home screen presets to pixel values for preview and kiosk app.
 * Single source of truth — no raw x/y; only preset-driven layout.
 */

export type HeroTextPosition = 'slightly-higher' | 'centered'
export type CtaPosition = 'centered' | 'lower-center'
export type UtilityBarLayout = 'split' | 'grouped-left' | 'grouped-right'

export function heroTopPadding(position: HeroTextPosition): number {
  return position === 'slightly-higher' ? 36 : 60
}

export function ctaSpacerHeight(position: CtaPosition): number {
  return position === 'centered' ? 48 : 80
}
