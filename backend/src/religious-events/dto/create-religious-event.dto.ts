import { IsString, IsOptional, IsDateString, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReligiousEventDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  date: string; // ISO date string (YYYY-MM-DD)

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startTime?: string; // HH:mm format

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  recurrencePattern?: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsNumber()
  displayOrder?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  googleCalendarLinks?: string[];
}

