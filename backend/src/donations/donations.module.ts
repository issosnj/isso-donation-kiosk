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
import { Temple } from '../temples/entities/temple.entity';
import { DevicesModule } from '../devices/devices.module';
import { StripeModule } from '../stripe/stripe.module';
import { GmailModule } from '../gmail/gmail.module';
import { ReceiptPdfService } from './receipt-pdf.service';
import { ReceiptGeneratorService } from './receipt-generator.service';
import { DonorsModule } from '../donors/donors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, DonationCategory, Temple]),
    TemplesModule,
    forwardRef(() => DevicesModule),
    forwardRef(() => StripeModule),
    GmailModule,
    forwardRef(() => DonorsModule),
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
  providers: [DonationsService, DonationCategoriesService, ReceiptPdfService, ReceiptGeneratorService],
  exports: [DonationsService, DonationCategoriesService],
})
export class DonationsModule {}

