import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TemplesService } from '../temples/temples.service';
import * as crypto from 'crypto';

const OAUTH_STATE_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class GmailService {
  constructor(
    private configService: ConfigService,
    private templesService: TemplesService,
  ) {}

  getOAuthUrl(templeId: string, userId: string): string {
    const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
    const redirectUri = this.configService.get<string>('GMAIL_REDIRECT_URI');
    
    if (!clientId || !redirectUri) {
      throw new Error('Gmail configuration missing: GMAIL_CLIENT_ID or GMAIL_REDIRECT_URI not set');
    }
    
    const state = this.signOAuthState(templeId, userId);
    const encodedRedirectUri = encodeURIComponent(redirectUri);
    
    // Gmail OAuth scopes for sending emails
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');
    
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
    
    console.log('[Gmail Service] Generated OAuth URL for temple:', templeId);
    return oauthUrl;
  }

  signOAuthState(templeId: string, userId: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        templeId,
        userId,
        exp: Date.now() + OAUTH_STATE_TTL_MS,
      }),
    ).toString('base64url');
    const signature = crypto.createHmac('sha256', this.oauthStateSecret()).update(payload).digest('base64url');
    return `${payload}.${signature}`;
  }

  verifyOAuthState(state: string): { templeId: string; userId: string } {
    const [payload, signature] = (state || '').split('.');
    if (!payload || !signature || state.split('.').length !== 2) {
      throw new Error('Invalid OAuth state');
    }
    const expected = crypto.createHmac('sha256', this.oauthStateSecret()).update(payload).digest('base64url');
    const actualBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expected);
    if (actualBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(actualBuf, expectedBuf)) {
      throw new Error('Invalid OAuth state');
    }
    let data: { templeId?: string; userId?: string; exp?: number };
    try {
      data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    } catch {
      throw new Error('Invalid OAuth state');
    }
    if (!data.templeId || !data.userId || typeof data.exp !== 'number' || data.exp < Date.now()) {
      throw new Error('OAuth state expired');
    }
    return { templeId: data.templeId, userId: data.userId };
  }

  private oauthStateSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  async exchangeCodeForToken(code: string, state: string): Promise<any> {
    const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GMAIL_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('GMAIL_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Gmail configuration missing');
    }

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const requestBody = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };

    console.log('[Gmail Service] Exchanging code for token');

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Gmail Service] Token exchange failed:', error);
      throw new Error(`Gmail OAuth error: ${error.error_description || JSON.stringify(error)}`);
    }

    const data = await response.json();
    console.log('[Gmail Service] Token exchange successful');
    return data;
  }

  async getUserEmail(accessToken: string): Promise<string> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get user email');
    }

    const data = await response.json();
    return data.email;
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const clientId = this.configService.get<string>('GMAIL_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GMAIL_CLIENT_SECRET');

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const requestBody = {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Gmail Service] Token refresh failed:', error);
      throw new Error('Failed to refresh Gmail access token');
    }

    const data = await response.json();
    return data.access_token;
  }

  async sendEmail(
    accessToken: string,
    to: string,
    subject: string,
    htmlBody: string,
    fromEmail?: string,
    fromName?: string,
    attachment?: { filename: string; content: Buffer; contentType: string },
  ): Promise<void> {
    const from = fromName ? `${fromName} <${fromEmail || to}>` : (fromEmail || to);
    
    // Build multipart message if attachment exists
    if (attachment) {
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Build multipart message
      const parts: string[] = [];
      
      // HTML body part
      parts.push(
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: quoted-printable',
        '',
        htmlBody.replace(/=/g, '=3D').replace(/\n/g, '=\n'),
      );
      
      // Attachment part
      const attachmentBase64 = attachment.content.toString('base64');
      parts.push(
        `--${boundary}`,
        `Content-Type: ${attachment.contentType}`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${attachment.filename}"`,
        '',
        attachmentBase64,
        `--${boundary}--`,
      );
      
      const message = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        parts.join('\n'),
      ].join('\n');

      // Encode message in base64url format (Gmail API requirement)
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let error: any;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { message: errorText };
        }
        console.error('[Gmail Service] Failed to send email with attachment - Status:', response.status);
        console.error('[Gmail Service] Failed to send email - Error:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to send email (${response.status}): ${error.error?.message || error.message || JSON.stringify(error)}`);
      }

      const responseData = await response.json();
      console.log('[Gmail Service] ✅ Email with attachment sent successfully - Message ID:', responseData.id);
    } else {
      // Original simple message without attachment
      const message = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        htmlBody,
      ].join('\n');

      // Encode message in base64url format (Gmail API requirement)
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: encodedMessage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let error: any;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { message: errorText };
        }
        console.error('[Gmail Service] Failed to send email - Status:', response.status);
        console.error('[Gmail Service] Failed to send email - Error:', JSON.stringify(error, null, 2));
        console.error('[Gmail Service] Failed to send email - Response headers:', Object.fromEntries(response.headers.entries()));
        throw new Error(`Failed to send email (${response.status}): ${error.error?.message || error.message || JSON.stringify(error)}`);
      }

      const responseData = await response.json();
      console.log('[Gmail Service] ✅ Email sent successfully - Message ID:', responseData.id);
    }
  }
}

