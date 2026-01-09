import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalSettings } from './entities/global-settings.entity';

@Injectable()
export class GlobalSettingsService {
  constructor(
    @InjectRepository(GlobalSettings)
    private globalSettingsRepository: Repository<GlobalSettings>,
  ) {}

  async getSettings(): Promise<GlobalSettings> {
    let settings = await this.globalSettingsRepository.findOne({
      where: { key: 'global' },
    });

    if (!settings) {
      // Create default settings if none exist
      settings = this.globalSettingsRepository.create({
        key: 'global',
        kioskTheme: null,
      });
      settings = await this.globalSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateKioskTheme(kioskTheme: any): Promise<GlobalSettings> {
    let settings = await this.globalSettingsRepository.findOne({
      where: { key: 'global' },
    });

    console.log('[Global Settings] Updating kiosk theme');
    console.log('[Global Settings] Existing theme keys:', settings?.kioskTheme ? Object.keys(settings.kioskTheme) : 'none');
    console.log('[Global Settings] New theme keys:', kioskTheme ? Object.keys(kioskTheme) : 'none');

    if (!settings) {
      settings = this.globalSettingsRepository.create({
        key: 'global',
        kioskTheme,
      });
    } else {
      // Deep merge kioskTheme to preserve existing nested properties
      // This prevents losing theme properties when only one field is updated
      const existingTheme = settings.kioskTheme || {};
      
      // Helper function to deep merge objects, skipping undefined values and preserving existing values
      const deepMerge = (target: any, source: any): any => {
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
          return source !== undefined ? source : target;
        }
        if (!target || typeof target !== 'object' || Array.isArray(target)) {
          return source || target;
        }
        const result = { ...target };
        for (const key in source) {
          if (source[key] !== undefined && source[key] !== null) {
            if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
              result[key] = deepMerge(result[key] || {}, source[key]);
            } else {
              result[key] = source[key];
            }
          }
          // If source[key] is undefined or null, keep existing value (don't overwrite)
        }
        return result;
      };
      
      // Deep merge the theme, preserving all existing properties
      const mergedTheme = deepMerge(existingTheme, kioskTheme || {});
      console.log('[Global Settings] Merged theme keys:', Object.keys(mergedTheme));
      settings.kioskTheme = mergedTheme;
    }

    const saved = await this.globalSettingsRepository.save(settings);
    console.log('[Global Settings] Theme saved successfully');
    return saved;
  }
}

