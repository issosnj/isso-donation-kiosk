import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TemplesModule } from './temples/temples.module';
import { DevicesModule } from './devices/devices.module';
import { DonationsModule } from './donations/donations.module';
import { DonorsModule } from './donors/donors.module';
import { SquareModule } from './square/square.module';
import { GmailModule } from './gmail/gmail.module';
import { PlacesModule } from './places/places.module';
import { ReligiousEventsModule } from './religious-events/religious-events.module';
import { GlobalSettingsModule } from './global-settings/global-settings.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
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
    SquareModule,
    GmailModule,
    PlacesModule,
    ReligiousEventsModule,
    GlobalSettingsModule,
  ],
})
export class AppModule {}

