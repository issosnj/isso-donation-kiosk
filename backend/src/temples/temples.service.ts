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
    try {
      console.log('[Temples Service] Creating temple with data:', createTempleDto);
      const temple = this.templesRepository.create(createTempleDto);
      const savedTemple = await this.templesRepository.save(temple);
      console.log('[Temples Service] Temple saved with ID:', savedTemple.id);

      // Reload with relations to match findAll structure
      try {
        const reloadedTemple = await this.templesRepository.findOne({
          where: { id: savedTemple.id },
          relations: ['devices', 'categories'],
        });
        
        if (reloadedTemple) {
          console.log('[Temples Service] Temple reloaded with relations');
          return reloadedTemple;
        } else {
          console.log('[Temples Service] Warning: Could not reload temple, returning saved temple');
          // Initialize empty arrays for relations to match findAll structure
          return {
            ...savedTemple,
            devices: [],
            categories: [],
          };
        }
      } catch (reloadError: any) {
        console.warn('[Temples Service] Error reloading temple with relations (tables may not exist), returning saved temple:', reloadError.message);
        // If reload fails (e.g., relation tables don't exist), return saved temple with empty relations
        return {
          ...savedTemple,
          devices: [],
          categories: [],
        };
      }
    } catch (error) {
      console.error('[Temples Service] Error in create:', error);
      console.error('[Temples Service] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  async findAll(): Promise<Temple[]> {
    try {
      console.log('[Temples Service] Finding all temples...');
      
      // First, try a simple count to see if there are any temples at all
      const count = await this.templesRepository.count();
      console.log('[Temples Service] Total temple count in database:', count);
      
      // Try finding without relations first
      const templesWithoutRelations = await this.templesRepository.find();
      console.log('[Temples Service] Found', templesWithoutRelations?.length || 0, 'temples (without relations)');
      
      // Now try with relations - if this fails, fall back to temples without relations
      try {
        const result = await this.templesRepository.find({
          relations: ['devices', 'categories'],
        });
        console.log('[Temples Service] Found', result?.length || 0, 'temples (with relations)');
        
        if (result && result.length > 0) {
          console.log('[Temples Service] Temple IDs:', result.map(t => t.id));
          console.log('[Temples Service] Temple names:', result.map(t => t.name));
        }
        
        return result || [];
      } catch (relationsError: any) {
        // If loading relations fails (e.g., tables don't exist), return temples without relations
        console.warn('[Temples Service] Failed to load relations, returning temples without relations:', relationsError.message);
        
        // Initialize empty arrays for relations to match expected structure
        const templesWithEmptyRelations = templesWithoutRelations.map(temple => ({
          ...temple,
          devices: [],
          categories: [],
        }));
        
        console.log('[Temples Service] Returning', templesWithEmptyRelations.length, 'temples (without relations, empty arrays added)');
        return templesWithEmptyRelations;
      }
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
    
    // Handle Square disconnection - explicitly set to null if any Square field is null
    const updateDto = updateTempleDto as any;
    if (updateDto.squareMerchantId === null || 
        updateDto.squareAccessToken === null || 
        updateDto.squareRefreshToken === null) {
      console.log('[Temples Service] Disconnecting Square for temple:', id);
      temple.squareMerchantId = null;
      temple.squareAccessToken = null;
      temple.squareRefreshToken = null;
      temple.squareLocationId = null;
      
      // Still update other fields if provided
      if (updateDto.name !== undefined) temple.name = updateDto.name;
      if (updateDto.address !== undefined) temple.address = updateDto.address;
      if (updateDto.timezone !== undefined) temple.timezone = updateDto.timezone;
      if (updateDto.defaultCurrency !== undefined) temple.defaultCurrency = updateDto.defaultCurrency;
      if (updateDto.logoUrl !== undefined) temple.logoUrl = updateDto.logoUrl;
      if (updateDto.branding !== undefined) temple.branding = updateDto.branding;
      if (updateDto.homeScreenConfig !== undefined) temple.homeScreenConfig = updateDto.homeScreenConfig;
    } else {
      // Normal update - assign all fields
      Object.assign(temple, updateTempleDto);
    }
    
    const saved = await this.templesRepository.save(temple);
    console.log('[Temples Service] Temple updated, Square connected:', !!saved.squareAccessToken);
    return saved;
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
    console.log('[Temples Service] updateSquareCredentials called for temple:', id);
    console.log('[Temples Service] Merchant ID:', squareMerchantId);
    console.log('[Temples Service] Location ID:', squareLocationId || 'not provided');
    
    const temple = await this.findOne(id);
    console.log('[Temples Service] Temple found:', temple.name);
    
    temple.squareMerchantId = squareMerchantId;
    temple.squareAccessToken = squareAccessToken;
    temple.squareRefreshToken = squareRefreshToken;
    if (squareLocationId) {
      temple.squareLocationId = squareLocationId;
    }
    
    const savedTemple = await this.templesRepository.save(temple);
    console.log('[Temples Service] Square credentials saved, merchant ID:', savedTemple.squareMerchantId);
    return savedTemple;
  }
}

