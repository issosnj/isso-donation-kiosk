import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { GmailService } from './gmail.service';
import { TemplesService } from '../temples/temples.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@ApiTags('gmail')
@Controller('gmail')
export class GmailController {
  constructor(
    private gmailService: GmailService,
    private templesService: TemplesService,
    private configService: ConfigService,
  ) {}

  // Simple encryption/decryption helpers (in production, use a proper encryption service)
  private getEncryptionKey(): Buffer {
    const keyString = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-32-characters-long!!';
    
    // If it's a hex string, parse it
    if (/^[0-9a-fA-F]+$/.test(keyString)) {
      // Hex string - convert to buffer
      const hexKey = Buffer.from(keyString, 'hex');
      // AES-256-CBC requires exactly 32 bytes
      if (hexKey.length === 32) {
        return hexKey;
      } else if (hexKey.length < 32) {
        // Pad with zeros if too short
        const padded = Buffer.alloc(32);
        hexKey.copy(padded);
        return padded;
      } else {
        // Truncate if too long
        return hexKey.slice(0, 32);
      }
    } else {
      // Regular string - use SHA-256 to derive a 32-byte key
      return crypto.createHash('sha256').update(keyString).digest();
    }
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const key = this.getEncryptionKey();
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  @Get('connect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Gmail OAuth URL' })
  async connect(@Query('templeId') templeId: string, @CurrentUser() user: any) {
    if (user.role !== 'MASTER_ADMIN' && user.templeId !== templeId) {
      throw new Error('Unauthorized');
    }

    const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GMAIL_REDIRECT_URI');
    
    if (!clientId || !redirectUri) {
      throw new Error('Gmail configuration missing. Please set GMAIL_CLIENT_ID and GMAIL_REDIRECT_URI in environment variables.');
    }

    const oauthUrl = this.gmailService.getOAuthUrl(templeId);
    return { oauthUrl };
  }

  @Get('callback')
  @ApiOperation({ summary: 'Gmail OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      if (!code || !state) {
        throw new Error('Missing code or state parameter');
      }

      const stateData = JSON.parse(
        Buffer.from(state, 'base64').toString('utf-8'),
      );
      const { templeId } = stateData;

      // Exchange code for token
      const tokenData = await this.gmailService.exchangeCodeForToken(code, state);
      console.log('[Gmail Callback] Token exchange successful, has refresh token:', !!tokenData.refresh_token);
      
      // Get user email
      const userEmail = await this.gmailService.getUserEmail(tokenData.access_token);
      console.log('[Gmail Callback] User email:', userEmail);

      // Encrypt tokens before storing
      const encryptedAccessToken = this.encrypt(tokenData.access_token);
      const encryptedRefreshToken = tokenData.refresh_token 
        ? this.encrypt(tokenData.refresh_token)
        : null;
      console.log('[Gmail Callback] Tokens encrypted, updating temple:', templeId);

      // Update temple with Gmail credentials
      const updateData = {
        gmailAccessToken: encryptedAccessToken,
        gmailRefreshToken: encryptedRefreshToken,
        gmailEmail: userEmail,
      };
      console.log('[Gmail Callback] Update data:', {
        gmailEmail: updateData.gmailEmail,
        hasAccessToken: !!updateData.gmailAccessToken,
        hasRefreshToken: !!updateData.gmailRefreshToken,
      });
      
      const updatedTemple = await this.templesService.update(templeId, updateData);
      console.log('[Gmail Callback] Temple updated successfully:', {
        id: updatedTemple.id,
        gmailEmail: updatedTemple.gmailEmail,
        hasAccessToken: !!updatedTemple.gmailAccessToken,
        hasRefreshToken: !!updatedTemple.gmailRefreshToken,
      });

      const adminWebUrl = this.configService.get<string>('ADMIN_WEB_URL') || 'https://issodonationkiosk.netlify.app';
      const redirectUrl = `${adminWebUrl}/dashboard?gmailConnected=true&templeId=${templeId}`;
      
      res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('[Gmail Callback] Error:', error);
      const adminWebUrl = this.configService.get<string>('ADMIN_WEB_URL') || 'https://issodonationkiosk.netlify.app';
      const redirectUrl = `${adminWebUrl}/dashboard?gmailError=${encodeURIComponent(error.message)}`;
      res.redirect(redirectUrl);
    }
  }

  @Get('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect Gmail account' })
  async disconnect(@Query('templeId') templeId: string, @CurrentUser() user: any) {
    if (user.role !== 'MASTER_ADMIN' && user.templeId !== templeId) {
      throw new Error('Unauthorized');
    }

    await this.templesService.update(templeId, {
      gmailAccessToken: null,
      gmailRefreshToken: null,
      gmailEmail: null,
    });

    return { message: 'Gmail account disconnected successfully' };
  }
}

