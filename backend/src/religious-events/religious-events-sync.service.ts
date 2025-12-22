import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReligiousEventsService } from './religious-events.service';
import { GoogleCalendarService, GoogleCalendarEvent } from './google-calendar.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReligiousEvent } from './entities/religious-event.entity';

@Injectable()
export class ReligiousEventsSyncService {
  private readonly logger = new Logger(ReligiousEventsSyncService.name);

  constructor(
    @InjectRepository(ReligiousEvent)
    private religiousEventsRepository: Repository<ReligiousEvent>,
    private religiousEventsService: ReligiousEventsService,
    private googleCalendarService: GoogleCalendarService,
  ) {}

  /**
   * Sync events from Google Calendar for all religious events that have calendar links
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async syncAllEventsFromGoogleCalendar() {
    this.logger.log('🔄 Starting scheduled sync of Google Calendar events...');
    
    try {
      // Check if repository is available
      if (!this.religiousEventsRepository) {
        this.logger.error('❌ ReligiousEventsRepository is not available');
        return;
      }

      // Get all religious events that have Google Calendar links
      const eventsWithLinks = await this.religiousEventsRepository.find({
        where: {
          isActive: true,
        },
      });

      const eventsWithCalendarLinks = eventsWithLinks.filter(
        (event) => event.googleCalendarLinks && event.googleCalendarLinks.length > 0,
      );

      this.logger.log(`📅 Found ${eventsWithCalendarLinks.length} religious events with Google Calendar links`);

      if (eventsWithCalendarLinks.length === 0) {
        this.logger.log('ℹ️ No religious events with Google Calendar links found');
        return;
      }

      let totalNewEvents = 0;
      let totalUpdatedEvents = 0;

      for (const religiousEvent of eventsWithCalendarLinks) {
        try {
          const result = await this.syncEventsForReligiousEvent(religiousEvent);
          totalNewEvents += result.newEvents;
          totalUpdatedEvents += result.updatedEvents;
        } catch (error) {
          this.logger.error(
            `❌ Error syncing events for "${religiousEvent.name}": ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `✅ Sync completed: ${totalNewEvents} new events, ${totalUpdatedEvents} updated events`,
      );
    } catch (error) {
      this.logger.error(`❌ Error during scheduled sync: ${error.message}`, error.stack);
    }
  }

  /**
   * Sync events from Google Calendar for a specific religious event
   * This can be called manually or by the scheduled task
   */
  async syncEventsForReligiousEvent(
    religiousEvent: ReligiousEvent,
  ): Promise<{ newEvents: number; updatedEvents: number }> {
    if (!religiousEvent.googleCalendarLinks || religiousEvent.googleCalendarLinks.length === 0) {
      return { newEvents: 0, updatedEvents: 0 };
    }

    this.logger.log(`🔄 Syncing events for "${religiousEvent.name}"...`);

    let newEvents = 0;
    let updatedEvents = 0;

    // Fetch events from all linked calendars
    for (const calendarUrl of religiousEvent.googleCalendarLinks) {
      try {
        this.logger.log(`📅 Fetching from calendar: ${calendarUrl.substring(0, 80)}...`);
        
        // Fetch upcoming events (next 100 to ensure we catch all relevant ones)
        const googleEvents = await this.googleCalendarService.fetchEventsFromCalendar(calendarUrl, 100);
        
        this.logger.log(`📋 Found ${googleEvents.length} events in calendar`);

        // Process each event from Google Calendar
        for (const googleEvent of googleEvents) {
          const result = await this.processGoogleCalendarEvent(googleEvent, religiousEvent);
          if (result.isNew) {
            newEvents++;
          } else if (result.isUpdated) {
            updatedEvents++;
          }
        }
      } catch (error) {
        this.logger.error(
          `❌ Error fetching from calendar ${calendarUrl}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `✅ Synced "${religiousEvent.name}": ${newEvents} new, ${updatedEvents} updated`,
    );

    return { newEvents, updatedEvents };
  }

  /**
   * Process a single Google Calendar event and create/update a ReligiousEvent if needed
   */
  private async processGoogleCalendarEvent(
    googleEvent: GoogleCalendarEvent,
    parentReligiousEvent: ReligiousEvent,
  ): Promise<{ isNew: boolean; isUpdated: boolean }> {
    // Parse the event date
    let eventDate: Date | null = null;
    let startTime: string | null = null;

    if (googleEvent.start?.dateTime) {
      const date = new Date(googleEvent.start.dateTime);
      eventDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      startTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else if (googleEvent.start?.date) {
      // All-day event - format: YYYYMMDD
      const dateStr = googleEvent.start.date;
      if (dateStr.length === 8) {
        const year = parseInt(dateStr.substring(0, 4), 10);
        const month = parseInt(dateStr.substring(4, 6), 10) - 1; // Month is 0-indexed
        const day = parseInt(dateStr.substring(6, 8), 10);
        eventDate = new Date(year, month, day);
      }
    }

    if (!eventDate) {
      this.logger.warn(`⚠️ Could not parse date for event: ${googleEvent.summary}`);
      return { isNew: false, isUpdated: false };
    }

    // Check if an event with this name and date already exists
    const existingEvent = await this.religiousEventsRepository.findOne({
      where: {
        name: googleEvent.summary,
        date: eventDate,
      },
    });

    if (existingEvent) {
      // Event exists - check if it needs updating
      let needsUpdate = false;

      if (existingEvent.description !== (googleEvent.description || '')) {
        existingEvent.description = googleEvent.description || null;
        needsUpdate = true;
      }

      if (existingEvent.startTime !== startTime) {
        existingEvent.startTime = startTime;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await this.religiousEventsRepository.save(existingEvent);
        this.logger.log(`🔄 Updated existing event: ${googleEvent.summary} on ${eventDate.toISOString().split('T')[0]}`);
        return { isNew: false, isUpdated: true };
      }

      return { isNew: false, isUpdated: false };
    }

    // Create new event
    const newEvent = this.religiousEventsRepository.create({
      name: googleEvent.summary,
      description: googleEvent.description || null,
      date: eventDate,
      startTime: startTime,
      isRecurring: false, // Individual events from calendar are not recurring
      isActive: true,
      displayOrder: parentReligiousEvent.displayOrder,
      googleCalendarLinks: [], // Don't copy links - this is a child event
    });

    await this.religiousEventsRepository.save(newEvent);
    this.logger.log(`✨ Created new event: ${googleEvent.summary} on ${eventDate.toISOString().split('T')[0]}`);

    return { isNew: true, isUpdated: false };
  }

  /**
   * Manually trigger a sync (can be called from API endpoint)
   */
  async manualSync(): Promise<{ newEvents: number; updatedEvents: number }> {
    this.logger.log('🔄 Manual sync triggered');
    
    try {
      // Get all religious events that have Google Calendar links
      const eventsWithLinks = await this.religiousEventsRepository.find({
        where: {
          isActive: true,
        },
      });

      const eventsWithCalendarLinks = eventsWithLinks.filter(
        (event) => event.googleCalendarLinks && event.googleCalendarLinks.length > 0,
      );

      this.logger.log(`📅 Found ${eventsWithCalendarLinks.length} religious events with Google Calendar links`);

      let totalNewEvents = 0;
      let totalUpdatedEvents = 0;

      for (const religiousEvent of eventsWithCalendarLinks) {
        try {
          const result = await this.syncEventsForReligiousEvent(religiousEvent);
          totalNewEvents += result.newEvents;
          totalUpdatedEvents += result.updatedEvents;
        } catch (error) {
          this.logger.error(
            `❌ Error syncing events for "${religiousEvent.name}": ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `✅ Manual sync completed: ${totalNewEvents} new events, ${totalUpdatedEvents} updated events`,
      );

      return { newEvents: totalNewEvents, updatedEvents: totalUpdatedEvents };
    } catch (error) {
      this.logger.error(`❌ Error during manual sync: ${error.message}`, error.stack);
      throw error;
    }
  }
}

