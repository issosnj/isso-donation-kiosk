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
    
    const state = Buffer.from(JSON.stringify({ templeId })).toString('base64');
    const oauthUrl = `https://squareup.com/oauth2/authorize?client_id=${applicationId}&response_type=code&scope=PAYMENTS_READ+PAYMENTS_WRITE+MERCHANT_PROFILE_READ&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
    
    console.log('[Square Service] Generated OAuth URL for temple:', templeId);
    console.log('[Square Service] Redirect URI:', redirectUri);
    
    return oauthUrl;
  }

  async exchangeCodeForToken(code: string, state: string): Promise<any> {
    const applicationId = this.configService.get<string>('SQUARE_APPLICATION_ID');
    const applicationSecret = this.configService.get<string>('SQUARE_APPLICATION_SECRET');
    const redirectUri = this.configService.get<string>('SQUARE_REDIRECT_URI');

    console.log('[Square Service] Exchanging code for token');
    console.log('[Square Service] Application ID:', applicationId ? `${applicationId.substring(0, 8)}...` : 'missing');
    console.log('[Square Service] Application Secret:', applicationSecret ? 'present' : 'missing');
    console.log('[Square Service] Redirect URI:', redirectUri);
    console.log('[Square Service] Code present:', !!code);
    console.log('[Square Service] State present:', !!state);

    if (!applicationId || !applicationSecret || !redirectUri) {
      throw new Error('Square configuration missing: SQUARE_APPLICATION_ID, SQUARE_APPLICATION_SECRET, or SQUARE_REDIRECT_URI not set');
    }

    const response = await fetch('https://connect.squareup.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18',
      },
      body: JSON.stringify({
        client_id: applicationId,
        client_secret: applicationSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
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

  // Square client methods can be added here if needed in the future
  // Currently using direct fetch calls for OAuth and API interactions
}

