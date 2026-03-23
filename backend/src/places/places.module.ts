import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    forwardRef(() => DevicesModule), // Required for JwtOrDeviceAuthGuard (DevicesService)
    PassportModule, // Required for JwtOrDeviceAuthGuard
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule, // Required for ConfigService in guard
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}

