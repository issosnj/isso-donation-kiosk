import { Controller, Post, Get, Body, Param, Headers, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../users/entities/user.entity';

@ApiTags('stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Get('connection-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Stripe Terminal connection token (device endpoint)' })
  async getConnectionToken(
    @CurrentUser() user: any,
    @Query('templeId') templeId: string,
  ) {
    return this.stripeService.createConnectionToken(templeId);
  }

  @Post('payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create PaymentIntent for Terminal payment' })
  async createPaymentIntent(
    @Body() body: { templeId: string; donationId: string; amount: number; currency?: string },
  ) {
    return this.stripeService.createPaymentIntent(
      body.templeId,
      body.donationId,
      body.amount,
      body.currency,
    );
  }

  @Post('payment-intent/:paymentIntentId/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm PaymentIntent after collection on device' })
  async confirmPaymentIntent(
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: { templeId: string },
  ) {
    return this.stripeService.confirmPaymentIntent(body.templeId, paymentIntentId);
  }

  @Get('payment-intent/:paymentIntentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get PaymentIntent details' })
  async getPaymentIntentDetails(
    @Param('paymentIntentId') paymentIntentId: string,
    @Query('templeId') templeId: string,
  ) {
    return this.stripeService.getPaymentIntentDetails(templeId, paymentIntentId);
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @Roles(Role.MASTER_ADMIN, Role.TEMPLE_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a payment' })
  async refundPayment(
    @Body() body: { templeId: string; paymentIntentId: string; amount?: number; reason?: string },
  ) {
    return this.stripeService.refundPayment(
      body.templeId,
      body.paymentIntentId,
      body.amount,
      body.reason,
    );
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler (optional - for async payment updates)' })
  async handleWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    await this.stripeService.handleWebhook(body, signature || '');
    return { received: true };
  }
}
