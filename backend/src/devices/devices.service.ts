import { Injectable, NotFoundException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { AppLogger } from '../common/logger/app-logger.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Device, DeviceStatus } from './entities/device.entity';
import { DeviceTelemetry } from './entities/device-telemetry.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ActivateDeviceDto } from './dto/activate-device.dto';
import { CreateDeviceTelemetryDto } from './dto/create-device-telemetry.dto';
import { TemplesService } from '../temples/temples.service';
import { DonationCategoriesService } from '../donations/donation-categories.service';
import { StripeService } from '../stripe/stripe.service';
import { GlobalSettingsService } from '../global-settings/global-settings.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    @InjectRepository(DeviceTelemetry)
    private telemetryRepository: Repository<DeviceTelemetry>,
    private jwtService: JwtService,
    private templesService: TemplesService,
    private globalSettingsService: GlobalSettingsService,
    private logger: AppLogger,
    @Inject(forwardRef(() => DonationCategoriesService))
    private donationCategoriesService: DonationCategoriesService,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
  ) {}

  async create(createDeviceDto: CreateDeviceDto): Promise<Device> {
    // Generate unique device code (8 characters, alphanumeric)
    const deviceCode = this.generateDeviceCode();
    
    const device = this.devicesRepository.create({
      ...createDeviceDto,
      deviceCode,
      status: DeviceStatus.PENDING,
    });

    return this.devicesRepository.save(device);
  }

  async findAll(templeId?: string): Promise<Device[]> {
    if (templeId) {
      return this.devicesRepository.find({
        where: { templeId },
        relations: ['temple'],
      });
    }
    return this.devicesRepository.find({
      relations: ['temple'],
    });
  }

  async findOne(id: string, user?: { role: string; templeId?: string }): Promise<Device> {
    const device = await this.devicesRepository.findOne({
      where: { id },
      relations: ['temple'],
    });
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    // Temple Admin: only devices in their temple
    if (user?.role === 'TEMPLE_ADMIN' && user.templeId && device.templeId !== user.templeId) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
  }

  async validateDeviceToken(deviceId: string, token: string): Promise<boolean> {
    const device = await this.devicesRepository.findOne({
      where: { id: deviceId },
      select: ['id', 'deviceToken'],
    });
    return device?.deviceToken === token;
  }

  async findByDeviceCode(deviceCode: string): Promise<Device> {
    const device = await this.devicesRepository.findOne({
      where: { deviceCode },
      relations: ['temple'],
    });
    if (!device) {
      throw new NotFoundException(`Device with code ${deviceCode} not found`);
    }
    return device;
  }

  async activate(activateDeviceDto: ActivateDeviceDto) {
    const device = await this.findByDeviceCode(activateDeviceDto.deviceCode);
    
    // Allow reactivation: devices can be activated if PENDING, ACTIVE, or INACTIVE
    // This allows reusing the same code when app is deleted or tablet is replaced
    if (!(device.status === DeviceStatus.PENDING ||
          device.status === DeviceStatus.ACTIVE ||
          device.status === DeviceStatus.INACTIVE)) {
      this.logger.warn('Device activation failed: invalid status', {
        deviceId: device.id,
        status: device.status,
      });
      throw new UnauthorizedException('Device cannot be activated');
    }

    this.logger.log('Device activated', {
      deviceId: device.id,
      templeId: device.templeId,
    });

    // Generate new device token (invalidate old token)
    const deviceToken = this.jwtService.sign({
      deviceId: device.id,
      templeId: device.templeId,
      type: 'device',
    });

    device.deviceToken = deviceToken;
    device.status = DeviceStatus.ACTIVE;
    device.lastSeenAt = new Date();
    await this.devicesRepository.save(device);

    // Get temple config and global kiosk behavior
    const temple = await this.templesService.findOne(device.templeId);
    const categories = await this.donationCategoriesService.findByTemple(
      device.templeId,
      true, // forKiosk = true to filter by date/time
    );
    const globalSettings = await this.globalSettingsService.getSettings();
    const showObservances = globalSettings.kioskBehavior?.showObservances ?? true;

    return {
      deviceToken,
      showObservances,
      temple: this.toKioskSafeTemple(temple),
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        defaultAmount: cat.defaultAmount,
      })),
    };
  }

  /**
   * Get kiosk runtime config for device-authenticated requests.
   * Returns only kiosk-safe fields; no admin-only or sensitive data.
   */
  async getKioskConfig(deviceId: string): Promise<{
    showObservances: boolean;
    temple: {
      id: string;
      name: string;
      address?: string;
      logoUrl?: string;
      branding?: any;
      squareLocationId?: string;
      homeScreenConfig?: any;
      kioskTheme?: any;
    };
  }> {
    const device = await this.findOne(deviceId);
    const temple = await this.templesService.findOne(device.templeId);
    const globalSettings = await this.globalSettingsService.getSettings();
    const showObservances = globalSettings.kioskBehavior?.showObservances ?? true;
    return {
      showObservances,
      temple: this.toKioskSafeTemple(temple),
    };
  }

  /** Kiosk-safe temple shape: excludes Square/Stripe/Gmail tokens, receiptConfig, etc. */
  private toKioskSafeTemple(temple: { id: string; name: string; address?: string; logoUrl?: string; branding?: any; squareLocationId?: string; homeScreenConfig?: any; kioskTheme?: any }) {
    return {
      id: temple.id,
      name: temple.name,
      address: temple.address,
      logoUrl: temple.logoUrl,
      branding: temple.branding,
      squareLocationId: temple.squareLocationId,
      homeScreenConfig: temple.homeScreenConfig || null,
      kioskTheme: temple.kioskTheme || null,
    };
  }

  async updateLastSeen(deviceId: string, user?: { role: string; templeId?: string } | null): Promise<void> {
    const device = await this.findOne(deviceId, user ?? undefined);
    device.lastSeenAt = new Date();
    await this.devicesRepository.save(device);
  }

  async remove(id: string, user?: { role: string; templeId?: string }): Promise<void> {
    const device = await this.findOne(id, user);
    await this.devicesRepository.remove(device);
  }

  async deactivate(id: string, user?: { role: string; templeId?: string }): Promise<Device> {
    const device = await this.findOne(id, user);
    device.status = DeviceStatus.INACTIVE;
    device.deviceToken = null; // Clear token to force reactivation
    return this.devicesRepository.save(device);
  }

  async reactivate(id: string, user?: { role: string; templeId?: string }): Promise<Device> {
    const device = await this.findOne(id, user);
    device.status = DeviceStatus.PENDING; // Set to pending so it can be activated again
    return this.devicesRepository.save(device);
  }

  async getSquareCredentials(deviceId: string): Promise<{
    accessToken: string;
    locationId: string;
  }> {
    try {
      console.log('[Devices Service] Getting Square credentials for device:', deviceId);
      const device = await this.findOne(deviceId);
      console.log('[Devices Service] Device found, templeId:', device.templeId);
      
      const temple = await this.templesService.findOne(device.templeId);
      console.log('[Devices Service] Temple found:', temple.name);
      console.log('[Devices Service] Square fields:', {
        squareAccessToken: temple.squareAccessToken ? 'present' : 'null/empty',
        squareLocationId: temple.squareLocationId ? 'present' : 'null/empty',
      });

      if (!temple.squareAccessToken) {
        console.log('[Devices Service] Square not connected - no access token');
        throw new Error('Square not connected for this temple. Please connect Square in the admin portal.');
      }

      if (!temple.squareLocationId) {
        console.log('[Devices Service] Square location not configured');
        throw new Error('Square location not configured for this temple.');
      }

      console.log('[Devices Service] Returning Square credentials');
      return {
        accessToken: temple.squareAccessToken,
        locationId: temple.squareLocationId,
      };
    } catch (error: any) {
      console.error('[Devices Service] Error getting Square credentials:', error);
      console.error('[Devices Service] Error stack:', error.stack);
      throw error;
    }
  }

  async getStripeCredentials(deviceId: string): Promise<{
    connectionToken: string;
    locationId: string;
  }> {
    try {
      console.log('[Devices Service] Getting Stripe credentials for device:', deviceId);
      const device = await this.findOne(deviceId);
      console.log('[Devices Service] Device found, templeId:', device.templeId);
      
      const temple = await this.templesService.findOne(device.templeId);
      console.log('[Devices Service] Temple found:', temple.name);
      console.log('[Devices Service] Stripe fields:', {
        stripeAccountId: temple.stripeAccountId ? 'present' : 'null/empty',
        stripePublishableKey: temple.stripePublishableKey ? 'present' : 'null/empty',
      });

      // Check if Stripe is configured
      // For direct accounts: stripePublishableKey is sufficient
      // For Connect accounts: stripeAccountId is also needed
      // Backend STRIPE_SECRET_KEY is required in environment
      if (!temple.stripePublishableKey) {
        console.log('[Devices Service] Stripe not connected - no publishable key');
        throw new Error('Stripe not connected for this temple. Please connect Stripe in the admin portal by adding your Stripe Publishable Key.');
      }

      const credentials = await this.stripeService.createConnectionToken(device.templeId);
      
      console.log('[Devices Service] Returning Stripe credentials (connection token + location ID)');
      return {
        connectionToken: credentials.secret,
        locationId: credentials.locationId,
      };
    } catch (error: any) {
      console.error('[Devices Service] Error getting Stripe credentials:', error);
      console.error('[Devices Service] Error stack:', error.stack);
      throw error;
    }
  }

  async createTelemetry(deviceId: string, telemetryDto: CreateDeviceTelemetryDto): Promise<DeviceTelemetry> {
    const device = await this.findOne(deviceId);
    
    const telemetry = this.telemetryRepository.create({
      deviceId: device.id,
      ...telemetryDto,
    });

    return this.telemetryRepository.save(telemetry);
  }

  async getTelemetry(deviceId: string, user?: { role: string; templeId?: string }, limit: number = 100): Promise<DeviceTelemetry[]> {
    await this.findOne(deviceId, user); // Validates access
    return this.telemetryRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getLatestTelemetry(deviceId: string, user?: { role: string; templeId?: string }): Promise<DeviceTelemetry | null> {
    await this.findOne(deviceId, user); // Validates access
    return this.telemetryRepository.findOne({
      where: { deviceId },
      order: { createdAt: 'DESC' },
    });
  }

  async getDeviceLogs(deviceId: string, user?: { role: string; templeId?: string }, limit: number = 1000): Promise<Array<{
    timestamp: string;
    category: string;
    message: string;
    level?: 'info' | 'warning' | 'error';
  }>> {
    await this.findOne(deviceId, user); // Validates access
    const telemetryRecords = await this.telemetryRepository.find({
      where: { deviceId },
      order: { createdAt: 'DESC' },
      take: limit,
      select: ['logs', 'createdAt'],
    });

    // Flatten all logs from all telemetry records
    const allLogs: Array<{
      timestamp: string;
      category: string;
      message: string;
      level?: 'info' | 'warning' | 'error';
    }> = [];

    for (const record of telemetryRecords) {
      if (record.logs && Array.isArray(record.logs)) {
        allLogs.push(...record.logs);
      }
    }

    // Sort by timestamp descending
    return allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  async cleanupOldTelemetry(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await this.telemetryRepository.delete({
      createdAt: LessThan(cutoffDate),
    });
  }

  private generateDeviceCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

