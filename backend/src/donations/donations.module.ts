import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DonationsService } from './donations.service';
import { DonationsController } from './donations.controller';
import { Donation } from './entities/donation.entity';
import { DonationCategory } from './entities/donation-category.entity';
import { DonationCategoriesService } from './donation-categories.service';
import { DonationCategoriesController } from './donation-categories.controller';
import { TemplesModule } from '../temples/temples.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, DonationCategory]),
    TemplesModule,
    DevicesModule,
  ],
  controllers: [DonationsController, DonationCategoriesController],
  providers: [DonationsService, DonationCategoriesService],
  exports: [DonationsService, DonationCategoriesService],
})
export class DonationsModule {}

