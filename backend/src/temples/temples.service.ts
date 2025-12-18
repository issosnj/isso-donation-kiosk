import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Temple } from './entities/temple.entity';
import { CreateTempleDto } from './dto/create-temple.dto';
import { UpdateTempleDto } from './dto/update-temple.dto';

@Injectable()
export class TemplesService {
  constructor(
    @InjectRepository(Temple)
    private templesRepository: Repository<Temple>,
  ) { }

  async create(createTempleDto: CreateTempleDto): Promise<Temple> {
    const temple = this.templesRepository.create(createTempleDto);
    const savedTemple = await this.templesRepository.save(temple);

    // Reload with relations to match findAll structure
    return this.templesRepository.findOne({
      where: { id: savedTemple.id },
      relations: ['devices', 'categories'],
    }) || savedTemple;
  }

  async findAll(): Promise<Temple[]> {
    try {
      console.log('[Temples Service] Finding all temples...');
      const result = await this.templesRepository.find({
        relations: ['devices', 'categories'],
      });
      console.log('[Temples Service] Found', result?.length || 0, 'temples');
      return result || [];
    } catch (error) {
      console.error('[Temples Service] Error in findAll:', error);
      console.error('[Temples Service] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
  }

  async findOne(id: string): Promise<Temple> {
    const temple = await this.templesRepository.findOne({
      where: { id },
      relations: ['devices', 'categories', 'donations'],
    });
    if (!temple) {
      throw new NotFoundException(`Temple with ID ${id} not found`);
    }
    return temple;
  }

  async update(id: string, updateTempleDto: UpdateTempleDto): Promise<Temple> {
    const temple = await this.findOne(id);
    Object.assign(temple, updateTempleDto);
    return this.templesRepository.save(temple);
  }

  async remove(id: string): Promise<void> {
    const temple = await this.findOne(id);
    await this.templesRepository.remove(temple);
  }

  async updateSquareCredentials(
    id: string,
    squareMerchantId: string,
    squareAccessToken: string,
    squareRefreshToken: string,
    squareLocationId?: string,
  ): Promise<Temple> {
    const temple = await this.findOne(id);
    temple.squareMerchantId = squareMerchantId;
    temple.squareAccessToken = squareAccessToken;
    temple.squareRefreshToken = squareRefreshToken;
    if (squareLocationId) {
      temple.squareLocationId = squareLocationId;
    }
    return this.templesRepository.save(temple);
  }
}

