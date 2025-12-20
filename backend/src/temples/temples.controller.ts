import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { TemplesService } from './temples.service';
import { CreateTempleDto } from './dto/create-temple.dto';
import { UpdateTempleDto } from './dto/update-temple.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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

  @Post(':id/upload-background')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), 'uploads', 'backgrounds');
          // Ensure directory exists
          if (!existsSync(uploadPath)) {
            mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // Generate unique filename: temple-{id}-{timestamp}.{ext}
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `temple-${req.params.id}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        // Accept only image files
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload background image for temple kiosk home screen' })
  async uploadBackground(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
    @Req() req: Request,
  ) {
    if (user.role === UserRole.TEMPLE_ADMIN && user.templeId !== id) {
      throw new BadRequestException('Unauthorized');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Get base URL from environment, Railway variables, or construct from request
    let baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL;
    
    // Try Railway's public domain if available
    if (!baseUrl && process.env.RAILWAY_PUBLIC_DOMAIN) {
      baseUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
    }
    
    // Fallback to constructing from request
    if (!baseUrl && req) {
      const protocol = req.protocol || (req.headers['x-forwarded-proto'] as string) || 'https';
      const host = req.get('host') || req.headers.host || 'localhost:3000';
      baseUrl = `${protocol}://${host}`;
    }
    
    // Final fallback
    if (!baseUrl) {
      const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
      const host = process.env.HOST || 'localhost:3000';
      baseUrl = `${protocol}://${host}`;
    }
    
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, '');
    const fileUrl = `${baseUrl}/uploads/backgrounds/${file.filename}`;

    // Verify file exists before saving URL
    const filePath = join(process.cwd(), 'uploads', 'backgrounds', file.filename);
    if (!existsSync(filePath)) {
      throw new BadRequestException('File was not saved correctly');
    }

    // Update temple's homeScreenConfig with the background image URL
    const temple = await this.templesService.findOne(id);
    const homeScreenConfig = temple.homeScreenConfig || {};
    homeScreenConfig.backgroundImageUrl = fileUrl;

    await this.templesService.update(id, {
      homeScreenConfig,
    } as UpdateTempleDto);

    return {
      message: 'Background image uploaded successfully',
      url: fileUrl,
      filename: file.filename,
    };
  }
}

