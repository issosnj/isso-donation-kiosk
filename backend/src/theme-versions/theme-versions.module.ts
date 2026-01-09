import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeVersionsService } from './theme-versions.service';
import { ThemeVersionsController } from './theme-versions.controller';
import { DefaultPositionsController } from './default-positions.controller';
import { ThemeVersion } from './entities/theme-version.entity';
import { DefaultPosition } from './entities/default-position.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ThemeVersion, DefaultPosition])],
  controllers: [ThemeVersionsController, DefaultPositionsController],
  providers: [ThemeVersionsService],
  exports: [ThemeVersionsService],
})
export class ThemeVersionsModule {}

