import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DonationChangeRequest,
  DonationChangeRequestStatus,
  DonationChangeRequestType,
  DonorDisplaySnapshot,
} from './entities/donation-change-request.entity';
import { Donation, DonationStatus } from './entities/donation.entity';
import { CreateDonationChangeRequestDto, DonorDisplayProposedDto } from './dto/create-donation-change-request.dto';
import { DonationsService } from './donations.service';
import { DonorsService } from '../donors/donors.service';
import { AuditLog } from '../audit/entities/audit-log.entity';

function snapshotFromDonation(d: Donation): DonorDisplaySnapshot {
  return {
    donorName: d.donorName ?? null,
    donorPhone: d.donorPhone ?? null,
    donorEmail: d.donorEmail ?? null,
    donorAddress: d.donorAddress ?? null,
    donorId: d.donorId ?? null,
  };
}

function trimField(v: string | undefined): string | null | undefined {
  if (v === undefined) return undefined;
  const t = v.trim();
  return t === '' ? null : t;
}

function mergeProposed(
  previous: DonorDisplaySnapshot,
  proposed: DonorDisplayProposedDto,
): DonorDisplaySnapshot {
  return {
    donorName:
      proposed.donorName !== undefined ? trimField(proposed.donorName) ?? null : previous.donorName,
    donorPhone:
      proposed.donorPhone !== undefined ? trimField(proposed.donorPhone) ?? null : previous.donorPhone,
    donorEmail:
      proposed.donorEmail !== undefined ? trimField(proposed.donorEmail) ?? null : previous.donorEmail,
    donorAddress:
      proposed.donorAddress !== undefined
        ? trimField(proposed.donorAddress) ?? null
        : previous.donorAddress,
    donorId: proposed.donorId !== undefined ? proposed.donorId || null : previous.donorId,
  };
}

function snapshotsEqual(a: DonorDisplaySnapshot, b: DonorDisplaySnapshot): boolean {
  return (
    a.donorName === b.donorName &&
    a.donorPhone === b.donorPhone &&
    a.donorEmail === b.donorEmail &&
    a.donorAddress === b.donorAddress &&
    a.donorId === b.donorId
  );
}

@Injectable()
export class DonationChangeRequestsService {
  constructor(
    @InjectRepository(DonationChangeRequest)
    private readonly changeRequestRepository: Repository<DonationChangeRequest>,
    @InjectRepository(Donation)
    private readonly donationsRepository: Repository<Donation>,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    private readonly donationsService: DonationsService,
    private readonly donorsService: DonorsService,
  ) {}

  async create(dto: CreateDonationChangeRequestDto, user: { id: string; templeId?: string }): Promise<DonationChangeRequest> {
    if (!user.templeId) {
      throw new ForbiddenException('Temple admin context required');
    }

    const donation = await this.donationsService.findOne(dto.donationId, user);
    if (donation.templeId !== user.templeId) {
      throw new ForbiddenException('Donation does not belong to your temple');
    }
    if (donation.status !== DonationStatus.SUCCEEDED) {
      throw new BadRequestException('Change requests are only allowed for successful donations');
    }

    const pending = await this.changeRequestRepository.findOne({
      where: {
        donationId: donation.id,
        status: DonationChangeRequestStatus.PENDING,
        type: DonationChangeRequestType.DONOR_DISPLAY_CHANGE,
      },
    });
    if (pending) {
      throw new BadRequestException('A pending change request already exists for this donation');
    }

    const previousSnapshot = snapshotFromDonation(donation);
    const proposedSnapshot = mergeProposed(previousSnapshot, dto.proposed);

    if (snapshotsEqual(previousSnapshot, proposedSnapshot)) {
      throw new BadRequestException('Proposed values are unchanged from the current donation');
    }

    if (proposedSnapshot.donorId) {
      const donor = await this.donorsService.getDonorById(proposedSnapshot.donorId);
      if (!donor || donor.templeId !== donation.templeId) {
        throw new BadRequestException('Linked donor must belong to the same temple as the donation');
      }
    }

    const row = this.changeRequestRepository.create({
      templeId: donation.templeId,
      donationId: donation.id,
      type: DonationChangeRequestType.DONOR_DISPLAY_CHANGE,
      status: DonationChangeRequestStatus.PENDING,
      requestedByUserId: user.id,
      templeNote: dto.templeNote?.trim() || null,
      previousSnapshot,
      proposedSnapshot,
    });

    return this.changeRequestRepository.save(row);
  }

  async listForTemple(templeId: string): Promise<DonationChangeRequest[]> {
    return this.changeRequestRepository.find({
      where: { templeId },
      relations: ['donation', 'requestedByUser', 'reviewedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async listForMaster(filters: { status?: DonationChangeRequestStatus; templeId?: string }): Promise<DonationChangeRequest[]> {
    const qb = this.changeRequestRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.temple', 'temple')
      .leftJoinAndSelect('r.donation', 'donation')
      .leftJoinAndSelect('r.requestedByUser', 'requestedByUser')
      .leftJoinAndSelect('r.reviewedByUser', 'reviewedByUser')
      .orderBy('r.createdAt', 'ASC');

    if (filters.status) {
      qb.andWhere('r.status = :status', { status: filters.status });
    }
    if (filters.templeId) {
      qb.andWhere('r.templeId = :templeId', { templeId: filters.templeId });
    }

    return qb.getMany();
  }

  async approve(id: string, user: { id: string }): Promise<DonationChangeRequest> {
    const req = await this.changeRequestRepository.findOne({
      where: { id },
      relations: ['donation'],
    });
    if (!req) {
      throw new NotFoundException('Change request not found');
    }
    if (req.status !== DonationChangeRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    const donation = await this.donationsRepository.findOne({ where: { id: req.donationId } });
    if (!donation) {
      throw new NotFoundException('Donation no longer exists');
    }
    if (donation.status !== DonationStatus.SUCCEEDED) {
      throw new BadRequestException('Donation is no longer successful; cannot apply changes');
    }

    const p = req.proposedSnapshot;
    if (p.donorId) {
      const donor = await this.donorsService.getDonorById(p.donorId);
      if (!donor || donor.templeId !== donation.templeId) {
        throw new BadRequestException('Invalid donor for this donation');
      }
    }

    donation.donorName = p.donorName;
    donation.donorPhone = p.donorPhone;
    donation.donorEmail = p.donorEmail;
    donation.donorAddress = p.donorAddress;
    donation.donorId = p.donorId;
    donation.submittedAsAnonymous = false;

    await this.donationsRepository.save(donation);

    req.status = DonationChangeRequestStatus.APPROVED;
    req.reviewedByUserId = user.id;
    req.reviewedAt = new Date();
    req.reviewNote = null;
    await this.changeRequestRepository.save(req);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        userId: user.id,
        action: 'DONATION_CHANGE_REQUEST_APPROVED',
        metadata: {
          changeRequestId: req.id,
          donationId: donation.id,
          templeId: donation.templeId,
          previousSnapshot: req.previousSnapshot,
          proposedSnapshot: req.proposedSnapshot,
        },
      }),
    );

    const out = await this.changeRequestRepository.findOne({
      where: { id: req.id },
      relations: ['temple', 'donation', 'requestedByUser', 'reviewedByUser'],
    });
    if (!out) {
      throw new NotFoundException('Change request not found after approve');
    }
    return out;
  }

  async reject(id: string, reviewNote: string | undefined, user: { id: string }): Promise<DonationChangeRequest> {
    const req = await this.changeRequestRepository.findOne({ where: { id } });
    if (!req) {
      throw new NotFoundException('Change request not found');
    }
    if (req.status !== DonationChangeRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    req.status = DonationChangeRequestStatus.REJECTED;
    req.reviewedByUserId = user.id;
    req.reviewedAt = new Date();
    req.reviewNote = reviewNote?.trim() || null;
    await this.changeRequestRepository.save(req);

    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        userId: user.id,
        action: 'DONATION_CHANGE_REQUEST_REJECTED',
        metadata: {
          changeRequestId: req.id,
          donationId: req.donationId,
          reviewNote: req.reviewNote,
        },
      }),
    );

    const out = await this.changeRequestRepository.findOne({
      where: { id: req.id },
      relations: ['temple', 'donation', 'requestedByUser', 'reviewedByUser'],
    });
    if (!out) {
      throw new NotFoundException('Change request not found after reject');
    }
    return out;
  }

  async cancel(id: string, user: { id: string; templeId?: string }): Promise<DonationChangeRequest> {
    if (!user.templeId) {
      throw new ForbiddenException('Temple admin context required');
    }

    const req = await this.changeRequestRepository.findOne({ where: { id } });
    if (!req) {
      throw new NotFoundException('Change request not found');
    }
    if (req.templeId !== user.templeId) {
      throw new ForbiddenException('Not allowed to cancel this request');
    }
    if (req.status !== DonationChangeRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    req.status = DonationChangeRequestStatus.CANCELLED;
    req.reviewedAt = new Date();
    await this.changeRequestRepository.save(req);

    const out = await this.changeRequestRepository.findOne({
      where: { id: req.id },
      relations: ['donation', 'requestedByUser'],
    });
    if (!out) {
      throw new NotFoundException('Change request not found after cancel');
    }
    return out;
  }
}
