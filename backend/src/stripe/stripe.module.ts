import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { StripeWebhookEvent } from './entities/stripe-webhook-event.entity';
import { TemplesModule } from '../temples/temples.module';
import { DonationsModule } from '../donations/donations.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StripeWebhookEvent]),
    TemplesModule,
    forwardRef(() => DonationsModule),
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}

