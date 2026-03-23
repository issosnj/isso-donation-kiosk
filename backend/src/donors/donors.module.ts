import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Donor } from './entities/donor.entity';
import { Donation } from '../donations/entities/donation.entity';
import { DonorsService } from './donors.service';
import { DonorsController } from './donors.controller';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donor, Donation]),
    forwardRef(() => DevicesModule), // Required for DeviceAuthGuard (DevicesService)
    JwtModule.register({}), // Required for DeviceAuthGuard
  ],
  controllers: [DonorsController],
  providers: [DonorsService],
  exports: [DonorsService],
})
export class DonorsModule {}

