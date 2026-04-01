import { IsNumber, IsString, Min, Max, Length } from 'class-validator';
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
}
