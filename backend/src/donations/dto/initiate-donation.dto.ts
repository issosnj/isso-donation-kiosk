import { IsUUID, IsNumber, IsString, IsOptional, Min, Max, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InitiateDonationDto {
  @ApiProperty()
  @IsUUID('4')
  templeId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  deviceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  amount: number;

  @ApiProperty({ default: 'USD' })
  @IsString()
  @Length(3, 3)
  currency: string;
}

