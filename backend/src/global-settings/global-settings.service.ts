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

    if (!settings) {
      settings = this.globalSettingsRepository.create({
        key: 'global',
        kioskTheme,
      });
    } else {
      settings.kioskTheme = kioskTheme;
    }

    return this.globalSettingsRepository.save(settings);
  }
}

