import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DonationStatus } from '../entities/donation.entity';

export class CompleteDonationDto {
  @ApiProperty()
  @IsString()
  squarePaymentId: string;
  
  netAmount?: number;
  squareFee?: number;
  cardLast4?: string;
  cardType?: string;

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
}

