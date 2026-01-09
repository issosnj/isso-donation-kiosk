import {
  Controller,
  Get,
  Post,
  Put,
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

@ApiTags('default-positions')
@Controller('default-positions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DefaultPositionsController {
  constructor(private readonly themeVersionsService: ThemeVersionsService) {}

  @Get()
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get all default positions (Master Admin only)' })
  async getDefaultPositions(@Query('screenType') screenType?: string) {
    if (screenType) {
      return this.themeVersionsService.getDefaultPositionsByScreenType(screenType);
    }
    return this.themeVersionsService.getDefaultPositions();
  }

  @Get(':elementType/:screenType')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Get default position for specific element (Master Admin only)' })
  async getDefaultPosition(
    @Param('elementType') elementType: string,
    @Param('screenType') screenType: string,
  ) {
    return this.themeVersionsService.getDefaultPosition(elementType, screenType);
  }

  @Post()
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Set default position for an element (Master Admin only)' })
  async setDefaultPosition(
    @Body() body: {
      elementType: string;
      screenType: string;
      position: any;
      metadata?: any;
    },
    @CurrentUser() user: any,
  ) {
    return this.themeVersionsService.setDefaultPosition(
      body.elementType,
      body.screenType,
      body.position,
      body.metadata,
      user.id,
    );
  }

  @Put(':elementType/:screenType')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Update default position for an element (Master Admin only)' })
  async updateDefaultPosition(
    @Param('elementType') elementType: string,
    @Param('screenType') screenType: string,
    @Body() body: {
      position: any;
      metadata?: any;
    },
    @CurrentUser() user: any,
  ) {
    return this.themeVersionsService.setDefaultPosition(
      elementType,
      screenType,
      body.position,
      body.metadata,
      user.id,
    );
  }

  @Delete(':elementType/:screenType')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete default position (Master Admin only)' })
  async deleteDefaultPosition(
    @Param('elementType') elementType: string,
    @Param('screenType') screenType: string,
  ) {
    await this.themeVersionsService.deleteDefaultPosition(elementType, screenType);
    return { message: 'Default position deleted successfully' };
  }
}

