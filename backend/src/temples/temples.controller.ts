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
import { TemplesService } from './temples.service';
import { CreateTempleDto } from './dto/create-temple.dto';
import { UpdateTempleDto } from './dto/update-temple.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('temples')
@Controller('temples')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TemplesController {
  constructor(private readonly templesService: TemplesService) {}

  @Post()
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create a new temple (Master Admin only)' })
  create(@Body() createTempleDto: CreateTempleDto) {
    return this.templesService.create(createTempleDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all temples' })
  findAll(@CurrentUser() user: any) {
    if (user.role === UserRole.MASTER_ADMIN) {
      return this.templesService.findAll();
    }
    // Temple Admin only sees their temple
    return this.templesService.findOne(user.templeId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get temple by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Temple Admin can only access their own temple
    if (user.role === UserRole.TEMPLE_ADMIN && user.templeId !== id) {
      throw new Error('Unauthorized');
    }
    return this.templesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update temple' })
  update(
    @Param('id') id: string,
    @Body() updateTempleDto: UpdateTempleDto,
    @CurrentUser() user: any,
  ) {
    if (user.role === UserRole.TEMPLE_ADMIN && user.templeId !== id) {
      throw new Error('Unauthorized');
    }
    return this.templesService.update(id, updateTempleDto);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete temple (Master Admin only)' })
  remove(@Param('id') id: string) {
    return this.templesService.remove(id);
  }
}

