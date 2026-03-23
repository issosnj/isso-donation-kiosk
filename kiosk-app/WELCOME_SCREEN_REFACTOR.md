# Welcome / Tap To Donate Screen — Layout Refactor

## Summary

Refactored the KioskHomeView layout for clarity, balance, and a premium feel. No branding colors changed; no features removed.

---

## Before vs After

### 1. Header Section

| Aspect | Before | After |
|--------|--------|-------|
| **Vertical height** | Loose spacing (xs between lines, 60pt top padding) | Tighter block: 6pt between temple/subtitle, 8pt before address |
| **Font sizes** | Hero 42pt, Page 32pt, Subsection 20pt | Hero 34pt, Page 26pt, Subsection 14pt (clearer hierarchy) |
| **Top padding** | 60pt default | 44pt default (theme can override) |
| **Address** | Same weight as other text | Secondary: 14pt, 90% opacity, separated by sm spacing |
| **Grouping** | Flat list | Temple name + subtitle in one group; address as separate element |

### 2. Main CTA (Tap To Donate)

| Aspect | Before | After |
|--------|--------|-------|
| **Spacer above** | 100pt max | 56pt max — CTA sits higher, less floating |
| **Layout** | HStack with Spacers on both sides | Single centered button, full-width frame |
| **Padding** | 20pt horizontal, 8pt vertical | 32pt horizontal, 24pt vertical |
| **Feel** | Floating | Anchored with stronger padding and position |

### 3. Background

| Aspect | Before | After |
|--------|--------|-------|
| **Image overlay** | None | Subtle gradient overlay (6%→2%→0% black) for text legibility |
| **Scope** | — | Only when using photo background (KioskHomeBackground or KioskBackground) |
| **Gradient fallback** | Unchanged | No overlay — gradient remains unchanged |

### 4. Bottom Utility Actions (WhatsApp, Observances)

| Aspect | Before | After |
|--------|--------|-------|
| **Icon size** | 32px | 24px |
| **Text** | 18pt, Inter-Medium | 14pt, Inter-Regular |
| **Separator** | 30px height, 30% opacity | 18px height, 20% opacity |
| **Container** | None | Capsule with white 12% opacity background |
| **Padding** | Direct positioning | 24pt horizontal, 8pt vertical inside capsule |
| **Placement** | Bottom-left | Bottom-left (unchanged) |

### 5. Top Bar

| Aspect | Before | After |
|--------|--------|-------|
| **Padding** | 20pt sides, 8pt top | 24pt sides, 16pt top |
| **Alignment** | `.top` | `.center` |
| **Status circles** | 12px, radius 4 | 10px, radius 2 |
| **Time font** | 18pt | 16pt (body size) |
| **Spacing** | 12pt between elements | 8pt (sm) |

---

## Files Modified

- `kiosk-app/ISSOKiosk/ISSOKiosk/Views/KioskHomeView.swift`

---

## Theme Override Compatibility

Admin theme values still apply where supported:

- `homeScreenHeaderTopPadding` — default 44
- `homeScreenSpacerMaxHeight` — default 56
- `homeScreenContentSpacing` — default 24
- `homeScreenBottomButtonsLeftPadding` — default 20
- `homeScreenBottomButtonsPadding` — default 40
