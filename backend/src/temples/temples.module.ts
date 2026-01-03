import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplesService } from './temples.service';
import { TemplesController } from './temples.controller';
import { Temple } from './entities/temple.entity';
import { GlobalSettingsModule } from '../global-settings/global-settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Temple]),
    GlobalSettingsModule,
  ],
  controllers: [TemplesController],
  providers: [TemplesService],
  exports: [TemplesService],
})
export class TemplesModule {}

