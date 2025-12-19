# Square Mobile Payments SDK Setup for Kiosk

## Overview
We're using Square Mobile Payments SDK for in-person payments with Square Kiosk hardware (Square Stand with card reader).

## Package to Add
Add this Swift Package in Xcode:
- URL: `https://github.com/square/in-app-payments-ios`
- Product: `SquareInAppPaymentsSDK`

## Required Scopes
Make sure Square OAuth includes:
- `PAYMENTS_WRITE` - For processing payments
- `PAYMENTS_READ` - For reading payment status

## Implementation
The SDK will:
1. Initialize with Square Application ID
2. Start a payment session when user is ready
3. Listen for card taps/chip inserts on Square hardware
4. Process payment through Square API
5. Return payment result

## Hardware Requirements
- Square Stand with card reader connected to iPad
- Square hardware must be paired with Square account
- Hardware must be online and ready

