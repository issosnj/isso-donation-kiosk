import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReligiousEvent } from './entities/religious-event.entity';
import { CreateReligiousEventDto } from './dto/create-religious-event.dto';
import { UpdateReligiousEventDto } from './dto/update-religious-event.dto';
import { TemplesService } from '../temples/temples.service';
import { GoogleCalendarService } from './google-calendar.service';

/** Last observance calendar failure (for admin health/status later) */
export interface ObservanceCalendarFailure {
  templeId: string;
  templeName: string;
  error: string;
  at: string;
}

/** Normalized event shape returned to kiosk (matches ReligiousEvent API) */
export interface KioskReligiousEvent {
  id: string;
  name: string;
  description?: string;
  date: string;
  startTime?: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  displayOrder?: number;
  isActive?: boolean;
  googleCalendarLinks?: string[];
}

@Injectable()
export class ReligiousEventsService {
  /** Last observance calendar failure per temple (in-memory; for admin status) */
  private lastObservanceFailure: Map<string, ObservanceCalendarFailure> = new Map();

  constructor(
    @InjectRepository(ReligiousEvent)
    private religiousEventsRepository: Repository<ReligiousEvent>,
    private templesService: TemplesService,
    private googleCalendarService: GoogleCalendarService,
  ) {}

  async create(createDto: CreateReligiousEventDto): Promise<ReligiousEvent> {
    const event = this.religiousEventsRepository.create({
      ...createDto,
      date: new Date(createDto.date),
    });
    return this.religiousEventsRepository.save(event);
  }

  async findAll(): Promise<ReligiousEvent[]> {
    return this.religiousEventsRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC', date: 'ASC' },
    });
  }

  /**
   * Get upcoming religious events for kiosk. Uses temple-specific observance calendar
   * when configured, otherwise falls back to global DB events.
   * On calendar fetch failure: logs structured error, falls back to DB.
   */
  async findUpcomingForKiosk(templeId: string, limit: number = 50): Promise<KioskReligiousEvent[]> {
    const temple = await this.templesService.findOne(templeId);
    const observanceCalendarUrl = temple.homeScreenConfig?.observanceCalendarUrl?.trim();
    if (observanceCalendarUrl) {
      try {
        const rawEvents = await this.googleCalendarService.fetchEventsFromCalendar(
          observanceCalendarUrl,
          limit,
        );
        return rawEvents.map((e, idx) => this.mapGoogleEventToKiosk(e, idx));
      } catch (err: any) {
        const errMsg = err?.message || String(err);
        const failure: ObservanceCalendarFailure = {
          templeId,
          templeName: temple.name,
          error: errMsg,
          at: new Date().toISOString(),
        };
        this.lastObservanceFailure.set(templeId, failure);
        console.error('[ReligiousEventsService] OBSERVANCE_CALENDAR_FETCH_FAILED', JSON.stringify({
          event: 'observance_calendar_fetch_failed',
          ...failure,
          calendarUrlMasked: observanceCalendarUrl ? `${observanceCalendarUrl.slice(0, 50)}...` : null,
          fallback: 'global_db',
        }));
        return this.findUpcomingAsKioskFormat(limit);
      }
    }
    return this.findUpcomingAsKioskFormat(limit);
  }

  private mapGoogleEventToKiosk(
    e: { id: string; summary: string; description?: string; start: { date?: string; dateTime?: string } },
    displayOrder: number,
  ): KioskReligiousEvent {
    const dateProp = e.start;
    let dateStr = '';
    let startTime: string | undefined;
    if (dateProp.dateTime) {
      const raw = dateProp.dateTime;
      const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
      if (m) {
        dateStr = `${m[1]}-${m[2]}-${m[3]}`;
        startTime = `${m[4]}:${m[5]}`;
      } else {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().slice(0, 10);
          startTime = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
        }
      }
    } else if (dateProp.date && dateProp.date.length === 8) {
      dateStr = dateProp.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
    }
    return {
      id: e.id || `gc-${displayOrder}`,
      name: e.summary || 'Untitled',
      description: e.description,
      date: dateStr,
      startTime,
      isRecurring: false,
      displayOrder,
      isActive: true,
    };
  }

  /** Get last observance calendar failure for a temple (for admin status) */
  getLastObservanceFailure(templeId?: string): ObservanceCalendarFailure | Map<string, ObservanceCalendarFailure> | null {
    if (templeId) {
      return this.lastObservanceFailure.get(templeId) ?? null;
    }
    return this.lastObservanceFailure.size > 0 ? new Map(this.lastObservanceFailure) : null;
  }

  private async findUpcomingAsKioskFormat(limit: number): Promise<KioskReligiousEvent[]> {
    const events = await this.findUpcoming(limit);
    return events.map((e, idx) => ({
      id: e.id,
      name: e.name,
      description: e.description ?? undefined,
      date: typeof e.date === 'string' ? e.date : (e.date as Date).toISOString().slice(0, 10),
      startTime: e.startTime ?? undefined,
      isRecurring: e.isRecurring,
      recurrencePattern: e.recurrencePattern ?? undefined,
      displayOrder: e.displayOrder ?? idx,
      isActive: e.isActive,
      googleCalendarLinks: e.googleCalendarLinks ?? undefined,
    }));
  }

  async findUpcoming(limit: number = 50): Promise<ReligiousEvent[]> {
    // For kiosk display, show all active events regardless of date
    // This allows religious observances to be visible even if they're in the past
    // Events are ordered by date (ascending) and displayOrder
    console.log('[ReligiousEventsService] Finding upcoming events for kiosk (limit:', limit, ')');
    
    const events = await this.religiousEventsRepository.find({
      where: {
        isActive: true,
      },
      order: { date: 'ASC', displayOrder: 'ASC' },
      take: limit,
    });
    
    console.log('[ReligiousEventsService] Found', events.length, 'active religious events');
    if (events.length > 0) {
      console.log('[ReligiousEventsService] Sample events:', events.slice(0, 3).map(e => ({ name: e.name, date: e.date, isActive: e.isActive })));
    }
    
    return events;
  }

  async findOne(id: string): Promise<ReligiousEvent> {
    const event = await this.religiousEventsRepository.findOne({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Religious event with ID ${id} not found`);
    }
    return event;
  }

  async update(id: string, updateDto: UpdateReligiousEventDto): Promise<ReligiousEvent> {
    const event = await this.findOne(id);
    
    // Handle date conversion if provided
    if (updateDto.date) {
      event.date = new Date(updateDto.date);
    }
    
    // Update other fields
    Object.assign(event, {
      ...updateDto,
      date: updateDto.date ? new Date(updateDto.date) : event.date,
    });
    
    return this.religiousEventsRepository.save(event);
  }

  async remove(id: string): Promise<void> {
    const event = await this.findOne(id);
    await this.religiousEventsRepository.remove(event);
  }
}

