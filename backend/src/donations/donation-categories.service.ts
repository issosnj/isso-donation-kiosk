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
    // Ensure defaults are set if not provided
    const categoryData = {
      ...createCategoryDto,
      isActive: createCategoryDto.isActive ?? true,
      showOnKiosk: createCategoryDto.showOnKiosk ?? true, // Default to true for new categories
    };
    
    console.log('[DonationCategoriesService] Creating category with data:', categoryData);
    const category = this.categoriesRepository.create(categoryData);
    const saved = await this.categoriesRepository.save(category);
    console.log('[DonationCategoriesService] Category created:', saved.id, saved.name, 'showOnKiosk:', saved.showOnKiosk);
    return saved;
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

  async findByTemple(templeId: string, forKiosk: boolean = false): Promise<DonationCategory[]> {
    console.log(`[DonationCategoriesService] findByTemple called for templeId: ${templeId}, forKiosk: ${forKiosk}`);
    
    const queryBuilder = this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.templeId = :templeId', { templeId })
      .andWhere('category.isActive = :isActive', { isActive: true });

    if (forKiosk) {
      const now = new Date();
      console.log(`[DonationCategoriesService] Filtering for kiosk, current time: ${now.toISOString()}`);
      queryBuilder
        .andWhere('category.showOnKiosk = :showOnKiosk', { showOnKiosk: true })
        .andWhere('(category.showStartDate IS NULL OR category.showStartDate <= :now)', { now })
        .andWhere('(category.showEndDate IS NULL OR category.showEndDate >= :now)', { now });
    }

    const categories = await queryBuilder.orderBy('category.name', 'ASC').getMany();
    console.log(`[DonationCategoriesService] Found ${categories.length} categories`);
    
    if (categories.length > 0) {
      categories.forEach((cat, index) => {
        console.log(`[DonationCategoriesService] Category ${index + 1}: ${cat.name} (ID: ${cat.id}, Active: ${cat.isActive}, ShowOnKiosk: ${cat.showOnKiosk}, StartDate: ${cat.showStartDate}, EndDate: ${cat.showEndDate})`);
      });
    } else {
      console.log('[DonationCategoriesService] No categories found - checking all categories for this temple...');
      const allCategories = await this.categoriesRepository.find({
        where: { templeId },
      });
      console.log(`[DonationCategoriesService] Total categories in database: ${allCategories.length}`);
      allCategories.forEach((cat) => {
        console.log(`[DonationCategoriesService]   - ${cat.name}: isActive=${cat.isActive}, showOnKiosk=${cat.showOnKiosk}, showStartDate=${cat.showStartDate}, showEndDate=${cat.showEndDate}`);
      });
    }
    
    return categories;
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

