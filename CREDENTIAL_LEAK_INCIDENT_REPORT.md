# Credential Leak Incident Report

## Phase 1 — Detection Report

### Files with CRITICAL/HIGH Risk (Hardcoded Credentials)

| File | Line | Type | Risk |
|------|------|------|------|
| `backend/check-backend-db.js` | 6-7 | Postgres connection strings (public + private URL) | **CRITICAL** |
| `backend/create-user-simple.js` | 6-7 | Postgres URL + default Admin123 | **CRITICAL** |
| `backend/create-tables-and-user.js` | 6-7 | Postgres URL + default Admin123 | **CRITICAL** |
| `backend/verify-user.js` | 6-7, 18 | Postgres URL + hardcoded email + Admin123 | **CRITICAL** |
| `backend/src/scripts/create-user-direct.ts` | 7-8 | Postgres URL + default Admin123 | **CRITICAL** |
| `backend/src/scripts/create-user-direct.js` | 6-7 | Postgres URL + default Admin123 | **CRITICAL** |
| `backend/scripts/restore-theme.js` | 32-33 | Postgres URL fallback | **CRITICAL** |
| `backend/src/scripts/create-user.ts` | 17 | Default Admin123 + email | **HIGH** |
| `backend/src/config/typeorm.config.ts` | 67 | DB_PASSWORD fallback 'postgres' | **HIGH** |
| `kiosk-app/.../AdminMenuView.swift` | 650 | Hardcoded admin123 (local unlock) | **MEDIUM** |

### Leaked Credentials Identified

- **Postgres**: Full connection string with embedded password (Railway)
- **Default user password**: `Admin123`
- **Default email**: Address was hardcoded in scripts

---

## Phase 2 — Remediation Applied

All affected files were updated to:
1. Remove ALL hardcoded credentials
2. Require environment variables (no fallbacks for secrets)
3. Add `require('dotenv').config()` at script entry points
4. Fail fast with clear errors when required vars are missing

---

## Phase 3 — Environment Standardization

- Created `backend/.env.example` with all variable names (no real values)
- Standardized: `DATABASE_URL`, `DATABASE_PUBLIC_URL`, `JWT_SECRET`, `STRIPE_*`, `GMAIL_*`, `GOOGLE_PLACES_API_KEY`

---

## Phase 4 — Rotation Instructions

- Added `SECURITY.md` with step-by-step rotation instructions
- Added security notice to main `README.md`

---

## Phase 5 — Prevention

- Updated `.gitignore`: `.env`, `.env.*`, `!.env.example`, `!**/.env.example`
- Added gitleaks/trufflehog recommendation in SECURITY.md
- Backend now fails at startup if `DATABASE_URL` or `JWT_SECRET` missing

---

## Phase 6 — Centralization

- Created `backend/src/config/script-db.ts` for shared `getDatabaseUrl()`
- TypeORM config: removed DB_PASSWORD default, throws if missing when using individual vars

---

## Security Checklist

- [x] All hardcoded Postgres URLs removed
- [x] All default passwords (Admin123) removed
- [x] .env.example created (no real values)
- [x] SECURITY.md with rotation instructions
- [x] Runtime validation for DATABASE_URL and JWT_SECRET
- [x] .gitignore updated for env files
- [x] TypeORM config: no password fallback
- [ ] **ACTION REQUIRED**: Rotate database password
- [ ] **ACTION REQUIRED**: Rotate JWT_SECRET
- [ ] **ACTION REQUIRED**: Rotate Stripe keys if exposed
- [ ] Consider: Git history rewrite (BFG or git filter-repo) to purge leaked creds from history
