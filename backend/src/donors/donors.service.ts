import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Donor } from './entities/donor.entity';
import { DonationStatus } from '../donations/entities/donation.entity';
import { donationBelongsToDonorSql, canonicalDonorPhone, canonicalPhoneSql, roundMoney } from './donor-donation-match';

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

    const normalizedPhone = canonicalDonorPhone(phone);
    if (!normalizedPhone) {
      return null;
    }

    let donor = await this.findDonorByCanonicalPhone(templeId, normalizedPhone);

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

    const normalizedPhone = canonicalDonorPhone(phone);
    if (!normalizedPhone) {
      return;
    }
    const donor = await this.findDonorByCanonicalPhone(templeId, normalizedPhone);

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

    const normalizedPhone = canonicalDonorPhone(phone);
    if (!normalizedPhone) {
      return null;
    }
    return this.findDonorByCanonicalPhone(templeId, normalizedPhone);
  }

  private findDonorByCanonicalPhone(templeId: string, canonicalPhone: string): Promise<Donor | null> {
    return this.donorsRepository
      .createQueryBuilder('donor')
      .where('donor.templeId = :templeId', { templeId })
      .andWhere(`${canonicalPhoneSql('donor.phone')} = :phone`, { phone: canonicalPhone })
      .orderBy('donor.createdAt', 'ASC')
      .getOne();
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
    options?: {
      segment?: string;
      sort?: string;
      monthStart?: Date;
      vipIds?: string[];
    },
  ): Promise<{ donors: Donor[]; total: number }> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 500) : 50;

    let whereSql = `d."templeId" = $1::uuid`;
    let params: unknown[] = [templeId];

    if (search && search.trim()) {
      const matches = await this.donorsRepository
        .createQueryBuilder('donor')
        .select(['donor.id'])
        .where('donor.templeId = :templeId', { templeId })
        .andWhere(
          '(donor.name ILIKE :search OR donor.phone ILIKE :search OR donor.email ILIKE :search)',
          { search: `%${search.trim()}%` },
        )
        .getMany();
      if (matches.length === 0) {
        return { donors: [], total: 0 };
      }
      whereSql = `d.id IN (${matches.map((_, index) => `$${index + 1}::uuid`).join(', ')})`;
      params = matches.map((donor) => donor.id);
    }

    const ledger = this.sortDonorLedger(
      this.filterDonorLedger(await this.loadLedger(whereSql, params), options),
      options?.sort,
    );

    const total = ledger.length;
    const pageRows = ledger.slice((safePage - 1) * safeLimit, safePage * safeLimit);
    if (pageRows.length === 0) {
      return { donors: [], total };
    }

    const donors = await this.donorsRepository.find({
      where: { id: In(pageRows.map((row) => row.donorId)) },
      relations: ['temple'],
    });
    const order = new Map(pageRows.map((row, index) => [row.donorId, index]));
    donors.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    this.stampLedger(donors, pageRows);

    return { donors, total };
  }

  /**
   * Get donor stats for a temple (for CRM dashboard)
   */
  async getDonorStats(
    templeId: string,
    monthStart?: Date,
  ): Promise<{
    total: number;
    totalDonated: number;
    totalGifts: number;
    newThisMonth: number;
    firstGiftThisMonth: number;
    averageGiftsPerDonor: number;
    repeatCount: number;
    activeCount: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [ledger, newThisMonth] = await Promise.all([
      this.loadLedger(`d."templeId" = $1::uuid`, [templeId]),
      this.donorsRepository
        .createQueryBuilder('donor')
        .where('donor.templeId = :templeId', { templeId })
        .andWhere('donor.createdAt >= :startOfMonth', { startOfMonth })
        .getCount(),
    ]);

    let totalDonated = 0;
    let totalGifts = 0;
    let repeatCount = 0;
    let activeCount = 0;
    let donorsWithGifts = 0;
    let firstGiftThisMonth = 0;
    const monthBoundary =
      monthStart && !isNaN(monthStart.getTime())
        ? monthStart
        : new Date(now.getFullYear(), now.getMonth(), 1);

    for (const row of ledger) {
      const gifts = Number(row.giftCount) || 0;
      totalGifts += gifts;
      totalDonated = roundMoney(totalDonated + roundMoney(row.giftSum));
      if (gifts > 0) donorsWithGifts += 1;
      if (gifts > 1) repeatCount += 1;
      if (row.lastGift && new Date(row.lastGift) >= twelveMonthsAgo) activeCount += 1;
      if (row.firstGift && new Date(row.firstGift) >= monthBoundary) firstGiftThisMonth += 1;
    }

    return {
      total: ledger.length,
      totalDonated,
      totalGifts,
      newThisMonth,
      firstGiftThisMonth,
      averageGiftsPerDonor:
        donorsWithGifts > 0 ? Math.round((totalGifts / donorsWithGifts) * 10) / 10 : 0,
      repeatCount,
      activeCount,
    };
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
      donor.phone = canonicalDonorPhone(updates.phone);
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
   * Creates donor records for all successful donations that have a phone number.
   * Resets donor stats before recalculating so running multiple times does not double-count.
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

    // Reset stats for donors we're about to update (prevents double-counting when backfill runs multiple times)
    const donorKeys = new Set<string>();
    for (const d of donations) {
      const normalized = d.donorPhone?.replace(/\D/g, '');
      if (normalized) donorKeys.add(`${d.templeId}:${normalized}`);
    }
    for (const key of donorKeys) {
      const [tId, phone] = key.split(':');
      const donor = await this.donorsRepository.findOne({ where: { templeId: tId, phone } });
      if (donor) {
        donor.totalDonations = 0;
        donor.totalAmount = 0;
        donor.lastDonationDate = null;
        await this.donorsRepository.save(donor);
      }
    }

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

  /**
   * Replace stored running totals with succeeded-gift totals from the donation ledger.
   * Refunded, failed, pending, and canceled gifts are not included.
   * Each succeeded gift is counted for only one donor.
   */
  private stampLedger(
    donors: Donor[],
    rows: { donorId: string; giftCount: string; giftSum: string; lastGift: string | null }[],
  ): void {
    const byId = new Map(rows.map((row) => [row.donorId, row]));
    for (const donor of donors) {
      const row = byId.get(donor.id);
      if (!row) continue;
      donor.totalDonations = Number(row.giftCount) || 0;
      donor.totalAmount = roundMoney(row.giftSum);
      donor.lastDonationDate = row.lastGift ? new Date(row.lastGift) : null;
    }
  }

  private filterDonorLedger<T extends {
    donorId: string;
    name: string | null;
    giftCount: string;
    giftSum: string;
    lastGift: string | null;
    createdAt: string | null;
  }>(rows: T[], options?: { segment?: string; monthStart?: Date; vipIds?: string[] }): T[] {
    const segment = options?.segment || 'all';
    if (segment === 'all') return rows;

    const vipIds = new Set(options?.vipIds || []);
    const monthStart =
      options?.monthStart && !isNaN(options.monthStart.getTime())
        ? options.monthStart
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const inactiveBefore = new Date();
    inactiveBefore.setMonth(inactiveBefore.getMonth() - 12);

    return rows.filter((row) => {
      const gifts = Number(row.giftCount) || 0;
      const total = Number(row.giftSum) || 0;
      const last = row.lastGift ? new Date(row.lastGift) : null;
      switch (segment) {
        case 'vip':
          return total >= 1000 || vipIds.has(row.donorId);
        case 'recurring':
          return gifts > 1;
        case 'new':
          return !!row.createdAt && new Date(row.createdAt) >= monthStart;
        case 'inactive':
          return !last || last < inactiveBefore;
        case 'high_value':
          return total >= 500;
        case 'anonymous':
          return !row.name?.trim();
        default:
          return true;
      }
    });
  }

  private sortDonorLedger<T extends {
    name: string | null;
    phone: string | null;
    giftCount: string;
    giftSum: string;
    lastGift: string | null;
    createdAt: string | null;
  }>(rows: T[], sort?: string): T[] {
    const key = sort || 'last_donation';
    return [...rows].sort((a, b) => {
      switch (key) {
        case 'name':
          return (a.name || a.phone || '').localeCompare(b.name || b.phone || '', undefined, {
            sensitivity: 'base',
          });
        case 'total_amount':
          return (Number(b.giftSum) || 0) - (Number(a.giftSum) || 0);
        case 'donation_count':
          return (Number(b.giftCount) || 0) - (Number(a.giftCount) || 0);
        case 'created':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'last_donation':
        default: {
          const lastDiff = new Date(b.lastGift || 0).getTime() - new Date(a.lastGift || 0).getTime();
          if (lastDiff !== 0) return lastDiff;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
      }
    });
  }

  private loadLedger(
    whereSql: string,
    params: unknown[],
  ): Promise<
    {
      donorId: string;
      name: string | null;
      phone: string | null;
      giftCount: string;
      giftSum: string;
      lastGift: string | null;
      firstGift: string | null;
      createdAt: string | null;
    }[]
  > {
    const match = donationBelongsToDonorSql('dn', 'd');
    return this.donorsRepository.query(
      `
      SELECT
        d.id AS "donorId",
        d."createdAt" AS "createdAt",
        COUNT(dn.id)::int AS "giftCount",
        d.name AS "name",
        d.phone AS "phone",
        COALESCE(SUM(dn.amount - COALESCE(dn."refundedAmount", 0)), 0) AS "giftSum",
        MAX(dn."createdAt") AS "lastGift",
        MIN(dn."createdAt") AS "firstGift"
      FROM donors d
      LEFT JOIN donations dn
        ON dn."templeId" = d."templeId"
        AND dn.status = '${DonationStatus.SUCCEEDED}'
        AND ${match}
      WHERE ${whereSql}
      GROUP BY d.id, d."createdAt", d.name, d.phone
      `,
      params,
    );
  }
}

