import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { Donation } from './entities/donation.entity';
import { DonationCategory } from './entities/donation-category.entity';
import { DonationCategoriesService } from './donation-categories.service';
import { DonationCategoriesController } from './donation-categories.controller';
import { TemplesModule } from '../temples/temples.module';
import { DevicesModule } from '../devices/devices.module';
import { SquareModule } from '../square/square.module';
import { GmailModule } from '../gmail/gmail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, DonationCategory]),
    TemplesModule,
    forwardRef(() => DevicesModule),
    forwardRef(() => SquareModule),
    GmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '365d', // Device tokens last a year
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [DonationsController, DonationCategoriesController],
  providers: [DonationsService, DonationCategoriesService],
  exports: [DonationsService, DonationCategoriesService],
})
export class DonationsModule {}

