# Phase 2 Security Hardening — Deliverable

## 1. Executive Summary

This hardening pass implements **Phase A (Security)**, **Phase B (Scale & DB)**, and **Phase C (Device Token)** for the ISSO Donation Kiosk backend. Highlights:

- **Database-backed webhook idempotency** — Stripe webhooks are tracked in `stripe_webhook_events` and deduplicated across restarts and multiple instances.
- **Global exception handling** — API errors are standardized, sanitized, and safe for production.
- **Structured logging** — Auth, device activation, and webhook flows log in JSON.
- **Rate limiting** — Login (5/15min), device activation (10/15min), default (100/min).
- **DTO validation** — UUIDs, enums, lengths, and formats validated on DTOs.
- **Database indexes** — Added for donations, devices, donors, categories, webhook events.
- **Device token** — 90-day expiry, revocation via deactivation, DB validation on each request.

---

## 2. Critical Fixes Implemented

| Area | Fix |
|------|-----|
| Webhook idempotency | New `stripe_webhook_events` table; INSERT with unique constraint; 23505 = skip |
| Exception filter | Sanitizes messages; no stack/internal details in production responses |
| Logging | AppLogger (JSON); auth success/failure, device activation, webhook receipt |
| Rate limiting | `@nestjs/throttler`; login 5/15min; activation 10/15min; webhook skipped |
| DTO validation | InitiateDonationDto, CompleteDonationDto, ActivateDeviceDto tightened |
| Indexes | donations (templeId, deviceId, stripePaymentIntentId, status, createdAt); devices (templeId); donors (templeId); categories (templeId) |
| Device token | 90d expiry; `validateDeviceToken` in DeviceAuthGuard & JwtOrDeviceAuthGuard |

---

## 3. Remaining High-Risk Issues

1. **Receipt email** — Still sent inline in `complete()`; can block response. Recommend moving to a queue/background job.
2. **Transaction safety** — Donation `complete` + webhook update runs in separate calls; low risk but could be wrapped in a transaction where applicable.
3. **JwtOrDeviceAuthGuard** — Adds a DB lookup for device token validation on every device request; acceptable for now, consider caching if load grows.

---

## 4. Exact Files Changed

| File | Changes |
|------|---------|
| `src/stripe/entities/stripe-webhook-event.entity.ts` | **NEW** — Entity for webhook event tracking |
| `src/stripe/stripe.module.ts` | TypeOrmModule.forFeature([StripeWebhookEvent]) |
| `src/stripe/stripe.service.ts` | DB-backed webhook idempotency; AppLogger; remove in-memory cache |
| `src/config/typeorm.config.ts` | Add StripeWebhookEvent entity |
| `src/common/filters/http-exception.filter.ts` | Sanitize responses; structured error logging |
| `src/common/logger/app-logger.service.ts` | **NEW** — JSON structured logger |
| `src/common/logger/logger.module.ts` | **NEW** — Global logger module |
| `src/app.module.ts` | LoggerModule, ThrottlerModule, APP_GUARD ThrottlerGuard |
| `src/auth/auth.module.ts` | forwardRef(DevicesModule); DeviceAuthGuard provider/export |
| `src/auth/auth.service.ts` | AppLogger; structured auth logging |
| `src/auth/guards/device-auth.guard.ts` | validateDeviceToken; AppLogger; async canActivate |
| `src/auth/guards/jwt-or-device-auth.guard.ts` | validateDeviceToken for device path |
| `src/auth/auth.controller.ts` | @Throttle for login |
| `src/devices/devices.module.ts` | forwardRef(AuthModule); JWT expiresIn 90d |
| `src/devices/devices.service.ts` | validateDeviceToken(); AppLogger; activation logging |
| `src/devices/devices.controller.ts` | @Throttle for activate |
| `src/devices/dto/activate-device.dto.ts` | @Matches for alphanumeric deviceCode |
| `src/donations/dto/initiate-donation.dto.ts` | @IsUUID(4), @Max, @Length(3,3) for currency |
| `src/donations/dto/complete-donation.dto.ts` | @MaxLength, @IsEmail on fields |
| `src/stripe/stripe.controller.ts` | @SkipThrottle on webhook |
| `package.json` | @nestjs/throttler ^5.1.0 |

---

## 5. Migrations Added

| Migration | Purpose |
|-----------|---------|
| `1738000000000-AddStripeWebhookEventsAndIndexes.ts` | Create `stripe_webhook_events` table; add indexes on donations, devices, donors, donation_categories |

**Run before deploy:**
```bash
cd backend && npm run migration:run
```

---

## 6. Before Multi-Location Rollout

- [ ] Run migration `1738000000000` on production DB
- [ ] Verify `STRIPE_WEBHOOK_SECRET` is set in production
- [ ] Confirm throttler limits are acceptable for expected traffic
- [ ] Test device activation and donation flow end-to-end
- [ ] Verify deactivated devices cannot complete donations

---

## 7. Can Wait Until After Rollout

- Queue/background job for receipt emails
- Caching for device token validation (if needed for performance)
- Redis-based throttler for multi-instance scaling
- Scheduled cleanup of old `stripe_webhook_events` rows (e.g. >30 days)

---

## 8. Final Verdict

**Yes, the backend is ready for Phase 3 (kiosk UI and bug fixing).**

- Multi-tenant isolation and payment verification are in place from Phase 1.
- Webhook idempotency, exception handling, rate limiting, validation, and device token handling are production-ready.
- Remaining items (receipt queue, optional caching) are improvements, not blockers for rollout.
