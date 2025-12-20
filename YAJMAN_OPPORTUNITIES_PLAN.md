# Yajman Opportunities Feature - Planning Document

## Overview
Enhance donation categories to support multi-tiered yajman sponsorship opportunities. Based on the 2026 Yajman Sponsorship poster, categories like "Platinum", "Gold", "Silver" are **sponsorship tiers** that include **multiple yajman opportunities as benefits** included in the package.

## Understanding the Structure (Based on Poster)

### Sponsorship Tiers (Categories):
1. **Platinum Sponsor: $11,000** - Includes 12 yajman opportunities
2. **Gold Sponsor: $4,000** - Includes 11 yajman opportunities  
3. **Silver Sponsor: $3,000** - Includes 9 yajman opportunities

### Yajman Opportunities (Benefits Included):
Each tier includes multiple yajman opportunities as part of the package:
- ANNUAL SATURDAY REGULAR SABHA YAJMAN
- ANNUAL POONAM SABHA YAJMAN
- ANNUAL HARIJAYANTI YAJMAN
- SHAKOUSTAV MAIN YAJMAN / SHAKOTSAV - BHOJAN YAJMAN
- MARUTI YAGNA MAIN YAJMAN / MARUTI YAGNA PATLA YAJMAN
- PATOTSAV MAIN YAJMAN
- GANESH CHATURTHI POOJAN
- KALI CHAUDAS HANUMANJI POOJAN
- CHOPDA POOJAN
- SHIVRATRI POOJAN
- TULSI VIVAH MAMA YAJMAN
- DHANUSMAS (4 DHUN)

**Key Insight:** These are not individual selectable opportunities - they are **benefits included** when you purchase a sponsorship tier. The donor selects a tier (Platinum/Gold/Silver) and receives all the yajman opportunities listed for that tier.

## Current Structure
- **DonationCategory** entity has:
  - `name` (e.g., "Platinum", "Gold", "Silver")
  - `defaultAmount` (single amount)
  - `isActive`, `showOnKiosk` flags
  - Date range filtering

## Proposed Data Model

### Option A: Nested Structure (Recommended) - UPDATED
Add a `yajmanOpportunities` JSON field to `DonationCategory` to store the **included yajman opportunities** (benefits):

```typescript
@Column({ type: 'json', nullable: true })
yajmanOpportunities?: Array<{
  id: string;                    // Unique ID for this opportunity
  name: string;                  // e.g., "ANNUAL POONAM SABHA YAJMAN", "SHAKOUSTAV MAIN YAJMAN"
  description?: string;           // Optional description
  // Note: amount is NOT here - the category's defaultAmount is the tier price
  // These are benefits included in the tier, not separate purchasable items
}>;
```

**Important:** The category's `defaultAmount` is the sponsorship tier price (e.g., $11,000 for Platinum). The `yajmanOpportunities` array lists what's **included** in that tier.

**Pros:**
- Simple to implement
- No new database tables needed
- Easy to query and filter
- Flexible JSON structure

**Cons:**
- Less normalized (but acceptable for this use case)
- Harder to query individual opportunities across categories

### Option B: Separate Entity
Create a new `YajmanOpportunity` entity:

```typescript
@Entity('yajman_opportunities')
export class YajmanOpportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  categoryId: string;

  @ManyToOne(() => DonationCategory)
  @JoinColumn({ name: 'categoryId' })
  category: DonationCategory;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json' })
  benefits: string[];

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ nullable: true })
  maxQuantity: number;

  @Column({ nullable: true })
  imageUrl: string;
}
```

**Pros:**
- More normalized database structure
- Better for complex queries
- Can add more fields easily

**Cons:**
- More complex to implement
- Requires migration
- More joins needed

## Recommended Approach: **Option A (Nested JSON)**

For this use case, Option A is better because:
1. Yajman opportunities are tightly coupled to categories
2. Simpler implementation
3. Flexible enough for future needs
4. No complex queries needed

## UI/UX Flow Options

### Option 1: Enhanced Category Display with Benefits (Recommended)
1. **Step 1**: User sees categories (Platinum, Gold, Silver) with:
   - Category name
   - Price (e.g., "$11,000")
   - Indicator that it includes yajman opportunities
   - Option to "View Details" or expand to see included opportunities
2. **Step 2**: When category is selected/expanded, show:
   - List of all included yajman opportunities
   - Clear indication these are benefits included in the tier
   - Amount is automatically set to the tier price
   - Proceed to donor details

**Visual Flow:**
```
Category Selection Screen:
┌─────────────────────────────────┐
│ PLATINUM SPONSOR                │
│ $11,000                         │
│ [View Included Yajman] ▼        │
│                                 │
│ Includes:                       │
│ • ANNUAL SATURDAY REGULAR...    │
│ • ANNUAL POONAM SABHA YAJMAN    │
│ • ANNUAL HARIJAYANTI YAJMAN     │
│ • SHAKOUSTAV MAIN YAJMAN        │
│ • ... (8 more)                 │
│                                 │
│ [Select Platinum]               │
└─────────────────────────────────┘
```

### Option 2: Modal with Full Details
1. User selects category
2. Modal opens showing:
   - Tier name and price prominently
   - Full list of included yajman opportunities
   - "This sponsorship includes:" header
   - Confirm button to proceed

### Option 3: Info Icon Approach
- Category cards show name and price
- Small "info" icon indicates yajman opportunities included
- Tapping info shows modal with full list
- Main tap selects the category

**Pros:**
- Clean, uncluttered main view
- Details available on demand

**Cons:**
- Requires extra tap to see benefits

## Recommended UI Flow: **Option 1 (Enhanced Category Display)**

This matches the poster's structure where tiers are clearly presented with their included benefits.

## Implementation Plan

### Phase 1: Backend Changes

1. **Update DonationCategory Entity**
   - Add `yajmanOpportunities` JSON column
   - Update DTOs to include this field

2. **Update Admin Portal**
   - Add UI in CategoriesTab to manage yajman opportunities
   - Allow adding/editing/deleting opportunities
   - Show benefits as a list (add/remove items)

3. **Update API**
   - Ensure yajman opportunities are returned in category responses
   - No new endpoints needed (uses existing category endpoints)

### Phase 2: iOS App Changes

1. **Update DonationCategory Model**
   - Add `yajmanOpportunities` array property
   - Parse from JSON response

2. **Create YajmanOpportunitiesDisplayView**
   - Component that displays included opportunities
   - Shows as a list of benefits (not selectable)
   - Can be used in:
     - Expandable section in category card
     - Modal/sheet for detailed view
     - Info popover

3. **Update DonationHomeView**
   - Enhanced category cards that show:
     - Category name and price prominently
     - "Includes X yajman opportunities" indicator
     - Expandable section or "View Details" button
     - When expanded, show list of included opportunities
   - When category is selected:
     - Amount automatically set to defaultAmount
     - Show confirmation of included opportunities
     - Proceed to donor details

4. **Update DonationDetailsView**
   - Show selected category name
   - Display amount (tier price)
   - Optionally show "Included Yajman Opportunities" section
   - List all included opportunities

### Phase 3: Receipt/Email Updates

1. **Update Receipt Template**
   - Show selected yajman opportunity name
   - Show benefits in receipt (optional)

2. **Update Email Receipt**
   - Include opportunity details

## Data Structure Example

```json
{
  "id": "category-uuid",
  "name": "Platinum Sponsor",
  "defaultAmount": 11000,
  "yajmanOpportunities": [
    {
      "id": "opp-1",
      "name": "ANNUAL SATURDAY REGULAR SABHA YAJMAN"
    },
    {
      "id": "opp-2",
      "name": "ANNUAL POONAM SABHA YAJMAN"
    },
    {
      "id": "opp-3",
      "name": "ANNUAL HARIJAYANTI YAJMAN"
    },
    {
      "id": "opp-4",
      "name": "SHAKOUSTAV MAIN YAJMAN"
    },
    {
      "id": "opp-5",
      "name": "MARUTI YAGNA MAIN YAJMAN"
    },
    {
      "id": "opp-6",
      "name": "PATOTSAV MAIN YAJMAN"
    },
    {
      "id": "opp-7",
      "name": "GANESH CHATURTHI POOJAN"
    },
    {
      "id": "opp-8",
      "name": "KALI CHAUDAS HANUMANJI POOJAN"
    },
    {
      "id": "opp-9",
      "name": "CHOPDA POOJAN"
    },
    {
      "id": "opp-10",
      "name": "SHIVRATRI POOJAN"
    },
    {
      "id": "opp-11",
      "name": "TULSI VIVAH MAMA YAJMAN"
    },
    {
      "id": "opp-12",
      "name": "DHANUSMAS (4 DHUN)"
    }
  ]
}
```

**Example for Gold Sponsor:**
```json
{
  "id": "category-uuid-2",
  "name": "Gold Sponsor",
  "defaultAmount": 4000,
  "yajmanOpportunities": [
    { "id": "opp-g1", "name": "ANNUAL POONAM SABHA YAJMAN" },
    { "id": "opp-g2", "name": "ANNUAL HARI JAYANTI YAJMAN" },
    { "id": "opp-g3", "name": "SHAKOTSAV - BHOJAN YAJMAN" },
    { "id": "opp-g4", "name": "MARUTI YAGNA PATLA YAJMAN" },
    { "id": "opp-g5", "name": "PATOTSAV MAIN YAJMAN" },
    { "id": "opp-g6", "name": "KALI CHAUDAS HANUMANJI POOJAN" },
    { "id": "opp-g7", "name": "CHOPDA POOJAN" },
    { "id": "opp-g8", "name": "GANESH CHATURTHI POOJAN" },
    { "id": "opp-g9", "name": "SHIVRATRI POOJAN" },
    { "id": "opp-g10", "name": "TULSI VIVAH MAMA YAJMAN" },
    { "id": "opp-g11", "name": "DHANUSMAS (4 DHUN)" }
  ]
}
```

**Example for Silver Sponsor:**
```json
{
  "id": "category-uuid-3",
  "name": "Silver Sponsor",
  "defaultAmount": 3000,
  "yajmanOpportunities": [
    { "id": "opp-s1", "name": "ANNUAL POONAM SABHA YAJMAN" },
    { "id": "opp-s2", "name": "ANNUAL HARI JAYANTI YAJMAN" },
    { "id": "opp-s3", "name": "SHAKOTSAV - BHOJAN YAJMAN" },
    { "id": "opp-s4", "name": "MARUTI YAGNA PATLA YAJMAN" },
    { "id": "opp-s5", "name": "CHOPDA POOJAN" },
    { "id": "opp-s6", "name": "SHIVRATRI POOJAN" },
    { "id": "opp-s7", "name": "KALI CHAUDAS HANUMANJI POOJAN" },
    { "id": "opp-s8", "name": "TULSI VIVAH MAMA YAJMAN" },
    { "id": "opp-s9", "name": "DHANUSMAS (4 DHUN)" }
  ]
}
```

## Questions to Consider

1. **Can a category have both a default amount AND opportunities?**
   - **Answer:** Yes! The defaultAmount IS the tier price. The opportunities are benefits included in that tier.
   - **Implementation:** When category is selected, amount is automatically set to defaultAmount. Opportunities are shown as included benefits.

2. **Can multiple opportunities be selected?**
   - **Answer:** No. All opportunities listed are automatically included when you select the tier.
   - **Implementation:** Display as a read-only list of benefits, not selectable items.

3. **Should opportunities be shown in the category list?**
   - **Answer:** Yes, but as included benefits, not selectable items.
   - **Implementation:** Show category with price, and either:
     - Expandable section showing all included opportunities
     - "View Details" button that shows modal with full list
     - Info icon that reveals the list

4. **What if a category has opportunities but user wants to donate a different amount?**
   - **Answer:** For sponsorship tiers, the amount should be fixed (the tier price).
   - **Implementation:** If category has yajmanOpportunities, lock the amount to defaultAmount. 
   - **Alternative:** Allow "Other Amount" but note that it won't include the yajman opportunities (if that makes sense for your use case).

5. **Should we track availability/quantity limits?**
   - **Answer:** Possibly for future, but not needed initially.
   - **Implementation:** Can add `isAvailable` flag to category level if needed later.

## Next Steps

1. **Confirm approach** (Option A vs Option B, UI Flow Option 1 vs 2 vs 3)
2. **Create database migration** for JSON column
3. **Update backend entity and DTOs**
4. **Update admin portal UI**
5. **Update iOS app models and UI**
6. **Test end-to-end flow**

## Pledge Feature (Pay Later)

### Overview
Allow donors to select a yajman sponsorship tier and **pledge** to pay for it later, without requiring immediate payment.

### Use Cases
- Donor wants to commit to Gold Sponsor ($4,000) but needs to pay later
- Donor can review their pledge and pay when ready
- Temple can track pending pledges and follow up

### Data Model Changes

#### Option A: Add Pledge Status to Donation (Recommended)
Add a new donation status: `PLEDGED`

```typescript
enum DonationStatus {
  PENDING = 'PENDING',
  PLEDGED = 'PLEDGED',  // NEW: Pledged but not paid
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
  REFUNDED = 'REFUNDED',
}
```

Add fields to track pledge information:
```typescript
@Column({ nullable: true })
pledgeExpiryDate?: Date;  // Optional: when pledge expires

@Column({ nullable: true })
pledgePaymentLink?: string;  // Link to pay later (QR code or URL)

@Column({ nullable: true })
pledgeToken?: string;  // Unique token for pledge payment link
```

#### Option B: Separate Pledge Entity
Create a separate `Pledge` entity (more complex, but cleaner separation)

**Recommendation: Option A** - Simpler and keeps everything in one place.

### UI/UX Flow

#### On Kiosk (iOS App):
1. User selects category (e.g., "Gold Sponsor")
2. User sees two options:
   - **[Pay Now]** - Proceed to payment immediately
   - **[Pledge Now, Pay Later]** - Create pledge without payment
3. If "Pledge Now":
   - Collect donor information (name, phone, email - all required for pledges)
   - Show confirmation: "You've pledged $4,000 for Gold Sponsor"
   - Generate unique pledge link/QR code
   - Display QR code or link for donor to save
   - Option to email pledge confirmation with payment link
4. If "Pay Now":
   - Normal payment flow

#### Payment Link Options:
- **QR Code**: Display on screen, donor scans with phone
- **Email Link**: Send email with unique payment link
- **SMS Link**: Send SMS with payment link (if phone provided)
- **Manual Entry**: Show pledge ID that donor can enter on website

### Backend Implementation

1. **New Endpoint: Create Pledge**
   ```
   POST /donations/pledge
   Body: {
     templeId, deviceId, categoryId, amount,
     donorName, donorPhone, donorEmail
   }
   Response: {
     donationId,
     pledgeToken,
     paymentLink,
     qrCodeUrl
   }
   ```

2. **New Endpoint: Pay Pledge**
   ```
   POST /donations/pledge/:token/pay
   Body: { squarePaymentId, status }
   ```
   - Updates donation status from PLEDGED to SUCCEEDED
   - Processes payment

3. **New Endpoint: Get Pledge Details**
   ```
   GET /donations/pledge/:token
   ```
   - Returns pledge details (amount, category, donor info)
   - Used for payment page

4. **Update Donation Service**
   - `createPledge()` - Creates donation with PLEDGED status
   - `payPledge()` - Processes payment for existing pledge
   - Generate unique pledge token (UUID or short code)

### Admin Portal Changes

1. **Donations Tab Updates**
   - Filter by status: "Pledges" (PLEDGED status)
   - Show pledge expiry date
   - Show payment link
   - "Send Reminder" button (email/SMS)
   - "Mark as Expired" button

2. **Pledge Management**
   - View all pledges
   - See which pledges are expiring soon
   - Send payment reminders
   - Cancel pledges if needed

### Payment Link/QR Code Flow

1. **Generate Payment Link**
   - Format: `https://your-domain.com/pay-pledge/{pledgeToken}`
   - Or: `https://your-domain.com/pledge/{pledgeToken}`

2. **Payment Page** (New web page)
   - Shows pledge details
   - Amount, category, donor name
   - Payment form (Square integration)
   - After payment, update donation status

3. **QR Code**
   - Generate QR code with payment link
   - Display on kiosk screen
   - Donor scans with phone
   - Opens payment page

### Email/SMS Notifications

1. **Pledge Confirmation Email**
   - Sent immediately after pledge creation
   - Includes:
     - Pledge details
     - Payment link
     - QR code image
     - Expiry date (if set)
     - Instructions

2. **Payment Reminder Email** (Optional)
   - Sent X days before expiry
   - Sent if pledge not paid after Y days

3. **Payment Confirmation Email**
   - Sent when pledge is paid
   - Same as regular donation receipt

### Questions to Consider

1. **Should pledges expire?**
   - Recommendation: Yes, set default expiry (e.g., 30 days)
   - Admin can extend if needed

2. **Can donors modify pledges?**
   - Recommendation: No, but can cancel and create new one

3. **What if donor wants to pay partial amount?**
   - Recommendation: Not supported initially. Full amount only.

4. **Can admin mark pledge as paid manually?**
   - Recommendation: Yes, for cash/check payments

5. **Should we track pledge source?**
   - Recommendation: Yes, store deviceId to know which kiosk

### Implementation Priority

**Phase 1: Basic Pledge**
- Add PLEDGED status
- Create pledge endpoint
- Generate payment link
- Display QR code on kiosk
- Basic payment page

**Phase 2: Enhanced Features**
- Email confirmation
- Expiry dates
- Admin reminder system
- Pledge management UI

**Phase 3: Advanced**
- SMS notifications
- Partial payments
- Pledge modifications
- Analytics/reporting

## Future Enhancements

- Availability tracking (mark opportunities as sold out)
- Quantity limits per opportunity
- Images for opportunities
- Recurring opportunities (same opportunity for multiple dates)
- Opportunity scheduling/calendar integration
- Pledge analytics and reporting
- Automated reminder system

