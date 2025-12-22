import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    date?: string;
    dateTime?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
  };
  description?: string;
}

@Injectable()
export class GoogleCalendarService {
  /**
   * Converts Google Calendar embed URL to iCal feed URL
   */
  private convertToICalUrl(url: string): string {
    // If already an iCal URL, return as-is
    if (url.includes('/calendar/ical/') || url.includes('/calendar/feeds/')) {
      return url;
    }

    // Extract calendar ID from embed URL
    // Format: https://calendar.google.com/calendar/embed?src=CALENDAR_ID
    const embedMatch = url.match(/src=([^&]+)/);
    if (embedMatch) {
      const calendarId = decodeURIComponent(embedMatch[1]);
      return `https://calendar.google.com/calendar/ical/${calendarId}/public/basic.ics`;
    }

    // Try to extract from other formats
    const calendarIdMatch = url.match(/calendar\.google\.com\/calendar\/u\/\d+\/embed\?src=([^&]+)/);
    if (calendarIdMatch) {
      const calendarId = decodeURIComponent(calendarIdMatch[1]);
      return `https://calendar.google.com/calendar/ical/${calendarId}/public/basic.ics`;
    }

    // If no match, assume it's already an iCal URL or return as-is
    return url;
  }

  /**
   * Fetches events from a Google Calendar public feed
   */
  async fetchEventsFromCalendar(calendarUrl: string, limit: number = 50): Promise<GoogleCalendarEvent[]> {
    try {
      const iCalUrl = this.convertToICalUrl(calendarUrl);
      
      const response = await axios.get(iCalUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (response.status !== 200) {
        throw new Error(`Failed to fetch calendar: ${response.status}`);
      }

      // Parse iCal format
      const events = this.parseICalendar(response.data);

      // Filter to only upcoming events and sort by date
      const now = new Date();
      const upcomingEvents = events
        .filter((event) => {
          const eventDate = this.parseEventDate(event.start);
          return eventDate && eventDate >= now;
        })
        .sort((a, b) => {
          const dateA = this.parseEventDate(a.start) || new Date(0);
          const dateB = this.parseEventDate(b.start) || new Date(0);
          return dateA.getTime() - dateB.getTime();
        })
        .slice(0, limit);

      return upcomingEvents;
    } catch (error) {
      console.error('[GoogleCalendarService] Error fetching calendar:', error);
      throw new Error(`Failed to fetch calendar events: ${error.message}`);
    }
  }

  /**
   * Parses iCalendar format data
   */
  private parseICalendar(data: string): GoogleCalendarEvent[] {
    const events: GoogleCalendarEvent[] = [];
    const lines = data.split(/\r?\n/);
    
    let currentEvent: any = null;
    let inEvent = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'BEGIN:VEVENT') {
        inEvent = true;
        currentEvent = {};
      } else if (line === 'END:VEVENT' && currentEvent) {
        const event = this.parseEvent(currentEvent);
        if (event) {
          events.push(event);
        }
        currentEvent = null;
        inEvent = false;
      } else if (inEvent && currentEvent) {
        // Handle line continuation (starts with space or tab)
        if (line.startsWith(' ') || line.startsWith('\t')) {
          const prevKey = Object.keys(currentEvent).pop();
          if (prevKey) {
            currentEvent[prevKey] = (currentEvent[prevKey] || '') + line.substring(1);
          }
        } else {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).split(';')[0]; // Remove parameters
            const value = line.substring(colonIndex + 1);
            currentEvent[key] = value;
          }
        }
      }
    }

    return events;
  }

  /**
   * Parses a single event from iCal properties
   */
  private parseEvent(properties: Record<string, string>): GoogleCalendarEvent | null {
    const uid = properties['UID'] || properties['DTSTART'] || `event-${Date.now()}`;
    const summary = properties['SUMMARY'] || 'Untitled Event';
    
    // Get DTSTART and DTEND, handling VALUE=DATE format
    let startDate = properties['DTSTART'] || properties['DTSTART;VALUE=DATE'] || '';
    let endDate = properties['DTEND'] || properties['DTEND;VALUE=DATE'] || '';

    const description = properties['DESCRIPTION']?.replace(/\\n/g, '\n');

    // Parse date format
    const start = this.parseDateProperty(startDate);
    const end = this.parseDateProperty(endDate);

    return {
      id: uid,
      summary: summary,
      start,
      end,
      description,
    };
  }

  /**
   * Parses a date property (DATE or DATE-TIME format)
   */
  private parseDateProperty(dateStr: string): { date?: string; dateTime?: string } {
    if (!dateStr) {
      return {};
    }

    if (dateStr.includes('T')) {
      // DATE-TIME format: 20231219T120000Z or 20231219T120000
      return { dateTime: dateStr, date: undefined };
    } else {
      // DATE format: 20231219 (all-day event)
      return { date: dateStr, dateTime: undefined };
    }
  }

  /**
   * Parses an event date to a Date object
   */
  private parseEventDate(dateProp: { date?: string; dateTime?: string }): Date | null {
    if (dateProp.dateTime) {
      // Try multiple date formats
      const dateTime = dateProp.dateTime;
      
      // Format 1: 20231219T120000Z (iCal format)
      if (dateTime.length === 16 && dateTime.endsWith('Z')) {
        const year = dateTime.substring(0, 4);
        const month = dateTime.substring(4, 6);
        const day = dateTime.substring(6, 8);
        const hour = dateTime.substring(9, 11);
        const minute = dateTime.substring(11, 13);
        const second = dateTime.substring(13, 15);
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
      }
      
      // Format 2: 20231219T120000 (no Z)
      if (dateTime.length === 15) {
        const year = dateTime.substring(0, 4);
        const month = dateTime.substring(4, 6);
        const day = dateTime.substring(6, 8);
        const hour = dateTime.substring(9, 11);
        const minute = dateTime.substring(11, 13);
        const second = dateTime.substring(13, 15);
        return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
      }
      
      // Try ISO8601
      const isoDate = new Date(dateTime);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }
    } else if (dateProp.date) {
      // All-day event format: 20231219
      const date = dateProp.date;
      if (date.length === 8) {
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        return new Date(`${year}-${month}-${day}`);
      }
    }
    
    return null;
  }
}

