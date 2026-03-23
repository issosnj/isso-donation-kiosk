# Kiosk Design System — Deliverable

## Overview

A unified design system layer has been added to standardize spacing, typography, and component sizing across all kiosk screens. **Colors were not changed** — only structure, spacing, and hierarchy.

---

## 1. Shared Styles / Theme Tokens

**New file:** `ISSOKiosk/Helpers/DesignSystem.swift`

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight gaps, vertical rhythm |
| `sm` | 8px | Inline spacing, icon gaps |
| `md` | 16px | Content padding, standard gaps |
| `lg` | 24px | Section spacing, modal padding |
| `xl` | 32px | Page margins, large spacing |
| `xxl` | 48px | Major section breaks |

### Typography Hierarchy

| Role | Size | Font | Usage |
|------|------|------|-------|
| Page title | 32pt | Inter-SemiBold | "Select Amount", "Review Donation" |
| Hero | 42pt | Inter-Bold | Welcome text |
| Section title | 24pt | Inter-SemiBold | Card headers |
| Subsection | 20pt | Inter-SemiBold | Quick actions, amount display |
| Body | 16pt | Inter-Regular | Primary content |
| Secondary | 14pt | Inter-Regular | Labels, captions |
| Button | 18pt | Inter-Medium | Button text |
| Input | 18pt | Inter-Regular | Form fields |
| Label | 14pt | Inter-Regular | Above inputs |

### Component Standards

| Component | Token | Value |
|-----------|-------|-------|
| Card corner radius | `cardCornerRadius` | 16px |
| Button corner radius | `buttonCornerRadius` | 12px |
| Chip corner radius | `chipCornerRadius` | 8px |
| Button height | `buttonHeight` | 56px |
| Input height | `inputHeight` | 56px |
| Modal padding (H) | `modalPaddingHorizontal` | 24px |
| Modal padding (V) | `modalPaddingVertical` | 24px |
| Section spacing | `sectionSpacing` | 24px |
| Inline spacing | `inlineSpacing` | 12px |
| Icon size | `iconSize` | 24px |
| Icon size (large) | `iconSizeLarge` | 32px |

### Layout Standards

| Token | Value | Usage |
|-------|-------|-------|
| `screenPadding` | 20px | Status bar, corners |
| `pageHorizontalPadding` | 40px | Page content sides |
| `pageTopPadding` | 60px | Content below status |
| `actionBottomPadding` | 32px | Primary actions |
| `bottomCornerPadding` | 48px | WhatsApp/observances |
| `cardPadding` | 24px | Card internal padding |

---

## 2. Files Modified

| File | Changes |
|------|---------|
| **Helpers/DesignSystem.swift** | **NEW** — Single source of truth for all tokens |
| **Views/KioskHomeView.swift** | Spacing, typography, layout tokens; WhatsApp/observances; Quick actions |
| **Views/DonationHomeView.swift** | Theme fallbacks, spacing, typography; CleanAmountButton, CleanCategoryButton, CleanCustomAmountField |
| **Views/DonationDetailsView.swift** | Theme fallbacks, card/button/input tokens, typography |
| **Views/CustomNumericKeypad.swift** | KeypadTheme defaults use DesignSystem |
| **Views/TextKeypadButton.swift** | Font, height, corner radius |
| **Views/NameKeypadView.swift** | Modal padding, typography, spacing |

---

## 3. Inconsistencies Fixed

### Before → After

| Issue | Before | After |
|-------|--------|-------|
| **Corner radii** | 8, 12, 16, 18, 20 used randomly | Cards: 16px; Buttons/inputs: 12px |
| **Button heights** | 60, 70 mixed | Standard 56px (theme can override) |
| **Section spacing** | 6, 8, 12, 16, 20, 24, 32, 40 | xs/sm/md/lg/xl scale |
| **Screen padding** | 7, 16, 20, 24, 32, 40, 50 | screenPadding (20), pageHorizontalPadding (40) |
| **Typography** | Ad hoc 14–64pt | Defined hierarchy (page/section/body/secondary) |
| **Modal padding** | 12, 16, 24, 32 | modalPaddingHorizontal (24), modalPaddingVertical (24) |
| **Input padding** | 16, 18, 20, 28 | Spacing.md (16), Spacing.xl (32) |
| **Icon sizes** | 10, 14, 16, 18, 20, 24, 32 | iconSize (24), iconSizeLarge (32) |
| **Quick action buttons** | 110×110, radius 18 | quickActionSize (110), cardCornerRadius (16) |
| **Bottom action padding** | 30, 50 | actionBottomPadding (32), bottomCornerPadding (48) |

### Cross-Screen Consistency

- **Welcome screen:** Uses DesignSystem for header, content spacing, bottom buttons
- **Donation screen:** Theme fallbacks use DesignSystem; amount/category buttons standardized
- **Review screen:** Card padding, input height, button styling aligned
- **Modals (keypads):** Modal padding, typography, spacing consistent
- **Payment screen:** Uses shared components (no structural changes in this pass)

---

## 4. Theme Override Behavior

Admin theme values still override DesignSystem when present:

- `headerTopPadding`, `categoryHeaderTopPadding` → fallback `pageTopPadding`
- `buttonSpacing`, `cornerRadius` → fallback `inlineSpacing`, `buttonCornerRadius`
- `donationSelectionPageLeftPadding` → fallback `pageHorizontalPadding`
- `detailsCardPadding`, `detailsCardSpacing` → fallback `cardPadding`, `Spacing.md`

This keeps admin control while providing consistent defaults.

---

## 5. Usage

```swift
// With GeometryProxy (responsive scaling)
.padding(.horizontal, geometry.scale(DesignSystem.Layout.screenPadding))
.font(.custom(DesignSystem.Typography.sectionTitleFont, size: geometry.scale(DesignSystem.Typography.sectionTitleSize)))

// Without geometry (fixed sizes in modals/overlays)
.frame(height: DesignSystem.Components.buttonHeight)
.cornerRadius(DesignSystem.Components.buttonCornerRadius)
```

---

*Design system applied. No color changes.*
