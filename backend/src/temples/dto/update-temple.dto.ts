import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CreateTempleDto } from './create-temple.dto';

export class UpdateTempleDto extends PartialType(CreateTempleDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gmailAccessToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gmailRefreshToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gmailEmail?: string;
}

