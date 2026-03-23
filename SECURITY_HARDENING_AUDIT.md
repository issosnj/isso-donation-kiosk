# Security & Stability Hardening Audit

**Date:** March 23, 2025  
**System:** ISSO Donation Kiosk (NestJS + Next.js + iOS)  
**Scope:** Full backend security, multi-tenant isolation, payment safety, error handling, rate limiting

---

## Executive Summary

This audit identified **32 vulnerabilities** across 6 phases. **8 are CRITICAL** and must be fixed before adding new features. The most severe issues are: device donation endpoints using wrong auth guard (potentially broken or insecure), multi-tenant data leakage across devices/users/donors, donation completion accepting client-provided `status: SUCCEEDED` without payment verification, and a public debug endpoint leaking user data.

---

# Phase 1: Multi-Tenant Security (CRITICAL)

## 1.1 Vulnerabilities Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 1.1 | **CRITICAL** | Device endpoints (findOne, heartbeat, deactivate, reactivate, remove, getTelemetry, getDeviceLogs) do NOT validate temple ownership. Temple Admin can access ANY device by ID. | `devices.controller.ts`, `devices.service.ts` |
| 1.2 | **CRITICAL** | `findAll(templeId)` - Temple Admin can pass another temple's ID in query and get that temple's devices | `devices.controller.ts:50` |
| 1.3 | **HIGH** | Users `findOne(id)` - Temple Admin can fetch any user by ID (including other temples) | `users.controller.ts:41`, `users.service.ts` |
| 1.4 | **HIGH** | Donors `getDonorsByTemple(templeId)` - Temple Admin can request GET /donors/temple/:otherTempleId | `donors.controller.ts:75-90` |
| 1.5 | **HIGH** | Donors `updateDonor`, `deleteDonor` - No tenant check. Temple Admin can modify/delete any donor | `donors.controller.ts:145-159`, `donors.service.ts` |
| 1.6 | **HIGH** | Donation categories `findOne`, `update`, `remove` - No tenant validation | `donation-categories.controller.ts:208-226` |
| 1.7 | **HIGH** | Donation categories `findAll(templeId)` - Temple Admin can pass another templeId in query | `donation-categories.controller.ts:95-106` |
| 1.8 | **CRITICAL** | Stripe controller - Any authenticated user can request connection token, PaymentIntent, refund for ANY temple by passing templeId in body/query | `stripe.controller.ts` |
| 1.9 | **CRITICAL** | Donation `initiate` - Accepts templeId/deviceId from body without validating device owns that temple | `donations.controller.ts`, `donations.service.ts` |
| 1.10 | **HIGH** | Donation `cancel` - No user/device passed to service. Any authenticated user can cancel any donation | `donations.controller.ts:329` |
| 1.11 | **HIGH** | Donation `createPledge` - No auth validation; accepts templeId from body. Could create pledges for any temple | `donations.controller.ts:383` |
| 1.12 | **HIGH** | `assignDonationToDonor` - Service receives user.id but no temple ownership check on donorId | `donations.service.ts` (assignDonationToDonor) |
| 1.13 | **MEDIUM** | Temples `findOne` - Throws generic `Error` instead of `ForbiddenException` | `temples.controller.ts:72` |
| 1.14 | **MEDIUM** | Master Admin role check uses string `'MASTER_ADMIN'` instead of enum in some places | Multiple controllers |

## 1.2 Required Fixes

- Add `TenantGuard` or validate `user.templeId` / `device.templeId` in every service method that accesses tenant-scoped data
- Devices: Pass `user` to `findOne`, `updateLastSeen`, `deactivate`, `reactivate`, `remove`, `getTelemetry`, `getDeviceLogs` and enforce templeId
- Donors: Restrict `getDonorsByTemple` so Temple Admin can only use their templeId
- Donors: Add temple ownership check in `updateDonor` and `deleteDonor`
- Categories: Same pattern for findOne/update/remove
- Stripe: Validate templeId against user.templeId (Temple Admin) or require Master Admin for cross-temple
- Donations initiate: Require device auth and validate device.templeId === body.templeId
- Donations cancel: Require device or user, validate ownership
- Donations createPledge: Require device auth, validate device.templeId === body.templeId

---

# Phase 2: Auth & Token Hardening

## 2.1 Vulnerabilities Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 2.1 | **CRITICAL** | Donation device endpoints use `JwtAuthGuard` but kiosk app sends device token. JWT strategy expects user (payload.sub). Device tokens have deviceId/templeId/type - no sub. **Donation flow from kiosks may fail or is broken.** | `donations.controller.ts` - initiate, create-payment-intent, confirm-payment-intent, complete, cancel |
| 2.2 | **HIGH** | Device token has NO expiration when signed in `devices.service.activate()`. Uses default JwtService - need to verify. Donations module registers JwtModule with 365d - different module. | `devices.service.ts:86-90`, `devices.module.ts` |
| 2.3 | **HIGH** | Device token rotation only on reactivation. No expiration, no lastActiveAt tracking in token validation | `devices.service.ts` |
| 2.4 | **MEDIUM** | No ability to revoke device tokens (other than deactivate which nulls token - but existing tokens may still be valid if no expiration) | `devices.service.ts` |
| 2.5 | **HIGH** | Auth `/test-db` endpoint is PUBLIC, hardcodes email, returns user info and password hash presence | `auth.controller.ts:17-40` |
| 2.6 | **MEDIUM** | JWT strategy doesn't explicitly validate role enum - could accept invalid roles | `jwt.strategy.ts` |
| 2.7 | **LOW** | RolesGuard returns true when no roles specified - permissive by default | `roles.guard.ts:24` |

## 2.2 Required Fixes

- **Donation device endpoints:** Use `JwtOrDeviceAuthGuard` for: initiate, create-payment-intent, confirm-payment-intent, complete, cancel
- When device auth: Validate device.templeId matches donation/request templeId
- Add device token expiration (e.g., 90 days) in devices.service activate
- Add `lastActiveAt` column to devices, update on each device-authenticated request
- Add `revokeDeviceToken(deviceId)` - set deviceToken=null, optionally add to blocklist
- **Remove or protect** `/auth/test-db` - must require auth + Master Admin, remove hardcoded email
- Add strict role validation in JwtStrategy

---

# Phase 3: Stripe & Payment Safety

## 3.1 Vulnerabilities Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 3.1 | **CRITICAL** | Donation `complete` accepts `status: SUCCEEDED` from client. Attacker can POST complete with status: SUCCEEDED and fake stripePaymentIntentId without actual payment | `donations.controller.ts:188`, `donations.service.ts:complete()` |
| 3.2 | **CRITICAL** | PaymentIntent ownership not validated - confirm-payment-intent uses donation.templeId from donation but doesn't verify PaymentIntent metadata matches | `stripe.service.ts:confirmPaymentIntent` |
| 3.3 | **HIGH** | Webhook has NO idempotency - Stripe retries can cause duplicate status updates | `stripe.service.ts:handleWebhook` |
| 3.4 | **HIGH** | Webhook logs not structured; no event ID logging for deduplication | `stripe.service.ts:handleWebhook` |
| 3.5 | **HIGH** | STRIPE_WEBHOOK_SECRET optional - in production webhooks accepted without verification if not set | `stripe.service.ts:634` |
| 3.6 | **MEDIUM** | payPledge accepts status from client - same issue as complete | `donations.service.ts:payPledge` |
| 3.7 | **MEDIUM** | create-payment-intent and confirm-payment-intent don't validate device/user owns the donation | `donations.controller.ts` |

## 3.2 Required Fixes

- **complete:** For status SUCCEEDED, REQUIRE stripePaymentIntentId and verify with Stripe API that PaymentIntent status is 'succeeded' before accepting. Never trust client-provided status for SUCCEEDED.
- **confirm-payment-intent:** Verify PaymentIntent metadata.donationId and metadata.templeId match the donation
- **Webhook:** Add idempotency - store processed event IDs, skip if already processed
- **Webhook:** Log all events (type, id) for audit
- **Webhook:** Require STRIPE_WEBHOOK_SECRET in production (throw if not set when NODE_ENV=production)
- **payPledge:** Validate payment via provider before setting SUCCEEDED
- Validate device/user owns donation before create-payment-intent and confirm-payment-intent

---

# Phase 4: Error Handling & Logging

## 4.1 Vulnerabilities Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 4.1 | **MEDIUM** | Exception filter may leak stack traces - passes exception.message which could contain internal paths/sql | `http-exception.filter.ts` |
| 4.2 | **MEDIUM** | Generic "Internal server error" for non-HttpException - good, but stack logged to console could go to log aggregator | `http-exception.filter.ts` |
| 4.3 | **LOW** | Excessive console.log in production (CORS, JWT, request logging) - performance and log noise | `main.ts`, `jwt-auth.guard.ts` |
| 4.4 | **MEDIUM** | Audit logging - need to verify all sensitive actions (payment, refund, device activation, user creation) are in audit_logs | Audit module |

## 4.2 Required Fixes

- Sanitize error responses - never return stack trace to client in production
- Use proper logger (e.g., Logger from @nestjs/common) with log levels
- Reduce verbose logging in production
- Add audit entries for: donation complete, refund, device activate, device revoke, user create

---

# Phase 5: Input Validation & Rate Limiting

## 5.1 Vulnerabilities Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 5.1 | **HIGH** | No rate limiting anywhere. Auth, device activation, donation initiation are brute-forceable | Entire backend |
| 5.2 | **MEDIUM** | InitiateDonationDto - currency has @IsString but no length/format validation | `initiate-donation.dto.ts` |
| 5.3 | **MEDIUM** | CompleteDonationDto - donorEmail, donorPhone, donorName no max length, no sanitization | `complete-donation.dto.ts` |
| 5.4 | **MEDIUM** | ActivateDeviceDto - deviceCode format validation | `activate-device.dto.ts` |
| 5.5 | **LOW** | Many DTOs lack @MaxLength, @IsEmail where appropriate | Various DTOs |

## 5.2 Required Fixes

- Add @nestjs/throttler for rate limiting
- Auth login: 5 attempts per 15 min per IP
- Device activate: 10 attempts per 15 min per IP
- Donation initiate: 30 per min per device/user
- Add @MaxLength, @IsEmail, @Matches to DTOs

---

# Phase 6: Database & Infra Hardening

## 6.1 Vulnerabilities Found

| # | Severity | Issue | Location |
|---|----------|-------|----------|
| 6.1 | **LOW** | Migrations use parameterized queries - good. Raw queryRunner.query with template literals - verify no injection | `migrations/*.ts` |
| 6.2 | **MEDIUM** | Missing indexes: donations.templeId, donations.deviceId, donations.stripePaymentIntentId, devices.templeId | Entities |
| 6.3 | **LOW** | Donations findAll returns [] on error instead of throwing - could hide issues | `donations.service.ts:660` |

## 6.2 Required Fixes

- Add indexes: @Index on Donation (templeId, createdAt), (deviceId), (stripePaymentIntentId); Device (templeId)
- Create migration for new indexes
- Review findAll error handling - consider rethrowing

---

# Implementation Plan

## Step-by-Step Order

### Week 1: Critical (Blocking)

1. **Fix donation auth** - Replace JwtAuthGuard with JwtOrDeviceAuthGuard for device donation endpoints; add device ownership validation
2. **Remove /auth/test-db** or protect it (Master Admin only, no hardcoded email)
3. **Fix donation complete** - Require Stripe verification before accepting SUCCEEDED
4. **Add device tenant checks** - Devices controller/service: all operations scoped by temple

### Week 2: High Priority

5. **Stripe controller** - Validate templeId against user for all endpoints
6. **Donors tenant checks** - getDonorsByTemple, updateDonor, deleteDonor
7. **Donation categories** - findOne, update, remove, findAll temple scoping
8. **Webhook idempotency** - Store event IDs, skip duplicates
9. **Device token expiration** - Add expiresIn to device JWT, add lastActiveAt

### Week 3: Medium Priority

10. **Users findOne** - Temple Admin restriction
11. **Donation cancel, createPledge** - Add ownership validation
12. **Rate limiting** - Add @nestjs/throttler
13. **Error filter** - Sanitize production responses

### Week 4: Lower Priority

14. **DTO validation** - Add @MaxLength, @IsEmail
15. **Database indexes** - Migration for new indexes
16. **Audit logging** - Ensure coverage
17. **Webhook STRIPE_WEBHOOK_SECRET** - Required in production

---

# Files to Update

## Phase 1
- `backend/src/devices/devices.controller.ts`
- `backend/src/devices/devices.service.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.ts`
- `backend/src/donors/donors.controller.ts`
- `backend/src/donors/donors.service.ts`
- `backend/src/donations/donation-categories.controller.ts`
- `backend/src/donations/donation-categories.service.ts`
- `backend/src/stripe/stripe.controller.ts`
- `backend/src/donations/donations.controller.ts`
- `backend/src/donations/donations.service.ts`
- `backend/src/temples/temples.controller.ts`

## Phase 2
- `backend/src/donations/donations.controller.ts` (guards)
- `backend/src/donations/donations.module.ts` (import JwtOrDeviceAuthGuard deps)
- `backend/src/devices/devices.service.ts` (token expiration)
- `backend/src/devices/entities/device.entity.ts` (lastActiveAt)
- `backend/src/auth/auth.controller.ts` (remove test-db or protect)
- `backend/src/auth/strategies/jwt.strategy.ts`

## Phase 3
- `backend/src/donations/donations.service.ts` (complete, payPledge)
- `backend/src/stripe/stripe.service.ts` (webhook, PaymentIntent validation)

## Phase 4
- `backend/src/common/filters/http-exception.filter.ts`
- `backend/src/main.ts` (reduce logging)

## Phase 5
- `backend/package.json` (@nestjs/throttler)
- `backend/src/app.module.ts` (ThrottlerModule)
- `backend/src/*/dto/*.dto.ts` (validation)

## Phase 6
- `backend/src/donations/entities/donation.entity.ts` (@Index)
- `backend/src/devices/entities/device.entity.ts` (@Index)
- New migration file

---

# Appendix: Quick Reference

## Tenant Scoping Rules

- **Master Admin:** Can access all temples (templeId optional or can specify any)
- **Temple Admin:** MUST be restricted to user.templeId only
- **Device:** MUST be restricted to device.templeId only

## Auth Guard Usage

- **JwtAuthGuard:** Admin web only (user JWT)
- **DeviceAuthGuard:** Kiosk device-only endpoints (device token)
- **JwtOrDeviceAuthGuard:** Endpoints used by BOTH admin and kiosk (e.g., donations initiate, complete)

## Payment Integrity

- Never trust client-provided `status: SUCCEEDED`
- Always verify with Stripe API: `paymentIntent.status === 'succeeded'`
- Validate PaymentIntent metadata matches donation before completing
