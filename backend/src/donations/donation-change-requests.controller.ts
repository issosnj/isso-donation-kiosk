import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DonationChangeRequestsService } from './donation-change-requests.service';
import { CreateDonationChangeRequestDto } from './dto/create-donation-change-request.dto';
import { RejectDonationChangeRequestDto } from './dto/reject-donation-change-request.dto';
import { DonationChangeRequestStatus } from './entities/donation-change-request.entity';

@ApiTags('donation-change-requests')
@SkipThrottle()
@Controller('donation-change-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DonationChangeRequestsController {
  constructor(private readonly donationChangeRequestsService: DonationChangeRequestsService) {}

  @Post()
  @Roles(UserRole.TEMPLE_ADMIN)
  @ApiOperation({ summary: 'Request donor display change (pending master approval)' })
  create(@Body() dto: CreateDonationChangeRequestDto, @CurrentUser() user: any) {
    return this.donationChangeRequestsService.create(dto, user);
  }

  @Get('my-temple')
  @Roles(UserRole.TEMPLE_ADMIN)
  @ApiOperation({ summary: 'List change requests for the current temple' })
  listMyTemple(@CurrentUser() user: any) {
    return this.donationChangeRequestsService.listForTemple(user.templeId);
  }

  @Get()
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'List change requests (master admin queue)' })
  listForMaster(
    @Query('status') status?: DonationChangeRequestStatus,
    @Query('templeId') templeId?: string,
  ) {
    return this.donationChangeRequestsService.listForMaster({ status, templeId });
  }

  @Post(':id/approve')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Approve and apply donor display changes' })
  approve(@Param('id') id: string, @CurrentUser() user: any) {
    return this.donationChangeRequestsService.approve(id, user);
  }

  @Post(':id/reject')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Reject a change request' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectDonationChangeRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.donationChangeRequestsService.reject(id, dto.reviewNote, user);
  }

  @Post(':id/cancel')
  @Roles(UserRole.TEMPLE_ADMIN)
  @ApiOperation({ summary: 'Cancel own pending request' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.donationChangeRequestsService.cancel(id, user);
  }
}
