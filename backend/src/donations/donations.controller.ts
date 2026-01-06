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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { InitiateDonationDto } from './dto/initiate-donation.dto';
import { CompleteDonationDto } from './dto/complete-donation.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { PayPledgeDto } from './dto/pay-pledge.dto';
import { SquareService } from '../square/square.service';
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
    private readonly squareService: SquareService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a donation (device endpoint)' })
  initiate(@Body() initiateDonationDto: InitiateDonationDto) {
    return this.donationsService.initiate(initiateDonationDto);
  }

  @Post('process-payment')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process Square payment with card nonce from Mobile Payments SDK (device endpoint - legacy)' })
  async processPayment(
    @Body() processPaymentDto: ProcessPaymentDto,
    @CurrentUser() user: any,
  ) {
    // Get donation to find temple
    const donation = await this.donationsService.findOne(processPaymentDto.donationId);
    
    // Process payment through Square (with card nonce if provided)
    const result = await this.squareService.processPayment(
      donation.templeId,
      processPaymentDto.donationId,
      processPaymentDto.amount,
      processPaymentDto.idempotencyKey,
      processPaymentDto.sourceId, // Card nonce from Mobile Payments SDK
    );

    // Update donation with payment result
    await this.donationsService.complete(processPaymentDto.donationId, {
      squarePaymentId: result.paymentId,
      status: result.status === 'COMPLETED' ? DonationStatus.SUCCEEDED : DonationStatus.FAILED,
      netAmount: result.netAmount,
      squareFee: result.squareFee,
      cardLast4: result.cardLast4,
      cardType: result.cardType,
    });

    return {
      success: result.status === 'COMPLETED',
      paymentId: result.paymentId,
      status: result.status,
    };
  }

  @Post('create-payment-intent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe PaymentIntent for Terminal payment (device endpoint)' })
  async createPaymentIntent(
    @Body() body: { donationId: string; amount: number; currency?: string },
    @CurrentUser() user: any,
  ) {
    const donation = await this.donationsService.findOne(body.donationId);
    
    // Create PaymentIntent for Stripe Terminal
    const result = await this.stripeService.createPaymentIntent(
      donation.templeId,
      body.donationId,
      body.amount,
      body.currency || 'usd',
    );

    return {
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    };
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
  @ApiOperation({ summary: 'Check status of Terminal checkout (device endpoint)' })
  async getCheckoutStatus(
    @Param('checkoutId') checkoutId: string,
    @Query('donationId') donationId: string,
    @CurrentUser() user: any,
  ) {
    // Get donation to find temple
    const donation = await this.donationsService.findOne(donationId);
    
    const result = await this.squareService.getCheckoutStatus(donation.templeId, checkoutId);

    // If checkout is completed, update donation
    if (result.completed && result.paymentId) {
      // Fetch full payment details to get fee and card info
      const paymentDetails = await this.squareService.getPaymentDetails(donation.templeId, result.paymentId);
      await this.donationsService.complete(donationId, {
        squarePaymentId: result.paymentId,
        status: result.status === 'COMPLETED' ? DonationStatus.SUCCEEDED : DonationStatus.FAILED,
        netAmount: paymentDetails.netAmount,
        squareFee: paymentDetails.squareFee,
        cardLast4: paymentDetails.cardLast4,
        cardType: paymentDetails.cardType,
      });
    }

    return {
      completed: result.completed,
      paymentId: result.paymentId,
      status: result.status,
    };
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

  @Post('cleanup/backfill-square-fees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Backfill Square fees for donations missing fee information (Master Admin only)' })
  async backfillSquareFees(@CurrentUser() user: any) {
    if (user.role !== 'MASTER_ADMIN') {
      throw new ForbiddenException('Only master admins can perform this action');
    }
    return this.donationsService.backfillSquareFees();
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
    // Process refund through Square if Square payment (legacy)
    else if (donation.squarePaymentId) {
      const refundResult = await this.squareService.refundPayment(
        donation.templeId,
        donation.squarePaymentId,
        refundDto.amount || donation.amount,
        refundDto.reason,
      );

      // Update donation status
      await this.donationsService.updateStatus(donation.id, DonationStatus.REFUNDED);

      return {
        message: 'Refund processed successfully',
        refundId: refundResult.refundId,
        refundAmount: refundResult.amount,
        provider: 'square',
      };
    } else {
      throw new BadRequestException('Donation does not have a payment ID');
    }
  }

  @Get(':id/payment-details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment details from Square' })
  async getPaymentDetails(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const donation = await this.donationsService.findOne(id, user);
    
    // Verify user has access to this donation
    if (user.role === UserRole.TEMPLE_ADMIN && donation.templeId !== user.templeId) {
      throw new ForbiddenException('Unauthorized');
    }

    if (!donation.squarePaymentId) {
      throw new BadRequestException('Donation does not have a Square payment ID');
    }

    // Fetch payment details from Square
    const paymentDetails = await this.squareService.getPaymentDetails(
      donation.templeId,
      donation.squarePaymentId,
    );

    return paymentDetails;
  }
}

