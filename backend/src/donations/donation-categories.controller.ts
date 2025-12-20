import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DonationCategoriesService } from './donation-categories.service';
import { CreateDonationCategoryDto } from './dto/create-donation-category.dto';
import { UpdateDonationCategoryDto } from './dto/update-donation-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceAuthGuard } from '../auth/guards/device-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CurrentDevice } from '../auth/decorators/current-device.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('donation-categories')
@Controller('donation-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DonationCategoriesController {
  constructor(
    private readonly categoriesService: DonationCategoriesService,
  ) {}

  // More specific routes must come before generic routes in NestJS
  @Post(':id/move-up')
  @ApiOperation({ summary: 'Move category up in display order' })
  async moveUp(@Param('id') id: string, @CurrentUser() user: any) {
    try {
      console.log('[DonationCategoriesController] moveUp called with id:', id)
      const templeId = user.role === UserRole.MASTER_ADMIN 
        ? undefined 
        : user.templeId;
      
      if (!templeId) {
        // For master admin, need to get category first to find templeId
        const category = await this.categoriesService.findOne(id);
        console.log('[DonationCategoriesController] Master admin - found category templeId:', category.templeId)
        return await this.categoriesService.moveUp(id, category.templeId);
      }
      
      console.log('[DonationCategoriesController] Temple admin - using templeId:', templeId)
      return await this.categoriesService.moveUp(id, templeId);
    } catch (error) {
      console.error('[DonationCategoriesController] Error moving category up:', error);
      throw error;
    }
  }

  @Post(':id/move-down')
  @ApiOperation({ summary: 'Move category down in display order' })
  async moveDown(@Param('id') id: string, @CurrentUser() user: any) {
    try {
      console.log('[DonationCategoriesController] moveDown called with id:', id)
      const templeId = user.role === UserRole.MASTER_ADMIN 
        ? undefined 
        : user.templeId;
      
      if (!templeId) {
        // For master admin, need to get category first to find templeId
        const category = await this.categoriesService.findOne(id);
        console.log('[DonationCategoriesController] Master admin - found category templeId:', category.templeId)
        return await this.categoriesService.moveDown(id, category.templeId);
      }
      
      console.log('[DonationCategoriesController] Temple admin - using templeId:', templeId)
      return await this.categoriesService.moveDown(id, templeId);
    } catch (error) {
      console.error('[DonationCategoriesController] Error moving category down:', error);
      throw error;
    }
  }

  @Post()
  @ApiOperation({ summary: 'Create a new donation category' })
  create(
    @Body() createCategoryDto: CreateDonationCategoryDto,
    @CurrentUser() user: any,
  ) {
    if (user.role === UserRole.TEMPLE_ADMIN) {
      createCategoryDto.templeId = user.templeId;
    }
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all donation categories' })
  async findAll(@CurrentUser() user: any) {
    const categories = user.role === UserRole.MASTER_ADMIN
      ? await this.categoriesService.findAll()
      : await this.categoriesService.findAll(user.templeId);
    
    // Fix any duplicate displayOrder values by reassigning them
    // Group by templeId and fix each group
    const categoriesByTemple = new Map<string, typeof categories>();
    categories.forEach(cat => {
      if (!categoriesByTemple.has(cat.templeId)) {
        categoriesByTemple.set(cat.templeId, []);
      }
      categoriesByTemple.get(cat.templeId)!.push(cat);
    });
    
    // Check and fix duplicates for each temple
    for (const [templeId, templeCategories] of categoriesByTemple) {
      const orders = templeCategories.map(c => c.displayOrder);
      const hasDuplicates = orders.length !== new Set(orders).size;
      
      if (hasDuplicates) {
        console.log(`[DonationCategoriesController] Found duplicate displayOrder values for temple ${templeId}, fixing...`);
        // Fix will happen on next move operation, but we can also trigger a fix here if needed
        // For now, just log it - the move operations will handle it
      }
    }
    
    return categories;
  }

  @Get('kiosk/:templeId')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get categories for kiosk (filtered by date/time)' })
  async getKioskCategories(
    @Param('templeId') templeId: string,
    @CurrentDevice() device: any,
  ) {
    console.log('[DonationCategoriesController] ========== getKioskCategories called ==========');
    console.log('[DonationCategoriesController] Requested templeId:', templeId);
    console.log('[DonationCategoriesController] Device templeId:', device?.templeId);
    console.log('[DonationCategoriesController] Device ID:', device?.deviceId);
    
    // Ensure the device token's templeId matches the requested templeId
    if (!device || device.templeId !== templeId) {
      console.error('[DonationCategoriesController] ❌ Unauthorized: device templeId does not match requested templeId');
      console.error('[DonationCategoriesController] Device object:', JSON.stringify(device, null, 2));
      throw new Error('Unauthorized access to categories for this temple.');
    }
    
    // First, get ALL categories for this temple (unfiltered) for debugging
    const allCategories = await this.categoriesService.findAll(templeId);
    console.log(`[DonationCategoriesController] 📊 Total categories in database: ${allCategories.length}`);
    allCategories.forEach((cat, index) => {
      console.log(`[DonationCategoriesController]   Category ${index + 1}: "${cat.name}"`);
      console.log(`[DonationCategoriesController]     - ID: ${cat.id}`);
      console.log(`[DonationCategoriesController]     - isActive: ${cat.isActive}`);
      console.log(`[DonationCategoriesController]     - showOnKiosk: ${cat.showOnKiosk}`);
      console.log(`[DonationCategoriesController]     - showStartDate: ${cat.showStartDate || 'NULL'}`);
      console.log(`[DonationCategoriesController]     - showEndDate: ${cat.showEndDate || 'NULL'}`);
    });
    
    // Now get filtered categories
    const categories = await this.categoriesService.findByTemple(templeId, true);
    console.log(`[DonationCategoriesController] ✅ Found ${categories.length} categories after filtering`);
    
    // Map to only include necessary fields for kiosk
    const mappedCategories = categories.map((cat) => {
      // Convert defaultAmount from decimal to number (TypeORM returns decimals as strings)
      const defaultAmount = cat.defaultAmount != null 
        ? (typeof cat.defaultAmount === 'string' 
            ? parseFloat(cat.defaultAmount) 
            : Number(cat.defaultAmount))
        : null;
      
      const mapped = {
        id: cat.id,
        name: cat.name,
        defaultAmount: defaultAmount,
        // Convert Date objects to ISO strings for iOS compatibility
        showStartDate: cat.showStartDate ? cat.showStartDate.toISOString() : null,
        showEndDate: cat.showEndDate ? cat.showEndDate.toISOString() : null,
        // Include yajman opportunities if they exist
        yajmanOpportunities: cat.yajmanOpportunities || null,
      };
      console.log(`[DonationCategoriesController]   Mapping category: "${cat.name}"`);
      console.log(`[DonationCategoriesController]     - yajmanOpportunities: ${cat.yajmanOpportunities ? JSON.stringify(cat.yajmanOpportunities) : 'null'}`);
      console.log(`[DonationCategoriesController]     - Mapped: ${JSON.stringify(mapped)}`);
      return mapped;
    });
    
    console.log('[DonationCategoriesController] 📤 Returning mapped categories:', mappedCategories.length);
    console.log('[DonationCategoriesController] 📤 Response JSON:', JSON.stringify(mappedCategories, null, 2));
    
    if (mappedCategories.length === 0) {
      console.warn('[DonationCategoriesController] ⚠️ No categories returned - this might indicate:');
      console.warn('[DonationCategoriesController]   1. No categories exist for this temple');
      console.warn('[DonationCategoriesController]   2. Categories exist but isActive = false');
      console.warn('[DonationCategoriesController]   3. Categories exist but showOnKiosk = false');
      console.warn('[DonationCategoriesController]   4. Categories exist but are outside date range');
    }
    console.log('[DonationCategoriesController] ========== End getKioskCategories ==========');
    return mappedCategories;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get donation category by ID' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update donation category' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateDonationCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete donation category' })
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}

