import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ActivateDeviceDto } from './dto/activate-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  findAll(@CurrentUser() user: any) {
    if (user.role === UserRole.MASTER_ADMIN) {
      return this.devicesService.findAll();
    }
    return this.devicesService.findAll(user.templeId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get device by ID' })
  findOne(@Param('id') id: string) {
    return this.devicesService.findOne(id);
  }

  @Post('activate')
  @ApiOperation({ summary: 'Activate device with device code (public endpoint)' })
  activate(@Body() activateDeviceDto: ActivateDeviceDto) {
    return this.devicesService.activate(activateDeviceDto);
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
}

