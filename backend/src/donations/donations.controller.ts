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
  @ApiOperation({ summary: 'Process Square payment with card nonce from Mobile Payments SDK (device endpoint)' })
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
    });

    return {
      success: result.status === 'COMPLETED',
      paymentId: result.paymentId,
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
      await this.donationsService.complete(donationId, {
        squarePaymentId: result.paymentId,
        status: result.status === 'COMPLETED' ? DonationStatus.SUCCEEDED : DonationStatus.FAILED,
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
}

