import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTempleDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false, default: 'USD' })
  @IsOptional()
  @IsString()
  defaultCurrency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  homeScreenConfig?: {
    idleTimeoutSeconds?: number;
    customMessage?: string;
    whatsAppLink?: string;
    eventsText?: string;
    googleCalendarLink?: string;
    socialMedia?: Array<{
      platform: string;
      url: string;
    }>;
  };
}

