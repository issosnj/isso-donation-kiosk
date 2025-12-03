import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Donation, DonationStatus } from './entities/donation.entity';
import { InitiateDonationDto } from './dto/initiate-donation.dto';
import { CompleteDonationDto } from './dto/complete-donation.dto';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private donationsRepository: Repository<Donation>,
  ) {}

  async initiate(initiateDonationDto: InitiateDonationDto): Promise<Donation> {
    const donation = this.donationsRepository.create({
      ...initiateDonationDto,
      status: DonationStatus.PENDING,
    });
    return this.donationsRepository.save(donation);
  }

  async complete(
    donationId: string,
    completeDonationDto: CompleteDonationDto,
  ): Promise<Donation> {
    const donation = await this.donationsRepository.findOne({
      where: { id: donationId },
    });
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    donation.squarePaymentId = completeDonationDto.squarePaymentId;
    donation.status = completeDonationDto.status;
    if (completeDonationDto.donorName) {
      donation.donorName = completeDonationDto.donorName;
    }
    if (completeDonationDto.donorEmail) {
      donation.donorEmail = completeDonationDto.donorEmail;
    }

    return this.donationsRepository.save(donation);
  }

  async findAll(
    templeId?: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      categoryId?: string;
      status?: DonationStatus;
    },
  ): Promise<Donation[]> {
    const query = this.donationsRepository.createQueryBuilder('donation')
      .leftJoinAndSelect('donation.temple', 'temple')
      .leftJoinAndSelect('donation.device', 'device')
      .leftJoinAndSelect('donation.category', 'category');

    if (templeId) {
      query.where('donation.templeId = :templeId', { templeId });
    }

    if (filters?.startDate && filters?.endDate) {
      query.andWhere('donation.createdAt BETWEEN :startDate AND :endDate', {
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
    }

    if (filters?.categoryId) {
      query.andWhere('donation.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.status) {
      query.andWhere('donation.status = :status', { status: filters.status });
    }

    query.orderBy('donation.createdAt', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Donation> {
    const donation = await this.donationsRepository.findOne({
      where: { id },
      relations: ['temple', 'device', 'category'],
    });
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${id} not found`);
    }
    return donation;
  }

  async findBySquarePaymentId(
    squarePaymentId: string,
  ): Promise<Donation | null> {
    return this.donationsRepository.findOne({
      where: { squarePaymentId },
      relations: ['temple', 'device', 'category'],
    });
  }

  async updateStatus(
    donationId: string,
    status: DonationStatus,
  ): Promise<Donation> {
    const donation = await this.findOne(donationId);
    donation.status = status;
    return this.donationsRepository.save(donation);
  }

  async getStats(templeId?: string, startDate?: Date, endDate?: Date) {
    // Build base query conditions
    const baseQuery = this.donationsRepository
      .createQueryBuilder('donation')
      .where('donation.status = :status', { status: DonationStatus.SUCCEEDED });

    if (templeId) {
      baseQuery.andWhere('donation.templeId = :templeId', { templeId });
    }

    if (startDate && endDate) {
      baseQuery.andWhere('donation.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    // Get total amount
    const totalQuery = baseQuery.clone();
    const total = await totalQuery
      .select('SUM(donation.amount)', 'total')
      .getRawOne();

    // Get count
    const count = await baseQuery.getCount();

    return {
      total: parseFloat(total?.total || '0'),
      count,
    };
  }
}

