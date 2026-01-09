import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalSettings } from './entities/global-settings.entity';
import { GlobalSettingsService } from './global-settings.service';
import { GlobalSettingsController } from './global-settings.controller';
import { ThemeVersionsModule } from '../theme-versions/theme-versions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GlobalSettings]),
    forwardRef(() => ThemeVersionsModule),
  ],
  controllers: [GlobalSettingsController],
  providers: [GlobalSettingsService],
  exports: [GlobalSettingsService],
})
export class GlobalSettingsModule {}

