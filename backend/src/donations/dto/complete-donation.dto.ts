import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DonationStatus } from '../entities/donation.entity';

export class CompleteDonationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  squarePaymentId?: string; // Legacy Square payment ID

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  stripePaymentIntentId?: string; // Stripe PaymentIntent ID

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
  @IsString()
  donorAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  netAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  squareFee?: number; // Legacy Square fee

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stripeFee?: number; // Stripe processing fee

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cardType?: string;
}
