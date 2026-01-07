import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { InitiateDonationDto } from './dto/initiate-donation.dto';
import { CompleteDonationDto } from './dto/complete-donation.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { PayPledgeDto } from './dto/pay-pledge.dto';
import { StripeService } from '../stripe/stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DonationStatus } from './entities/donation.entity';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('donations')
@Controller('donations')
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a donation (device endpoint)' })
  async initiate(@Body() initiateDonationDto: InitiateDonationDto) {
    try {
      console.log('[DonationsController] Initiating donation:', {
        templeId: initiateDonationDto.templeId,
        deviceId: initiateDonationDto.deviceId,
        categoryId: initiateDonationDto.categoryId,
        amount: initiateDonationDto.amount,
        currency: initiateDonationDto.currency,
      });
      
      const donation = await this.donationsService.initiate(initiateDonationDto);
      
      console.log('[DonationsController] Donation initiated successfully:', donation.id);
      return donation;
    } catch (error) {
      console.error('[DonationsController] Error initiating donation:', error);
      console.error('[DonationsController] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        `Failed to initiate donation: ${error.message || 'Unknown error'}`
      );
    }
  }

  @Post('process-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process payment (deprecated - Square removed)' })
  async processPayment(
    @Body() processPaymentDto: ProcessPaymentDto,
    @CurrentUser() user: any,
  ) {
    throw new BadRequestException('This endpoint is deprecated. Use Stripe Terminal SDK directly from iOS app.');
  }

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe PaymentIntent for Terminal payment (device endpoint)' })
  async createPaymentIntent(
    @Body() body: { donationId: string; amount: number; currency?: string },
    @CurrentUser() user: any,
  ) {
    try {
      console.log('[DonationsController] Creating PaymentIntent for donation:', body.donationId);
      const donation = await this.donationsService.findOne(body.donationId);
      
      if (!donation) {
        throw new BadRequestException(`Donation ${body.donationId} not found`);
      }
      
      console.log('[DonationsController] Donation found, templeId:', donation.templeId);
      
      // Create PaymentIntent for Stripe Terminal
      const result = await this.stripeService.createPaymentIntent(
        donation.templeId,
        body.donationId,
        body.amount,
        body.currency || 'usd',
      );

      console.log('[DonationsController] PaymentIntent created successfully:', result.paymentIntentId);
      return {
        clientSecret: result.clientSecret,
        paymentIntentId: result.paymentIntentId,
      };
    } catch (error) {
      console.error('[DonationsController] Error creating PaymentIntent:', error);
      console.error('[DonationsController] Error message:', error.message);
      console.error('[DonationsController] Error stack:', error.stack);
      console.error('[DonationsController] Error type:', error.constructor.name);
      
      // If it's already a NestJS exception, re-throw it
      if (error instanceof BadRequestException || error instanceof ForbiddenException) {
        throw error;
      }
      
      // Check if it's a Stripe configuration error (should be 400)
      const errorMessage = error.message || 'Failed to create payment intent. Please check Stripe configuration.';
      const isConfigError = errorMessage.includes('Stripe not configured') || 
                           errorMessage.includes('not found') ||
                           errorMessage.includes('Invalid amount');
      
      if (isConfigError) {
        console.error('[DonationsController] Throwing BadRequestException (config error):', errorMessage);
        throw new BadRequestException(errorMessage);
      } else {
        // For other errors (Stripe API errors, etc.), use 500 but with clear message
        console.error('[DonationsController] Throwing InternalServerErrorException:', errorMessage);
        throw new InternalServerErrorException(
          `Payment setup failed: ${errorMessage}. Please check Stripe configuration in the admin portal.`
        );
      }
    }
  }

  @Post('confirm-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Confirm Stripe PaymentIntent after collection on device (device endpoint)' })
  async confirmPaymentIntent(
    @Body() body: { donationId: string; paymentIntentId: string },
    @CurrentUser() user: any,
  ) {
    const donation = await this.donationsService.findOne(body.donationId);
    
    // Confirm PaymentIntent
    const result = await this.stripeService.confirmPaymentIntent(
      donation.templeId,
      body.paymentIntentId,
    );

    // Update donation with payment result
    await this.donationsService.complete(body.donationId, {
      stripePaymentIntentId: result.paymentIntentId,
      status: result.status === 'succeeded' ? DonationStatus.SUCCEEDED : DonationStatus.FAILED,
      netAmount: result.netAmount,
      stripeFee: result.fee,
      cardLast4: result.cardLast4 || undefined,
      cardType: result.cardBrand || undefined,
    });

    return {
      success: result.status === 'succeeded',
      paymentIntentId: result.paymentIntentId,
      status: result.status,
    };
  }

  @Get('checkout-status/:checkoutId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check status of checkout (deprecated - Square removed)' })
  async getCheckoutStatus(
    @Param('checkoutId') checkoutId: string,
    @Query('donationId') donationId: string,
    @CurrentUser() user: any,
  ) {
    throw new BadRequestException('This endpoint is deprecated. Square integration has been removed.');
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete a donation (device endpoint)' })
  complete(
    @Param('id') id: string,
    @Body() completeDonationDto: CompleteDonationDto,
  ) {
    return this.donationsService.complete(id, completeDonationDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all donations' })
  findAll(
    @CurrentUser() user: any,
    @Query('templeId') templeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('status') status?: DonationStatus,
  ) {
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (categoryId) filters.categoryId = categoryId;
    if (status) filters.status = status;

    if (user.role === UserRole.MASTER_ADMIN) {
      // Master admin can filter by templeId or get all temples
      const filterTempleId = templeId || undefined;
      return this.donationsService.findAll(filterTempleId, filters);
    }
    // Temple admin always sees only their temple's donations
    return this.donationsService.findAll(user.templeId, filters);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get donation statistics' })
  async getStats(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      console.log('[Donations Controller] getStats called by user:', user.email, user.role);
      console.log('[Donations Controller] Query params:', { startDate, endDate });
      
      const templeId = user.role === UserRole.MASTER_ADMIN ? undefined : user.templeId;
      console.log('[Donations Controller] Using templeId:', templeId);
      
      let parsedStartDate: Date | undefined;
      let parsedEndDate: Date | undefined;
      
      if (startDate) {
        parsedStartDate = new Date(startDate);
        if (isNaN(parsedStartDate.getTime())) {
          console.warn('[Donations Controller] Invalid startDate:', startDate);
          parsedStartDate = undefined;
        }
      }
      
      if (endDate) {
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedEndDate.getTime())) {
          console.warn('[Donations Controller] Invalid endDate:', endDate);
          parsedEndDate = undefined;
        }
      }
      
      const stats = await this.donationsService.getStats(
        templeId,
        parsedStartDate,
        parsedEndDate,
      );
      
      console.log('[Donations Controller] Returning stats:', stats);
      return stats;
    } catch (error: any) {
      console.error('[Donations Controller] Error in getStats:', error);
      console.error('[Donations Controller] Error message:', error?.message);
      console.error('[Donations Controller] Error stack:', error?.stack);
      
      // Return default stats on error
      return {
        total: 0,
        count: 0,
      };
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get donation by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.donationsService.findOne(id, user);
  }

  @Get(':id/receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get donation receipt details for printing' })
  async getReceipt(@Param('id') id: string, @CurrentUser() user: any) {
    const donation = await this.donationsService.findOne(id, user);
    // Temple is already loaded in donation relations
    return {
      donation,
      temple: donation.temple,
      receiptConfig: donation.temple?.receiptConfig || {},
    };
  }

  @Post(':id/resend-receipt')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resend donation receipt email' })
  async resendReceipt(@Param('id') id: string, @CurrentUser() user: any) {
    const donation = await this.donationsService.findOne(id, user);
    
    // Verify user has access to this donation
    if (user.role === UserRole.TEMPLE_ADMIN && donation.templeId !== user.templeId) {
      throw new Error('Unauthorized');
    }

    if (!donation.donorEmail) {
      throw new BadRequestException('Donation does not have an email address');
    }

    if (donation.status !== DonationStatus.SUCCEEDED) {
      throw new BadRequestException('Can only resend receipts for successful donations');
    }

    await this.donationsService.sendReceiptEmail(donation);
    return { message: 'Receipt email sent successfully' };
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a donation (device endpoint)' })
  async cancel(@Param('id') id: string) {
    return this.donationsService.cancel(id);
  }

  @Post('cleanup/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete all pending donations (Master Admin only)' })
  async cleanupPending(@CurrentUser() user: any) {
    if (user.role !== 'MASTER_ADMIN') {
      throw new ForbiddenException('Only master admins can perform this action');
    }
    return this.donationsService.cleanupPendingDonations();
  }

  @Post('cleanup/generate-receipt-numbers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate receipt numbers for successful donations without them (Master Admin only)' })
  async generateReceiptNumbers(@CurrentUser() user: any) {
    if (user.role !== 'MASTER_ADMIN') {
      throw new ForbiddenException('Only master admins can perform this action');
    }
    return this.donationsService.generateReceiptNumbersForSuccessfulDonations();
  }

  @Post('cleanup/backfill-stripe-fees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Backfill Stripe fees for donations missing fee information (Master Admin only)' })
  async backfillStripeFees(@CurrentUser() user: any) {
    if (user.role !== 'MASTER_ADMIN') {
      throw new ForbiddenException('Only master admins can perform this action');
    }
    return this.donationsService.backfillStripeFees();
  }

  @Get('by-donor/:phone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all donations by donor phone number' })
  async getDonationsByDonor(
    @Param('phone') phone: string,
    @CurrentUser() user: any,
    @Query('templeId') templeId?: string,
  ) {
    // For temple admin, use their templeId. For master admin, use provided templeId or all temples
    const targetTempleId = user.role === 'TEMPLE_ADMIN' ? user.templeId : templeId;
    return this.donationsService.findByDonorPhone(phone, targetTempleId);
  }

  @Post('pledge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a pledge (pay later) - device endpoint' })
  async createPledge(@Body() createPledgeDto: CreatePledgeDto) {
    return this.donationsService.createPledge(createPledgeDto);
  }

  @Get('pledge/:token')
  @ApiOperation({ summary: 'Get pledge details by token (public endpoint)' })
  async getPledge(@Param('token') token: string) {
    return this.donationsService.getPledgeByToken(token);
  }

  @Post('pledge/:token/pay')
  @ApiOperation({ summary: 'Pay a pledge (public endpoint)' })
  async payPledge(
    @Param('token') token: string,
    @Body() payPledgeDto: PayPledgeDto,
  ) {
    return this.donationsService.payPledge(token, payPledgeDto);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refund a donation' })
  async refund(
    @Param('id') id: string,
    @Body() refundDto: { amount?: number; reason?: string },
    @CurrentUser() user: any,
  ) {
    const donation = await this.donationsService.findOne(id, user);
    
    // Verify user has access to this donation
    if (user.role === UserRole.TEMPLE_ADMIN && donation.templeId !== user.templeId) {
      throw new ForbiddenException('Unauthorized');
    }

    if (donation.status !== DonationStatus.SUCCEEDED) {
      throw new BadRequestException('Can only refund successful donations');
    }

    // Process refund through Stripe if Stripe payment
    if (donation.stripePaymentIntentId) {
      const refundResult = await this.stripeService.refundPayment(
        donation.templeId,
        donation.stripePaymentIntentId,
        refundDto.amount,
        refundDto.reason,
      );

      // Update donation status
      await this.donationsService.updateStatus(donation.id, DonationStatus.REFUNDED);

      return {
        message: 'Refund processed successfully',
        refundId: refundResult.refundId,
        refundAmount: refundResult.amount,
        provider: 'stripe',
      };
    }
    // Legacy Square payments - no longer supported
    else if (donation.squarePaymentId) {
      throw new BadRequestException('Square refunds are no longer supported. Please contact support for legacy refunds.');
    } else {
      throw new BadRequestException('Donation does not have a payment ID');
    }
  }

  @Get(':id/payment-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment details from Stripe' })
  async getPaymentDetails(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const donation = await this.donationsService.findOne(id, user);
    
    // Verify user has access to this donation
    if (user.role === UserRole.TEMPLE_ADMIN && donation.templeId !== user.templeId) {
      throw new ForbiddenException('Unauthorized');
    }

    if (!donation.stripePaymentIntentId) {
      throw new BadRequestException('Donation does not have a Stripe payment intent ID');
    }

    // Fetch payment details from Stripe
    const paymentDetails = await this.stripeService.getPaymentIntentDetails(
      donation.templeId,
      donation.stripePaymentIntentId,
    );

    return paymentDetails;
  }

  @Post(':id/assign-donor')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign an anonymous donation to a donor' })
  async assignDonationToDonor(
    @Param('id') id: string,
    @Body() body: { donorId: string; sendReceiptEmail?: boolean },
    @CurrentUser() user: any,
  ) {
    return this.donationsService.assignDonationToDonor(
      id,
      body.donorId,
      user.id,
      body.sendReceiptEmail || false,
    );
  }
}

