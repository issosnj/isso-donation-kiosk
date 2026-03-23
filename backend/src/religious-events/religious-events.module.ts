import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReligiousEventsService } from './religious-events.service';
import { ReligiousEventsController } from './religious-events.controller';
import { GoogleCalendarService } from './google-calendar.service';
import { ReligiousEventsSyncService } from './religious-events-sync.service';
import { ReligiousEvent } from './entities/religious-event.entity';
import { JwtModule } from '@nestjs/jwt';
import { DevicesModule } from '../devices/devices.module';
import { TemplesModule } from '../temples/temples.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReligiousEvent]),
    forwardRef(() => DevicesModule), // Required for DeviceAuthGuard (DevicesService)
    TemplesModule,
    JwtModule.register({}),
  ],
  controllers: [ReligiousEventsController],
  providers: [ReligiousEventsService, GoogleCalendarService, ReligiousEventsSyncService],
  exports: [ReligiousEventsService, GoogleCalendarService, ReligiousEventsSyncService],
})
export class ReligiousEventsModule {}

