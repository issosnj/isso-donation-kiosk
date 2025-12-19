import { IsUUID, IsString, IsBoolean, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDonationCategoryDto {
  @ApiProperty()
  @IsUUID()
  templeId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  showOnKiosk?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  defaultAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  showStartDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  showEndDate?: string;
}

