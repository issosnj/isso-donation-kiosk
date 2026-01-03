import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Temple } from './entities/temple.entity';
import { CreateTempleDto } from './dto/create-temple.dto';
import { UpdateTempleDto } from './dto/update-temple.dto';
import { GlobalSettingsService } from '../global-settings/global-settings.service';

@Injectable()
export class TemplesService {
  constructor(
    @InjectRepository(Temple)
    private templesRepository: Repository<Temple>,
    private globalSettingsService: GlobalSettingsService,
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
    try {
      console.log('[Temples Service] Finding temple with ID:', id);
      const startTime = Date.now();
      
      const temple = await this.templesRepository.findOne({
        where: { id },
        relations: ['devices', 'categories'],
      });
      
      const queryTime = Date.now() - startTime;
      console.log(`[Temples Service] Query completed in ${queryTime}ms`);
      
      if (!temple) {
        throw new NotFoundException(`Temple with ID ${id} not found`);
      }
      
      // Include global kiosk theme (master-admin controlled, same for all temples)
      try {
        const globalSettings = await this.globalSettingsService.getSettings();
        if (globalSettings?.kioskTheme) {
          // Override temple's kioskTheme with global theme
          temple.kioskTheme = globalSettings.kioskTheme as any;
          console.log('[Temples Service] Applied global kiosk theme to temple response');
        }
      } catch (globalThemeError) {
        console.warn('[Temples Service] Could not load global theme (may not exist yet):', globalThemeError.message);
        // Continue without global theme - temple's own theme (if any) will be used
      }
      
      console.log(`[Temples Service] Temple found: ${temple.name}, devices: ${temple.devices?.length || 0}, categories: ${temple.categories?.length || 0}`);
      return temple;
    } catch (error) {
      console.error('[Temples Service] Error in findOne:', error);
      console.error('[Temples Service] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  async update(id: string, updateTempleDto: UpdateTempleDto): Promise<Temple> {
    console.log('[Temples Service] Update called for temple:', id);
    console.log('[Temples Service] Update data keys:', Object.keys(updateTempleDto));
    
    const temple = await this.findOne(id);
    
    // Handle Square disconnection - explicitly set to null if any Square field is null
    const updateDto = updateTempleDto as any;
    const isDisconnecting = updateDto.squareMerchantId === null || 
                            updateDto.squareAccessToken === null || 
                            updateDto.squareRefreshToken === null;
    
    // Handle Gmail fields explicitly
    if (updateDto.gmailAccessToken !== undefined) {
      console.log('[Temples Service] Updating Gmail access token');
      temple.gmailAccessToken = updateDto.gmailAccessToken;
    }
    if (updateDto.gmailRefreshToken !== undefined) {
      console.log('[Temples Service] Updating Gmail refresh token');
      temple.gmailRefreshToken = updateDto.gmailRefreshToken;
    }
    if (updateDto.gmailEmail !== undefined) {
      console.log('[Temples Service] Updating Gmail email:', updateDto.gmailEmail);
      temple.gmailEmail = updateDto.gmailEmail;
    }
    
    if (isDisconnecting) {
      console.log('[Temples Service] Disconnecting Square for temple:', id);
      console.log('[Temples Service] Before update - Square fields:', {
        squareMerchantId: temple.squareMerchantId ? 'present' : 'null',
        squareAccessToken: temple.squareAccessToken ? 'present' : 'null',
      });
      
      // Explicitly set to null - TypeORM needs this
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
      // Normal update - assign all fields except Gmail (already handled above)
      const { gmailAccessToken, gmailRefreshToken, gmailEmail, ...otherFields } = updateDto;
      Object.assign(temple, otherFields);
    }
    
    // Use update() method to ensure null values are saved
    if (isDisconnecting) {
      console.log('[Temples Service] Executing update() with null values...');
      const updateResult = await this.templesRepository.update(id, {
        squareMerchantId: null,
        squareAccessToken: null,
        squareRefreshToken: null,
        squareLocationId: null,
      });
      console.log('[Temples Service] Update result:', updateResult);
      
      // Use query builder to get fresh data (bypass any cache)
      const saved = await this.templesRepository
        .createQueryBuilder('temple')
        .where('temple.id = :id', { id })
        .getOne();
      
      if (!saved) {
        throw new NotFoundException(`Temple with ID ${id} not found`);
      }
      
      console.log('[Temples Service] After save - Square fields:', {
        squareMerchantId: saved.squareMerchantId ? 'present' : 'null',
        squareAccessToken: saved.squareAccessToken ? 'present' : 'null',
        squareLocationId: saved.squareLocationId ? 'present' : 'null',
      });
      console.log('[Temples Service] Temple updated, Square connected:', !!saved.squareAccessToken);
      return saved;
    } else {
      console.log('[Temples Service] Saving temple with all updates...');
      const saved = await this.templesRepository.save(temple);
      console.log('[Temples Service] Temple saved, Gmail email:', saved.gmailEmail);
      console.log('[Temples Service] Gmail connected:', !!saved.gmailAccessToken);
      return saved;
    }
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

