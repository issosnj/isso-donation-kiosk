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
    console.log('[DonationCategoriesController] getKioskCategories called');
    console.log('[DonationCategoriesController] Requested templeId:', templeId);
    console.log('[DonationCategoriesController] Device templeId:', device.templeId);
    
    // Ensure the device token's templeId matches the requested templeId
    if (device.templeId !== templeId) {
      console.error('[DonationCategoriesController] Unauthorized: device templeId does not match requested templeId');
      throw new Error('Unauthorized access to categories for this temple.');
    }
    
    const categories = await this.categoriesService.findByTemple(templeId, true);
    console.log(`[DonationCategoriesController] Found ${categories.length} categories for kiosk`);
    
    // Map to only include necessary fields for kiosk
    const mappedCategories = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      defaultAmount: cat.defaultAmount,
      showStartDate: cat.showStartDate,
      showEndDate: cat.showEndDate,
    }));
    
    console.log('[DonationCategoriesController] Returning mapped categories:', mappedCategories.length);
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

