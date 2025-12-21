import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donor } from './entities/donor.entity';

@Injectable()
export class DonorsService {
  constructor(
    @InjectRepository(Donor)
    private donorsRepository: Repository<Donor>,
  ) {}

  /**
   * Find or create a donor based on phone number and temple
   * Updates donor information if it exists, creates new if it doesn't
   */
  async findOrCreateDonor(
    templeId: string,
    phone: string,
    name?: string,
    email?: string,
    address?: string,
  ): Promise<Donor> {
    if (!phone || !phone.trim()) {
      return null;
    }

    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phone.replace(/\D/g, '');

    let donor = await this.donorsRepository.findOne({
      where: { templeId, phone: normalizedPhone },
    });

    if (donor) {
      // Update existing donor information
      if (name && name.trim()) donor.name = name.trim();
      if (email && email.trim()) donor.email = email.trim();
      if (address && address.trim()) donor.address = address.trim();
      await this.donorsRepository.save(donor);
    } else {
      // Create new donor
      donor = this.donorsRepository.create({
        templeId,
        phone: normalizedPhone,
        name: name?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        totalDonations: 0,
        totalAmount: 0,
      });
      donor = await this.donorsRepository.save(donor);
    }

    return donor;
  }

  /**
   * Update donor statistics after a donation
   */
  async updateDonorStats(
    templeId: string,
    phone: string,
    amount: number,
    donationDate: Date,
  ): Promise<void> {
    if (!phone || !phone.trim()) {
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    const donor = await this.donorsRepository.findOne({
      where: { templeId, phone: normalizedPhone },
    });

    if (donor) {
      donor.totalDonations += 1;
      donor.totalAmount = (Number(donor.totalAmount) || 0) + amount;
      if (!donor.lastDonationDate || donationDate > donor.lastDonationDate) {
        donor.lastDonationDate = donationDate;
      }
      await this.donorsRepository.save(donor);
    }
  }

  /**
   * Get donor by phone number (for auto-populate on kiosk)
   */
  async getDonorByPhone(templeId: string, phone: string): Promise<Donor | null> {
    if (!phone || !phone.trim()) {
      return null;
    }

    const normalizedPhone = phone.replace(/\D/g, '');
    return this.donorsRepository.findOne({
      where: { templeId, phone: normalizedPhone },
    });
  }

  /**
   * Get all donors for a temple
   */
  async getDonorsByTemple(
    templeId: string,
    page: number = 1,
    limit: number = 50,
    search?: string,
  ): Promise<{ donors: Donor[]; total: number }> {
    const queryBuilder = this.donorsRepository
      .createQueryBuilder('donor')
      .where('donor.templeId = :templeId', { templeId })
      .orderBy('donor.lastDonationDate', 'DESC')
      .addOrderBy('donor.createdAt', 'DESC');

    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      queryBuilder.andWhere(
        '(donor.name ILIKE :search OR donor.phone ILIKE :search OR donor.email ILIKE :search)',
        { search: searchTerm },
      );
    }

    const [donors, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { donors, total };
  }

  /**
   * Update donor information
   */
  async updateDonor(
    donorId: string,
    updates: {
      name?: string;
      email?: string;
      address?: string;
      phone?: string;
    },
  ): Promise<Donor> {
    const donor = await this.donorsRepository.findOne({
      where: { id: donorId },
    });

    if (!donor) {
      throw new Error('Donor not found');
    }

    if (updates.name !== undefined) donor.name = updates.name?.trim() || null;
    if (updates.email !== undefined) donor.email = updates.email?.trim() || null;
    if (updates.address !== undefined) donor.address = updates.address?.trim() || null;
    if (updates.phone !== undefined) {
      donor.phone = updates.phone.replace(/\D/g, '');
    }

    return this.donorsRepository.save(donor);
  }

  /**
   * Delete a donor
   */
  async deleteDonor(donorId: string): Promise<void> {
    await this.donorsRepository.delete(donorId);
  }
}

