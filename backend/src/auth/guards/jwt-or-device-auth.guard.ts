import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { DevicesService } from '../../devices/devices.service';

@Injectable()
export class JwtOrDeviceAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private configService: ConfigService,
    private devicesService: DevicesService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Try JWT auth first (for admin users)
    try {
      const jwtResult = await super.canActivate(context);
      if (jwtResult === true) {
        return true;
      }
    } catch (jwtError) {
      // JWT auth failed, try device auth
      // Continue to device auth check
    }

    // Try device auth
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type === 'device') {
        const deviceId = payload.deviceId;
        if (deviceId) {
          const isValid = await this.devicesService.validateDeviceToken(deviceId, token);
          if (!isValid) {
            throw new UnauthorizedException('Token has been revoked');
          }
        }
        request.device = payload;
        return true;
      }
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
    }

    throw new UnauthorizedException('Invalid or expired token');
  }
}

