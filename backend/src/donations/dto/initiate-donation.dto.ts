import { IsUUID, IsNumber, IsString, IsOptional, Min, Max, Length, IsArray, ValidateNested, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DonationLineItemDto } from './donation-line-item.dto';

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

  @ApiProperty({ required: false, type: [DonationLineItemDto], description: 'Optional line breakdown; amounts must sum to total amount' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => DonationLineItemDto)
  lineItems?: DonationLineItemDto[];

  @ApiProperty({ default: 'USD' })
  @IsString()
  @Length(3, 3)
  currency: string;
}

