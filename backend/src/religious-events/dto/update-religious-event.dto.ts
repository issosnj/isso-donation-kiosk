import { PartialType } from '@nestjs/swagger';
import { CreateReligiousEventDto } from './create-religious-event.dto';

export class UpdateReligiousEventDto extends PartialType(CreateReligiousEventDto) {}

