import { DataSource } from 'typeorm';
import { typeOrmConfig } from '../config/typeorm.config';
import { Donation } from '../donations/entities/donation.entity';
import { DonationStatus } from '../donations/entities/donation.entity';
import { Temple } from '../temples/entities/temple.entity';

interface SquarePayment {
  id: string;
  created_at: string;
  amount_money: {
    amount: number; // in cents
    currency: string;
  };
  status: string;
  card_details?: {
    card: {
      last_4: string;
      card_brand: string;
    };
  };
  processing_fee?: Array<{
    amount_money: {
      amount: number; // in cents
    };
  }>;
  note?: string;
}

async function fetchSquarePayments(
  accessToken: string,
  locationId: string,
  beginTime?: string,
  endTime?: string,
): Promise<SquarePayment[]> {
  const url = 'https://connect.squareup.com/v2/payments/search';
  
  // Build the query according to Square API v2 format
  // Square API requires the query to be properly structured
  const query: any = {
    query: {
      filter: {
        location_ids: [locationId],
        status_filter: {
          statuses: ['COMPLETED'],
        },
      },
      sort: {
        sort_field: 'CREATED_AT',
        sort_order: 'DESC',
      },
    },
  };

  // Add date range if provided
  if (beginTime || endTime) {
    query.query.filter.date_time_filter = {};
    if (beginTime) {
      query.query.filter.date_time_filter.created_at = {
        start_at: beginTime,
      };
    }
    if (endTime) {
      if (!query.query.filter.date_time_filter.created_at) {
        query.query.filter.date_time_filter.created_at = {};
      }
      query.query.filter.date_time_filter.created_at.end_at = endTime;
    }
  }

  // Log request details (without exposing full token)
  console.log('[Square API] Request URL:', url);
  console.log('[Square API] Location ID:', locationId);
  console.log('[Square API] Date range:', { beginTime, endTime });
  console.log('[Square API] Access token length:', accessToken?.length || 0);
  console.log('');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': '2023-10-18',
    },
    body: JSON.stringify(query),
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    let error;
    try {
      error = JSON.parse(responseText);
    } catch {
      error = { message: responseText };
    }
    
    console.error('[Square API] Error Status:', response.status, response.statusText);
    console.error('[Square API] Error Details:', JSON.stringify(error, null, 2));
    
    // Provide more helpful error messages
    if (response.status === 401) {
      throw new Error('Square access token is invalid or expired. Please reconnect Square in the admin portal.');
    } else if (response.status === 404) {
      throw new Error(`Square location '${locationId}' not found. Please verify the location ID is correct.`);
    } else {
      const errorMessage = error.errors?.[0]?.detail || error.errors?.[0]?.code || error.message || 'Unknown error';
      throw new Error(`Square API error (${response.status}): ${errorMessage}`);
    }
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch (e) {
    throw new Error(`Failed to parse Square API response: ${responseText.substring(0, 200)}`);
  }

  console.log('[Square API] Successfully fetched payments');
  console.log(`[Square API] Total payments in response: ${data.payments?.length || 0}`);
  console.log('');

  return data.payments || [];
}

async function restoreDonationsFromSquare() {
  console.log('==========================================');
  console.log('Restore Deleted Donations from Square');
  console.log('==========================================');
  console.log('');

  const dataSource = new DataSource({
    ...typeOrmConfig(),
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');
    console.log('');

    // Get all temples with Square connected
    const templesWithSquare = await dataSource
      .getRepository(Temple)
      .createQueryBuilder('temple')
      .where('temple.squareAccessToken IS NOT NULL')
      .andWhere('temple.squareLocationId IS NOT NULL')
      .getMany();

    if (templesWithSquare.length === 0) {
      console.log('❌ No temples found with Square connected');
      return;
    }

    console.log(`Found ${templesWithSquare.length} temple(s) with Square connected`);
    console.log('');

    let totalRestored = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const temple of templesWithSquare) {
      console.log(`Processing temple: ${temple.name} (${temple.id})`);
      console.log(`Square Location ID: ${temple.squareLocationId}`);
      console.log('');

      try {
        // Fetch payments from Square
        // Get payments from last 90 days (adjust as needed)
        const endTime = new Date().toISOString();
        const beginTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

        // First, verify the Square token and location are valid
        console.log('Verifying Square connection...');
        try {
          const locationsResponse = await fetch('https://connect.squareup.com/v2/locations', {
            headers: {
              'Authorization': `Bearer ${temple.squareAccessToken}`,
              'Square-Version': '2023-10-18',
            },
          });

          if (!locationsResponse.ok) {
            const errorText = await locationsResponse.text();
            throw new Error(`Failed to verify Square connection: ${errorText}`);
          }

          const locationsData = await locationsResponse.json();
          const validLocationIds = (locationsData.locations || []).map((loc: any) => loc.id);
          
          if (!validLocationIds.includes(temple.squareLocationId)) {
            console.warn(`⚠️  Warning: Location ID ${temple.squareLocationId} not found in accessible locations`);
            console.warn(`   Available locations: ${validLocationIds.join(', ')}`);
            console.warn(`   Using stored location ID anyway...`);
          } else {
            console.log(`✅ Square connection verified`);
            console.log(`   Location ID ${temple.squareLocationId} is valid`);
          }
        } catch (verifyError: any) {
          console.error(`❌ Failed to verify Square connection:`, verifyError.message);
          console.error(`   The access token may be invalid or expired.`);
          console.error(`   Please reconnect Square in the admin portal.`);
          console.log('');
          throw verifyError;
        }

        console.log('');
        console.log(`Fetching Square payments from ${beginTime} to ${endTime}...`);
        console.log(`Using Square Location ID: ${temple.squareLocationId}`);
        console.log('');
        
        let payments: SquarePayment[];
        try {
          payments = await fetchSquarePayments(
            temple.squareAccessToken,
            temple.squareLocationId,
            beginTime,
            endTime,
          );
        } catch (error: any) {
          console.error(`❌ Failed to fetch payments from Square:`, error.message);
          console.error(`   This might be due to:`);
          console.error(`   - Invalid or expired Square access token`);
          console.error(`   - Incorrect Square location ID`);
          console.error(`   - Square API permissions issue (need PAYMENTS_READ scope)`);
          console.error(`   - Network connectivity issue`);
          console.log('');
          throw error;
        }

        console.log(`Found ${payments.length} completed payment(s) in Square`);
        console.log('');

        // Get existing donations with Square payment IDs
        const existingDonations = await dataSource
          .getRepository(Donation)
          .createQueryBuilder('donation')
          .where('donation.templeId = :templeId', { templeId: temple.id })
          .andWhere('donation.squarePaymentId IS NOT NULL')
          .getMany();

        const existingPaymentIds = new Set(
          existingDonations.map((d) => d.squarePaymentId),
        );

        console.log(`Found ${existingDonations.length} existing donation(s) in database`);
        console.log('');

        // Find payments that don't have corresponding donations
        const missingPayments = payments.filter(
          (p) => !existingPaymentIds.has(p.id),
        );

        console.log(`Found ${missingPayments.length} payment(s) without corresponding donations`);
        console.log('');

        if (missingPayments.length === 0) {
          console.log('✅ No missing donations to restore');
          console.log('');
          continue;
        }

        // Restore missing donations
        for (const payment of missingPayments) {
          try {
            const amount = payment.amount_money.amount / 100; // Convert cents to dollars
            const processingFeeMoney =
              payment.processing_fee?.[0]?.amount_money?.amount || 0;
            const squareFee = processingFeeMoney / 100; // Convert cents to dollars
            const netAmount = amount - squareFee;

            const donation = dataSource.getRepository(Donation).create({
              templeId: temple.id,
              deviceId: null, // Device was deleted, so set to NULL
              amount: amount,
              currency: payment.amount_money.currency || 'USD',
              squarePaymentId: payment.id,
              netAmount: netAmount,
              squareFee: squareFee,
              cardLast4: payment.card_details?.card?.last_4 || null,
              cardType: payment.card_details?.card?.card_brand || null,
              status:
                payment.status === 'COMPLETED'
                  ? DonationStatus.SUCCEEDED
                  : DonationStatus.PENDING,
              createdAt: new Date(payment.created_at),
            });

            await dataSource.getRepository(Donation).save(donation);

            console.log(
              `  ✅ Restored donation: $${amount.toFixed(2)} (Payment ID: ${payment.id.substring(0, 8)}...)`,
            );
            totalRestored++;
          } catch (error) {
            console.error(
              `  ❌ Error restoring payment ${payment.id}:`,
              error.message,
            );
            totalErrors++;
          }
        }

        console.log('');
      } catch (error) {
        console.error(`❌ Error processing temple ${temple.name}:`, error.message);
        totalErrors++;
        console.log('');
      }
    }

    console.log('==========================================');
    console.log('Restoration Summary');
    console.log('==========================================');
    console.log(`✅ Restored: ${totalRestored} donation(s)`);
    console.log(`⏭️  Skipped: ${totalSkipped} donation(s)`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log('');
    console.log('✅ Restoration completed!');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run the restoration
restoreDonationsFromSquare().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

