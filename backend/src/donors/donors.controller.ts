import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DeviceAuthGuard } from '../auth/guards/device-auth.guard';
import { DonorsService } from './donors.service';
import { UpdateDonorDto } from './dto/update-donor.dto';

@ApiTags('donors')
@Controller('donors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DonorsController {
  constructor(private readonly donorsService: DonorsService) {}

  @Get('lookup/:phone')
  @ApiOperation({ summary: 'Lookup donor by phone number (for kiosk auto-populate)' })
  async lookupDonor(
    @Request() req,
    @Param('phone') phone: string,
  ) {
    const templeId = req.user.templeId;
    if (!templeId) {
      throw new Error('Temple ID not found in user context');
    }

    const donor = await this.donorsService.getDonorByPhone(templeId, phone);
    return {
      found: !!donor,
      donor: donor || null,
    };
  }

  @Get('device/lookup/:phone')
  @UseGuards(DeviceAuthGuard)
  @ApiOperation({ summary: 'Lookup donor by phone number (device endpoint for kiosk)' })
  async lookupDonorDevice(
    @Request() req,
    @Param('phone') phone: string,
  ) {
    const templeId = req.device?.templeId;
    if (!templeId) {
      throw new Error('Temple ID not found in device context');
    }

    const donor = await this.donorsService.getDonorByPhone(templeId, phone);
    return {
      found: !!donor,
      donor: donor || null,
    };
  }

  @Get('temple/:templeId')
  @Roles(UserRole.MASTER_ADMIN, UserRole.TEMPLE_ADMIN)
  @ApiOperation({ summary: 'Get all donors for a temple' })
  async getDonorsByTemple(
    @Param('templeId') templeId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
  ) {
    const result = await this.donorsService.getDonorsByTemple(
      templeId,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
    );
    return result;
  }

  @Get('my-temple')
  @Roles(UserRole.TEMPLE_ADMIN)
  @ApiOperation({ summary: 'Get all donors for current temple admin' })
  async getMyTempleDonors(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
    @Query('search') search?: string,
  ) {
    const templeId = req.user.templeId;
    if (!templeId) {
      throw new Error('Temple ID not found in user context');
    }

    const result = await this.donorsService.getDonorsByTemple(
      templeId,
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
    );
    return result;
  }

  @Put(':id')
  @Roles(UserRole.MASTER_ADMIN, UserRole.TEMPLE_ADMIN)
  @ApiOperation({ summary: 'Update donor information' })
  async updateDonor(
    @Param('id') id: string,
    @Body() updateDonorDto: UpdateDonorDto,
  ) {
    return this.donorsService.updateDonor(id, updateDonorDto);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER_ADMIN, UserRole.TEMPLE_ADMIN)
  @ApiOperation({ summary: 'Delete a donor' })
  async deleteDonor(@Param('id') id: string) {
    await this.donorsService.deleteDonor(id);
    return { message: 'Donor deleted successfully' };
  }
}

