import { Type } from 'class-transformer';
import { IsUUID, IsString, IsOptional, MaxLength, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DonorDisplayProposedDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  donorName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  donorPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(254)
  donorEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  donorAddress?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  donorId?: string;
}

export class CreateDonationChangeRequestDto {
  @ApiProperty()
  @IsUUID()
  donationId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  templeNote?: string;

  @ApiProperty({ type: DonorDisplayProposedDto })
  @ValidateNested()
  @Type(() => DonorDisplayProposedDto)
  proposed: DonorDisplayProposedDto;
}
