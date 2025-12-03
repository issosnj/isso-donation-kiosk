import { Module } from '@nestjs/common';
import { SquareService } from './square.service';
import { SquareController } from './square.controller';
import { TemplesModule } from '../temples/temples.module';
import { DonationsModule } from '../donations/donations.module';

@Module({
  imports: [TemplesModule, DonationsModule],
  controllers: [SquareController],
  providers: [SquareService],
  exports: [SquareService],
})
export class SquareModule {}

