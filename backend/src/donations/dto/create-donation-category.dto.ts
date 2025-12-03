import { IsUUID, IsString, IsBoolean, IsOptional } from 'class-validator';
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
}

