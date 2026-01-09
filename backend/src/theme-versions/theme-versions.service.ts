import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThemeVersion } from './entities/theme-version.entity';
import { DefaultPosition } from './entities/default-position.entity';

@Injectable()
export class ThemeVersionsService {
  constructor(
    @InjectRepository(ThemeVersion)
    private themeVersionsRepository: Repository<ThemeVersion>,
    @InjectRepository(DefaultPosition)
    private defaultPositionsRepository: Repository<DefaultPosition>,
  ) {}

  /**
   * Get all theme versions, ordered by version (descending)
   */
  async getThemeVersions(limit: number = 50): Promise<ThemeVersion[]> {
    return this.themeVersionsRepository.find({
      order: { version: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  /**
   * Get a specific theme version by ID
   */
  async getThemeVersion(id: string): Promise<ThemeVersion> {
    const version = await this.themeVersionsRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!version) {
      throw new NotFoundException(`Theme version with ID ${id} not found`);
    }

    return version;
  }

  /**
   * Get the latest theme version
   */
  async getLatestThemeVersion(): Promise<ThemeVersion | null> {
    return this.themeVersionsRepository.findOne({
      order: { version: 'DESC' },
      relations: ['user'],
    });
  }

  /**
   * Create a new theme version (backup)
   */
  async createThemeVersion(
    kioskTheme: any,
    createdBy?: string,
    description?: string,
    isAutomatic: boolean = false,
  ): Promise<ThemeVersion> {
    const version = this.themeVersionsRepository.create({
      kioskTheme,
      createdBy,
      description,
      isAutomatic,
    });

    return this.themeVersionsRepository.save(version);
  }

  /**
   * Restore a theme version by applying it to global settings
   */
  async restoreThemeVersion(id: string, restoredBy?: string): Promise<any> {
    const version = await this.getThemeVersion(id);
    
    // Create a new version entry for the restore action
    const restoreVersion = this.themeVersionsRepository.create({
      kioskTheme: version.kioskTheme,
      createdBy: restoredBy,
      description: `Restored from version ${version.version} (created ${version.createdAt.toISOString()})`,
      isAutomatic: false,
    });

    await this.themeVersionsRepository.save(restoreVersion);
    
    return version.kioskTheme;
  }

  /**
   * Delete a theme version (keep for history, but mark as deleted)
   * Actually, we'll keep all versions for full history
   */
  async deleteThemeVersion(id: string): Promise<void> {
    const version = await this.getThemeVersion(id);
    await this.themeVersionsRepository.remove(version);
  }

  /**
   * Get default positions for all elements
   */
  async getDefaultPositions(): Promise<DefaultPosition[]> {
    return this.defaultPositionsRepository.find({
      where: { isDefault: true },
      order: { screenType: 'ASC', elementType: 'ASC' },
      relations: ['creator', 'updater'],
    });
  }

  /**
   * Get default position for a specific element
   */
  async getDefaultPosition(
    elementType: string,
    screenType: string,
  ): Promise<DefaultPosition | null> {
    return this.defaultPositionsRepository.findOne({
      where: { elementType, screenType, isDefault: true },
      relations: ['creator', 'updater'],
    });
  }

  /**
   * Set or update default position for an element
   */
  async setDefaultPosition(
    elementType: string,
    screenType: string,
    position: any,
    metadata?: any,
    userId?: string,
  ): Promise<DefaultPosition> {
    const existing = await this.defaultPositionsRepository.findOne({
      where: { elementType, screenType },
    });

    if (existing) {
      existing.position = position;
      existing.metadata = metadata || existing.metadata;
      existing.updatedBy = userId;
      existing.isDefault = true;
      existing.updatedAt = new Date();
      return this.defaultPositionsRepository.save(existing);
    } else {
      const newPosition = this.defaultPositionsRepository.create({
        elementType,
        screenType,
        position,
        metadata,
        createdBy: userId,
        updatedBy: userId,
        isDefault: true,
      });
      return this.defaultPositionsRepository.save(newPosition);
    }
  }

  /**
   * Delete default position
   */
  async deleteDefaultPosition(
    elementType: string,
    screenType: string,
  ): Promise<void> {
    const position = await this.defaultPositionsRepository.findOne({
      where: { elementType, screenType },
    });

    if (position) {
      await this.defaultPositionsRepository.remove(position);
    }
  }

  /**
   * Get default positions for a specific screen type
   */
  async getDefaultPositionsByScreenType(
    screenType: string,
  ): Promise<DefaultPosition[]> {
    return this.defaultPositionsRepository.find({
      where: { screenType, isDefault: true },
      relations: ['creator', 'updater'],
    });
  }

  /**
   * Apply default positions to a theme layout
   */
  async applyDefaultPositionsToTheme(theme: any): Promise<any> {
    if (!theme.layout) {
      theme.layout = {};
    }

    const defaultPositions = await this.getDefaultPositions();

    for (const defaultPos of defaultPositions) {
      // Map element types to theme layout properties
      const positionKey = `${defaultPos.elementType}X`;
      const positionKeyY = `${defaultPos.elementType}Y`;
      
      // Apply X and Y positions if they exist
      if (defaultPos.position.x !== undefined) {
        theme.layout[positionKey] = defaultPos.position.x;
      }
      if (defaultPos.position.y !== undefined) {
        theme.layout[positionKeyY] = defaultPos.position.y;
      }

      // Apply width and height if they exist
      if (defaultPos.position.width !== undefined) {
        theme.layout[`${defaultPos.elementType}Width`] = defaultPos.position.width;
      }
      if (defaultPos.position.height !== undefined) {
        theme.layout[`${defaultPos.elementType}Height`] = defaultPos.position.height;
      }

      // Apply metadata properties if they exist
      if (defaultPos.metadata) {
        if (defaultPos.metadata.visibility !== undefined) {
          theme.layout[`${defaultPos.elementType}Visible`] = defaultPos.metadata.visibility;
        }
        if (defaultPos.metadata.alignment) {
          theme.layout[`${defaultPos.elementType}Alignment`] = defaultPos.metadata.alignment;
        }
      }
    }

    return theme;
  }
}

