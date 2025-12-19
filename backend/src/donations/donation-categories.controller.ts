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
  findAll(@CurrentUser() user: any) {
    if (user.role === UserRole.MASTER_ADMIN) {
      return this.categoriesService.findAll();
    }
    return this.categoriesService.findAll(user.templeId);
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
    const mappedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      defaultAmount: cat.defaultAmount,
      showStartDate: cat.showStartDate,
      showEndDate: cat.showEndDate,
    }));
    
    console.log('[DonationCategoriesController] 📤 Returning mapped categories:', mappedCategories.length);
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

