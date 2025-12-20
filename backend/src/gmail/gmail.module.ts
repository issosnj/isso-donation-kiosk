import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';
import { TemplesModule } from '../temples/temples.module';

@Module({
  imports: [TemplesModule, ConfigModule],
  controllers: [GmailController],
  providers: [GmailService],
  exports: [GmailService],
})
export class GmailModule {}

