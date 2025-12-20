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
    localEvents?: Array<{
      id: string;
      title: string;
      description?: string;
      date: string;
      startTime?: string;
      endTime?: string;
      isAllDay?: boolean;
    }>;
    socialMedia?: Array<{
      platform: string;
      url: string;
    }>;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  kioskTheme?: {
    fonts?: {
      headingFamily?: string;
      headingSize?: number;
      buttonFamily?: string;
      buttonSize?: number;
      bodyFamily?: string;
      bodySize?: number;
    };
    colors?: {
      headingColor?: string;
      buttonTextColor?: string;
      bodyTextColor?: string;
      subtitleColor?: string;
      quantityTotalColor?: string;
    };
    layout?: {
      categoryBoxMaxWidth?: number;
      amountButtonWidth?: number;
      amountButtonHeight?: number;
      categoryButtonHeight?: number;
      headerTopPadding?: number;
      categoryHeaderTopPadding?: number;
      sectionSpacing?: number;
      categoryAmountSectionSpacing?: number;
      buttonSpacing?: number;
      cornerRadius?: number;
      quantityTotalSpacing?: number;
    };
  };
}

