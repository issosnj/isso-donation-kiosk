import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DonationsService } from './donations.service';
import { InitiateDonationDto } from './dto/initiate-donation.dto';
import { CompleteDonationDto } from './dto/complete-donation.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
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
  @ApiOperation({ summary: 'Process Square payment for a donation (device endpoint)' })
  async processPayment(
    @Body() processPaymentDto: ProcessPaymentDto,
    @CurrentUser() user: any,
  ) {
    // Get donation to find temple
    const donation = await this.donationsService.findOne(processPaymentDto.donationId);
    
    // Process payment through Square
    const result = await this.squareService.processPayment(
      donation.templeId,
      processPaymentDto.donationId,
      processPaymentDto.amount,
      processPaymentDto.idempotencyKey,
    );

    // Update donation with payment result
    await this.donationsService.complete(processPaymentDto.donationId, {
      squarePaymentId: result.paymentId,
      status: result.status === 'COMPLETED' ? 'SUCCEEDED' : 'FAILED',
    });

    return {
      success: result.status === 'COMPLETED',
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
      return this.donationsService.findAll(undefined, filters);
    }
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
  findOne(@Param('id') id: string) {
    return this.donationsService.findOne(id);
  }
}

