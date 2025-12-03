import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Environment } from 'squareup';
import { TemplesService } from '../temples/temples.service';
import { DonationsService } from '../donations/donations.service';
import { DonationStatus } from '../donations/entities/donation.entity';

@Injectable()
export class SquareService {
  private squareClient: Client;

  constructor(
    private configService: ConfigService,
    private templesService: TemplesService,
    private donationsService: DonationsService,
  ) {
    const environment =
      this.configService.get<string>('SQUARE_ENVIRONMENT') === 'production'
        ? Environment.Production
        : Environment.Sandbox;

    this.squareClient = new Client({
      accessToken: this.configService.get<string>('SQUARE_APPLICATION_SECRET'),
      environment,
    });
  }

  getOAuthUrl(templeId: string): string {
    const applicationId = this.configService.get<string>('SQUARE_APPLICATION_ID');
    const redirectUri = this.configService.get<string>('SQUARE_REDIRECT_URI');
    const state = Buffer.from(JSON.stringify({ templeId })).toString('base64');

    return `https://squareup.com/oauth2/authorize?client_id=${applicationId}&response_type=code&scope=PAYMENTS_READ+PAYMENTS_WRITE+MERCHANT_PROFILE_READ&state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }

  async exchangeCodeForToken(code: string, state: string): Promise<any> {
    const applicationId = this.configService.get<string>('SQUARE_APPLICATION_ID');
    const applicationSecret = this.configService.get<string>('SQUARE_APPLICATION_SECRET');
    const redirectUri = this.configService.get<string>('SQUARE_REDIRECT_URI');

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
      throw new Error(`Square OAuth error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data;
  }

  async getMerchantInfo(accessToken: string): Promise<any> {
    const response = await fetch('https://connect.squareup.com/v2/merchants', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get merchant info');
    }

    const data = await response.json();
    return data.merchant[0];
  }

  async getLocations(accessToken: string): Promise<any[]> {
    const response = await fetch('https://connect.squareup.com/v2/locations', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Square-Version': '2023-10-18',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get locations');
    }

    const data = await response.json();
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

  getClientForTemple(templeId: string): Client {
    // This would be used to get a Square client configured with the temple's access token
    // For now, return the default client
    return this.squareClient;
  }
}

