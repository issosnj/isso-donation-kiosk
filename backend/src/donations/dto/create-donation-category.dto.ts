import { IsUUID, IsString, IsBoolean, IsOptional, IsNumber, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
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

  @ApiProperty({ required: false, nullable: true, type: Number })
  @IsOptional()
  @ValidateIf((o) => o.defaultAmount !== null && o.defaultAmount !== undefined)
  @Type(() => Number)
  @IsNumber({}, { message: 'defaultAmount must be a number' })
  defaultAmount?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  showStartDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  showEndDate?: string;
}

