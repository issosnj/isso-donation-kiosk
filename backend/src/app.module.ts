import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TemplesModule } from './temples/temples.module';
import { DevicesModule } from './devices/devices.module';
import { DonationsModule } from './donations/donations.module';
import { DonorsModule } from './donors/donors.module';
import { SquareModule } from './square/square.module';
import { GmailModule } from './gmail/gmail.module';
import { typeOrmConfig } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
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
  ],
})
export class AppModule {}

