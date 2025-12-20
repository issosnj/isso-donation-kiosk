import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DonationStatus } from '../entities/donation.entity';

export class PayPledgeDto {
  @ApiProperty()
  @IsString()
  squarePaymentId: string;

  @ApiProperty({ enum: DonationStatus })
  @IsEnum(DonationStatus)
  status: DonationStatus;
}

