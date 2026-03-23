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
   * Get donor by ID
   */
  async getDonorById(donorId: string): Promise<Donor | null> {
    return this.donorsRepository.findOne({
      where: { id: donorId },
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
    user?: { role: string; templeId?: string },
  ): Promise<Donor> {
    const donor = await this.donorsRepository.findOne({
      where: { id: donorId },
    });

    if (!donor) {
      throw new Error('Donor not found');
    }

    // Temple Admin: only donors in their temple
    if (user?.role === 'TEMPLE_ADMIN' && user.templeId && donor.templeId !== user.templeId) {
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
  async deleteDonor(donorId: string, user?: { role: string; templeId?: string }): Promise<void> {
    if (user?.role === 'TEMPLE_ADMIN' && user.templeId) {
      const donor = await this.donorsRepository.findOne({ where: { id: donorId } });
      if (!donor || donor.templeId !== user.templeId) {
        throw new Error('Donor not found');
      }
    }
    await this.donorsRepository.delete(donorId);
  }

  /**
   * Backfill donors from past donations
   * Creates donor records for all successful donations that have a phone number
   */
  async backfillDonorsFromDonations(
    donationsRepository: Repository<any>,
    templeId?: string,
  ): Promise<{ created: number; updated: number; errors: number }> {
    let created = 0;
    let updated = 0;
    let errors = 0;

    const queryBuilder = donationsRepository
      .createQueryBuilder('donation')
      .where('donation.donorPhone IS NOT NULL')
      .andWhere("donation.donorPhone != ''")
      .andWhere('donation.status = :status', { status: 'SUCCEEDED' });

    if (templeId) {
      queryBuilder.andWhere('donation.templeId = :templeId', { templeId });
    }

    const donations = await queryBuilder.getMany();

    for (const donation of donations) {
      try {
        const normalizedPhone = donation.donorPhone.replace(/\D/g, '');
        if (!normalizedPhone) continue;

        let donor = await this.donorsRepository.findOne({
          where: { templeId: donation.templeId, phone: normalizedPhone },
        });

        if (!donor) {
          // Create new donor
          donor = this.donorsRepository.create({
            templeId: donation.templeId,
            phone: normalizedPhone,
            name: donation.donorName?.trim() || null,
            email: donation.donorEmail?.trim() || null,
            address: donation.donorAddress?.trim() || null,
            totalDonations: 0,
            totalAmount: 0,
          });
          created++;
        } else {
          // Update existing donor info if missing
          if (!donor.name && donation.donorName) donor.name = donation.donorName.trim();
          if (!donor.email && donation.donorEmail) donor.email = donation.donorEmail.trim();
          if (!donor.address && donation.donorAddress) donor.address = donation.donorAddress.trim();
          updated++;
        }

        // Update stats
        donor.totalDonations += 1;
        donor.totalAmount = (Number(donor.totalAmount) || 0) + Number(donation.amount);
        if (!donor.lastDonationDate || donation.createdAt > donor.lastDonationDate) {
          donor.lastDonationDate = donation.createdAt;
        }

        await this.donorsRepository.save(donor);
      } catch (error) {
        console.error(`[DonorsService] Error backfilling donor for donation ${donation.id}:`, error);
        errors++;
      }
    }

    return { created, updated, errors };
  }
}

