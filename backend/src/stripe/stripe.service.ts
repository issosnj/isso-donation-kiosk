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
      apiVersion: '2023-10-16',
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
    
    try {
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
    } catch (error: any) {
      console.error('[Stripe Service] Error creating/retrieving location:', error);
      console.error('[Stripe Service] Error type:', error.constructor.name);
      console.error('[Stripe Service] Error message:', error.message);
      if (error.type) {
        console.error('[Stripe Service] Stripe error type:', error.type);
      }
      if (error.code) {
        console.error('[Stripe Service] Stripe error code:', error.code);
      }
      
      // Provide more helpful error messages
      if (error.type === 'StripeAuthenticationError') {
        throw new Error('Invalid Stripe secret key. Please check STRIPE_SECRET_KEY in backend environment.');
      } else if (error.type === 'StripeAPIError') {
        throw new Error(`Stripe API error while creating location: ${error.message || 'Unknown error'}`);
      } else if (error.message) {
        throw new Error(`Failed to create location: ${error.message}`);
      } else {
        throw new Error('Failed to create Stripe location. Please check backend logs.');
      }
    }
  }

  /**
   * Create a connection token for Stripe Terminal SDK
   * This is used by the iOS app to connect to the M2 reader
   */
  async createConnectionToken(templeId: string): Promise<{ secret: string; locationId: string }> {
    const temple = await this.templesService.findOne(templeId);
    
    // Check if Stripe is configured
    // For direct accounts: only need STRIPE_SECRET_KEY in environment (stripeAccountId is optional)
    // For Connect accounts: need stripeAccountId
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured in the backend environment.');
    }
    
    // In live mode with Connect, stripeAccountId is required
    // For direct accounts (no Connect), stripeAccountId is optional
    const isTestMode = secretKey?.startsWith('sk_test_') ?? false;
    
    // Only require stripeAccountId if we're in live mode AND using Connect
    // For direct accounts, we can proceed without stripeAccountId
    // The check in devices.service.ts already ensures stripePublishableKey is set

    try {
      // Get or create a location for this temple (required for reader registration)
      const locationId = await this.getOrCreateLocation(templeId);

      // Create connection token for Terminal SDK
      const connectionToken = await this.stripe.terminal.connectionTokens.create({
        // Connection tokens are account-level
      });

      console.log('[Stripe Service] Connection token created (mode:', isTestMode ? 'TEST' : 'LIVE', ', locationId:', locationId, ')');
      return { 
        secret: connectionToken.secret,
        locationId: locationId,
      };
    } catch (error: any) {
      console.error('[Stripe Service] Error creating connection token:', error);
      console.error('[Stripe Service] Error type:', error.constructor.name);
      console.error('[Stripe Service] Error message:', error.message);
      if (error.type) {
        console.error('[Stripe Service] Stripe error type:', error.type);
      }
      if (error.code) {
        console.error('[Stripe Service] Stripe error code:', error.code);
      }
      
      // Provide more helpful error messages
      if (error.type === 'StripeAuthenticationError') {
        throw new Error('Invalid Stripe secret key. Please check STRIPE_SECRET_KEY in backend environment.');
      } else if (error.type === 'StripeAPIError') {
        throw new Error(`Stripe API error: ${error.message || 'Unknown error'}`);
      } else if (error.message) {
        throw new Error(`Failed to create connection token: ${error.message}`);
      } else {
        throw new Error('Failed to create Stripe connection token. Please check backend logs.');
      }
    }
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
    try {
      console.log('[Stripe Service] Creating PaymentIntent:', { templeId, donationId, amount, currency });
      
      const temple = await this.templesService.findOne(templeId);
      
      if (!temple) {
        throw new Error(`Temple ${templeId} not found`);
      }

      // Check if Stripe is configured (either stripeAccountId for Connect or stripePublishableKey for direct)
      if (!temple.stripeAccountId && !temple.stripePublishableKey) {
        throw new Error('Stripe not configured for this temple. Please configure Stripe in the admin portal.');
      }

      // Convert amount to cents
      const amountInCents = Math.round(amount * 100);
      
      if (amountInCents <= 0) {
        throw new Error(`Invalid amount: ${amount} (must be greater than 0)`);
      }

      console.log('[Stripe Service] Creating PaymentIntent with amount:', amountInCents, 'cents');
      console.log('[Stripe Service] Temple Stripe config:', {
        hasStripeAccountId: !!temple.stripeAccountId,
        hasStripePublishableKey: !!temple.stripePublishableKey,
        stripeAccountId: temple.stripeAccountId,
      });

      // Create PaymentIntent
      let paymentIntent;
      try {
        paymentIntent = await this.stripe.paymentIntents.create({
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
      } catch (stripeError) {
        console.error('[Stripe Service] Stripe API error creating PaymentIntent:', {
          type: stripeError.type,
          code: stripeError.code,
          message: stripeError.message,
          statusCode: stripeError.statusCode,
        });
        throw new Error(`Stripe API error: ${stripeError.message || 'Failed to create payment intent'}`);
      }

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
    } catch (error) {
      console.error('[Stripe Service] Error creating PaymentIntent:', error);
      console.error('[Stripe Service] Error details:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name,
        code: error.code,
        statusCode: error.statusCode,
      });
      
      // If it's a Stripe API error, extract the message
      if (error.type && error.type.startsWith('Stripe')) {
        const stripeMessage = error.message || 'Stripe API error occurred';
        console.error('[Stripe Service] Stripe API error:', stripeMessage);
        throw new Error(`Stripe error: ${stripeMessage}`);
      }
      
      throw error;
    }
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
    
    // Check if Stripe is configured (either stripeAccountId for Connect or stripePublishableKey for direct)
    if (!temple.stripeAccountId && !temple.stripePublishableKey) {
      throw new Error('Stripe not connected for this temple. Please configure Stripe in the admin portal.');
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

