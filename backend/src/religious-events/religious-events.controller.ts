import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReligiousEventsService } from './religious-events.service';
import { GoogleCalendarService } from './google-calendar.service';
import { ReligiousEventsSyncService } from './religious-events-sync.service';
import { CreateReligiousEventDto } from './dto/create-religious-event.dto';
import { UpdateReligiousEventDto } from './dto/update-religious-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { DeviceAuthGuard } from '../auth/guards/device-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('religious-events')
@Controller('religious-events')
export class ReligiousEventsController {
  constructor(
    private readonly religiousEventsService: ReligiousEventsService,
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly religiousEventsSyncService: ReligiousEventsSyncService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new religious event (Master Admin only)' })
  create(@Body() createDto: CreateReligiousEventDto) {
    return this.religiousEventsService.create(createDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all religious events (Master Admin only)' })
  findAll() {
    return this.religiousEventsService.findAll();
  }

  @Get('upcoming')
  @Public()
  @ApiOperation({ summary: 'Get upcoming religious events (Public endpoint for kiosks)' })
  findUpcoming() {
    return this.religiousEventsService.findUpcoming(50);
  }

  @Get('kiosk')
  @UseGuards(DeviceAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get upcoming religious events for kiosk (Device authenticated)' })
  findUpcomingForKiosk(@Req() req: { device: { templeId: string } }) {
    return this.religiousEventsService.findUpcomingForKiosk(req.device.templeId, 50);
  }

  @Get('observance-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get observance calendar failure status (Master Admin only)' })
  getObservanceStatus(@Query('templeId') templeId?: string) {
    const failures = this.religiousEventsService.getLastObservanceFailure(templeId);
    const asArray = failures instanceof Map
      ? Array.from(failures.entries()).map(([id, f]) => ({ templeId: id, ...f }))
      : failures ? [{ ...failures }] : [];
    return { lastFailures: asArray };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a religious event by ID (Master Admin only)' })
  findOne(@Param('id') id: string) {
    return this.religiousEventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a religious event (Master Admin only)' })
  update(@Param('id') id: string, @Body() updateDto: UpdateReligiousEventDto) {
    return this.religiousEventsService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a religious event (Master Admin only)' })
  remove(@Param('id') id: string) {
    return this.religiousEventsService.remove(id);
  }

  @Get('google-calendar/fetch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Fetch events from Google Calendar (Master Admin only)' })
  async fetchFromGoogleCalendar(@Query('url') url: string, @Query('limit') limit?: string) {
    console.log('[ReligiousEventsController] 📅 Fetching from Google Calendar');
    console.log('[ReligiousEventsController] URL:', url);
    console.log('[ReligiousEventsController] Limit:', limit);
    
    if (!url || !url.trim()) {
      console.error('[ReligiousEventsController] ❌ Calendar URL is required');
      throw new BadRequestException('Calendar URL is required');
    }

    try {
      const eventLimit = limit ? parseInt(limit, 10) : 50;
      console.log('[ReligiousEventsController] 🔄 Calling GoogleCalendarService...');
      const events = await this.googleCalendarService.fetchEventsFromCalendar(url.trim(), eventLimit);
      console.log('[ReligiousEventsController] ✅ Successfully fetched', events.length, 'events');
      return events;
    } catch (error) {
      console.error('[ReligiousEventsController] ❌ Error fetching calendar:', error);
      console.error('[ReligiousEventsController] Error message:', error.message);
      console.error('[ReligiousEventsController] Error stack:', error.stack);
      
      // Return proper HTTP error
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_REQUEST,
          message: error.message || 'Failed to fetch events from Google Calendar',
          error: 'Bad Request',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MASTER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually trigger Google Calendar sync (Master Admin only)' })
  async triggerSync() {
    console.log('[ReligiousEventsController] 🔄 Manual sync triggered via API');
    try {
      const result = await this.religiousEventsSyncService.manualSync();
      return {
        message: 'Sync completed successfully',
        newEvents: result.newEvents,
        updatedEvents: result.updatedEvents,
      };
    } catch (error) {
      console.error('[ReligiousEventsController] ❌ Error during manual sync:', error);
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Failed to sync events from Google Calendar',
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

