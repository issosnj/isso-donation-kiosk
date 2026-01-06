import { Module, forwardRef } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { TemplesModule } from '../temples/temples.module';
import { DonationsModule } from '../donations/donations.module';

@Module({
  imports: [
    TemplesModule,
    forwardRef(() => DonationsModule),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}

