import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GlobalSettingsService } from './global-settings.service';
import { ThemeVersionsService } from '../theme-versions/theme-versions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('global-settings')
@Controller('global-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class GlobalSettingsController {
  constructor(
    private readonly globalSettingsService: GlobalSettingsService,
    private readonly themeVersionsService: ThemeVersionsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get global settings (Master Admin only)' })
  @Roles(UserRole.MASTER_ADMIN)
  async getSettings() {
    return this.globalSettingsService.getSettings();
  }

  @Patch('kiosk-theme')
  @ApiOperation({ summary: 'Update kiosk theme (Master Admin only)' })
  @Roles(UserRole.MASTER_ADMIN)
  async updateKioskTheme(
    @Body() body: { kioskTheme: any; description?: string },
    @CurrentUser() user: any,
  ) {
    // Get current theme for backup (before update)
    const currentSettings = await this.globalSettingsService.getSettings();
    if (currentSettings.kioskTheme) {
      // Create backup of current theme before updating
      try {
        await this.themeVersionsService.createThemeVersion(
          currentSettings.kioskTheme,
          user.id,
          `Automatic backup before: ${body.description || 'Theme update'}`,
          true,
        );
      } catch (error) {
        console.error('[Global Settings Controller] Failed to backup theme:', error.message);
        // Continue with update even if backup fails
      }
    }

    // Update theme
    const updated = await this.globalSettingsService.updateKioskTheme(body.kioskTheme);

    // Create version record of new theme
    if (updated.kioskTheme) {
      try {
        await this.themeVersionsService.createThemeVersion(
          updated.kioskTheme,
          user.id,
          body.description || 'Theme update',
          false,
        );
      } catch (error) {
        console.error('[Global Settings Controller] Failed to create theme version:', error.message);
        // Continue even if version creation fails
      }
    }

    return updated;
  }
}

