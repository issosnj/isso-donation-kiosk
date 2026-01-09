import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ThemeVersionsService } from './theme-versions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('theme-versions')
@Controller('theme-versions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ThemeVersionsController {
  constructor(private readonly themeVersionsService: ThemeVersionsService) {}

  @Get()
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get all theme versions (Master Admin only)' })
  async getThemeVersions(@Query('limit') limit?: number) {
    return this.themeVersionsService.getThemeVersions(limit ? parseInt(limit.toString()) : 50);
  }

  @Get('latest')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get latest theme version (Master Admin only)' })
  async getLatestThemeVersion() {
    return this.themeVersionsService.getLatestThemeVersion();
  }

  @Get(':id')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get specific theme version (Master Admin only)' })
  async getThemeVersion(@Param('id') id: string) {
    return this.themeVersionsService.getThemeVersion(id);
  }

  @Post(':id/restore')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Restore a theme version (Master Admin only)' })
  async restoreThemeVersion(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const theme = await this.themeVersionsService.restoreThemeVersion(
      id,
      user.id,
    );
    return {
      message: 'Theme version restored successfully',
      theme,
      versionId: id,
    };
  }

  @Delete(':id')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete a theme version (Master Admin only)' })
  async deleteThemeVersion(@Param('id') id: string) {
    await this.themeVersionsService.deleteThemeVersion(id);
    return { message: 'Theme version deleted successfully' };
  }
}

