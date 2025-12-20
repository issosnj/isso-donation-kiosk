import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation, DonationStatus } from './entities/donation.entity';
import { InitiateDonationDto } from './dto/initiate-donation.dto';
import { CompleteDonationDto } from './dto/complete-donation.dto';
import { TemplesService } from '../temples/temples.service';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private donationsRepository: Repository<Donation>,
    private templesService: TemplesService,
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
      relations: ['temple'],
    });
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    donation.squarePaymentId = completeDonationDto.squarePaymentId;
    donation.status = completeDonationDto.status;
    if (completeDonationDto.donorName) {
      donation.donorName = completeDonationDto.donorName;
    }
    if (completeDonationDto.donorPhone) {
      donation.donorPhone = completeDonationDto.donorPhone;
    }
    if (completeDonationDto.donorEmail) {
      donation.donorEmail = completeDonationDto.donorEmail;
    }

    // Generate receipt number if payment succeeded and temple has a code
    if (completeDonationDto.status === DonationStatus.SUCCEEDED && !donation.receiptNumber) {
      donation.receiptNumber = await this.generateReceiptNumber(donation.templeId);
    }

    const savedDonation = await this.donationsRepository.save(donation);

    // Send receipt email if email is provided and payment succeeded
    if (completeDonationDto.donorEmail && completeDonationDto.status === DonationStatus.SUCCEEDED) {
      try {
        await this.sendReceiptEmail(savedDonation);
      } catch (error) {
        console.error('[DonationsService] Failed to send receipt email:', error);
        // Don't fail the donation completion if email fails
      }
    }

    return savedDonation;
  }

  private async generateReceiptNumber(templeId: string): Promise<string> {
    // Get temple to access templeCode
    const temple = await this.templesService.findOne(templeId);
    if (!temple || !temple.templeCode) {
      // If no temple code, use temple ID first 4 chars
      const fallbackCode = templeId.substring(0, 4).toUpperCase();
      console.warn(`[DonationsService] Temple ${templeId} has no templeCode, using fallback: ${fallbackCode}`);
    }

    const templeCode = temple?.templeCode || templeId.substring(0, 4).toUpperCase();
    const pattern = `${templeCode} - K - %`;

    // Query donations with receipt numbers matching the pattern
    const donationsWithReceipts = await this.donationsRepository
      .createQueryBuilder('donation')
      .where('donation.templeId = :templeId', { templeId })
      .andWhere('donation.receiptNumber IS NOT NULL')
      .andWhere('donation.receiptNumber LIKE :pattern', { pattern })
      .orderBy('donation.createdAt', 'DESC')
      .getMany();

    let nextNumber = 1;
    if (donationsWithReceipts.length > 0) {
      // Extract the number from the last receipt number
      const lastReceiptNumber = donationsWithReceipts[0].receiptNumber;
      const match = lastReceiptNumber.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0], 10) + 1;
      }
    }

    // Format: TempleCode - K - 0001
    const receiptNumber = `${templeCode} - K - ${nextNumber.toString().padStart(4, '0')}`;
    console.log(`[DonationsService] Generated receipt number: ${receiptNumber} for temple ${templeId}`);
    return receiptNumber;
  }

  async cleanupPendingDonations(): Promise<{ deleted: number }> {
    const result = await this.donationsRepository.delete({
      status: DonationStatus.PENDING,
    });
    console.log(`[DonationsService] Deleted ${result.affected || 0} pending donations`);
    return { deleted: result.affected || 0 };
  }

  async generateReceiptNumbersForSuccessfulDonations(): Promise<{ updated: number }> {
    // Find all successful donations without receipt numbers
    const donations = await this.donationsRepository.find({
      where: {
        status: DonationStatus.SUCCEEDED,
        receiptNumber: null as any, // TypeORM workaround for IS NULL
      },
      relations: ['temple'],
    });

    // Group by temple to generate sequential numbers
    const donationsByTemple = new Map<string, typeof donations>();
    for (const donation of donations) {
      const templeId = donation.templeId;
      if (!donationsByTemple.has(templeId)) {
        donationsByTemple.set(templeId, []);
      }
      donationsByTemple.get(templeId)!.push(donation);
    }

    let totalUpdated = 0;

    // Process each temple's donations
    for (const [templeId, templeDonations] of donationsByTemple.entries()) {
      // Sort by creation date to maintain chronological order
      templeDonations.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Get existing receipt numbers for this temple to find the starting number
      const existingDonations = await this.donationsRepository
        .createQueryBuilder('donation')
        .where('donation.templeId = :templeId', { templeId })
        .andWhere('donation.receiptNumber IS NOT NULL')
        .andWhere('donation.status = :status', { status: DonationStatus.SUCCEEDED })
        .orderBy('donation.createdAt', 'ASC')
        .getMany();

      // Find the highest receipt number
      let nextNumber = 1;
      if (existingDonations.length > 0) {
        const temple = templeDonations[0].temple;
        const templeCode = temple?.templeCode || templeId.substring(0, 4).toUpperCase();
        const pattern = `${templeCode} - K - %`;
        
        const matchingReceipts = existingDonations.filter(d => 
          d.receiptNumber && d.receiptNumber.startsWith(templeCode + ' - K - ')
        );
        
        if (matchingReceipts.length > 0) {
          const lastReceipt = matchingReceipts[matchingReceipts.length - 1].receiptNumber;
          const match = lastReceipt?.match(/\d+$/);
          if (match) {
            nextNumber = parseInt(match[0], 10) + 1;
          }
        }
      }

      // Generate receipt numbers for each donation
      for (const donation of templeDonations) {
        const temple = donation.temple;
        const templeCode = temple?.templeCode || templeId.substring(0, 4).toUpperCase();
        const receiptNumber = `${templeCode} - K - ${nextNumber.toString().padStart(4, '0')}`;
        
        donation.receiptNumber = receiptNumber;
        await this.donationsRepository.save(donation);
        console.log(`[DonationsService] Generated receipt number ${receiptNumber} for donation ${donation.id}`);
        nextNumber++;
        totalUpdated++;
      }
    }

    console.log(`[DonationsService] Generated receipt numbers for ${totalUpdated} donations`);
    return { updated: totalUpdated };
  }

  async cancel(donationId: string): Promise<Donation> {
    const donation = await this.donationsRepository.findOne({
      where: { id: donationId },
    });
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    // Only allow canceling if still pending
    if (donation.status !== DonationStatus.PENDING) {
      throw new BadRequestException('Can only cancel pending donations');
    }

    donation.status = DonationStatus.CANCELED;
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

  async findOne(id: string, user?: any): Promise<Donation> {
    const donation = await this.donationsRepository.findOne({
      where: { id },
      relations: ['temple', 'device', 'category'],
    });
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${id} not found`);
    }
    
    // Verify user has access (if user provided)
    if (user && user.role === 'TEMPLE_ADMIN' && donation.templeId !== user.templeId) {
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

  async sendReceiptEmail(donation: Donation): Promise<void> {
    try {
      const temple = await this.templesService.findOne(donation.templeId);
      if (!temple || !donation.donorEmail) {
        return;
      }

      const receiptConfig = temple.receiptConfig || {};
      const fromEmail = receiptConfig.fromEmail || 'donations@temple.org';
      const fromName = receiptConfig.fromName || temple.name;
      const subject = receiptConfig.subject?.replace('{{templeName}}', temple.name) || `Donation Receipt - ${temple.name}`;
      const headerText = receiptConfig.headerText || 'Thank You for Your Donation';
      const footerText = receiptConfig.footerText || 'Your donation helps support our temple';
      const customMessage = receiptConfig.customMessage || '';

      // Build receipt HTML
      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4a5568; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f7fafc; padding: 30px; }
            .receipt-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .detail-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #4a5568; }
            .value { color: #2d3748; }
            .amount { font-size: 24px; font-weight: bold; color: #38a169; }
            .footer { text-align: center; padding: 20px; color: #718096; font-size: 14px; }
            ${receiptConfig.taxId ? '.tax-id { margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0; }' : ''}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${headerText}</h1>
            </div>
            <div class="content">
              ${donation.donorName ? `<p>Dear ${donation.donorName},</p>` : '<p>Dear Donor,</p>'}
              ${customMessage ? `<p>${customMessage}</p>` : ''}
              <div class="receipt-details">
                <h2>Donation Receipt</h2>
                <div class="detail-row">
                  <span class="label">Temple:</span>
                  <span class="value">${temple.name}</span>
                </div>
                ${temple.address ? `
                <div class="detail-row">
                  <span class="label">Address:</span>
                  <span class="value">${temple.address}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="label">Donation Date:</span>
                  <span class="value">${new Date(donation.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                ${donation.receiptNumber ? `
                <div class="detail-row">
                  <span class="label">Receipt Number:</span>
                  <span class="value" style="font-weight: bold; font-size: 18px; color: #2d3748;">${donation.receiptNumber}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="label">Donation ID:</span>
                  <span class="value">${donation.id}</span>
                </div>
                ${donation.category ? `
                <div class="detail-row">
                  <span class="label">Category:</span>
                  <span class="value">${donation.category.name}</span>
                </div>
                ` : ''}
                <div class="detail-row">
                  <span class="label">Amount:</span>
                  <span class="value amount">$${Number(donation.amount).toFixed(2)}</span>
                </div>
                ${receiptConfig.includeTaxId && receiptConfig.taxId ? `
                <div class="tax-id">
                  <div class="detail-row">
                    <span class="label">Tax ID (EIN):</span>
                    <span class="value">${receiptConfig.taxId}</span>
                  </div>
                </div>
                ` : ''}
              </div>
              <p>${footerText}</p>
            </div>
            <div class="footer">
              <p>This is an automated receipt. Please keep this for your records.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // For now, log the receipt email details
      // In production, integrate with an email service (SendGrid, AWS SES, nodemailer, etc.)
      console.log('[DonationsService] 📧 Receipt email would be sent:', {
        from: `${fromName} <${fromEmail}>`,
        to: donation.donorEmail,
        subject: subject,
        templeName: temple.name,
        amount: donation.amount,
        category: donation.category?.name || 'General Donation',
        donationId: donation.id,
        date: donation.createdAt,
        donorName: donation.donorName,
        donorPhone: donation.donorPhone,
        receiptConfig: receiptConfig,
      });

      // TODO: Implement actual email sending using nodemailer, SendGrid, or AWS SES
      // Example with nodemailer:
      // const transporter = nodemailer.createTransport({...});
      // await transporter.sendMail({
      //   from: `${fromName} <${fromEmail}>`,
      //   to: donation.donorEmail,
      //   subject: subject,
      //   html: receiptHtml
      // });
    } catch (error) {
      console.error('[DonationsService] Error sending receipt email:', error);
      // Don't throw - email failure shouldn't break donation completion
    }
  }
}

