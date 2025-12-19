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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DonationStatus } from './entities/donation.entity';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('donations')
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a donation (device endpoint)' })
  initiate(@Body() initiateDonationDto: InitiateDonationDto) {
    return this.donationsService.initiate(initiateDonationDto);
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
      const templeId = user.role === UserRole.MASTER_ADMIN ? undefined : user.templeId;
      const stats = await this.donationsService.getStats(
        templeId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return stats;
    } catch (error) {
      console.error('[Donations Controller] Error in getStats:', error);
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

