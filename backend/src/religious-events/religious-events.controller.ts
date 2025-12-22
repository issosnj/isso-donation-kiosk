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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReligiousEventsService } from './religious-events.service';
import { GoogleCalendarService } from './google-calendar.service';
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
  findUpcomingForKiosk() {
    return this.religiousEventsService.findUpcoming(50);
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
    if (!url) {
      throw new Error('Calendar URL is required');
    }
    const eventLimit = limit ? parseInt(limit, 10) : 50;
    return this.googleCalendarService.fetchEventsFromCalendar(url, eventLimit);
  }
}

