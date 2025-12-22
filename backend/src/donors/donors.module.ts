import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Donor } from './entities/donor.entity';
import { Donation } from '../donations/entities/donation.entity';
import { DonorsService } from './donors.service';
import { DonorsController } from './donors.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donor, Donation]),
    JwtModule.register({}), // Required for DeviceAuthGuard
  ],
  controllers: [DonorsController],
  providers: [DonorsService],
  exports: [DonorsService],
})
export class DonorsModule {}

