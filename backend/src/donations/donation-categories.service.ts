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
    // Get the highest displayOrder for this temple to assign the next order
    const existingCategories = await this.categoriesRepository.find({
      where: { templeId: createCategoryDto.templeId },
      order: { displayOrder: 'DESC' },
      take: 1,
    });
    
    const nextDisplayOrder = existingCategories.length > 0 
      ? existingCategories[0].displayOrder + 1 
      : 0;
    
    // Ensure defaults are set if not provided
    const categoryData = {
      ...createCategoryDto,
      isActive: createCategoryDto.isActive ?? true,
      showOnKiosk: createCategoryDto.showOnKiosk ?? true, // Default to true for new categories
      displayOrder: nextDisplayOrder,
    };
    
    console.log('[DonationCategoriesService] Creating category with data:', categoryData);
    console.log('[DonationCategoriesService] Assigning displayOrder:', nextDisplayOrder);
    const category = this.categoriesRepository.create(categoryData);
    const saved = await this.categoriesRepository.save(category);
    console.log('[DonationCategoriesService] Category created:', saved.id, saved.name, 'displayOrder:', saved.displayOrder);
    return saved;
  }

  async findAll(templeId?: string): Promise<DonationCategory[]> {
    if (templeId) {
      return this.categoriesRepository.find({
        where: { templeId },
        order: { displayOrder: 'ASC', name: 'ASC' },
      });
    }
    return this.categoriesRepository.find({
      order: { displayOrder: 'ASC', name: 'ASC' },
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
        .andWhere('category.showOnKiosk = :showOnKiosk', { showOnKiosk: true });
      
      // Date filtering: Only apply if dates are set
      // If showStartDate is set, it must be <= now
      // If showEndDate is set, it must be >= now
      // If both are NULL, category is always visible
      queryBuilder.andWhere(
        '(category.showStartDate IS NULL OR category.showStartDate <= :now)',
        { now }
      );
      queryBuilder.andWhere(
        '(category.showEndDate IS NULL OR category.showEndDate >= :now)',
        { now }
      );
    }

    const categories = await queryBuilder
      .orderBy('category.displayOrder', 'ASC')
      .addOrderBy('category.name', 'ASC')
      .getMany();
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

  async moveUp(id: string, templeId: string): Promise<DonationCategory[]> {
    // Use transaction to prevent race conditions
    return await this.categoriesRepository.manager.transaction(async (transactionalEntityManager) => {
      // Get all categories for this temple, ordered by displayOrder
      const allCategories = await transactionalEntityManager.find(DonationCategory, {
        where: { templeId },
        order: { displayOrder: 'ASC', name: 'ASC' },
      });

      const currentIndex = allCategories.findIndex((c) => c.id === id);
      if (currentIndex <= 0) {
        // Already at the top, nothing to do
        console.log(`[DonationCategoriesService] moveUp: Category at index ${currentIndex}, cannot move up`);
        return allCategories;
      }

      // Use the category from allCategories array to ensure we have the right entity instance
      const category = allCategories[currentIndex];
      const previousCategory = allCategories[currentIndex - 1];
      
      console.log(`[DonationCategoriesService] moveUp: Moving "${category.name}" (order: ${category.displayOrder}) up with "${previousCategory.name}" (order: ${previousCategory.displayOrder})`);

      // If they have the same displayOrder, we need to reassign orders to ensure uniqueness
      if (category.displayOrder === previousCategory.displayOrder) {
        console.log(`[DonationCategoriesService] moveUp: Same displayOrder detected, reassigning orders`);
        // Reassign all orders to ensure uniqueness
        for (let i = 0; i < allCategories.length; i++) {
          allCategories[i].displayOrder = i;
        }
        await transactionalEntityManager.save(allCategories);
      } else {
        // Swap displayOrder with the category above
        const tempOrder = category.displayOrder;
        category.displayOrder = previousCategory.displayOrder;
        previousCategory.displayOrder = tempOrder;
      }

      console.log(`[DonationCategoriesService] moveUp: After swap - "${category.name}" now has order ${category.displayOrder}, "${previousCategory.name}" now has order ${previousCategory.displayOrder}`);

      await transactionalEntityManager.save([category, previousCategory]);

      // Return updated list
      const updatedCategories = await transactionalEntityManager.find(DonationCategory, {
        where: { templeId },
        order: { displayOrder: 'ASC', name: 'ASC' },
      });
      
      console.log(`[DonationCategoriesService] moveUp: Updated order:`, updatedCategories.map(c => `${c.name} (${c.displayOrder})`).join(', '));
      
      return updatedCategories;
    });
  }

  async moveDown(id: string, templeId: string): Promise<DonationCategory[]> {
    // Use transaction to prevent race conditions
    return await this.categoriesRepository.manager.transaction(async (transactionalEntityManager) => {
      // Get all categories for this temple, ordered by displayOrder
      const allCategories = await transactionalEntityManager.find(DonationCategory, {
        where: { templeId },
        order: { displayOrder: 'ASC', name: 'ASC' },
      });

      const currentIndex = allCategories.findIndex((c) => c.id === id);
      if (currentIndex < 0 || currentIndex >= allCategories.length - 1) {
        // Already at the bottom, nothing to do
        console.log(`[DonationCategoriesService] moveDown: Category at index ${currentIndex}, cannot move down`);
        return allCategories;
      }

      // Use the category from allCategories array to ensure we have the right entity instance
      const category = allCategories[currentIndex];
      const nextCategory = allCategories[currentIndex + 1];
      
      console.log(`[DonationCategoriesService] moveDown: Moving "${category.name}" (order: ${category.displayOrder}) down with "${nextCategory.name}" (order: ${nextCategory.displayOrder})`);

      // If they have the same displayOrder, we need to reassign orders to ensure uniqueness
      if (category.displayOrder === nextCategory.displayOrder) {
        console.log(`[DonationCategoriesService] moveDown: Same displayOrder detected, reassigning orders`);
        // Reassign all orders to ensure uniqueness
        for (let i = 0; i < allCategories.length; i++) {
          allCategories[i].displayOrder = i;
        }
        // Swap the two categories in the array
        [allCategories[currentIndex], allCategories[currentIndex + 1]] = [allCategories[currentIndex + 1], allCategories[currentIndex]];
        // Reassign orders again after swap
        for (let i = 0; i < allCategories.length; i++) {
          allCategories[i].displayOrder = i;
        }
        await transactionalEntityManager.save(allCategories);
      } else {
        // Swap displayOrder with the category below
        const tempOrder = category.displayOrder;
        category.displayOrder = nextCategory.displayOrder;
        nextCategory.displayOrder = tempOrder;
      }

      console.log(`[DonationCategoriesService] moveDown: After swap - "${category.name}" now has order ${category.displayOrder}, "${nextCategory.name}" now has order ${nextCategory.displayOrder}`);

      await transactionalEntityManager.save([category, nextCategory]);

      // Return updated list
      const updatedCategories = await transactionalEntityManager.find(DonationCategory, {
        where: { templeId },
        order: { displayOrder: 'ASC', name: 'ASC' },
      });
      
      console.log(`[DonationCategoriesService] moveDown: Updated order:`, updatedCategories.map(c => `${c.name} (${c.displayOrder})`).join(', '));
      
      return updatedCategories;
    });
  }
}

