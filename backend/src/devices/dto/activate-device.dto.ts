import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateDeviceDto {
  @ApiProperty({ example: 'ABC12345' })
  @IsString()
  @Length(8, 8)
  deviceCode: string;
}

