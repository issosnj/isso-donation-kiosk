import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    try {
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

      const result = await query.getMany();
      return result || [];
    } catch (error) {
      console.error('Error in findAll donations:', error);
      // Return empty array instead of throwing to prevent 500 errors
      return [];
    }
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
    try {
      console.log('[Donations Service] getStats called with:', { templeId, startDate, endDate });

      // Build query builder for more control
      const queryBuilder = this.donationsRepository.createQueryBuilder('donation')
        .where('donation.status = :status', { status: DonationStatus.SUCCEEDED });

      // Add temple filter if provided
      if (templeId) {
        queryBuilder.andWhere('donation.templeId = :templeId', { templeId });
      }

      // Add date filter if both dates are provided and valid
      if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        queryBuilder.andWhere('donation.createdAt BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      // Get all succeeded donations matching criteria
      const donations = await queryBuilder
        .select(['donation.amount'])
        .getMany();

      console.log('[Donations Service] Found donations:', donations.length);

      // Calculate total and count in JavaScript
      const count = donations.length;
      let totalAmount = 0;

      for (const donation of donations) {
        if (donation.amount != null) {
          const amount = typeof donation.amount === 'string' 
            ? parseFloat(donation.amount) 
            : Number(donation.amount);
          if (!isNaN(amount) && isFinite(amount)) {
            totalAmount += amount;
          }
        }
      }

      console.log('[Donations Service] Returning stats:', { total: totalAmount, count });

      return {
        total: Math.round(totalAmount * 100) / 100, // Round to 2 decimal places
        count: count || 0,
      };
    } catch (error: any) {
      console.error('[Donations Service] Error in getStats:', error);
      console.error('[Donations Service] Error message:', error?.message);
      console.error('[Donations Service] Error stack:', error?.stack);
      console.error('[Donations Service] Error details:', {
        templeId,
        startDate,
        endDate,
        errorName: error?.name,
        errorCode: error?.code,
      });
      
      // Return default stats instead of throwing
      return {
        total: 0,
        count: 0,
      };
    }
  }
}

