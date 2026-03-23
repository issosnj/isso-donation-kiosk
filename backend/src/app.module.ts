import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from './common/logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TemplesModule } from './temples/temples.module';
import { DevicesModule } from './devices/devices.module';
import { DonationsModule } from './donations/donations.module';
import { DonorsModule } from './donors/donors.module';
import { StripeModule } from './stripe/stripe.module';
import { GmailModule } from './gmail/gmail.module';
import { PlacesModule } from './places/places.module';
import { ReligiousEventsModule } from './religious-events/religious-events.module';
import { GlobalSettingsModule } from './global-settings/global-settings.module';
import { ThemeVersionsModule } from './theme-versions/theme-versions.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    LoggerModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(), // Enable scheduled tasks
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),
    AuthModule,
    UsersModule,
    TemplesModule,
    DevicesModule,
    DonationsModule,
    DonorsModule,
    StripeModule,
    GmailModule,
    PlacesModule,
    ReligiousEventsModule,
    GlobalSettingsModule,
    ThemeVersionsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

