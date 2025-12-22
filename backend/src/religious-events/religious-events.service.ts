import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReligiousEvent } from './entities/religious-event.entity';
import { CreateReligiousEventDto } from './dto/create-religious-event.dto';
import { UpdateReligiousEventDto } from './dto/update-religious-event.dto';

@Injectable()
export class ReligiousEventsService {
  constructor(
    @InjectRepository(ReligiousEvent)
    private religiousEventsRepository: Repository<ReligiousEvent>,
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

