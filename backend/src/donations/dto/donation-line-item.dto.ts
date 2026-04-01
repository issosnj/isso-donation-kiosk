import {
  IsNumber,
  IsString,
  Min,
  Max,
  Length,
  IsOptional,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DonationLineItemDto {
  @ApiProperty()
  @IsString()
  @Length(1, 500)
  label: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @ApiProperty({
    required: false,
    description: 'Optional quantity when line is category default × qty (e.g. kiosk).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  quantity?: number;
}
