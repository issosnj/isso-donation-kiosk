import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProcessPaymentDto {
  @ApiProperty()
  @IsString()
  donationId: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sourceId?: string; // Card nonce from Square Mobile Payments SDK

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

