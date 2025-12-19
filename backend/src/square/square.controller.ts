import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { SquareService } from './square.service';
import { TemplesService } from '../temples/temples.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('square')
@Controller('square')
export class SquareController {
  constructor(
    private squareService: SquareService,
    private templesService: TemplesService,
    private configService: ConfigService,
  ) {}

  @Get('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate Square OAuth connection' })
  async connect(@Query('templeId') templeId: string, @CurrentUser() user: any) {
    // Temple Admin can only connect their own temple
    if (user.role === 'TEMPLE_ADMIN' && user.templeId !== templeId) {
      throw new Error('Unauthorized');
    }

    const oauthUrl = this.squareService.getOAuthUrl(templeId);
    return { oauthUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Square OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const stateData = JSON.parse(
        Buffer.from(state, 'base64').toString('utf-8'),
      );
      const { templeId } = stateData;

      // Exchange code for token
      const tokenData = await this.squareService.exchangeCodeForToken(
        code,
        state,
      );

      // Get merchant info
      const merchant = await this.squareService.getMerchantInfo(
        tokenData.access_token,
      );

      // Get locations
      const locations = await this.squareService.getLocations(
        tokenData.access_token,
      );

      // Save to temple
      await this.templesService.updateSquareCredentials(
        templeId,
        merchant.id,
        tokenData.access_token,
        tokenData.refresh_token,
        locations[0]?.id,
      );

      const adminWebUrl = this.configService.get<string>('ADMIN_WEB_URL') || 'https://issodonationkiosk.netlify.app';
      // Redirect to dashboard with success message - user can navigate to temple edit view
      res.redirect(`${adminWebUrl}/dashboard?squareConnected=true&templeId=${templeId}`);
    } catch (error: any) {
      const adminWebUrl = this.configService.get<string>('ADMIN_WEB_URL') || 'https://issodonationkiosk.netlify.app';
      // Redirect to dashboard with error message
      res.redirect(`${adminWebUrl}/dashboard?squareError=${encodeURIComponent(error.message || 'Connection failed')}`);
    }
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Square webhook endpoint' })
  async webhook(@Body() webhookData: any) {
    await this.squareService.handleWebhook(webhookData);
    return { success: true };
  }
}

