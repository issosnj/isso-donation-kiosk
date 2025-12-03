import { PartialType } from '@nestjs/swagger';
import { CreateTempleDto } from './create-temple.dto';

export class UpdateTempleDto extends PartialType(CreateTempleDto) {}

