# Kiosk Configuration Separation — Audit & Recommendations

**Date:** 2025-03-23  
**Goal:** Standardize kiosk configuration with clear separation: global hardcoded design, global behavior, temple-specific content.

---

## 1. Current State Audit

### 1.1 Observance Visibility — Where It Is Controlled

| Location | Type | Scope | Notes |
|----------|------|-------|-------|
| `kioskTheme.layout.homeScreenObservanceVisible` | Theme layout | Per-theme (effectively global) | Stored in `global-settings.kioskTheme.layout`; Theme Studio LayoutEditor has "Show Observance" toggle |
| `kioskTheme.layout.homeScreenWhatsAppButtonsVisible` | Legacy fallback | Same | Used when `homeScreenObservanceVisible` is undefined |
| `KioskHomeView.swift` L275 | Consumes | Temple | `appState.temple?.kioskTheme?.layout?.homeScreenObservanceVisible` — theme is merged from global → temple |
| `PreviewWelcome.tsx` L22 | Consumes | Theme Studio preview | `layout.homeScreenObservanceVisible` |

**Finding:** Observance visibility lives in **theme layout**. Because `global-settings.kioskTheme` overrides all temples (temples.service L134–136), it behaves globally. However, the field is nested in theme, which mixes design (colors, layout) with behavior (visibility). The model assumes it could be per-temple if a temple had its own theme override.

### 1.2 Observance Calendar Source — Where It Is Stored

| Location | Type | Scope | Notes |
|----------|------|-------|-------|
| `ReligiousEvent.googleCalendarLinks` | Entity field | **Global** | Each ReligiousEvent has `googleCalendarLinks: string[]` for sync; no templeId on ReligiousEvent |
| `religious_events` table | Entity | **Global** | Master Admin only; same list for all temples |
| `GET /religious-events/kiosk` | API | **Global** | Returns all religious events; no temple filter |
| `homeScreenConfig.googleCalendarLink` | Temple JSON | **Per-temple** | Used for **general Events** (UnifiedCalendarEventsView), NOT observances |

**Finding:** There are two distinct calendar concepts:

1. **Events (general)** — `homeScreenConfig.googleCalendarLink` — temple-specific; powers "Events" button/modal (UnifiedCalendarEventsView).
2. **Observances (religious)** — `religious_events` table — global; powers "Observances" button/modal (ReligiousEventsView). ReligiousEvent entities have `googleCalendarLinks` for syncing from Google Calendar into the global list. There is **no temple-specific observance calendar source**.

### 1.3 Incorrect Assumptions

- **Observance visibility is temple-specific:** It is stored in theme layout; when theme is global it behaves globally, but the schema allows per-temple overrides. User wants it explicitly global.
- **Observances use temple calendar:** Observances come from a global `religious_events` list. No per-temple observance calendar exists.
- **Kiosk Home tab has full temple config:** KioskHomeTab only edits `idleTimeoutSeconds`, `whatsAppLink`, `presetAmounts`. It does NOT edit temple name, address, or `googleCalendarLink`. Those are in TemplesTab and EventsCalendarTab.

### 1.4 Current Temple-Specific vs Global (Summary)

| Setting | Current Location | Current Scope |
|---------|------------------|---------------|
| Temple name | `temple.name` | Per-temple ✓ |
| Temple address | `temple.address` | Per-temple ✓ |
| WhatsApp link | `homeScreenConfig.whatsAppLink` | Per-temple ✓ |
| Events calendar | `homeScreenConfig.googleCalendarLink` | Per-temple ✓ |
| Observance visibility | `kioskTheme.layout.homeScreenObservanceVisible` | Theme (effectively global) |
| Observance data source | `religious_events` table (no temple filter) | Global (no per-temple option) |
| Design (colors, typography, etc.) | `kioskTheme` | Theme Studio (admin-controlled) — user wants hardcoded |

---

## 2. Recommended Final Config Model

### 2.1 Global (Hardcoded in Kiosk App)

- Colors, typography, spacing, button styles, card styles
- Layout structure, animation behavior, keyboard design  
- **No admin control** — design is fixed in `DesignSystem` and view code

### 2.2 Global Behavior Settings

| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `showObservances` | boolean | `true` | Single global toggle; same for all temples |

**Storage:** Add to `global_settings` as a top-level field (e.g. `kioskBehavior` or `showObservances`), or a minimal `kioskGlobalConfig` JSON. Do **not** keep in `kioskTheme.layout`.

### 2.3 Temple-Specific Content

| Field | Type | Notes |
|-------|------|-------|
| `displayName` | string | Or continue using `name` as display name |
| `formattedAddress` | string | Or continue using `address` |
| `whatsAppGroupUrl` | string | Rename from `whatsAppLink` for clarity, or keep as-is |
| `observanceCalendarUrl` | string | **New** — Google Calendar URL / calendar ID for this temple’s observances |
| `eventsCalendarUrl` | string | Rename from `googleCalendarLink` for clarity, or keep as-is (current Events) |

**Storage:** All in `temple` entity — `name`, `address`, `homeScreenConfig.whatsAppLink`, `homeScreenConfig.observanceCalendarUrl` (new), `homeScreenConfig.googleCalendarLink` (events).

### 2.4 Observance Data Flow (Recommended)

- **Today:** Kiosk calls `GET /religious-events/kiosk` → global list.
- **Target:** When `temple.homeScreenConfig.observanceCalendarUrl` is set, kiosk (or backend) fetches observances from that calendar for that temple.  
  - Option A: New endpoint `GET /religious-events/kiosk?templeId=X` that fetches from temple’s calendar when set.  
  - Option B: Kiosk fetches directly from temple’s observance calendar (like UnifiedCalendarEventsView does for events).  
- **Fallback:** When `observanceCalendarUrl` is empty, observances can be hidden or use a global default (if desired).

---

## 3. Backend Changes

### 3.1 Global Settings

- Add `showObservances?: boolean` to `global_settings` (new column or in a small JSON blob like `kioskBehavior`).
- Ensure device activation response includes this (or kiosk reads it from a global config endpoint).

### 3.2 Temple Entity

- Add `observanceCalendarUrl?: string` (or `observanceCalendarId`) to `homeScreenConfig`.
- Keep `googleCalendarLink` for general events.
- Keep `name`, `address`, `whatsAppLink` as-is.

### 3.3 Device / Temple Response

- Include `showObservances` from global settings in the payload the kiosk receives (e.g. in device connect or temple config).
- Include `homeScreenConfig.observanceCalendarUrl` in temple data sent to kiosk.

### 3.4 Religious Events API (If Using Temple-Specific Observances)

- Add `GET /religious-events/kiosk` that accepts optional `templeId` (from device context).
- When temple has `observanceCalendarUrl`, fetch events from that calendar and return them.
- When not set, return empty or continue returning global list (depending on product decision).

### 3.5 Remove Observance Visibility from Theme

- Stop reading `homeScreenObservanceVisible` from theme for behavior.
- Migrate existing theme values into `showObservances` once, then deprecate the theme field.

---

## 4. Admin UI Changes

### 4.1 Temple Settings (TemplesTab / Temple Edit)

Ensure temple edit includes:

- Temple name (`name`)
- Address (`address`)
- WhatsApp link (`homeScreenConfig.whatsAppLink`)
- Observance calendar URL (`homeScreenConfig.observanceCalendarUrl`) — **new field**

### 4.2 Kiosk Home Tab

Consolidate temple content and behavior so it includes:

- Temple name (read-only or link to temple edit)
- Address (read-only or link to temple edit)
- WhatsApp link
- Events calendar URL (`googleCalendarLink`)
- Observance calendar URL — **new**

### 4.3 Global / System Settings

- Add a "Kiosk behavior" or "Global kiosk" section.
- Toggle: **Show observances** — `showObservances` (default: on).
- Remove "Show Observance" from Theme Studio LayoutEditor.

### 4.4 Theme Studio

- Remove observance visibility from LayoutEditor.
- Keep only design-related layout controls (hero position, CTA position, utility bar layout, etc.), per the separation rules.

---

## 5. Kiosk App Changes

### 5.1 Global showObservances

- Read `showObservances` from device/temple config or global config instead of `kioskTheme.layout.homeScreenObservanceVisible`.
- Default to `true` when missing.

### 5.2 Temple Observance Calendar

- When `temple.homeScreenConfig.observanceCalendarUrl` is set, fetch observances from that calendar (or from a backend endpoint that uses it).
- When not set, either show no observances or continue using global religious events, depending on product choice.

### 5.3 Welcome Screen and Observance Modal

- Observance button visibility: use `showObservances` (global).
- Observance content: use temple’s observance calendar when configured; otherwise fallback (e.g. global list or empty).

### 5.4 Stop Using Theme for Behavior

- Do not use `kioskTheme.layout.homeScreenObservanceVisible` (or `homeScreenWhatsAppButtonsVisible`) for observance visibility.
- Use the new global `showObservances` and temple-specific calendar source.

---

## 6. Final Separation: Global vs Temple-Specific

### 6.1 Global (No Temple Context)

| Setting | Storage | Admin UI |
|---------|---------|----------|
| `showObservances` | `global_settings` | System / Global Settings |
| Design system (colors, typography, etc.) | Hardcoded in app | None (by design) |

### 6.2 Temple-Specific

| Setting | Storage | Admin UI |
|---------|---------|----------|
| `displayName` | `temple.name` | Temple edit / TemplesTab |
| `formattedAddress` | `temple.address` | Temple edit / TemplesTab |
| `whatsAppGroupUrl` | `homeScreenConfig.whatsAppLink` | Kiosk Home tab / Temple edit |
| `eventsCalendarUrl` | `homeScreenConfig.googleCalendarLink` | Events Calendar tab |
| `observanceCalendarUrl` | `homeScreenConfig.observanceCalendarUrl` (new) | Kiosk Home tab / Temple edit |

### 6.3 Deprecated / Removed from Theme

| Setting | Action |
|---------|--------|
| `homeScreenObservanceVisible` | Move to global `showObservances`; remove from theme |
| `homeScreenWhatsAppButtonsVisible` | Already split; ensure WhatsApp visibility uses temple config only |
| Design tokens in theme | Longer term: move to hardcoded design system; keep theme only for overrides if required |

---

## 7. Implementation Order

1. **Backend:** Add `showObservances` to global settings; add `observanceCalendarUrl` to temple `homeScreenConfig`.
2. **Backend:** Extend device/temple response to include `showObservances` and `observanceCalendarUrl`.
3. **Admin:** Add global "Show observances" toggle; add observance calendar URL to temple / Kiosk Home config.
4. **Admin:** Remove "Show Observance" from Theme Studio LayoutEditor.
5. **Kiosk:** Use `showObservances` instead of theme layout for visibility.
6. **Kiosk:** Use temple `observanceCalendarUrl` when present; implement fetch path (direct or via backend).
7. **Cleanup:** Deprecate `homeScreenObservanceVisible` (and related) in theme after migration.

---

## 8. Files to Touch (Summary)

| Area | Files |
|------|-------|
| Backend | `global-settings.entity.ts`, `temples` (entity, DTO, service), `devices.service.ts`, `religious-events` (controller/service if temple-specific) |
| Admin | `TemplesTab.tsx`, `KioskHomeTab.tsx`, `EventsCalendarTab.tsx`, `LayoutEditor.tsx`, new Global Kiosk Settings component |
| Kiosk | `AppState.swift`, `KioskHomeView.swift`, API service for observances |
