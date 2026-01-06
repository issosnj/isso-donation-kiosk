import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TemplesService } from '../temples/temples.service';
import { DonationsService } from '../donations/donations.service';
import { DonationStatus } from '../donations/entities/donation.entity';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private configService: ConfigService,
    private templesService: TemplesService,
    @Inject(forwardRef(() => DonationsService))
    private donationsService: DonationsService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    
    // Check if using test mode (test keys start with sk_test_)
    const isTestMode = secretKey.startsWith('sk_test_');
    console.log(`[Stripe Service] Initializing in ${isTestMode ? 'TEST' : 'LIVE'} mode`);
    
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-11-20.acacia',
    });
  }

  /**
   * Get or create a Stripe Terminal location
   * Locations are required for registering readers
   */
  async getOrCreateLocation(templeId: string): Promise<string> {
    const temple = await this.templesService.findOne(templeId);
    
    // Check if temple already has a Stripe location ID
    if (temple.stripeLocationId) {
      // Verify location still exists
      try {
        await this.stripe.terminal.locations.retrieve(temple.stripeLocationId);
        return temple.stripeLocationId;
      } catch (error) {
        // Location doesn't exist, create a new one
        console.log('[Stripe Service] Existing location not found, creating new one');
      }
    }
    
    // Create a new location for this temple
    const location = await this.stripe.terminal.locations.create({
      display_name: temple.name || 'Temple Location',
      address: temple.address ? {
        line1: temple.address,
        country: 'US', // Default to US, can be made configurable
      } : undefined,
    });
    
    // Save location ID to temple
    await this.templesService.update(templeId, {
      stripeLocationId: location.id,
    } as any);
    
    console.log('[Stripe Service] Created/retrieved location:', location.id);
    return location.id;
  }

  /**
   * Create a connection token for Stripe Terminal SDK
   * This is used by the iOS app to connect to the M2 reader
   * In test mode, this allows connecting to simulated readers
   */
  async createConnectionToken(templeId: string): Promise<{ secret: string; locationId: string }> {
    const temple = await this.templesService.findOne(templeId);
    
    // In test mode, we don't require stripeAccountId (can use direct account)
    // In live mode, stripeAccountId is required for Connect accounts
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    const isTestMode = secretKey?.startsWith('sk_test_') ?? false;
    
    if (!isTestMode && !temple.stripeAccountId) {
      throw new Error('Stripe not connected for this temple. Please connect Stripe in the admin portal.');
    }

    // Get or create a location for this temple (required for reader registration)
    const locationId = await this.getOrCreateLocation(templeId);

    // Create connection token for Terminal SDK
    // In test mode, this will allow simulated readers
    const connectionToken = await this.stripe.terminal.connectionTokens.create({
      // Connection tokens are account-level
      // In test mode, you can use simulated readers without a physical M2
    });

    console.log('[Stripe Service] Connection token created (test mode:', isTestMode, ', locationId:', locationId, ')');
    return { 
      secret: connectionToken.secret,
      locationId: locationId,
    };
  }

  /**
   * Create a PaymentIntent for Terminal payment
   * This is created on the backend, then collected on the device
   */
  async createPaymentIntent(
    templeId: string,
    donationId: string,
    amount: number,
    currency: string = 'usd',
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }> {
    const temple = await this.templesService.findOne(templeId);
    
    if (!temple.stripeAccountId) {
      throw new Error('Stripe not connected for this temple. Please connect Stripe in the admin portal.');
    }

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100);

    // Create PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
      metadata: {
        donationId: donationId,
        templeId: templeId,
      },
      // Use connected account if using Stripe Connect
      // stripeAccount: temple.stripeAccountId,
    });

    console.log('[Stripe Service] PaymentIntent created:', {
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
      currency,
      donationId,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Confirm a PaymentIntent after it's been collected on the device
   */
  async confirmPaymentIntent(
    templeId: string,
    paymentIntentId: string,
  ): Promise<{
    paymentIntentId: string;
    status: string;
    amount: number;
    fee: number;
    netAmount: number;
    cardLast4?: string | null;
    cardBrand?: string | null;
  }> {
    const temple = await this.templesService.findOne(templeId);
    
    if (!temple.stripeAccountId) {
      throw new Error('Stripe not connected for this temple.');
    }

    // Retrieve the PaymentIntent
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    // If not already confirmed, confirm it
    if (paymentIntent.status !== 'succeeded') {
      await this.stripe.paymentIntents.confirm(paymentIntentId);
    }

    // Get the confirmed PaymentIntent
    const confirmed = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    // Calculate fees (Stripe charges ~2.9% + $0.30)
    const totalAmount = confirmed.amount / 100; // Convert from cents
    const fee = Math.round((totalAmount * 0.029 + 0.30) * 100) / 100; // Approximate fee
    const netAmount = totalAmount - fee;

    // Extract card information
    const paymentMethod = confirmed.payment_method;
    let cardLast4: string | null = null;
    let cardBrand: string | null = null;

    if (paymentMethod && typeof paymentMethod === 'string') {
      const pm = await this.stripe.paymentMethods.retrieve(paymentMethod);
      if (pm.card) {
        cardLast4 = pm.card.last4;
        cardBrand = pm.card.brand;
      }
    }

    console.log('[Stripe Service] PaymentIntent confirmed:', {
      paymentIntentId: confirmed.id,
      status: confirmed.status,
      amount: totalAmount,
      fee,
      netAmount,
      cardLast4,
      cardBrand,
    });

    return {
      paymentIntentId: confirmed.id,
      status: confirmed.status,
      amount: totalAmount,
      fee,
      netAmount,
      cardLast4,
      cardBrand,
    };
  }

  /**
   * Get PaymentIntent details
   */
  async getPaymentIntentDetails(
    templeId: string,
    paymentIntentId: string,
  ): Promise<{
    status: string;
    amount: number;
    fee: number;
    netAmount: number;
    cardLast4?: string | null;
    cardBrand?: string | null;
    createdAt: string;
  }> {
    const temple = await this.templesService.findOne(templeId);
    
    if (!temple.stripeAccountId) {
      throw new Error('Stripe not connected for this temple.');
    }

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    const totalAmount = paymentIntent.amount / 100;
    const fee = Math.round((totalAmount * 0.029 + 0.30) * 100) / 100;
    const netAmount = totalAmount - fee;

    let cardLast4: string | null = null;
    let cardBrand: string | null = null;

    if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'string') {
      const pm = await this.stripe.paymentMethods.retrieve(paymentIntent.payment_method);
      if (pm.card) {
        cardLast4 = pm.card.last4;
        cardBrand = pm.card.brand;
      }
    }

    return {
      status: paymentIntent.status,
      amount: totalAmount,
      fee,
      netAmount,
      cardLast4,
      cardBrand,
      createdAt: new Date(paymentIntent.created * 1000).toISOString(),
    };
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    templeId: string,
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<{ refundId: string; amount: number }> {
    const temple = await this.templesService.findOne(templeId);
    
    if (!temple.stripeAccountId) {
      throw new Error('Stripe not connected for this temple.');
    }

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      reason: reason ? (reason as Stripe.RefundCreateParams.Reason) : undefined,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await this.stripe.refunds.create(refundParams);

    console.log('[Stripe Service] Refund processed:', {
      refundId: refund.id,
      amount: refund.amount / 100,
    });

    return {
      refundId: refund.id,
      amount: refund.amount / 100,
    };
  }

  /**
   * Handle Stripe webhook events
   * Note: Webhooks are optional for Terminal payments (synchronous flow)
   * They're useful for async updates but not required for basic functionality
   */
  async handleWebhook(webhookData: any, signature: string): Promise<void> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    
    let event: Stripe.Event;

    if (!webhookSecret) {
      console.warn('[Stripe Service] STRIPE_WEBHOOK_SECRET not set - webhook verification skipped');
      console.warn('[Stripe Service] Webhooks are optional for Terminal payments');
      // For testing/development, allow webhooks without verification
      // In production, you should set STRIPE_WEBHOOK_SECRET
      try {
        event = webhookData as Stripe.Event;
      } catch (err) {
        console.error('[Stripe Service] Failed to parse webhook data:', err);
        throw new Error('Invalid webhook data');
      }
    } else {
      // Verify webhook signature in production
      try {
        event = this.stripe.webhooks.constructEvent(
          webhookData,
          signature,
          webhookSecret,
        );
      } catch (err) {
        console.error('[Stripe Service] Webhook signature verification failed:', err);
        throw new Error('Webhook signature verification failed');
      }
    }

    const { type, data } = event;

    if (type === 'payment_intent.succeeded') {
      const paymentIntent = data.object as Stripe.PaymentIntent;
      const donationId = paymentIntent.metadata?.donationId;

      const donationId = paymentIntent.metadata?.donationId;

      if (donationId) {
        const donation = await this.donationsService.findByStripePaymentIntentId(
          paymentIntent.id,
        );

        if (donation) {
          await this.donationsService.updateStatus(donation.id, DonationStatus.SUCCEEDED);
        }
      }
    } else if (type === 'payment_intent.payment_failed') {
      const paymentIntent = data.object as Stripe.PaymentIntent;

      if (paymentIntent.id) {
        const donation = await this.donationsService.findByStripePaymentIntentId(
          paymentIntent.id,
        );

        if (donation) {
          await this.donationsService.updateStatus(donation.id, DonationStatus.FAILED);
        }
      }
    }
  }
}

