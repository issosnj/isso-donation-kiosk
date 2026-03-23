# Master Admin Overview Page — Data Wiring Audit

**Date:** 2025-03-23  
**Scope:** Master Admin Dashboard → Overview tab (full executive dashboard)

---

## 1. Executive Summary

| Section | Data Source | Status | Issue |
|---------|-------------|--------|-------|
| **Status Summary Strip** | `useAlerts()` | **MOCK** | No backend `/alerts` endpoint; always returns hardcoded mock alerts |
| **Hero (Executive Hero)** | `useOverviewData()` → `/donations/stats` | **REAL** | Backend-driven; loading clears correctly |
| **Action Center (Alerts)** | `useAlerts()` | **MOCK** | Same as Status Strip; always mock data |
| **Key Metric Cards** | `useOverviewData()` → `/donations/stats` | **REAL** | Backend-driven |
| **Donation Trends Chart** | `useOverviewData()` → `/donations` | **REAL** | Backend-driven; may show empty if no donations |
| **Platform Health (Devices)** | `useDevices()` → `/devices` | **REAL** (or **MOCK** if flag set) | Real by default; mock only when `window.__DEVICES_USE_MOCK__` |
| **Temple Performance** | `useOverviewData()` → `/donations` + `/temples` | **REAL** | Backend-driven; derived from donations + temples |

**Root cause of dummy/placeholder/skeleton issues:**

1. **Alerts system is entirely mock** — `useAlerts` never calls an API; it always returns `MOCK_ALERTS` after a 300ms delay. The backend has no `/alerts` endpoint.
2. **Status Summary Strip** uses alert summary from `useAlerts`, so it shows mock alert counts (e.g., "2 critical · 2 warning · 1 info need attention").
3. **Action Center** shows the same mock alerts; links may point to non-existent or incorrect paths (e.g., `/devices/status`).
4. **Loading states** are wired correctly for real data sections; skeletons clear when queries resolve.
5. **No response shape mismatches** were found for donation stats, donations list, devices, or temples.

---

## 2. Overview Page Sections Audit

### 2.1 Status Summary Strip (above Overview tab content)

| Question | Answer |
|----------|--------|
| Real backend data? | No |
| Mock data? | Yes — from `useAlerts()` |
| Hardcoded placeholder? | Yes — `MOCK_ALERTS` in `useAlerts` |
| Stuck loading? | No — 300ms delay then shows mock summary |
| Fetch failing? | No fetch — API never called |
| Response shape mismatch? | N/A |
| Fallback UI? | No — intentionally shows mock summary |

**Data flow:**
- `MasterDashboard.tsx` L49: `const { summary, isLoading } = useAlerts()`
- `MasterDashboard.tsx` L57: `<StatusSummaryStrip summary={summary} isLoading={isLoading} />`
- `useAlerts.ts` L85-92: `data: alerts = MOCK_ALERTS`, `queryFn` returns `MOCK_ALERTS` after 300ms
- No `api.get('/alerts')` — backend has no alerts endpoint

**Files:**
- `admin-web/src/components/MasterDashboard.tsx` (L48-58)
- `admin-web/src/hooks/useAlerts.ts` (L8-66, L85-92)
- `admin-web/src/components/alerts/StatusSummaryStrip.tsx`

---

### 2.2 Executive Hero (Total raised YTD)

| Question | Answer |
|----------|--------|
| Real backend data? | Yes |
| Mock data? | No |
| Hardcoded placeholder? | No |
| Stuck loading? | No — skeleton while `statsLoading \|\| donationsLoading` |
| Fetch failing? | Uses `/donations/stats` with `startDate`/`endDate` |
| Response shape mismatch? | No — expects `{ total, count }`; backend returns that |
| Fallback UI? | Renders `$0.00` when no data (valid empty state) |

**Data flow:**
- `OverviewTab.tsx` L27-36: `useOverviewData(chartGranularity)` → `stats`, `isLoading`
- `useOverviewData.ts` L85-93: `useQuery(['overview-stats-ytd'], () => api.get('/donations/stats', { params: { startDate, endDate } }))`
- `useOverviewData.ts` L162-166: `totalYtd = statsYtd?.total ?? 0`, `countYtd = statsYtd?.count ?? 0`
- `ExecutiveHero.tsx` receives `totalYtd`, `countYtd`, `trendDirection`, `isLoading`

**Files:**
- `admin-web/src/components/tabs/OverviewTab.tsx` (L50-55)
- `admin-web/src/hooks/useOverviewData.ts` (L85-93, L162-166)
- `admin-web/src/components/overview/ExecutiveHero.tsx`

---

### 2.3 Action Center / "What needs attention"

| Question | Answer |
|----------|--------|
| Real backend data? | No |
| Mock data? | Yes — `useAlerts()` returns `MOCK_ALERTS` |
| Hardcoded placeholder? | Yes |
| Stuck loading? | No — 300ms then mock alerts |
| Fetch failing? | No fetch |
| Response shape mismatch? | N/A |
| Fallback UI? | Shows "All systems normal" when `alertSummary.total === 0`; with mock, always shows 5 alerts |

**Data flow:**
- `OverviewTab.tsx` L27-36: `useOverviewData()` → `alertSummary`, `alerts`
- `useOverviewData.ts` L144: `const { summary: alertSummary, alerts } = useAlerts()`
- `useAlerts.ts`: Always returns `MOCK_ALERTS` (5 hardcoded alerts)
- `OverviewTab.tsx` L58-74: Conditionally renders `AlertCenter`; with mock, `alertSummary.total > 0` so alerts always shown

**Files:**
- `admin-web/src/components/tabs/OverviewTab.tsx` (L58-74)
- `admin-web/src/hooks/useOverviewData.ts` (L144)
- `admin-web/src/hooks/useAlerts.ts`
- `admin-web/src/components/alerts/AlertCenter.tsx`

---

### 2.4 Key Metric Cards (Total raised, Donations, Average gift)

| Question | Answer |
|----------|--------|
| Real backend data? | Yes |
| Mock data? | No |
| Hardcoded placeholder? | No |
| Stuck loading? | No — skeleton while `isLoading` |
| Fetch failing? | No — uses same `/donations/stats` as Hero |
| Response shape mismatch? | No |
| Fallback UI? | Shows `$0`, `0`, `$0.00` when no donations (valid) |

**Data flow:**
- Same as Executive Hero: `useOverviewData()` → `stats` (totalYtd, countYtd, avgGift)
- `OverviewStatCards.tsx` receives these and renders; skeleton when `isLoading`

**Files:**
- `admin-web/src/components/tabs/OverviewTab.tsx` (L77-86)
- `admin-web/src/hooks/useOverviewData.ts`
- `admin-web/src/components/overview/OverviewStatCards.tsx`

---

### 2.5 Donation Trends Chart

| Question | Answer |
|----------|--------|
| Real backend data? | Yes |
| Mock data? | No |
| Hardcoded placeholder? | No |
| Stuck loading? | No — skeleton while `isLoading` |
| Fetch failing? | Uses `GET /donations` with `startDate`/`endDate` (90 days) |
| Response shape mismatch? | No — expects array of `{ createdAt, amount, status, templeId?, temple? }` |
| Fallback UI? | Shows "No donation data for this period" when `chartData.length === 0` |

**Data flow:**
- `useOverviewData.ts` L120-132: `useQuery(['overview-donations', ...], () => api.get('/donations', { params: { startDate, endDate } }))`
- Backend returns `Donation[]` with `temple` relation; frontend uses `createdAt`, `amount`, `status`
- `groupDonationsByDate(donations, chartGranularity)` produces `TrendDataPoint[]`
- `DonationTrendsChart.tsx` receives `trendData`; empty state handled in L74-76

**Files:**
- `admin-web/src/hooks/useOverviewData.ts` (L24-50, L120-132, L144)
- `admin-web/src/components/overview/DonationTrendsChart.tsx`

---

### 2.6 Platform Health (Device Health Section)

| Question | Answer |
|----------|--------|
| Real backend data? | Yes (unless `window.__DEVICES_USE_MOCK__ === true`) |
| Mock data? | Optional — only when mock flag set |
| Hardcoded placeholder? | No |
| Stuck loading? | No — `devicesLoading` drives skeleton |
| Fetch failing? | Uses `GET /devices`; on failure React Query returns error, `devices` defaults to `[]` |
| Response shape mismatch? | `mapApiDevice` handles missing fields (lastActivityAt, readerConnected, activatedAt) with fallbacks |
| Fallback UI? | `computeSummary([])` yields total:0, online:0, offline:0, needingAttention:0 — valid empty state |

**Data flow:**
- `useOverviewData.ts` L142: `const { summary: deviceSummary, isLoading: devicesLoading } = useDevices()`
- `useDevices.ts` L163-176: `useQuery` → `api.get('/devices')` (or MOCK_DEVICES if flag set)
- `computeSummary(filtered)` → `{ total, online, offline, needingAttention }`
- `DeviceHealthSection` receives `deviceSummary` + `setupIssuesCount` (from `alertSummary.warning + alertSummary.critical` — which is mock!)

**Files:**
- `admin-web/src/hooks/useOverviewData.ts` (L142)
- `admin-web/src/hooks/useDevices.ts` (L56-72, L163-176, L186-188)
- `admin-web/src/components/overview/DeviceHealthSection.tsx`

**Note:** `setupIssuesCount` is passed as `alertSummary.warning + alertSummary.critical` — since alerts are mock, this number is from mock data. The core device counts (online/offline/needingAttention) are real.

---

### 2.7 Temple Performance

| Question | Answer |
|----------|--------|
| Real backend data? | Yes |
| Mock data? | No |
| Hardcoded placeholder? | No |
| Stuck loading? | No — `isLoading` drives skeleton |
| Fetch failing? | Uses donations (same as chart) + temples list |
| Response shape mismatch? | No — `aggregateByTemple` expects `templeId`, `temple.name`, `amount`, `status` |
| Fallback UI? | "No temple data yet" when `temples.length === 0`; merges in temples with zero donations |

**Data flow:**
- `useOverviewData.ts`: `donations` from `/donations`, `temples` from `/temples`
- `aggregateByTemple(donations)` → `TemplePerformance[]` (by templeId)
- `templesWithZero` adds temples with no donations; sorted by total
- `TemplePerformanceSection` receives `templePerformance` (full list)

**Files:**
- `admin-web/src/hooks/useOverviewData.ts` (L52-75, L120-139, L148-159)
- `admin-web/src/components/overview/TemplePerformanceSection.tsx`

---

## 3. Sections: Real vs Mock vs Broken

| Section | Status | Notes |
|---------|--------|-------|
| Status Summary Strip | **MOCK** | Always mock alerts |
| Executive Hero | **REAL** | |
| Action Center | **MOCK** | Always mock alerts |
| Key Metric Cards | **REAL** | |
| Donation Trends Chart | **REAL** | |
| Platform Health | **REAL** (with mock Setup issues count) | Device counts real; "Setup issues" from mock alerts |
| Temple Performance | **REAL** | |

---

## 4. Root Cause for Each Broken / Misleading Section

| Section | Root Cause |
|---------|------------|
| **Status Summary Strip** | `useAlerts` has no API; returns `MOCK_ALERTS` by design. Comment: "TODO: Replace with real API when backend endpoint is ready". |
| **Action Center** | Same as above; alerts are hardcoded. Users see fake "Pending donations stuck", "Device offline", "Stripe not connected", etc. |
| **Platform Health "Setup issues"** | `setupIssuesCount = alertSummary.warning + alertSummary.critical` — sourced from mock alerts, so number is fake. |

---

## 5. Exact Files Involved

| File | Role |
|------|------|
| `admin-web/src/components/MasterDashboard.tsx` | Renders Status Summary Strip; calls `useAlerts()` |
| `admin-web/src/components/tabs/OverviewTab.tsx` | Orchestrates Overview; uses `useOverviewData`, `useAlerts`; renders Hero, Alerts, StatCards, Chart, DeviceHealth, TemplePerformance |
| `admin-web/src/hooks/useOverviewData.ts` | Fetches stats, donations, temples; uses `useDevices`, `useAlerts`; computes trendData, templePerformance |
| `admin-web/src/hooks/useAlerts.ts` | **Always returns MOCK_ALERTS**; no API call |
| `admin-web/src/hooks/useDevices.ts` | Fetches `/devices` (or mock when flag set); computes summary |
| `admin-web/src/components/alerts/StatusSummaryStrip.tsx` | Displays alert summary |
| `admin-web/src/components/alerts/AlertCenter.tsx` | Displays alert cards |
| `admin-web/src/components/overview/ExecutiveHero.tsx` | Hero section |
| `admin-web/src/components/overview/OverviewStatCards.tsx` | Metric cards |
| `admin-web/src/components/overview/DonationTrendsChart.tsx` | Trends chart |
| `admin-web/src/components/overview/DeviceHealthSection.tsx` | Platform health |
| `admin-web/src/components/overview/TemplePerformanceSection.tsx` | Temple performance |
| `backend/src/donations/donations.controller.ts` | `GET /donations`, `GET /donations/stats` |
| `backend/src/donations/donations.service.ts` | Stats + findAll implementation |
| `backend/src/devices/devices.controller.ts` | `GET /devices` |
| **Backend:** No `/alerts` endpoint exists | — |

---

## 6. Exact Fixes Required

### Fix 1: Alerts — Implement Real Backend (or Hide Mock)

**Option A — Build real alerts API:**
1. Create `backend/src/alerts/` module with controller + service
2. Define alert rules (e.g., pending donations > 24h, devices offline, Stripe not connected, Gmail not configured)
3. Add `GET /api/alerts` returning `Alert[]`
4. In `useAlerts.ts` L86-92: Replace mock `queryFn` with `api.get('/alerts')` and map response to `Alert[]`

**Option B — Hide mock until backend exists:**
1. In `useAlerts.ts`: Return `{ alerts: [], summary: { critical: 0, warning: 0, info: 0, total: 0 }, isLoading: false }` instead of MOCK_ALERTS
2. Status Strip will show "All systems normal"
3. Action Center will show "All systems normal" (empty state)
4. Platform Health `setupIssuesCount` will be 0 (correct for no real alerts)

### Fix 2: Platform Health Setup Issues

- When real alerts exist: keep `setupIssuesCount={alertSummary.warning + alertSummary.critical}`
- When using Option B (hide mock): setupIssuesCount becomes 0 automatically
- Alternative: derive setup issues from devices (e.g., PENDING count) instead of alerts, if alerts API is deferred

### Fix 3: Action Center Links (if keeping mock for dev)

- Mock alert L29: `href: '/devices/status'` — verify this route exists or change to `/dashboard?tab=devices`
- Other hrefs use `/dashboard?tab=...` which should work

---

## 7. Recommended Order of Fixes

1. **Immediate (no backend work):**  
   Disable mock alerts in `useAlerts.ts` — return empty alerts so Status Strip and Action Center show "All systems normal" instead of fake alerts. File: `admin-web/src/hooks/useAlerts.ts` L85-92.

2. **Short-term:**  
   Implement `GET /api/alerts` with real rules (pending donations, offline devices, Stripe/Gmail config) and wire `useAlerts` to it.

3. **Optional cleanup:**  
   Remove or gate `MOCK_ALERTS` and `USE_MOCK` in `useDevices` for production.
