import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Donation, DonationStatus } from './entities/donation.entity';
import { InitiateDonationDto } from './dto/initiate-donation.dto';
import { CompleteDonationDto } from './dto/complete-donation.dto';
import { TemplesService } from '../temples/temples.service';
import { GmailService } from '../gmail/gmail.service';
import { SquareService } from '../square/square.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private donationsRepository: Repository<Donation>,
    private templesService: TemplesService,
    private gmailService: GmailService,
    @Inject(forwardRef(() => SquareService))
    private squareService: SquareService,
    private configService: ConfigService,
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
    
    // Automatically fetch Square fee and card information if not provided
    if (completeDonationDto.squarePaymentId && 
        (completeDonationDto.netAmount === undefined || 
         completeDonationDto.squareFee === undefined || 
         !completeDonationDto.cardLast4 || 
         !completeDonationDto.cardType)) {
      try {
        console.log('[DonationsService] Automatically fetching payment details from Square for payment:', completeDonationDto.squarePaymentId);
        const paymentDetails = await this.squareService.getPaymentDetails(
          donation.templeId,
          completeDonationDto.squarePaymentId,
        );
        
        // Use fetched data if not provided in DTO
        if (completeDonationDto.netAmount === undefined) {
          donation.netAmount = paymentDetails.netAmount;
        } else {
          donation.netAmount = completeDonationDto.netAmount;
        }
        
        if (completeDonationDto.squareFee === undefined) {
          donation.squareFee = paymentDetails.squareFee;
        } else {
          donation.squareFee = completeDonationDto.squareFee;
        }
        
        if (!completeDonationDto.cardLast4) {
          donation.cardLast4 = paymentDetails.cardLast4;
        } else {
          donation.cardLast4 = completeDonationDto.cardLast4;
        }
        
        if (!completeDonationDto.cardType) {
          donation.cardType = paymentDetails.cardType;
        } else {
          donation.cardType = completeDonationDto.cardType;
        }
        
        console.log('[DonationsService] Successfully fetched payment details:', {
          netAmount: donation.netAmount,
          squareFee: donation.squareFee,
          cardLast4: donation.cardLast4,
          cardType: donation.cardType,
        });
      } catch (error) {
        console.error('[DonationsService] Failed to automatically fetch payment details from Square:', error);
        // Fall back to provided values or defaults
        if (completeDonationDto.netAmount !== undefined) {
          donation.netAmount = completeDonationDto.netAmount;
        }
        if (completeDonationDto.squareFee !== undefined) {
          donation.squareFee = completeDonationDto.squareFee;
        }
        if (completeDonationDto.cardLast4) {
          donation.cardLast4 = completeDonationDto.cardLast4;
        }
        if (completeDonationDto.cardType) {
          donation.cardType = completeDonationDto.cardType;
        }
      }
    } else {
      // Use provided values
      if (completeDonationDto.netAmount !== undefined) {
        donation.netAmount = completeDonationDto.netAmount;
      }
      if (completeDonationDto.squareFee !== undefined) {
        donation.squareFee = completeDonationDto.squareFee;
      }
      if (completeDonationDto.cardLast4) {
        donation.cardLast4 = completeDonationDto.cardLast4;
      }
      if (completeDonationDto.cardType) {
        donation.cardType = completeDonationDto.cardType;
      }
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

  async backfillSquareFees(): Promise<{ updated: number; failed: number }> {
    // Find all successful donations with Square payment IDs but missing fee information
    const donations = await this.donationsRepository.find({
      where: {
        status: DonationStatus.SUCCEEDED,
      },
    });

    let updated = 0;
    let failed = 0;

    for (const donation of donations) {
      // Skip if already has fee information
      if (donation.squareFee !== null && donation.netAmount !== null && donation.squareFee !== undefined && donation.netAmount !== undefined) {
        continue;
      }

      // Skip if no Square payment ID
      if (!donation.squarePaymentId) {
        continue;
      }

      try {
        console.log(`[DonationsService] Backfilling fees for donation ${donation.id}, payment ${donation.squarePaymentId}`);
        const paymentDetails = await this.squareService.getPaymentDetails(
          donation.templeId,
          donation.squarePaymentId,
        );

        donation.netAmount = paymentDetails.netAmount;
        donation.squareFee = paymentDetails.squareFee;
        donation.cardLast4 = paymentDetails.cardLast4;
        donation.cardType = paymentDetails.cardType;

        await this.donationsRepository.save(donation);
        updated++;
        console.log(`[DonationsService] ✅ Successfully backfilled fees for donation ${donation.id}`);
      } catch (error) {
        console.error(`[DonationsService] ❌ Failed to backfill fees for donation ${donation.id}:`, error);
        failed++;
      }
    }

    return { updated, failed };
  }

  async generateReceiptNumbersForSuccessfulDonations(): Promise<{ updated: number }> {
    // Find all successful donations without receipt numbers using query builder
    const donations = await this.donationsRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.temple', 'temple')
      .where('donation.status = :status', { status: DonationStatus.SUCCEEDED })
      .andWhere('donation.receiptNumber IS NULL')
      .orderBy('donation.createdAt', 'ASC')
      .getMany();

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

    // Allow canceling if still pending or failed (user cancelled after failure)
    if (donation.status === DonationStatus.SUCCEEDED) {
      throw new BadRequestException('Cannot cancel a succeeded donation');
    }

    // If already canceled, just return it
    if (donation.status === DonationStatus.CANCELED) {
      return donation;
    }

    donation.status = DonationStatus.CANCELED;
    console.log(`[DonationsService] Canceling donation ${donationId}, previous status: ${donation.status}`);
    const saved = await this.donationsRepository.save(donation);
    console.log(`[DonationsService] Donation ${donationId} canceled successfully, new status: ${saved.status}`);
    return saved;
  }

  async createPledge(createPledgeDto: any): Promise<Donation> {
    // Generate unique pledge token
    const pledgeToken = crypto.randomUUID();
    
    // Calculate expiry date (30 days from now by default)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    
    // Generate payment link
    const baseUrl = this.configService.get<string>('FRONTEND_URL') || 
                   this.configService.get<string>('API_BASE_URL') || 
                   'https://isso-donation-kiosk-admin.netlify.app';
    const paymentLink = `${baseUrl}/pay-pledge/${pledgeToken}`;
    
    const donation = this.donationsRepository.create({
      templeId: createPledgeDto.templeId,
      deviceId: createPledgeDto.deviceId,
      categoryId: createPledgeDto.categoryId,
      amount: createPledgeDto.amount,
      currency: createPledgeDto.currency || 'USD',
      donorName: createPledgeDto.donorName,
      donorPhone: createPledgeDto.donorPhone,
      donorEmail: createPledgeDto.donorEmail,
      status: DonationStatus.PLEDGED,
      pledgeToken,
      pledgeExpiryDate: expiryDate,
      pledgePaymentLink: paymentLink,
    });
    
    return this.donationsRepository.save(donation);
  }

  async getPledgeByToken(token: string): Promise<Donation> {
    const donation = await this.donationsRepository.findOne({
      where: { pledgeToken: token },
      relations: ['temple', 'category'],
    });
    
    if (!donation) {
      throw new NotFoundException(`Pledge with token ${token} not found`);
    }
    
    if (donation.status !== DonationStatus.PLEDGED) {
      throw new BadRequestException('This pledge has already been paid or cancelled');
    }
    
    // Check if expired
    if (donation.pledgeExpiryDate && donation.pledgeExpiryDate < new Date()) {
      throw new BadRequestException('This pledge has expired');
    }
    
    return donation;
  }

  async payPledge(token: string, payPledgeDto: any): Promise<Donation> {
    const donation = await this.getPledgeByToken(token);
    
    // Update donation with payment information
    donation.squarePaymentId = payPledgeDto.squarePaymentId;
    donation.status = payPledgeDto.status;
    
    // Generate receipt number if payment succeeded
    if (payPledgeDto.status === DonationStatus.SUCCEEDED && !donation.receiptNumber) {
      donation.receiptNumber = await this.generateReceiptNumber(donation.templeId);
    }
    
    const savedDonation = await this.donationsRepository.save(donation);
    
    // Send receipt email if payment succeeded
    if (payPledgeDto.status === DonationStatus.SUCCEEDED && donation.donorEmail) {
      try {
        await this.sendReceiptEmail(savedDonation);
      } catch (error) {
        console.error('[DonationsService] Failed to send receipt email:', error);
      }
    }
    
    return savedDonation;
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

  // Simple encryption/decryption helpers (should match GmailController)
  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-32-characters-long!!', 'utf8');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-32-characters-long!!', 'utf8');
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async sendReceiptEmail(donation: Donation): Promise<void> {
    try {
      const temple = await this.templesService.findOne(donation.templeId);
      if (!temple || !donation.donorEmail) {
        return;
      }

      const receiptConfig = temple.receiptConfig || {};
      const fromEmail = receiptConfig.fromEmail || temple.gmailEmail || 'donations@temple.org';
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

      // Check if temple has Gmail connected
      if (temple.gmailAccessToken && temple.gmailEmail) {
        try {
          // Decrypt access token
          let accessToken = this.decrypt(temple.gmailAccessToken);
          
          // Try to send email, refresh token if needed
          try {
            await this.gmailService.sendEmail(
              accessToken,
              donation.donorEmail,
              subject,
              receiptHtml,
              temple.gmailEmail,
              fromName,
            );
            console.log('[DonationsService] ✅ Receipt email sent via Gmail');
            return;
          } catch (error: any) {
            // If token expired, try to refresh
            if (error.message?.includes('invalid_grant') || error.message?.includes('401') || error.message?.includes('invalid_token')) {
              console.log('[DonationsService] ⚠️ Access token expired, attempting refresh...');
              if (temple.gmailRefreshToken) {
                const refreshToken = this.decrypt(temple.gmailRefreshToken);
                accessToken = await this.gmailService.refreshAccessToken(refreshToken);
                
                // Update temple with new access token
                const encryptedToken = this.encrypt(accessToken);
                await this.templesService.update(temple.id, {
                  gmailAccessToken: encryptedToken,
                });
                
                // Retry sending email
                await this.gmailService.sendEmail(
                  accessToken,
                  donation.donorEmail,
                  subject,
                  receiptHtml,
                  temple.gmailEmail,
                  fromName,
                );
                console.log('[DonationsService] ✅ Receipt email sent via Gmail (after refresh)');
                return;
              }
            }
            throw error;
          }
        } catch (error) {
          console.error('[DonationsService] ❌ Failed to send email via Gmail:', error);
          // Fall through to log-only mode
        }
      }

      // Log email details (fallback if Gmail not connected or failed)
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
        gmailConnected: !!temple.gmailAccessToken,
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

