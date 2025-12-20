import { IsUUID, IsString, IsNumber, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePledgeDto {
  @ApiProperty()
  @IsUUID()
  templeId: string;

  @ApiProperty()
  @IsUUID()
  deviceId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty()
  @IsString()
  donorName: string;

  @ApiProperty()
  @IsString()
  donorPhone: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  donorEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;
}

