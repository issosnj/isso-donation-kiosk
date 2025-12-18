import { Injectable, NotFoundException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Device, DeviceStatus } from './entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { ActivateDeviceDto } from './dto/activate-device.dto';
import { TemplesService } from '../temples/temples.service';
import { DonationCategoriesService } from '../donations/donation-categories.service';

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private devicesRepository: Repository<Device>,
    private jwtService: JwtService,
    private templesService: TemplesService,
    @Inject(forwardRef(() => DonationCategoriesService))
    private donationCategoriesService: DonationCategoriesService,
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

  async findOne(id: string): Promise<Device> {
    const device = await this.devicesRepository.findOne({
      where: { id },
      relations: ['temple'],
    });
    if (!device) {
      throw new NotFoundException(`Device with ID ${id} not found`);
    }
    return device;
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
    
    if (device.status !== DeviceStatus.PENDING) {
      throw new UnauthorizedException('Device already activated');
    }

    // Generate device token
    const deviceToken = this.jwtService.sign({
      deviceId: device.id,
      templeId: device.templeId,
      type: 'device',
    });

    device.deviceToken = deviceToken;
    device.status = DeviceStatus.ACTIVE;
    device.lastSeenAt = new Date();
    await this.devicesRepository.save(device);

    // Get temple config
    const temple = await this.templesService.findOne(device.templeId);
    const categories = await this.donationCategoriesService.findByTemple(
      device.templeId,
    );

    return {
      deviceToken,
      temple: {
        id: temple.id,
        name: temple.name,
        logoUrl: temple.logoUrl,
        branding: temple.branding,
        squareLocationId: temple.squareLocationId,
      },
      categories: categories
        .filter((cat) => cat.showOnKiosk && cat.isActive)
        .map((cat) => ({
          id: cat.id,
          name: cat.name,
        })),
    };
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    const device = await this.findOne(deviceId);
    device.lastSeenAt = new Date();
    await this.devicesRepository.save(device);
  }

  async remove(id: string): Promise<void> {
    const device = await this.findOne(id);
    await this.devicesRepository.remove(device);
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

