import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DonationCategory } from './entities/donation-category.entity';
import { CreateDonationCategoryDto } from './dto/create-donation-category.dto';
import { UpdateDonationCategoryDto } from './dto/update-donation-category.dto';

@Injectable()
export class DonationCategoriesService {
  constructor(
    @InjectRepository(DonationCategory)
    private categoriesRepository: Repository<DonationCategory>,
  ) {}

  async create(
    createCategoryDto: CreateDonationCategoryDto,
  ): Promise<DonationCategory> {
    const category = this.categoriesRepository.create(createCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async findAll(templeId?: string): Promise<DonationCategory[]> {
    if (templeId) {
      return this.categoriesRepository.find({
        where: { templeId },
        order: { name: 'ASC' },
      });
    }
    return this.categoriesRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findByTemple(templeId: string): Promise<DonationCategory[]> {
    return this.categoriesRepository.find({
      where: { templeId },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<DonationCategory> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateDonationCategoryDto,
  ): Promise<DonationCategory> {
    const category = await this.findOne(id);
    Object.assign(category, updateCategoryDto);
    return this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoriesRepository.remove(category);
  }
}

