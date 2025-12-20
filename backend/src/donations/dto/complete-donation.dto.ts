import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DonationStatus } from '../entities/donation.entity';

export class CompleteDonationDto {
  @ApiProperty()
  @IsString()
  squarePaymentId: string;

  @ApiProperty({ enum: DonationStatus })
  @IsEnum(DonationStatus)
  status: DonationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  donorName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  donorPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  donorEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  netAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  squareFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cardType?: string;
}
