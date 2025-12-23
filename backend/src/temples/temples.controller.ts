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
import axios from 'axios';
import axios from 'axios';

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

  @Get('proxy-image')
  @Public()
  @ApiOperation({ summary: 'Proxy image from external URL (e.g., Google Drive) - Public endpoint for kiosks' })
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(400).json({ message: 'URL parameter is required' });
    }

    try {
      // Decode the URL if it's encoded
      const decodedUrl = decodeURIComponent(url);
      
      // Validate that it's a Google Drive URL or other allowed domain
      const allowedDomains = ['drive.google.com', 'googleusercontent.com', 'i.imgur.com'];
      const urlObj = new URL(decodedUrl);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));
      
      if (!isAllowed) {
        console.log(`[Proxy Image] Blocked domain: ${urlObj.hostname}`);
        return res.status(403).json({ message: 'Domain not allowed' });
      }

      console.log(`[Proxy Image] Proxying image from: ${decodedUrl}`);
      
      // Fetch the image
      const response = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ISSO-Kiosk/1.0)',
        },
      });

      if (!response.ok) {
        console.log(`[Proxy Image] Failed to fetch image: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          message: 'Failed to fetch image',
          statusCode: response.status 
        });
      }

      // Get content type
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Stream the image data
      const imageData = await response.arrayBuffer();
      res.send(Buffer.from(imageData));
      
      console.log(`[Proxy Image] Successfully proxied image (${imageData.byteLength} bytes)`);
    } catch (error) {
      console.error(`[Proxy Image] Error:`, error);
      return res.status(500).json({ 
        message: 'Failed to proxy image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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

  @Get('proxy-image')
  @Public()
  @ApiOperation({ summary: 'Proxy image from external URL (e.g., Google Drive) - Public endpoint for kiosks' })
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(400).json({ message: 'URL parameter is required' });
    }

    try {
      // Decode the URL if it's encoded
      const decodedUrl = decodeURIComponent(url);
      
      // Validate that it's a Google Drive URL or other allowed domain
      const allowedDomains = ['drive.google.com', 'googleusercontent.com', 'i.imgur.com'];
      const urlObj = new URL(decodedUrl);
      const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain));
      
      if (!isAllowed) {
        console.log(`[Proxy Image] Blocked domain: ${urlObj.hostname}`);
        return res.status(403).json({ message: 'Domain not allowed' });
      }

      console.log(`[Proxy Image] Proxying image from: ${decodedUrl}`);
      
      // Fetch the image using axios
      const response = await axios.get(decodedUrl, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ISSO-Kiosk/1.0)',
        },
        timeout: 30000, // 30 second timeout
      });

      // Get content type
      const contentType = response.headers['content-type'] || 'image/jpeg';
      
      // Set response headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      
      // Send the image data
      res.send(Buffer.from(response.data));
      
      console.log(`[Proxy Image] Successfully proxied image (${response.data.byteLength} bytes)`);
    } catch (error: any) {
      console.error(`[Proxy Image] Error:`, error);
      
      // Handle axios errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(`[Proxy Image] Failed to fetch image: ${error.response.status} ${error.response.statusText}`);
        return res.status(error.response.status).json({ 
          message: 'Failed to fetch image',
          statusCode: error.response.status 
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.log(`[Proxy Image] No response received: ${error.message}`);
        return res.status(504).json({ 
          message: 'Image source did not respond',
          error: error.message
        });
      }
      
      // Something happened in setting up the request
      return res.status(500).json({ 
        message: 'Failed to proxy image',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

}

