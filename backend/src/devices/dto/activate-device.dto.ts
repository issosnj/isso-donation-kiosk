import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ActivateDeviceDto {
  @ApiProperty({ example: 'ABC12345' })
  @IsString()
  @Length(8, 8)
  @Matches(/^[A-Za-z0-9]+$/, { message: 'deviceCode must be alphanumeric' })
  deviceCode: string;
}

