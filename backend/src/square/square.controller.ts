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
    console.log('[Square Callback] Received callback with code:', code ? 'present' : 'missing', 'state:', state ? 'present' : 'missing');
    
    try {
      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      const stateData = JSON.parse(
        Buffer.from(state, 'base64').toString('utf-8'),
      );
      const { templeId } = stateData;
      console.log('[Square Callback] Decoded templeId:', templeId);

      // Exchange code for token
      console.log('[Square Callback] Exchanging code for token...');
      const tokenData = await this.squareService.exchangeCodeForToken(
        code,
        state,
      );
      console.log('[Square Callback] Token exchange successful, access_token:', tokenData.access_token ? 'present' : 'missing');

      // Get merchant info
      console.log('[Square Callback] Fetching merchant info...');
      const merchant = await this.squareService.getMerchantInfo(
        tokenData.access_token,
      );
      console.log('[Square Callback] Merchant info retrieved, merchant ID:', merchant?.id);

      // Get locations
      console.log('[Square Callback] Fetching locations...');
      const locations = await this.squareService.getLocations(
        tokenData.access_token,
      );
      console.log('[Square Callback] Locations retrieved, count:', locations?.length || 0);

      // Save to temple
      console.log('[Square Callback] Saving Square credentials to temple...');
      const updatedTemple = await this.templesService.updateSquareCredentials(
        templeId,
        merchant.id,
        tokenData.access_token,
        tokenData.refresh_token,
        locations[0]?.id,
      );
      console.log('[Square Callback] Square credentials saved successfully, merchant ID:', updatedTemple.squareMerchantId);

      const adminWebUrl = this.configService.get<string>('ADMIN_WEB_URL') || 'https://issodonationkiosk.netlify.app';
      console.log('[Square Callback] Redirecting to:', `${adminWebUrl}/dashboard?squareConnected=true&templeId=${templeId}`);
      // Redirect to dashboard with success message - user can navigate to temple edit view
      res.redirect(`${adminWebUrl}/dashboard?squareConnected=true&templeId=${templeId}`);
    } catch (error: any) {
      console.error('[Square Callback] Error occurred:', error);
      console.error('[Square Callback] Error message:', error.message);
      console.error('[Square Callback] Error stack:', error.stack);
      
      const adminWebUrl = this.configService.get<string>('ADMIN_WEB_URL') || 'https://issodonationkiosk.netlify.app';
      const errorMessage = error.message || 'Connection failed';
      console.log('[Square Callback] Redirecting to error page:', `${adminWebUrl}/dashboard?squareError=${encodeURIComponent(errorMessage)}`);
      // Redirect to dashboard with error message
      res.redirect(`${adminWebUrl}/dashboard?squareError=${encodeURIComponent(errorMessage)}`);
    }
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Square webhook endpoint' })
  async webhook(@Body() webhookData: any) {
    await this.squareService.handleWebhook(webhookData);
    return { success: true };
  }
}

