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
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
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
  @ApiOperation({ summary: 'Get categories for kiosk (filtered by date/time)' })
  async getKioskCategories(@Param('templeId') templeId: string) {
    return this.categoriesService.findByTemple(templeId, true);
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

