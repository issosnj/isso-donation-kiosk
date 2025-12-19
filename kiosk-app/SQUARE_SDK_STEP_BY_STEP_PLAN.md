# Square Mobile Payments SDK Integration - Step-by-Step Plan

## Goal
Integrate Square Mobile Payments SDK incrementally, testing at each step to identify issues early.

## Prerequisites Checklist
- [ ] App builds and runs successfully (current state ✅)
- [ ] Backend has `PAYMENTS_WRITE_IN_PERSON` scope ✅
- [ ] Backend endpoint `/devices/square-credentials` exists ✅
- [ ] Info.plist has required permissions ✅
- [ ] Info.plist has Square Stand protocols ✅

---

## Step 1: Add Package (No Code Changes)
**Goal:** Add Square SDK package to Xcode project without using it in code.

### Actions:
1. Open Xcode project
2. **File** → **Add Package Dependencies...**
3. Enter URL: `https://github.com/square/mobile-payments-sdk-ios`
4. Select version: **2.3.1** (or latest stable)
5. **IMPORTANT:** Select product **`SquareMobilePaymentsSDK`** only
6. **DO NOT** select `MockReaderUI` or any other products
7. Add to target: **ISSOKiosk**
8. Click **Add Package**

### Success Criteria:
- [ ] Package appears in **Project** → **Package Dependencies**
- [ ] Project builds successfully (⌘B)
- [ ] No `LCRCore` or other framework errors
- [ ] App launches without crashing

### If Issues:
- **LCRCore error:** Check if package needs additional dependencies or build script
- **Build fails:** Check Xcode version compatibility
- **Package not found:** Verify URL and version

### Test:
- Build project
- Run app on iPad
- Verify no crashes

---

## Step 2: Import SDK (No Implementation)
**Goal:** Import SDK in code but don't use it yet.

### Actions:
1. Open `SquareMobilePaymentsService.swift`
2. Uncomment: `import SquareMobilePaymentsSDK`
3. **DO NOT** uncomment any other code yet

### Success Criteria:
- [ ] Project builds successfully
- [ ] No compilation errors
- [ ] App launches without crashing

### Test:
- Build project
- Run app
- Check console for any SDK-related warnings

---

## Step 3: Check SDK Availability
**Goal:** Verify SDK is accessible and can be referenced.

### Actions:
1. In `SquareMobilePaymentsService.swift`, add a simple test:
```swift
func testSDKAvailability() {
    // Just check if SDK is accessible
    let sdk = MobilePaymentsSDK.shared
    print("[SquareMobilePayments] SDK accessible: \(sdk)")
}
```
2. Call this from `AppState.loadTempleConfig()` temporarily

### Success Criteria:
- [ ] Project builds successfully
- [ ] Console shows SDK is accessible
- [ ] No runtime errors

### Test:
- Build and run
- Check console output
- Verify SDK object exists

---

## Step 4: Implement Authorization (No Payment Yet)
**Goal:** Implement authorization only, test it works.

### Actions:
1. Uncomment authorization code in `SquareMobilePaymentsService.swift`
2. Uncomment authorization call in `AppState.swift`
3. Keep payment processing commented out

### Code Changes:
- `SquareMobilePaymentsService.authorize()` - uncomment
- `AppState.authorizeSquareSDK()` - uncomment and enable

### Success Criteria:
- [ ] Project builds successfully
- [ ] Authorization completes (check console)
- [ ] No authorization errors
- [ ] App continues to work normally

### Test:
- Build and run
- Activate device
- Check console for: `[SquareMobilePayments] Successfully authorized`
- Verify no errors

---

## Step 5: Test Reader Detection
**Goal:** Verify Square Stand is detected (if connected).

### Actions:
1. Connect Square Stand to iPad
2. Check if SDK automatically detects it
3. Look for reader-related logs in console

### Success Criteria:
- [ ] Square Stand detected (if connected)
- [ ] No reader-related errors
- [ ] SDK reports reader status

### Test:
- Connect Square Stand
- Run app
- Check console for reader detection messages
- Verify SDK can see the hardware

---

## Step 6: Implement Payment Parameters (No Actual Payment)
**Goal:** Create payment parameters but don't start payment yet.

### Actions:
1. Uncomment payment parameter creation code
2. **DO NOT** call `startPayment()` yet
3. Just log the parameters

### Code Changes:
```swift
// Create payment parameters
let amountMoney = Money(amount: UInt(amount * 100), currency: .USD)
let paymentParameters = PaymentParameters(
    paymentAttemptID: donationId,
    amountMoney: amountMoney,
    processingMode: .onlineOnly
)
let promptParameters = PromptParameters(
    mode: .default,
    additionalMethods: .all
)
print("[SquareMobilePayments] Payment parameters created: \(paymentParameters)")
```

### Success Criteria:
- [ ] Parameters created successfully
- [ ] No compilation errors
- [ ] Parameters logged correctly

### Test:
- Build and run
- Go through donation flow
- Check console for parameter logs
- Verify no errors

---

## Step 7: Implement PaymentManagerDelegate
**Goal:** Add delegate methods without starting payment.

### Actions:
1. Make class conform to `PaymentManagerDelegate`
2. Uncomment delegate methods
3. Add logging to each method

### Code Changes:
- Add `PaymentManagerDelegate` to class declaration
- Uncomment all three delegate methods
- Add detailed logging

### Success Criteria:
- [ ] Delegate methods compile
- [ ] No protocol conformance errors
- [ ] Methods are properly defined

### Test:
- Build project
- Verify no compilation errors
- Check delegate methods are accessible

---

## Step 8: Start Payment (Test Mode)
**Goal:** Start payment flow but handle errors gracefully.

### Actions:
1. Uncomment `startPayment()` call
2. Add comprehensive error handling
3. Test with small amount first

### Code Changes:
- Uncomment `MobilePaymentsSDK.shared.paymentManager.startPayment()`
- Add try-catch if needed
- Add detailed logging

### Success Criteria:
- [ ] Payment flow starts
- [ ] SDK shows payment UI (if applicable)
- [ ] No crashes
- [ ] Errors are caught and logged

### Test:
- Build and run
- Go through donation flow
- Click "Ready for Payment"
- Verify payment UI appears
- Check for any errors

---

## Step 9: Test with Square Stand (Full Integration)
**Goal:** Complete end-to-end payment test.

### Actions:
1. Ensure Square Stand is connected
2. Complete full payment flow
3. Test card tap/chip
4. Verify payment completion

### Success Criteria:
- [ ] Payment processes successfully
- [ ] Payment ID is received
- [ ] Donation record updated
- [ ] Success screen shows

### Test:
- Full donation flow
- Card interaction on Square Stand
- Payment completion
- Verify backend receives payment

---

## Step 10: Error Handling & Edge Cases
**Goal:** Handle all error scenarios gracefully.

### Actions:
1. Test payment cancellation
2. Test payment failure
3. Test network errors
4. Test Square Stand disconnection

### Success Criteria:
- [ ] All errors handled gracefully
- [ ] User sees appropriate messages
- [ ] App doesn't crash
- [ ] Errors are logged

### Test:
- Cancel payment
- Test with invalid card
- Disconnect Square Stand during payment
- Test network issues

---

## Troubleshooting Guide

### If Step 1 Fails (Package Addition):
- Check Xcode version (15.0+)
- Verify internet connection
- Check Square's package URL is correct
- Try different version

### If Step 2-3 Fail (Import/Availability):
- Verify package was added correctly
- Check build settings
- Clean build folder
- Delete derived data

### If Step 4 Fails (Authorization):
- Check backend endpoint returns valid token
- Verify OAuth scope includes `PAYMENTS_WRITE_IN_PERSON`
- Check Square Developer Dashboard
- Verify location ID is correct

### If Step 5 Fails (Reader Detection):
- Verify Square Stand is connected
- Check Bluetooth is enabled
- Verify Info.plist has Square protocols
- Check Square Stand firmware

### If Step 6-8 Fail (Payment Setup):
- Check SDK version compatibility
- Verify payment parameters are correct
- Check delegate implementation
- Review Square documentation

### If Step 9-10 Fail (Payment Processing):
- Check Square Stand connection
- Verify card is valid
- Check network connectivity
- Review error logs

---

## Rollback Plan

If any step fails:
1. **Stop** - Don't proceed to next step
2. **Document** - Note the exact error
3. **Revert** - Comment out the failing code
4. **Investigate** - Check troubleshooting guide
5. **Fix** - Resolve issue before continuing

---

## Current Status

- ✅ **Step 0:** App working without SDK
- ⏳ **Step 1:** Ready to add package
- ⏳ **Step 2-10:** Pending

---

## Next Action

**Start with Step 1:** Add Square SDK package to Xcode project.

Let me know when you're ready to begin Step 1, and we'll proceed one step at a time!

