import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  BadRequestException,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TemplesService } from './temples.service';
import { CreateTempleDto } from './dto/create-temple.dto';
import { UpdateTempleDto } from './dto/update-temple.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('temples')
@Controller('temples')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TemplesController {
  constructor(private readonly templesService: TemplesService) { }

  @Post()
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create a new temple (Master Admin only)' })
  async create(@Body() createTempleDto: CreateTempleDto, @CurrentUser() user: any) {
    try {
      console.log('[Temple Creation] Request from user:', user.email, 'Role:', user.role);
      console.log('[Temple Creation] DTO:', createTempleDto);

      const temple = await this.templesService.create(createTempleDto);

      console.log('[Temple Creation] Success:', temple.id);
      return temple;
    } catch (error) {
      console.error('[Temple Creation] Error:', error);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all temples' })
  async findAll(@CurrentUser() user: any) {
    console.log('[Temples Controller] findAll called by user:', user.email, 'Role:', user.role);
    
    if (user.role === UserRole.MASTER_ADMIN) {
      console.log('[Temples Controller] User is MASTER_ADMIN, calling findAll service');
      const temples = await this.templesService.findAll();
      console.log('[Temples Controller] Returning', temples?.length || 0, 'temples');
      return temples;
    }
    
    // Temple Admin only sees their temple
    console.log('[Temples Controller] User is TEMPLE_ADMIN, returning single temple:', user.templeId);
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
    console.log('[Temples Controller] Update request received:', {
      id,
      updateDto: {
        ...updateTempleDto,
        squareAccessToken: (updateTempleDto as any).squareAccessToken === null ? 'null' : 'not null',
        squareMerchantId: (updateTempleDto as any).squareMerchantId === null ? 'null' : 'not null',
      },
    });
    return this.templesService.update(id, updateTempleDto);
  }

  @Delete(':id')
  @Roles(UserRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Delete temple (Master Admin only)' })
  remove(@Param('id') id: string) {
    return this.templesService.remove(id);
  }

}

