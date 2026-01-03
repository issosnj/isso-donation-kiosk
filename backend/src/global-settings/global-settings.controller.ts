import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GlobalSettingsService } from './global-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('global-settings')
@Controller('global-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GlobalSettingsController {
  constructor(private readonly globalSettingsService: GlobalSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get global settings (Master Admin only)' })
  @Roles(UserRole.MASTER_ADMIN)
  async getSettings() {
    return this.globalSettingsService.getSettings();
  }

  @Patch('kiosk-theme')
  @ApiOperation({ summary: 'Update kiosk theme (Master Admin only)' })
  @Roles(UserRole.MASTER_ADMIN)
  async updateKioskTheme(@Body() body: { kioskTheme: any }) {
    return this.globalSettingsService.updateKioskTheme(body.kioskTheme);
  }
}

