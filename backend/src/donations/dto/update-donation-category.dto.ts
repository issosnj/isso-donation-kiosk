import { PartialType } from '@nestjs/swagger';
import { CreateDonationCategoryDto } from './create-donation-category.dto';

export class UpdateDonationCategoryDto extends PartialType(
  CreateDonationCategoryDto,
) {}

