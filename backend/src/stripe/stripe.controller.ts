import { Controller, Post, Get, Body, Param, Query, UseGuards, ForbiddenException, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('stripe')
@Controller('stripe')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  private validateTempleAccess(user: any, templeId: string): void {
    if (user.role === UserRole.TEMPLE_ADMIN && user.templeId !== templeId) {
      throw new ForbiddenException('Cannot access Stripe for another temple');
    }
  }

  @Get('connection-token')
  @ApiOperation({ summary: 'Get Stripe Terminal connection token' })
  async getConnectionToken(
    @CurrentUser() user: any,
    @Query('templeId') templeId: string,
  ) {
    this.validateTempleAccess(user, templeId);
    return this.stripeService.createConnectionToken(templeId);
  }

  @Post('payment-intent')
  @ApiOperation({ summary: 'Create PaymentIntent for Terminal payment' })
  async createPaymentIntent(
    @CurrentUser() user: any,
    @Body() body: { templeId: string; donationId: string; amount: number; currency?: string },
  ) {
    this.validateTempleAccess(user, body.templeId);
    return this.stripeService.createPaymentIntent(
      body.templeId,
      body.donationId,
      body.amount,
      body.currency,
    );
  }

  @Post('payment-intent/:paymentIntentId/confirm')
  @ApiOperation({ summary: 'Confirm PaymentIntent after collection on device' })
  async confirmPaymentIntent(
    @Param('paymentIntentId') paymentIntentId: string,
    @Body() body: { templeId: string },
    @CurrentUser() user: any,
  ) {
    this.validateTempleAccess(user, body.templeId);
    return this.stripeService.confirmPaymentIntent(body.templeId, paymentIntentId);
  }

  @Get('payment-intent/:paymentIntentId')
  @ApiOperation({ summary: 'Get PaymentIntent details' })
  async getPaymentIntentDetails(
    @Param('paymentIntentId') paymentIntentId: string,
    @Query('templeId') templeId: string,
    @CurrentUser() user: any,
  ) {
    this.validateTempleAccess(user, templeId);
    return this.stripeService.getPaymentIntentDetails(templeId, paymentIntentId);
  }

  @Post('refund')
  @Roles(UserRole.MASTER_ADMIN, UserRole.TEMPLE_ADMIN)
  @ApiOperation({ summary: 'Refund a payment' })
  async refundPayment(
    @CurrentUser() user: any,
    @Body() body: { templeId: string; paymentIntentId: string; amount?: number; reason?: string },
  ) {
    this.validateTempleAccess(user, body.templeId);
    return this.stripeService.refundPayment(
      body.templeId,
      body.paymentIntentId,
      body.amount,
      body.reason,
    );
  }

  @Post('webhook')
  @Public()
  @SkipThrottle()
  @ApiOperation({ summary: 'Stripe webhook handler (called by Stripe)' })
  async handleWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature?: string,
  ) {
    await this.stripeService.handleWebhook(body, signature || '');
    return { received: true };
  }
}
