# ⚠️ IMPORTANT: Square Mobile Payments SDK Limitations

## Critical Requirement: Attended Kiosk Only

According to [Square's documentation](https://developer.squareup.com/docs/mobile-payments-sdk#requirements-and-limitations), the Mobile Payments SDK **CANNOT** be used for **unattended kiosks**.

### Your Kiosk Must Be:
- ✅ **Attended** - In line of sight of seller or worker
- ✅ **During business hours only** - Cannot be accessed outside normal business hours
- ✅ **Staff trained** - Onsite staff must be trained and available to assist customers

### Prohibited:
- ❌ **Unattended kiosks** - Outdoor vending machines, 24/7 access, no staff supervision
- ❌ **Unattended terminals** - Not in line of sight of seller/worker

## If Your Kiosk is Unattended

If your donation kiosk is unattended (accessible 24/7, no staff supervision), you **cannot use Mobile Payments SDK**. You must use:

- **Terminal API** - For Square Terminal hardware (separate device)
- Or consider making the kiosk attended (staff supervision during operating hours)

## Mobile Payments SDK vs In-App Payments SDK

- **Mobile Payments SDK** - For in-person payments with Square hardware (Reader, Stand)
- **In-App Payments SDK** - For online/card-on-file payments (NOT for hardware)

We're using **Mobile Payments SDK** for Square Stand integration.

