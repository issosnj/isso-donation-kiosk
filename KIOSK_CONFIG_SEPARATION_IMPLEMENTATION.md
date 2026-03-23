# Kiosk Configuration Separation — Implementation Summary

## Phase 2: Architecture Cleanup (Completed)

### Executive Summary

Completed the kiosk configuration separation cleanup and closed remaining architecture gaps:

1. **Device-authenticated kiosk config endpoint** — `GET /devices/kiosk-config` returns runtime-safe config (temple, showObservances) with device token auth only. Kiosks no longer depend on JWT-only temple endpoints.

2. **Runtime config refresh** — Kiosk app uses the new endpoint on launch, foreground/resume, and every 30 seconds. Config updates (showObservances, temple name/address, WhatsApp, observance source) apply without reactivation.

3. **Deprecated theme cleanup** — Removed `homeScreenObservanceVisible` from active usage in LayoutEditor, theme types, theme-utils, and PreviewWelcome. Kiosk uses `appState.showObservances` only. Backend/kiosk ThemeLayout retains the field for decoding compatibility only.

4. **Observance failure visibility** — Structured logging on calendar fetch failure; in-memory last-failure store; `GET /religious-events/observance-status` (Master Admin) for admin UI integration.

5. **Architecture** — Kiosks use kiosk-safe device-auth endpoints; design remains hardcoded in app.

---

## 1. Final Model Implemented

### Global (Hardcoded in Kiosk App)
- Colors, typography, spacing, button/card styles, layout structure, animation behavior, keyboard design — remain in `DesignSystem` and kiosk app code.

### Global Setting
- **`showObservances: boolean`** — stored in `global_settings.kioskBehavior`, controlled via Theme Tab → Kiosk Behavior.

### Temple-Specific Settings
- **`displayName`** → `temple.name` (Basic Info tab)
- **`formattedAddress`** → `temple.address` (Basic Info tab)
- **`whatsAppGroupUrl`** → `homeScreenConfig.whatsAppLink` (Kiosk Home tab)
- **`observanceCalendarUrl`** → `homeScreenConfig.observanceCalendarUrl` (Kiosk Home tab)
- **`eventsCalendarUrl`** → `homeScreenConfig.googleCalendarLink` (Kiosk Home tab)

---

## 2. Backend Files Changed

| File | Change |
|------|--------|
| `backend/src/global-settings/entities/global-settings.entity.ts` | Added `kioskBehavior: { showObservances?: boolean }` |
| `backend/src/global-settings/global-settings.service.ts` | Added `updateKioskBehavior()` |
| `backend/src/global-settings/global-settings.controller.ts` | Added `PATCH /global-settings/kiosk-behavior` |
| `backend/src/temples/entities/temple.entity.ts` | Added `observanceCalendarUrl` to `homeScreenConfig` |
| `backend/src/temples/dto/create-temple.dto.ts` | Added `observanceCalendarUrl` to `homeScreenConfig` |
| `backend/src/devices/devices.service.ts` | Inject `GlobalSettingsService`, include `showObservances` and `address` in activation response |
| `backend/src/devices/devices.module.ts` | Import `GlobalSettingsModule` |
| `backend/src/religious-events/religious-events.controller.ts` | `GET /religious-events/kiosk` passes `req.device.templeId` to service |
| `backend/src/religious-events/religious-events.service.ts` | Added `findUpcomingForKiosk(templeId)` — uses temple `observanceCalendarUrl` when set, else DB |
| `backend/src/religious-events/religious-events.module.ts` | Import `TemplesModule` |
| `backend/src/migrations/1739000000000-AddKioskBehaviorShowObservances.ts` | New migration for `kioskBehavior` column |

---

## 3. Admin UI Files Changed

| File | Change |
|------|--------|
| `admin-web/src/components/theme-studio/editors/LayoutEditor.tsx` | Removed "Show Observance" toggle from Utility Visibility |
| `admin-web/src/components/tabs/ThemeTab.tsx` | Added "Kiosk Behavior" tab with global "Show observances" toggle |
| `admin-web/src/components/tabs/KioskHomeTab.tsx` | Added fields: Observance Calendar URL, Events Calendar Link; updated form state and save logic |

---

## 4. Kiosk Files Changed

| File | Change |
|------|--------|
| `kiosk-app/.../AppState.swift` | Added `showObservances` property, persist/load from UserDefaults; set from activation response; guard `refreshReligiousEvents` and timer when `showObservances` is false |
| `kiosk-app/.../AppState.swift` | `DeviceActivationResponse` includes `showObservances: Bool?` |
| `kiosk-app/.../Views/KioskHomeView.swift` | Use `appState.showObservances` instead of `kioskTheme.layout.homeScreenObservanceVisible` |

---

## 5. Migrations Added

- **`1739000000000-AddKioskBehaviorShowObservances.ts`**
  - Adds `kioskBehavior` JSON column to `global_settings` with default `{"showObservances": true}`

Run with:
```bash
cd backend && npm run migration:run
```

---

## 6. New Endpoint(s) Added (Phase 2)

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /devices/kiosk-config` | Device token | Returns `{ showObservances, temple }` — kiosk-safe config only |
| `GET /religious-events/observance-status?templeId=` | JWT (Master Admin) | Returns `{ lastFailures }` — observance calendar fetch failures for admin |

## 7. Kiosk App Refresh Changes

- `loadTempleConfig()` now calls `getKioskConfig()` instead of `getTemple()`
- `refreshTempleConfig()` renamed to `refreshKioskConfig()`; uses `getKioskConfig()`
- Refresh triggers: app launch, scenePhase `.active` (foreground), theme refresh timer (30s)
- `showObservances` and temple config refresh without reactivation

## 8. Deprecated Theme Cleanup Completed

- Removed `homeScreenObservanceVisible` from LayoutEditor (already done in Phase 1)
- Removed from `ThemeLayout` interface, `DEFAULT_THEME`, `migrateLegacyLayout` in admin
- PreviewWelcome uses constant `true` for observance in mock (no theme dependency)
- Kiosk `ThemeLayout` keeps field for JSON decoding compat; not used for behavior

## 9. Observance Failure Visibility

- Structured log: `OBSERVANCE_CALENDAR_FETCH_FAILED` with templeId, templeName, error, fallback
- In-memory `lastObservanceFailure` map per temple
- `getLastObservanceFailure(templeId?)` for admin use
- `GET /religious-events/observance-status` returns last failures (ready for admin UI)

## 11. Files Changed (Phase 2)

| Area | File | Change |
|------|------|--------|
| Backend | `devices.controller.ts` | Added `GET /devices/kiosk-config` |
| Backend | `devices.service.ts` | Added `getKioskConfig()`, `toKioskSafeTemple()` |
| Backend | `religious-events.controller.ts` | Added `GET /religious-events/observance-status` |
| Backend | `religious-events.service.ts` | Structured logging, `lastObservanceFailure` map, `getLastObservanceFailure()` |
| Kiosk | `APIService.swift` | Added `getKioskConfig()` |
| Kiosk | `AppState.swift` | `KioskConfigResponse`; loadTempleConfig/refreshKioskConfig use getKioskConfig |
| Kiosk | `ISSOKioskApp.swift`, `DonationHomeView.swift`, `AdminMenuView.swift` | refreshKioskConfig() |
| Admin | `theme.ts` | Removed homeScreenObservanceVisible from ThemeLayout |
| Admin | `theme-utils.ts` | Removed from DEFAULT_THEME, migrateLegacyLayout |
| Admin | `PreviewWelcome.tsx` | showObservance = true (constant) |

## 12. Remaining Follow-up

1. **Admin UI for observance status** — Wire `GET /religious-events/observance-status` into a Kiosk Home or Religious Events tab to show calendar health.
2. **Persistence of observance failures** — Current store is in-memory; server restart clears it. Consider DB or Redis for durable status.
