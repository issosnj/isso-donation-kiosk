import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplesService } from './temples.service';
import { TemplesController } from './temples.controller';
import { Temple } from './entities/temple.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Temple])],
  controllers: [TemplesController],
  providers: [TemplesService],
  exports: [TemplesService],
})
export class TemplesModule {}

