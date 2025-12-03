import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDeviceDto {
  @ApiProperty()
  @IsUUID()
  templeId: string;

  @ApiProperty()
  @IsString()
  label: string;
}

