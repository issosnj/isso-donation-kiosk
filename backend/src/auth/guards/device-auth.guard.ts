import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DevicesService } from '../../devices/devices.service';
import { AppLogger } from '../../common/logger/app-logger.service';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private devicesService: DevicesService,
    private logger: AppLogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'device') {
        this.logger.warn('Device auth failed: invalid token type', { path: request.path });
        throw new UnauthorizedException('Invalid token type');
      }

      const deviceId = payload.deviceId;
      if (deviceId) {
        const isValid = await this.devicesService.validateDeviceToken(deviceId, token);
        if (!isValid) {
          this.logger.warn('Device auth failed: token revoked or mismatch', {
            deviceId,
            path: request.path,
          });
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      request.device = payload;
      return true;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      this.logger.warn('Device auth failed: invalid or expired token', { path: request.path });
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

