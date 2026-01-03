import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ActivateDeviceDto } from './dto/activate-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceAuthGuard } from '../auth/guards/device-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentDevice } from '../auth/decorators/current-device.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new device' })
  create(@Body() createDeviceDto: CreateDeviceDto, @CurrentUser() user: any) {
    // Temple Admin can only create devices for their temple
    if (user.role === UserRole.TEMPLE_ADMIN) {
      createDeviceDto.templeId = user.templeId;
    }
    return this.devicesService.create(createDeviceDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all devices' })
  findAll(@CurrentUser() user: any, @Query('templeId') templeId?: string) {
    // If templeId is provided in query, use it (for master admin viewing specific temple)
    // Otherwise, use user's templeId (for temple admin) or all (for master admin)
    if (templeId) {
      return this.devicesService.findAll(templeId);
    }
    if (user.role === UserRole.MASTER_ADMIN) {
      return this.devicesService.findAll();
    }
    return this.devicesService.findAll(user.templeId);
  }

  @Get('square-credentials')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Square credentials for Mobile Payments SDK (device endpoint)' })
  async getSquareCredentials(@CurrentDevice() device: any) {
    try {
      console.log('[Devices Controller] Square credentials request from device:', device?.deviceId);
      // Device token has deviceId in payload
      const deviceId = device.deviceId;
      if (!deviceId) {
        throw new Error('Device ID not found in token');
      }
      const credentials = await this.devicesService.getSquareCredentials(deviceId);
      console.log('[Devices Controller] Returning Square credentials (locationId present:', !!credentials.locationId, ')');
      return credentials;
    } catch (error: any) {
      console.error('[Devices Controller] Error in getSquareCredentials:', error);
      console.error('[Devices Controller] Error message:', error.message);
      console.error('[Devices Controller] Error stack:', error.stack);
      throw error;
    }
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate device with device code (public endpoint)' })
  activate(@Body() activateDeviceDto: ActivateDeviceDto) {
    return this.devicesService.activate(activateDeviceDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get device by ID' })
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Patch(':id/heartbeat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update device last seen timestamp' })
  heartbeat(@Param('id') id: string) {
    return this.devicesService.updateLastSeen(id);
  }

  @Patch(':id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate device (allows code reuse)' })
  deactivate(@Param('id') id: string) {
    return this.devicesService.deactivate(id);
  }

  @Patch(':id/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate device (reset to pending status)' })
  reactivate(@Param('id') id: string) {
    return this.devicesService.reactivate(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete device' })
  remove(@Param('id') id: string) {
    return this.devicesService.remove(id);
  }

  @Post(':id/telemetry')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit device telemetry data (device endpoint)' })
  async createTelemetry(
    @Param('id') id: string,
    @Body() telemetryDto: any,
    @CurrentDevice() device: any,
  ) {
    // Verify device ID matches
    if (device.deviceId !== id) {
      throw new UnauthorizedException('Device ID mismatch');
    }
    return this.devicesService.createTelemetry(id, telemetryDto);
  }

  @Get(':id/telemetry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get device telemetry data' })
  getTelemetry(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.devicesService.getTelemetry(id, limit ? parseInt(limit, 10) : 100);
  }

  @Get(':id/telemetry/latest')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get latest device telemetry' })
  getLatestTelemetry(@Param('id') id: string) {
    return this.devicesService.getLatestTelemetry(id);
  }

  @Get(':id/logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get device logs' })
  getDeviceLogs(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.devicesService.getDeviceLogs(id, limit ? parseInt(limit, 10) : 1000);
  }
}

