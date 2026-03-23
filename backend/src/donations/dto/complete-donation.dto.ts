import { IsString, IsEnum, IsOptional, IsNumber, MaxLength, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DonationStatus } from '../entities/donation.entity';

export class CompleteDonationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  squarePaymentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  stripePaymentIntentId?: string;

  @ApiProperty({ enum: DonationStatus })
  @IsEnum(DonationStatus)
  status: DonationStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  donorName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  donorPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  donorEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  donorAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  netAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  stripeFee?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4)
  cardLast4?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  cardType?: string;
}
