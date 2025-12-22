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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.religiousEventsRepository.find({
      where: {
        isActive: true,
      },
      order: { date: 'ASC', displayOrder: 'ASC' },
    }).then(events => 
      events
        .filter(event => {
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);
          return eventDate >= today;
        })
        .slice(0, limit)
    );
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

