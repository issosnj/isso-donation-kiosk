import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TemplesService } from '../temples/temples.service';
import { DonationsService } from '../donations/donations.service';
import { DonationStatus } from '../donations/entities/donation.entity';

@Injectable()
export class SquareService {
  constructor(
    private configService: ConfigService,
    private templesService: TemplesService,
    private donationsService: DonationsService,
  ) {}

  getOAuthUrl(templeId: string): string {
    const applicationId = this.configService.get<string>('SQUARE_APPLICATION_ID');
    const redirectUri = this.configService.get<string>('SQUARE_REDIRECT_URI');
    
    if (!applicationId || !redirectUri) {
      throw new Error('Square configuration missing: SQUARE_APPLICATION_ID or SQUARE_REDIRECT_URI not set');
    }
    
    // Normalize redirect URI - remove trailing slash if present
    const normalizedRedirectUri = redirectUri.endsWith('/') ? redirectUri.slice(0, -1) : redirectUri;
    
    const state = Buffer.from(JSON.stringify({ templeId })).toString('base64');
    const encodedRedirectUri = encodeURIComponent(normalizedRedirectUri);
    // Include PAYMENTS_WRITE_IN_PERSON for Mobile Payments SDK
    const oauthUrl = `https://squareup.com/oauth2/authorize?client_id=${applicationId}&response_type=code&scope=PAYMENTS_READ+PAYMENTS_WRITE+PAYMENTS_WRITE_IN_PERSON+MERCHANT_PROFILE_READ&state=${state}&redirect_uri=${encodedRedirectUri}`;
    
    console.log('[Square Service] Generated OAuth URL for temple:', templeId);
    console.log('[Square Service] Redirect URI (exact):', JSON.stringify(normalizedRedirectUri));
    console.log('[Square Service] Redirect URI (encoded):', encodedRedirectUri);
    console.log('[Square Service] Full OAuth URL (first 200 chars):', oauthUrl.substring(0, 200) + '...');
    
    return oauthUrl;
  }

  async exchangeCodeForToken(code: string, state: string): Promise<any> {
    const applicationId = this.configService.get<string>('SQUARE_APPLICATION_ID');
    const applicationSecret = this.configService.get<string>('SQUARE_APPLICATION_SECRET');
    const redirectUri = this.configService.get<string>('SQUARE_REDIRECT_URI');

    console.log('[Square Service] Exchanging code for token');
    console.log('[Square Service] Application ID:', applicationId ? `${applicationId.substring(0, 8)}...` : 'missing');
    console.log('[Square Service] Application Secret:', applicationSecret ? 'present' : 'missing');
    console.log('[Square Service] Redirect URI (exact):', JSON.stringify(redirectUri));
    console.log('[Square Service] Redirect URI length:', redirectUri?.length || 0);
    console.log('[Square Service] Code present:', !!code);
    console.log('[Square Service] State present:', !!state);

    if (!applicationId || !applicationSecret || !redirectUri) {
      throw new Error('Square configuration missing: SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET, or SQUARE_REDIRECT_URI not set');
    }

    // Normalize redirect URI - remove trailing slash if present
    const normalizedRedirectUri = redirectUri.endsWith('/') ? redirectUri.slice(0, -1) : redirectUri;
    console.log('[Square Service] Normalized Redirect URI:', JSON.stringify(normalizedRedirectUri));
    console.log('[Square Service] Redirect URI length:', normalizedRedirectUri.length);
    console.log('[Square Service] Redirect URI characters:', normalizedRedirectUri.split('').map(c => c.charCodeAt(0)).join(','));

    const requestBody = {
      client_id: applicationId,
      client_secret: applicationSecret,
      code,
      redirect_uri: normalizedRedirectUri,
      grant_type: 'authorization_code',
    };

    console.log('[Square Service] Request body (without secrets):', {
      client_id: `${applicationId.substring(0, 8)}...`,
      client_secret: '***',
      code: code ? 'present' : 'missing',
      redirect_uri: normalizedRedirectUri,
      grant_type: 'authorization_code',
    });

    const response = await fetch('https://connect.squareup.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Square Service] Token exchange failed');
      console.error('[Square Service] Status:', response.status, response.statusText);
      console.error('[Square Service] Error response:', JSON.stringify(error, null, 2));
      console.error('[Square Service] Request details:', {
        applicationId: applicationId ? `${applicationId.substring(0, 8)}...` : 'missing',
        redirectUri: redirectUri,
        hasCode: !!code,
        hasState: !!state,
      });
      
      // Provide more helpful error messages
      if (error.type === 'service.not_authorized') {
        throw new Error(`Square authorization failed. Common causes:\n` +
          `1. Redirect URI mismatch - ensure ${redirectUri} is exactly configured in Square Dashboard\n` +
          `2. Application ID or Secret is incorrect\n` +
          `3. Application doesn't have required permissions\n` +
          `4. Square account doesn't have permission to authorize this app\n\n` +
          `Error details: ${error.message || JSON.stringify(error)}`);
      }
      
      throw new Error(`Square OAuth error: ${error.message || JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('[Square Service] Token exchange successful');
    return data;
  }

  async getMerchantInfo(accessToken: string): Promise<any> {
    console.log('[Square Service] Fetching merchant info...');
    const response = await fetch('https://connect.squareup.com/v2/merchants', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Square Service] Failed to get merchant info, status:', response.status, 'error:', errorText);
      throw new Error(`Failed to get merchant info: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Square Service] Merchant info retrieved, merchant count:', data.merchant?.length || 0);
    return data.merchant[0];
  }

  async getLocations(accessToken: string): Promise<any[]> {
    console.log('[Square Service] Fetching locations...');
    const response = await fetch('https://connect.squareup.com/v2/locations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Square Service] Failed to get locations, status:', response.status, 'error:', errorText);
      throw new Error(`Failed to get locations: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Square Service] Locations retrieved, count:', data.locations?.length || 0);
    return data.locations || [];
  }

  async handleWebhook(webhookData: any): Promise<void> {
    const { type, data } = webhookData;

    if (type === 'payment.updated') {
      const payment = data.object.payment;
      const squarePaymentId = payment.id;
      const status = payment.status;

      // Find donation by Square payment ID
      const donation = await this.donationsService.findBySquarePaymentId(
        squarePaymentId,
      );

      if (donation) {
        let donationStatus: DonationStatus;
        switch (status) {
          case 'COMPLETED':
            donationStatus = DonationStatus.SUCCEEDED;
            break;
          case 'CANCELED':
            donationStatus = DonationStatus.CANCELED;
            break;
          case 'FAILED':
            donationStatus = DonationStatus.FAILED;
            break;
          default:
            return; // Unknown status, don't update
        }

        await this.donationsService.updateStatus(donation.id, donationStatus);
      }
    }
  }

  async processPayment(
    templeId: string,
    donationId: string,
    amount: number,
    idempotencyKey?: string,
    sourceId?: string, // Card nonce from Mobile Payments SDK
  ): Promise<{ paymentId: string; status: string }> {
    // Get temple with Square access token
    const temple = await this.templesService.findOne(templeId);
    
    if (!temple.squareAccessToken) {
      throw new Error('Square not connected for this temple. Please connect Square in the admin portal.');
    }

    if (!temple.squareLocationId) {
      throw new Error('Square location not configured for this temple.');
    }

    // Decrypt access token (if encrypted) - for now assuming it's stored as-is
    const accessToken = temple.squareAccessToken;
    const locationId = temple.squareLocationId;

    // Convert amount to cents (Square API uses cents)
    const amountMoney = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: temple.defaultCurrency || 'USD',
    };

    // Create payment request
    // If sourceId (card nonce) is provided, use Mobile Payments SDK flow
    // Otherwise, fall back to Terminal API for hardware checkout
    const paymentRequest: any = {
      idempotency_key: idempotencyKey || `${donationId}-${Date.now()}`,
      amount_money: amountMoney,
      location_id: locationId,
      autocomplete: true,
    };

    // If sourceId (card nonce) is provided, use it for direct payment
    if (sourceId) {
      paymentRequest.source_id = sourceId;
      console.log('[Square Service] Processing payment with card nonce (Mobile Payments SDK)');
    } else {
      // Fall back to Terminal API for hardware checkout
      paymentRequest.source_id = 'EXTERNAL';
      console.log('[Square Service] Creating Terminal checkout for hardware');
    }

    console.log('[Square Service] Processing payment:', {
      donationId,
      amount: amountMoney.amount,
      currency: amountMoney.currency,
      locationId,
      hasSourceId: !!sourceId,
    });

    // Call Square Payments API
    const response = await fetch('https://connect.squareup.com/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18',
      },
      body: JSON.stringify(paymentRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Square Service] Payment processing failed:', error);
      throw new Error(`Square payment failed: ${error.errors?.[0]?.detail || JSON.stringify(error)}`);
    }

    const data = await response.json();
    const payment = data.payment;
    
    // Extract fee information
    const totalMoney = payment.total_money?.amount || 0; // Total in cents
    const processingFeeMoney = payment.processing_fee_money?.amount || 0; // Fee in cents
    const netAmountMoney = totalMoney - processingFeeMoney; // Net in cents
    
    // Extract card information
    const cardDetails = payment.card_details;
    const cardLast4 = cardDetails?.card?.last_4 || null;
    const cardType = cardDetails?.card?.card_brand || null;
    
    console.log('[Square Service] Payment processed successfully:', {
      paymentId: payment.id,
      status: payment.status,
      totalAmount: totalMoney / 100,
      fee: processingFeeMoney / 100,
      netAmount: netAmountMoney / 100,
      cardLast4,
      cardType,
    });

    return {
      paymentId: payment.id,
      status: payment.status,
      netAmount: netAmountMoney / 100, // Convert cents to dollars
      squareFee: processingFeeMoney / 100, // Convert cents to dollars
      cardLast4,
      cardType,
    };
  }

  async getCheckoutStatus(
    templeId: string,
    checkoutId: string,
  ): Promise<{ paymentId?: string; status: string; completed: boolean }> {
    const temple = await this.templesService.findOne(templeId);
    
    if (!temple.squareAccessToken) {
      throw new Error('Square not connected for this temple.');
    }

    const accessToken = temple.squareAccessToken;

    // Get checkout status from Square Terminal API
    const response = await fetch(`https://connect.squareup.com/v2/terminals/checkouts/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Square Service] Failed to get checkout status:', error);
      throw new Error(`Failed to get checkout status: ${error.errors?.[0]?.detail || JSON.stringify(error)}`);
    }

    const data = await response.json();
    const checkout = data.checkout;
    
    // Checkout statuses: PENDING, IN_PROGRESS, COMPLETED, CANCELED
    const isCompleted = checkout.status === 'COMPLETED';
    const paymentId = checkout.payment_ids?.[0]; // Terminal checkout can have payment IDs when completed

    return {
      paymentId,
      status: checkout.status,
      completed: isCompleted,
    };
  }

  async getPaymentDetails(templeId: string, paymentId: string): Promise<{
    netAmount: number;
    squareFee: number;
    cardLast4: string | null;
    cardType: string | null;
    paymentStatus: string;
    createdAt: string;
    [key: string]: any;
  }> {
    const temple = await this.templesService.findOne(templeId);
    
    if (!temple.squareAccessToken) {
      throw new Error('Square not connected for this temple.');
    }

    const accessToken = temple.squareAccessToken;

    // Get payment details from Square
    const response = await fetch(`https://connect.squareup.com/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Square Service] Failed to get payment details:', error);
      throw new Error(`Failed to get payment details: ${error.errors?.[0]?.detail || JSON.stringify(error)}`);
    }

    const data = await response.json();
    const payment = data.payment;
    
    // Extract fee information
    const totalMoney = payment.total_money?.amount || 0; // Total in cents
    const processingFeeMoney = payment.processing_fee_money?.amount || 0; // Fee in cents
    const netAmountMoney = totalMoney - processingFeeMoney; // Net in cents
    
    // Extract card information
    const cardDetails = payment.card_details;
    const cardLast4 = cardDetails?.card?.last_4 || null;
    const cardType = cardDetails?.card?.card_brand || null;

    console.log('[Square Service] Payment details retrieved:', {
      paymentId,
      totalAmount: totalMoney / 100,
      fee: processingFeeMoney / 100,
      netAmount: netAmountMoney / 100,
      cardLast4,
      cardType,
    });

    return {
      netAmount: netAmountMoney / 100, // Convert cents to dollars
      squareFee: processingFeeMoney / 100, // Convert cents to dollars
      cardLast4,
      cardType,
      paymentStatus: payment.status,
      createdAt: payment.created_at,
      payment: payment, // Include full payment object for additional details
    };
  }

  async refundPayment(
    templeId: string,
    paymentId: string,
    amount: number,
    reason?: string,
  ): Promise<{ refundId: string; amount: number }> {
    const temple = await this.templesService.findOne(templeId);
    
    if (!temple.squareAccessToken) {
      throw new Error('Square not connected for this temple.');
    }

    if (!temple.squareLocationId) {
      throw new Error('Square location not configured for this temple.');
    }

    const accessToken = temple.squareAccessToken;
    const locationId = temple.squareLocationId;

    // Convert amount to cents
    const amountMoney = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: temple.defaultCurrency || 'USD',
    };

    // Create refund request
    const refundRequest = {
      idempotency_key: `refund-${paymentId}-${Date.now()}`,
      payment_id: paymentId,
      amount_money: amountMoney,
      reason: reason || 'Refund requested by admin',
    };

    console.log('[Square Service] Processing refund:', {
      paymentId,
      amount: amountMoney.amount,
      currency: amountMoney.currency,
      reason: refundRequest.reason,
    });

    // Call Square Refunds API
    const response = await fetch('https://connect.squareup.com/v2/refunds', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18',
      },
      body: JSON.stringify(refundRequest),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Square Service] Refund failed:', error);
      throw new Error(`Square refund failed: ${error.errors?.[0]?.detail || JSON.stringify(error)}`);
    }

    const data = await response.json();
    const refund = data.refund;
    
    console.log('[Square Service] Refund processed successfully:', {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount_money.amount / 100,
    });

    return {
      refundId: refund.id,
      amount: refund.amount_money.amount / 100, // Convert cents to dollars
    };
  }

  // Square client methods can be added here if needed in the future
  // Currently using direct fetch calls for OAuth and API interactions
}

