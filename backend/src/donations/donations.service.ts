import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { Donation, DonationStatus } from './entities/donation.entity';
import { InitiateDonationDto } from './dto/initiate-donation.dto';
import { CompleteDonationDto } from './dto/complete-donation.dto';
import { TemplesService } from '../temples/temples.service';
import { Temple } from '../temples/entities/temple.entity';
import { GmailService } from '../gmail/gmail.service';
import { StripeService } from '../stripe/stripe.service';
import { ReceiptPdfService } from './receipt-pdf.service';
import { ReceiptGeneratorService } from './receipt-generator.service';
import { DonorsService } from '../donors/donors.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DonationsService {
  constructor(
    @InjectRepository(Donation)
    private donationsRepository: Repository<Donation>,
    @InjectRepository(Temple)
    private templesRepository: Repository<Temple>,
    private templesService: TemplesService,
    private gmailService: GmailService,
    @Inject(forwardRef(() => StripeService))
    private stripeService: StripeService,
    private configService: ConfigService,
    private receiptPdfService: ReceiptPdfService,
    private receiptGeneratorService: ReceiptGeneratorService,
    private donorsService: DonorsService,
  ) {}

  async initiate(initiateDonationDto: InitiateDonationDto): Promise<Donation> {
    try {
      console.log('[DonationsService] Initiating donation with DTO:', {
        templeId: initiateDonationDto.templeId,
        deviceId: initiateDonationDto.deviceId,
        categoryId: initiateDonationDto.categoryId,
        amount: initiateDonationDto.amount,
        currency: initiateDonationDto.currency,
      });
      
      // Validate temple exists - use a simple query without relations for speed
      const templeLookupStart = Date.now();
      let templeExists = false;
      try {
        // Use a simple count query instead of loading full temple with relations
        const templeCount = await Promise.race([
          this.templesRepository.count({ where: { id: initiateDonationDto.templeId } }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Temple lookup timeout after 3 seconds')), 3000)
          )
        ]) as number;
        
        templeExists = templeCount > 0;
        const templeLookupTime = Date.now() - templeLookupStart;
        console.log(`[DonationsService] Temple validation completed in ${templeLookupTime}ms (exists: ${templeExists})`);
      } catch (lookupError) {
        console.error('[DonationsService] Temple validation failed:', lookupError);
        if (lookupError.message?.includes('timeout')) {
          throw new BadRequestException('Temple validation timed out. Please try again.');
        }
        throw lookupError;
      }
      
      if (!templeExists) {
        throw new NotFoundException(`Temple with ID ${initiateDonationDto.templeId} not found`);
      }
      
      console.log('[DonationsService] Temple validated successfully');

      if (initiateDonationDto.lineItems?.length) {
        const sum = initiateDonationDto.lineItems.reduce((acc, row) => acc + Number(row.amount), 0);
        const total = Number(initiateDonationDto.amount);
        if (Math.abs(sum - total) > 0.02) {
          throw new BadRequestException('Line item amounts must equal the donation total');
        }
      }

      const { lineItems: lineItemsDto, ...donationFields } = initiateDonationDto;
      const donation = this.donationsRepository.create({
        ...donationFields,
        lineItems: lineItemsDto?.length ? lineItemsDto : null,
        status: DonationStatus.PENDING,
      });
      
      console.log('[DonationsService] Created donation entity, saving to database...');
      
      // Save to database with timeout
      const saveStart = Date.now();
      let savedDonation;
      try {
        savedDonation = await Promise.race([
          this.donationsRepository.save(donation),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database save timeout after 5 seconds')), 5000)
          )
        ]) as any;
        const saveTime = Date.now() - saveStart;
        console.log(`[DonationsService] Database save completed in ${saveTime}ms`);
      } catch (saveError) {
        console.error('[DonationsService] Database save failed:', saveError);
        if (saveError.message?.includes('timeout')) {
          throw new BadRequestException('Database save timed out. Please try again.');
        }
        throw saveError;
      }
      
      console.log('[DonationsService] Donation saved successfully:', savedDonation.id);
      return savedDonation;
    } catch (error) {
      console.error('[DonationsService] Error in initiate:', error);
      console.error('[DonationsService] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      // Re-throw known exceptions
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      
      // Wrap unknown errors
      throw new BadRequestException(
        `Failed to initiate donation: ${error.message || 'Database error'}`
      );
    }
  }

  async complete(
    donationId: string,
    completeDonationDto: CompleteDonationDto,
    callerType?: 'device' | 'user',
  ): Promise<Donation> {
    const donation = await this.donationsRepository.findOne({
      where: { id: donationId },
      relations: ['temple'],
    });
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    // SECURITY: Never trust client-provided status for SUCCEEDED. Verify with Stripe API.
    if (completeDonationDto.status === DonationStatus.SUCCEEDED && completeDonationDto.stripePaymentIntentId) {
      const paymentDetails = await this.stripeService.getPaymentIntentDetails(
        donation.templeId,
        completeDonationDto.stripePaymentIntentId,
      );
      if (paymentDetails.status !== 'succeeded') {
        throw new BadRequestException(
          `Cannot complete donation as succeeded: payment status is '${paymentDetails.status}'. Verify payment with Stripe.`,
        );
      }
    }

    // Support both Square (legacy) and Stripe payment IDs
    if (completeDonationDto.squarePaymentId) {
      donation.squarePaymentId = completeDonationDto.squarePaymentId;
    }
    if (completeDonationDto.stripePaymentIntentId) {
      donation.stripePaymentIntentId = completeDonationDto.stripePaymentIntentId;
    }
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
    if (completeDonationDto.donorAddress) {
      donation.donorAddress = completeDonationDto.donorAddress;
    }
    
    // Automatically fetch payment details from payment provider API
    // Always fetch for SUCCEEDED donations with payment ID to ensure fees are always populated
    if (completeDonationDto.status === DonationStatus.SUCCEEDED) {
      // Handle Stripe payments
      if (completeDonationDto.stripePaymentIntentId) {
        try {
          console.log('[DonationsService] Automatically fetching payment details from Stripe for payment intent:', completeDonationDto.stripePaymentIntentId);
          const paymentDetails = await this.stripeService.getPaymentIntentDetails(
            donation.templeId,
            completeDonationDto.stripePaymentIntentId,
          );
          
          // Always use fetched data from Stripe (most accurate source)
          donation.netAmount = paymentDetails.netAmount;
          donation.stripeFee = paymentDetails.fee;
          donation.cardLast4 = paymentDetails.cardLast4 || null;
          donation.cardType = paymentDetails.cardBrand || null;
          
          console.log('[DonationsService] Successfully fetched payment details from Stripe:', {
            netAmount: donation.netAmount,
            stripeFee: donation.stripeFee,
            cardLast4: donation.cardLast4,
            cardType: donation.cardType,
          });
        } catch (error) {
          console.error('[DonationsService] Failed to automatically fetch payment details from Stripe:', error);
          // Fall back to provided values if fetch fails
          if (completeDonationDto.netAmount !== undefined) {
            donation.netAmount = completeDonationDto.netAmount;
          }
          if (completeDonationDto.stripeFee !== undefined) {
            donation.stripeFee = completeDonationDto.stripeFee;
          }
          if (completeDonationDto.cardLast4) {
            donation.cardLast4 = completeDonationDto.cardLast4;
          }
          if (completeDonationDto.cardType) {
            donation.cardType = completeDonationDto.cardType;
          }
        }
      }
      // Use provided values if no payment ID (fallback)
      else {
        if (completeDonationDto.netAmount !== undefined) {
          donation.netAmount = completeDonationDto.netAmount;
        }
        if (completeDonationDto.stripeFee !== undefined) {
          donation.stripeFee = completeDonationDto.stripeFee;
        }
        if (completeDonationDto.cardLast4) {
          donation.cardLast4 = completeDonationDto.cardLast4;
        }
        if (completeDonationDto.cardType) {
          donation.cardType = completeDonationDto.cardType;
        }
      }
    }
    
    // Clear fee information for non-succeeded donations (cancelled/failed)
    if (completeDonationDto.status !== DonationStatus.SUCCEEDED) {
      donation.netAmount = null;
      donation.stripeFee = null;
      donation.cardLast4 = null;
      donation.cardType = null;
    }

    // Generate receipt number if payment succeeded and temple has a code
    if (completeDonationDto.status === DonationStatus.SUCCEEDED && !donation.receiptNumber) {
      donation.receiptNumber = await this.generateReceiptNumber(donation.templeId);
    }

    const savedDonation = await this.donationsRepository.save(donation);
    
    // Update Stripe PaymentIntent metadata with receipt number if available
    if (savedDonation.status === DonationStatus.SUCCEEDED && 
        savedDonation.stripePaymentIntentId && 
        savedDonation.receiptNumber) {
      try {
        await this.stripeService.updatePaymentIntentMetadata(
          savedDonation.templeId,
          savedDonation.stripePaymentIntentId,
          {
            donationId: savedDonation.id,
            templeId: savedDonation.templeId,
            receiptNumber: savedDonation.receiptNumber,
          }
        );
        console.log(`[DonationsService] Added receipt number ${savedDonation.receiptNumber} to Stripe PaymentIntent ${savedDonation.stripePaymentIntentId}`);
      } catch (error) {
        console.warn(`[DonationsService] Failed to update PaymentIntent metadata with receipt number: ${error.message}`);
        // Don't fail donation completion if metadata update fails
      }
    }

    // Save/update donor information in Donor table if phone is provided (for both succeeded and other statuses to track all donors)
    if (completeDonationDto.donorPhone) {
      try {
        await this.donorsService.findOrCreateDonor(
          donation.templeId,
          completeDonationDto.donorPhone,
          completeDonationDto.donorName,
          completeDonationDto.donorEmail,
          completeDonationDto.donorAddress,
        );
        
        // Update donor statistics only for succeeded donations
        if (completeDonationDto.status === DonationStatus.SUCCEEDED) {
          await this.donorsService.updateDonorStats(
            donation.templeId,
            completeDonationDto.donorPhone,
            Number(donation.amount),
            new Date(),
          );
        }
      } catch (error) {
        console.error('[DonationsService] Failed to save donor information:', error);
        // Don't fail donation completion if donor save fails
      }
    }

    // Send receipt email if email is provided and payment succeeded
    if (completeDonationDto.donorEmail && completeDonationDto.status === DonationStatus.SUCCEEDED) {
      console.log('[DonationsService] 📧 Scheduling receipt email for donation:', savedDonation.id);
      // Don't await - send email asynchronously to not block donation completion
      this.sendReceiptEmail(savedDonation).catch((error) => {
        console.error('[DonationsService] ❌ Failed to send receipt email (async):', error);
        console.error('[DonationsService] ❌ Error stack:', error.stack);
        // Don't fail the donation completion if email fails
      });
    } else {
      if (!completeDonationDto.donorEmail) {
        console.log('[DonationsService] ⚠️ No donor email provided, skipping receipt email');
      }
      if (completeDonationDto.status !== DonationStatus.SUCCEEDED) {
        console.log('[DonationsService] ⚠️ Donation status is not SUCCEEDED, skipping receipt email');
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

  /**
   * Find all successful donations for a donor, matching by:
   * - Normalized phone (donorPhone with non-digits stripped) - handles +1, dashes, etc.
   * - donorId when provided (donations explicitly linked to donor entity)
   */
  async findByDonorPhone(
    phone: string,
    templeId?: string,
    donorId?: string,
  ): Promise<Donation[]> {
    const normalizedPhone = phone.replace(/\D/g, '');
    const queryBuilder = this.donationsRepository
      .createQueryBuilder('donation')
      .leftJoinAndSelect('donation.temple', 'temple')
      .leftJoinAndSelect('donation.category', 'category')
      .where('donation.status = :status', { status: DonationStatus.SUCCEEDED })
      .orderBy('donation.createdAt', 'DESC');

    // Match by donorId OR normalized phone (PostgreSQL: strip non-digits from donorPhone)
    if (donorId) {
      queryBuilder.andWhere(
        '(donation.donorId = :donorId OR REGEXP_REPLACE(COALESCE(donation.donorPhone, \'\'), \'[^0-9]\', \'\', \'g\') = :normalizedPhone)',
        { donorId, normalizedPhone },
      );
    } else {
      queryBuilder.andWhere(
        "REGEXP_REPLACE(COALESCE(donation.donorPhone, ''), '[^0-9]', '', 'g') = :normalizedPhone",
        { normalizedPhone },
      );
    }

    if (templeId) {
      queryBuilder.andWhere('donation.templeId = :templeId', { templeId });
    }

    return queryBuilder.getMany();
  }

  async backfillStripeFees(): Promise<{ updated: number; failed: number }> {
    // Find all successful donations with Stripe payment intent IDs but missing fee information
    const donations = await this.donationsRepository.find({
      where: {
        status: DonationStatus.SUCCEEDED,
        stripePaymentIntentId: Not(IsNull()),
      },
    });

    let updated = 0;
    let failed = 0;

    for (const donation of donations) {
      // Skip if no Stripe payment intent ID
      if (!donation.stripePaymentIntentId) {
        continue;
      }

      // Always backfill from Stripe to ensure accuracy
      // This ensures fees match what you see in Stripe Dashboard
      // Even if fee exists, refresh it from Stripe to catch any updates

      try {
        console.log(`[DonationsService] Backfilling Stripe fee for donation ${donation.id}`);
        const paymentDetails = await this.stripeService.getPaymentIntentDetails(
          donation.templeId,
          donation.stripePaymentIntentId,
        );
        
        donation.stripeFee = paymentDetails.fee;
        donation.netAmount = paymentDetails.netAmount;
        donation.cardLast4 = paymentDetails.cardLast4 || null;
        donation.cardType = paymentDetails.cardBrand || null;
        
        await this.donationsRepository.save(donation);
        updated++;
      } catch (error) {
        console.error(`[DonationsService] Failed to backfill fee for donation ${donation.id}:`, error);
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
        
        // Update Stripe PaymentIntent metadata with receipt number if available
        if (donation.stripePaymentIntentId) {
          try {
            await this.stripeService.updatePaymentIntentMetadata(
              donation.templeId,
              donation.stripePaymentIntentId,
              {
                donationId: donation.id,
                templeId: donation.templeId,
                receiptNumber: receiptNumber,
              }
            );
            console.log(`[DonationsService] Added receipt number ${receiptNumber} to Stripe PaymentIntent ${donation.stripePaymentIntentId}`);
          } catch (error) {
            console.warn(`[DonationsService] Failed to update PaymentIntent metadata with receipt number: ${error.message}`);
            // Don't fail receipt generation if metadata update fails
          }
        }
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
      relations: ['temple'],
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

    // Cancel PaymentIntent in Stripe if it exists and hasn't been confirmed
    if (donation.stripePaymentIntentId) {
      try {
        console.log(`[DonationsService] Canceling Stripe PaymentIntent: ${donation.stripePaymentIntentId}`);
        await this.stripeService.cancelPaymentIntent(
          donation.templeId,
          donation.stripePaymentIntentId,
        );
        console.log(`[DonationsService] Successfully canceled PaymentIntent in Stripe`);
      } catch (error) {
        // Log error but don't fail donation cancellation if PaymentIntent cancellation fails
        // (PaymentIntent might already be confirmed or canceled)
        console.warn(`[DonationsService] Failed to cancel PaymentIntent (may already be processed): ${error.message}`);
      }
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
      throw error;
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

  async findByStripePaymentIntentId(
    stripePaymentIntentId: string,
  ): Promise<Donation | null> {
    return this.donationsRepository.findOne({
      where: { stripePaymentIntentId },
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
    console.log('[Donations Service] getStats called with:', { templeId, startDate, endDate });

    const queryBuilder = this.donationsRepository
      .createQueryBuilder('donation')
      .where('donation.status = :status', { status: DonationStatus.SUCCEEDED });

    if (templeId) {
      queryBuilder.andWhere('donation.templeId = :templeId', { templeId });
    }

    if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      queryBuilder.andWhere('donation.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const raw = await queryBuilder
      .select('COALESCE(SUM(donation.amount), 0)', 'total')
      .addSelect('COUNT(donation.id)', 'count')
      .getRawOne<{ total: string | number | null; count: string | number | null }>();

    const totalAmount = raw?.total != null ? Number(raw.total) : 0;
    const count = raw?.count != null ? parseInt(String(raw.count), 10) : 0;

    console.log('[Donations Service] Returning stats (aggregated):', {
      total: totalAmount,
      count,
    });

    return {
      total: Math.round((Number.isFinite(totalAmount) ? totalAmount : 0) * 100) / 100,
      count: Number.isFinite(count) ? count : 0,
    };
  }

  /**
   * SQL aggregates for admin overview (trends + per-temple). Avoids loading full donation rows.
   */
  async getOverviewMetrics(
    templeId: string | undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    daily: { date: string; amount: number; count: number }[];
    byTemple: { templeId: string; templeName: string; total: number; count: number }[];
  }> {
    let dailyQb = this.donationsRepository
      .createQueryBuilder('donation')
      .where('donation.status = :status', { status: DonationStatus.SUCCEEDED })
      .andWhere('donation.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });

    if (templeId) {
      dailyQb = dailyQb.andWhere('donation.templeId = :templeId', { templeId });
    }

    const dailyRaw = await dailyQb
      .select(`TO_CHAR(DATE_TRUNC('day', donation.createdAt), 'YYYY-MM-DD')`, 'date')
      .addSelect('COALESCE(SUM(donation.amount), 0)', 'total')
      .addSelect('COUNT(donation.id)', 'count')
      .groupBy(`DATE_TRUNC('day', donation.createdAt)`)
      .orderBy(`DATE_TRUNC('day', donation.createdAt)`, 'ASC')
      .getRawMany();

    let templeQb = this.donationsRepository
      .createQueryBuilder('donation')
      .leftJoin('donation.temple', 'temple')
      .where('donation.status = :status', { status: DonationStatus.SUCCEEDED })
      .andWhere('donation.createdAt BETWEEN :start AND :end', {
        start: startDate,
        end: endDate,
      });

    if (templeId) {
      templeQb = templeQb.andWhere('donation.templeId = :templeId', { templeId });
    }

    const templeRaw = await templeQb
      .select('donation.templeId', 'templeId')
      .addSelect('COALESCE(MAX(temple.name), :unk)', 'templeName')
      .setParameter('unk', 'Unknown')
      .addSelect('COALESCE(SUM(donation.amount), 0)', 'total')
      .addSelect('COUNT(donation.id)', 'count')
      .groupBy('donation.templeId')
      .orderBy('SUM(donation.amount)', 'DESC')
      .getRawMany();

    const daily = (dailyRaw as any[]).map((row) => ({
      date: String(row.date ?? ''),
      amount: Math.round(Number(row.total) * 100) / 100,
      count: parseInt(String(row.count), 10) || 0,
    }));

    const byTemple = (templeRaw as any[]).map((row) => ({
      templeId: String(row.templeId ?? 'unknown'),
      templeName: String(row.templeName ?? 'Unknown'),
      total: Math.round(Number(row.total) * 100) / 100,
      count: parseInt(String(row.count), 10) || 0,
    }));

    return { daily, byTemple };
  }

  // Simple encryption/decryption helpers (should match GmailController)
  // Key derivation function - ensures we always have exactly 32 bytes for AES-256
  private getKey(): Buffer {
    const keyString = this.configService.get<string>('ENCRYPTION_KEY') || 'default-key-32-characters-long!!';
    
    // If it's a hex string, parse it
    if (/^[0-9a-fA-F]+$/.test(keyString)) {
      // Hex string - convert to buffer
      const hexKey = Buffer.from(keyString, 'hex');
      // AES-256-CBC requires exactly 32 bytes
      if (hexKey.length === 32) {
        return hexKey;
      } else if (hexKey.length < 32) {
        // Pad with zeros if too short
        const padded = Buffer.alloc(32);
        hexKey.copy(padded);
        return padded;
      } else {
        // Truncate if too long
        return hexKey.slice(0, 32);
      }
    }
    
    // For non-hex strings, use SHA-256 to derive exactly 32 bytes
    return crypto.createHash('sha256').update(keyString).digest();
  }

  private encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = this.getKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  private decrypt(encryptedText: string): string {
    try {
      const algorithm = 'aes-256-cbc';
      const key = this.getKey();
      
      if (!encryptedText || !encryptedText.includes(':')) {
        throw new Error('Invalid encrypted text format');
      }
      
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format: expected iv:encrypted');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      if (iv.length !== 16) {
        throw new Error('Invalid IV length');
      }
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error: any) {
      console.error('[DonationsService] ❌ Decryption error:', error.message);
      console.error('[DonationsService] ❌ Encrypted text length:', encryptedText?.length || 0);
      console.error('[DonationsService] ❌ Encryption key length:', this.configService.get<string>('ENCRYPTION_KEY')?.length || 0);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  async sendReceiptEmail(donation: Donation): Promise<void> {
    try {
      console.log('[DonationsService] 📧 Starting receipt email send process for donation:', donation.id);
      const temple = await this.templesService.findOne(donation.templeId);
      if (!temple) {
        console.log('[DonationsService] ⚠️ Temple not found, skipping email');
        return;
      }
      if (!donation.donorEmail) {
        console.log('[DonationsService] ⚠️ No donor email provided, skipping email');
        return;
      }
      console.log('[DonationsService] 📧 Temple found:', temple.name);
      console.log('[DonationsService] 📧 Donor email:', donation.donorEmail);
      console.log('[DonationsService] 📧 Gmail connected:', !!temple.gmailAccessToken);
      console.log('[DonationsService] 📧 Gmail email:', temple.gmailEmail);

      const receiptConfig = temple.receiptConfig || {};
      const fromEmail = receiptConfig.fromEmail || temple.gmailEmail || 'donations@temple.org';
      const fromName = receiptConfig.fromName || temple.name;
      const subject = receiptConfig.subject?.replace('{{templeName}}', temple.name) || `Donation Receipt - ${temple.name}`;

      // Generate receipt HTML using the same generator as the view receipt page
      const receiptHtml = this.receiptGeneratorService.generateReceiptHtml(donation, temple);

      // Generate PDF receipt (do this once, before attempting to send)

      // Generate PDF receipt (do this once, before attempting to send)
      console.log('[DonationsService] 📄 Generating PDF receipt...');
      let pdfBuffer: Buffer | null = null;
      try {
        pdfBuffer = await this.receiptPdfService.generateReceiptPdfAsync(donation, temple);
        console.log('[DonationsService] ✅ PDF receipt generated, size:', pdfBuffer.length, 'bytes');
      } catch (pdfError: any) {
        console.error('[DonationsService] ❌ Failed to generate PDF receipt:', pdfError.message);
        console.error('[DonationsService] ❌ PDF error details:', pdfError);
        // Continue without PDF attachment if generation fails
        pdfBuffer = null;
      }

      // Check if temple has Gmail connected
      if (temple.gmailAccessToken && temple.gmailEmail) {
        try {
          console.log('[DonationsService] 🔐 Decrypting Gmail access token...');
          // Decrypt access token
          let accessToken: string;
          try {
            accessToken = this.decrypt(temple.gmailAccessToken);
            console.log('[DonationsService] ✅ Access token decrypted successfully');
          } catch (decryptError: any) {
            console.error('[DonationsService] ❌ Failed to decrypt access token:', decryptError.message);
            console.error('[DonationsService] ❌ Decrypt error details:', decryptError);
            throw new Error(`Failed to decrypt Gmail access token: ${decryptError.message}`);
          }
          
          // Try to send email, refresh token if needed
          try {
            console.log('[DonationsService] 📤 Attempting to send email via Gmail API with PDF attachment...');
            const receiptNumber = donation.receiptNumber || donation.id.substring(0, 8);
            const pdfFilename = `Receipt_${receiptNumber}.pdf`;
            
            await this.gmailService.sendEmail(
              accessToken,
              donation.donorEmail,
              subject,
              receiptHtml,
              temple.gmailEmail,
              fromName,
              pdfBuffer ? {
                filename: pdfFilename,
                content: pdfBuffer,
                contentType: 'application/pdf',
              } : undefined,
            );
            console.log('[DonationsService] ✅ Receipt email with PDF attachment sent via Gmail successfully');
            return;
          } catch (error: any) {
            console.error('[DonationsService] ⚠️ Gmail send error:', error.message);
            console.error('[DonationsService] ⚠️ Error details:', JSON.stringify(error, null, 2));
            
            // If token expired, try to refresh
            const isTokenError = error.message?.includes('invalid_grant') || 
                                error.message?.includes('401') || 
                                error.message?.includes('invalid_token') ||
                                error.message?.includes('Invalid Credentials') ||
                                (error.response?.status === 401);
            
            if (isTokenError) {
              console.log('[DonationsService] 🔄 Access token expired or invalid, attempting refresh...');
              if (temple.gmailRefreshToken) {
                try {
                  const refreshToken = this.decrypt(temple.gmailRefreshToken);
                  console.log('[DonationsService] 🔄 Refresh token decrypted, refreshing access token...');
                  accessToken = await this.gmailService.refreshAccessToken(refreshToken);
                  console.log('[DonationsService] ✅ Access token refreshed successfully');
                  
                  // Update temple with new access token
                  const encryptedToken = this.encrypt(accessToken);
                  await this.templesService.update(temple.id, {
                    gmailAccessToken: encryptedToken,
                  });
                  console.log('[DonationsService] ✅ Updated temple with new access token');
                  
                // Retry sending email with PDF
                console.log('[DonationsService] 📤 Retrying email send with refreshed token and PDF attachment...');
                const receiptNumber = donation.receiptNumber || donation.id.substring(0, 8);
                const pdfFilename = `Receipt_${receiptNumber}.pdf`;
                
                await this.gmailService.sendEmail(
                  accessToken,
                  donation.donorEmail,
                  subject,
                  receiptHtml,
                  temple.gmailEmail,
                  fromName,
                  pdfBuffer ? {
                    filename: pdfFilename,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                  } : undefined,
                );
                console.log('[DonationsService] ✅ Receipt email with PDF attachment sent via Gmail (after refresh)');
                return;
                } catch (refreshError: any) {
                  console.error('[DonationsService] ❌ Failed to refresh access token:', refreshError.message);
                  console.error('[DonationsService] ❌ Refresh error details:', JSON.stringify(refreshError, null, 2));
                  throw new Error(`Failed to refresh Gmail token: ${refreshError.message}`);
                }
              } else {
                console.error('[DonationsService] ❌ No refresh token available');
                throw new Error('Gmail access token expired and no refresh token available');
              }
            }
            throw error;
          }
        } catch (error: any) {
          console.error('[DonationsService] ❌ Failed to send email via Gmail:', error.message);
          console.error('[DonationsService] ❌ Full error:', JSON.stringify(error, null, 2));
          // Fall through to log-only mode
        }
      } else {
        console.log('[DonationsService] ⚠️ Gmail not connected - no access token or email');
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

  /**
   * Assign an anonymous donation to a donor
   * Updates the donation with donor information and updates donor statistics
   */
  async assignDonationToDonor(
    donationId: string,
    donorId: string,
    assignedByUserId?: string,
    sendReceiptEmail: boolean = false,
  ): Promise<Donation> {
    const donation = await this.donationsRepository.findOne({
      where: { id: donationId },
      relations: ['donor'],
    });

    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    // Get the donor
    const donor = await this.donorsService.getDonorById(donorId);

    if (!donor) {
      throw new NotFoundException(`Donor with ID ${donorId} not found`);
    }

    // Verify the donor belongs to the same temple
    if (donor.templeId !== donation.templeId) {
      throw new BadRequestException('Donor and donation must belong to the same temple');
    }

    // Only allow assigning succeeded donations
    if (donation.status !== DonationStatus.SUCCEEDED) {
      throw new BadRequestException('Can only assign succeeded donations to donors');
    }

    // Check if donation is already assigned to a different donor
    if (donation.donorId && donation.donorId !== donorId) {
      throw new BadRequestException('Donation is already assigned to a different donor');
    }

    // If already assigned to this donor, return early
    if (donation.donorId === donorId) {
      return donation;
    }

    // Update donation with donor information
    donation.donorId = donorId;
    donation.donorName = donor.name || donation.donorName;
    donation.donorPhone = donor.phone || donation.donorPhone;
    donation.donorEmail = donor.email || donation.donorEmail;
    donation.donorAddress = donor.address || donation.donorAddress;
    
    // Track assignment history
    if (assignedByUserId) {
      donation.assignedBy = assignedByUserId;
      donation.assignedAt = new Date();
    }

    const savedDonation = await this.donationsRepository.save(donation);

    // Update donor statistics if not already updated
    // Check if this donation was already counted in donor stats
    // We'll update stats to ensure accuracy
    await this.donorsService.updateDonorStats(
      donation.templeId,
      donor.phone,
      Number(donation.amount),
      donation.createdAt,
    );

    console.log(`[DonationsService] ✅ Assigned donation ${donationId} to donor ${donorId} by user ${assignedByUserId || 'unknown'}`);

    // Send receipt email if requested
    if (sendReceiptEmail && savedDonation.donorEmail) {
      console.log(`[DonationsService] 📧 Sending receipt email after assignment for donation ${donationId}`);
      // Don't await - send email asynchronously
      this.sendReceiptEmail(savedDonation).catch((error) => {
        console.error('[DonationsService] ❌ Failed to send receipt email after assignment:', error);
        // Don't fail the assignment if email fails
      });
    }

    return savedDonation;
  }
}

