import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReligiousEventsService } from './religious-events.service';
import { ReligiousEventsController } from './religious-events.controller';
import { ReligiousEvent } from './entities/religious-event.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReligiousEvent]),
    JwtModule.register({}),
  ],
  controllers: [ReligiousEventsController],
  providers: [ReligiousEventsService],
  exports: [ReligiousEventsService],
})
export class ReligiousEventsModule {}

