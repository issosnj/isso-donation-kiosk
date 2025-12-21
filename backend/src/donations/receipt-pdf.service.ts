import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Donation } from './entities/donation.entity';
import { Temple } from '../temples/entities/temple.entity';
import { formatAmountInWords } from './receipt-helpers';
import { ReceiptGeneratorService } from './receipt-generator.service';
import axios from 'axios';

interface ReceiptData {
  receiptConfig: any;
  amount: number;
  amountInWords: string;
  receiptNumber: string;
  donationDate: string;
}

@Injectable()
export class ReceiptPdfService {
  constructor(private receiptGeneratorService: ReceiptGeneratorService) {}

  /**
   * Gets receipt data using the same logic as ReceiptGeneratorService
   * This ensures PDF uses the exact same data as HTML receipt
   */
  private getReceiptData(donation: Donation, temple: Temple): ReceiptData {
    const receiptConfig = temple.receiptConfig || {};
    const amount = Number(donation.amount);
    const amountInWords = formatAmountInWords(amount, receiptConfig.showAmountInWords !== false);
    const receiptNumber = donation.receiptNumber || donation.id.substring(0, 8).toUpperCase();
    const donationDate = new Date(donation.createdAt).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });

    return {
      receiptConfig,
      amount,
      amountInWords,
      receiptNumber,
      donationDate,
    };
  }

  generateReceiptPdf(donation: Donation, temple: Temple): Buffer {
    const doc = new PDFDocument({ margin: 50 });
    const buffers: Buffer[] = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {});

    const receiptConfig = temple.receiptConfig || {};
    const headerText = receiptConfig.headerText || 'Thank You for Your Donation';
    const footerText = receiptConfig.footerText || 'Your donation helps support our temple';
    const customMessage = receiptConfig.customMessage || '';

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text(headerText, { align: 'center' });
    doc.moveDown(2);

    // Donor name
    if (donation.donorName) {
      doc.fontSize(14).font('Helvetica').text(`Dear ${donation.donorName},`, { align: 'left' });
    } else {
      doc.fontSize(14).font('Helvetica').text('Dear Donor,', { align: 'left' });
    }
    doc.moveDown();

    // Custom message
    if (customMessage) {
      doc.fontSize(12).font('Helvetica').text(customMessage, { align: 'left' });
      doc.moveDown();
    }

    // Receipt details section
    doc.fontSize(18).font('Helvetica-Bold').text('Donation Receipt', { align: 'left' });
    doc.moveDown(0.5);

    // Draw a line
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    // Temple name
    doc.fontSize(12).font('Helvetica-Bold').text('Temple:', { continued: true });
    doc.font('Helvetica').text(temple.name);
    doc.moveDown(0.3);

    // Address
    if (temple.address) {
      doc.fontSize(12).font('Helvetica-Bold').text('Address:', { continued: true });
      doc.font('Helvetica').text(temple.address);
      doc.moveDown(0.3);
    }

    // Donation date
    const donationDate = new Date(donation.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.fontSize(12).font('Helvetica-Bold').text('Donation Date:', { continued: true });
    doc.font('Helvetica').text(donationDate);
    doc.moveDown(0.3);

    // Receipt number
    if (donation.receiptNumber) {
      doc.fontSize(14).font('Helvetica-Bold').text('Receipt Number:', { continued: true });
      doc.font('Helvetica-Bold').text(donation.receiptNumber);
      doc.moveDown(0.3);
    }

    // Donation ID
    doc.fontSize(12).font('Helvetica-Bold').text('Donation ID:', { continued: true });
    doc.font('Helvetica').text(donation.id);
    doc.moveDown(0.3);

    // Category
    if (donation.category) {
      doc.fontSize(12).font('Helvetica-Bold').text('Category:', { continued: true });
      doc.font('Helvetica').text(donation.category.name);
      doc.moveDown(0.3);
    }

    // Amount
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica-Bold').text('Amount:', { continued: true });
    doc.font('Helvetica-Bold').text(`$${Number(donation.amount).toFixed(2)}`, { align: 'right' });
    doc.moveDown(0.5);

    // Tax ID if configured
    if (receiptConfig.includeTaxId && receiptConfig.taxId) {
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold').text('Tax ID (EIN):', { continued: true });
      doc.font('Helvetica').text(receiptConfig.taxId);
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').text(footerText, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('This is an automated receipt. Please keep this for your records.', { align: 'center' });

    // Payment method if available
    if (donation.squarePaymentId) {
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica-Bold').text('Payment Method:', { continued: true });
      doc.font('Helvetica').text('Paid by Square');
      doc.moveDown(0.3);
      
      if (donation.cardLast4 && donation.cardType) {
        doc.fontSize(10).font('Helvetica-Bold').text('Card:', { continued: true });
        doc.font('Helvetica').text(`${donation.cardType} ending in ${donation.cardLast4}`);
      }
    }

    // Prepared by
    if (receiptConfig.preparedBy) {
      doc.moveDown(1);
      doc.fontSize(10).font('Helvetica').text(`Prepared by: ${receiptConfig.preparedBy}`, { align: 'left' });
    }

    doc.end();

    // Wait for the PDF to be generated
    return Buffer.concat(buffers);
  }

  async generateReceiptPdfAsync(donation: Donation, temple: Temple): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Use minimal margins and very compact layout to ensure content fits
        const doc = new PDFDocument({ margin: 30, size: 'LETTER', autoFirstPage: true });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          resolve(Buffer.concat(buffers));
        });
        doc.on('error', reject);

        // Use the same data extraction logic as ReceiptGeneratorService
        // This ensures PDF matches HTML receipt exactly
        const receiptData = this.getReceiptData(donation, temple);
        const { receiptConfig, amount, amountInWords, receiptNumber, donationDate } = receiptData;

        const pageWidth = 612; // Letter size width in points
        const pageHeight = 792; // Letter size height in points
        const margin = 30; // Minimal margin
        const contentWidth = pageWidth - (margin * 2);
        const maxContentHeight = pageHeight - (margin * 2); // Maximum usable height
        let currentY = margin;

        // Header Section - Logo on left, content in center
        const logoSize = 60; // Smaller logo to save space
        const logoX = margin;
        const logoY = currentY;
        let logoImage: Buffer | null = null;
        
        // Download and embed logo if URL is provided
        if (receiptConfig.logoUrl) {
          try {
            console.log('[ReceiptPdfService] Downloading logo from:', receiptConfig.logoUrl);
            const response = await axios.get(receiptConfig.logoUrl, {
              responseType: 'arraybuffer',
              timeout: 10000, // 10 second timeout
            });
            logoImage = Buffer.from(response.data);
            console.log('[ReceiptPdfService] Logo downloaded successfully, size:', logoImage.length, 'bytes');
          } catch (error: any) {
            console.error('[ReceiptPdfService] Could not download logo:', error.message);
            // Continue without logo if download fails
          }
        }

        // Embed logo image if downloaded successfully
        if (logoImage) {
          try {
            doc.image(logoImage, logoX, logoY, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
            console.log('[ReceiptPdfService] Logo embedded successfully');
          } catch (error: any) {
            console.error('[ReceiptPdfService] Could not embed logo image:', error.message);
            // Draw placeholder if embedding fails
            doc.rect(logoX, logoY, logoSize, logoSize).stroke();
            doc.fontSize(8).font('Helvetica').fillColor('#999999').text('Logo', logoX + 8, logoY + 25);
          }
        }

        // Header Center Content - Very compact font sizes
        // Calculate available width for header text (accounting for logo on left)
        // Ensure text doesn't extend beyond right margin
        const headerTextLeft = logoX + logoSize + 15; // Start after logo
        const headerTextRight = pageWidth - margin; // Right margin boundary
        const headerTextWidth = headerTextRight - headerTextLeft; // Available width
        const headerTextCenterX = headerTextLeft + (headerTextWidth / 2); // Center point within available space
        let headerY = currentY;

        if (receiptConfig.headerTitle) {
          doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000');
          const titleHeight = doc.heightOfString(receiptConfig.headerTitle, { width: headerTextWidth, align: 'center' });
          doc.text(receiptConfig.headerTitle, headerTextLeft, headerY, { width: headerTextWidth, align: 'center' });
          headerY += titleHeight + 3;
        }

        if (receiptConfig.organizationName) {
          doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
          const orgHeight = doc.heightOfString(receiptConfig.organizationName, { width: headerTextWidth, align: 'center' });
          doc.text(receiptConfig.organizationName, headerTextLeft, headerY, { width: headerTextWidth, align: 'center' });
          headerY += orgHeight + 1;
        }

        if (receiptConfig.organizationSubtitle) {
          doc.fontSize(9).font('Helvetica').fillColor('#666666');
          const subtitleHeight = doc.heightOfString(receiptConfig.organizationSubtitle, { width: headerTextWidth, align: 'center' });
          doc.text(receiptConfig.organizationSubtitle, headerTextLeft, headerY, { width: headerTextWidth, align: 'center' });
          headerY += subtitleHeight + 1;
        }

        if (temple.address) {
          doc.fontSize(9).font('Helvetica').fillColor('#666666');
          const addressHeight = doc.heightOfString(temple.address, { width: headerTextWidth, align: 'center' });
          doc.text(temple.address, headerTextLeft, headerY, { width: headerTextWidth, align: 'center' });
          headerY += addressHeight + 1;
        }

        // Contact Info
        if (receiptConfig.showContactInfo !== false) {
          const contactParts: string[] = [];
          if (receiptConfig.phone && receiptConfig.phone.trim()) {
            contactParts.push(`Phone: ${receiptConfig.phone}`);
          }
          if (receiptConfig.email && receiptConfig.email.trim()) {
            contactParts.push(`Email: ${receiptConfig.email}`);
          }
          if (receiptConfig.website && receiptConfig.website.trim()) {
            contactParts.push(`Visit: ${receiptConfig.website}`);
          }
          if (contactParts.length > 0) {
            doc.fontSize(9).font('Helvetica').fillColor('#666666');
            const contactText = contactParts.join(' | ');
            const contactHeight = doc.heightOfString(contactText, { width: headerTextWidth, align: 'center' });
            doc.text(contactText, headerTextLeft, headerY, { width: headerTextWidth, align: 'center' });
            headerY += contactHeight + 1;
          }
        }

        // Set Y position after header (use the maximum of logo bottom or header content bottom)
        currentY = Math.max(logoY + logoSize, headerY) + 10; // Minimal spacing

        // Receipt Number and Date - Very compact
        const receiptLabelY = currentY;
        doc.fontSize(9).font('Helvetica').fillColor('#666666').text('Receipt No:', margin, receiptLabelY); // Even smaller
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(receiptNumber, margin, receiptLabelY + 11); // Even smaller
        
        doc.fontSize(9).font('Helvetica').fillColor('#666666').text('Date:', pageWidth - margin - 100, receiptLabelY, { align: 'right', width: 100 }); // Even smaller
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(donationDate, pageWidth - margin - 100, receiptLabelY + 11, { align: 'right', width: 100 }); // Even smaller
        
        currentY = receiptLabelY + 24; // Even smaller
        
        // Draw line
        doc.moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
        currentY += 10; // Even smaller

        // Received From - Very compact
        doc.fontSize(9).font('Helvetica').fillColor('#666666').text('Received From:', margin, currentY); // Even smaller
        currentY += 11; // Even smaller
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text(donation.donorName || 'Anonymous', margin, currentY); // Even smaller
        currentY += 12; // Even smaller
        
        if (donation.donorName && donation.donorPhone) {
          const contactInfo = donation.donorPhone + (donation.donorEmail ? ` | ${donation.donorEmail}` : '');
          doc.fontSize(9).font('Helvetica').fillColor('#666666').text(contactInfo, margin, currentY); // Even smaller
          currentY += 12; // Even smaller
        }
        currentY += 5; // Even smaller

        // Calculate estimated remaining height to determine if we need scaling
        let estimatedRemainingHeight = 0;
        
        // Transaction table
        estimatedRemainingHeight += 25;
        // Amount in words
        if (amountInWords) estimatedRemainingHeight += 26;
        // Payment method
        if (receiptConfig.showPaymentMethod !== false) {
          estimatedRemainingHeight += 11;
          if (donation.cardType && donation.cardLast4) estimatedRemainingHeight += 11;
          if (receiptConfig.showPreparedBy && receiptConfig.preparedBy) estimatedRemainingHeight += 11;
        }
        // Custom message (estimate)
        if (receiptConfig.customMessage) estimatedRemainingHeight += 30;
        // Thank you
        if (receiptConfig.thankYouMessage) estimatedRemainingHeight += 15;
        // Footer
        estimatedRemainingHeight += 13;
        if (receiptConfig.footerText) estimatedRemainingHeight += 12;
        if (receiptConfig.includeTaxId && receiptConfig.taxId) estimatedRemainingHeight += 12;
        if (receiptConfig.taxExemptMessage) estimatedRemainingHeight += 12;
        
        const totalEstimatedHeight = currentY + estimatedRemainingHeight;
        const scaleFactor = totalEstimatedHeight > maxContentHeight ? Math.max(0.7, maxContentHeight / totalEstimatedHeight) : 1;
        
        // Transaction Details Table - Very compact with scaling
        const tableTop = currentY;
        const tableLeft = margin;
        const tableWidth = contentWidth;
        const col1Width = tableWidth * 0.7;
        const col2Width = tableWidth * 0.3;
        
        // Table Header
        doc.fontSize(8 * scaleFactor).font('Helvetica-Bold').fillColor('#000000');
        doc.text('Particulars', tableLeft, tableTop);
        doc.text('Amount ($)', tableLeft + col1Width, tableTop, { width: col2Width, align: 'right' });
        
        // Draw header line
        const headerLineY = tableTop + (9 * scaleFactor);
        doc.moveTo(tableLeft, headerLineY).lineTo(tableLeft + tableWidth, headerLineY).lineWidth(2).stroke();
        currentY = headerLineY + (2 * scaleFactor);
        
        // Table Row
        doc.fontSize(8 * scaleFactor).font('Helvetica').fillColor('#000000');
        // Show category name if category was selected, otherwise show "Donation" for preset amounts
        doc.text(donation.category?.name || 'Donation', tableLeft, currentY);
        doc.text(amount.toFixed(2), tableLeft + col1Width, currentY, { width: col2Width, align: 'right' });
        currentY += (12 * scaleFactor);
        
        // Draw row line
        doc.moveTo(tableLeft, currentY).lineTo(tableLeft + tableWidth, currentY).stroke();
        currentY += (2 * scaleFactor);
        
        // Total Row
        doc.fontSize(8 * scaleFactor).font('Helvetica-Bold').fillColor('#000000');
        doc.moveTo(tableLeft, currentY).lineTo(tableLeft + tableWidth, currentY).lineWidth(2).stroke();
        currentY += (2 * scaleFactor);
        doc.text('Total', tableLeft, currentY);
        doc.text(`$${amount.toFixed(2)}`, tableLeft + col1Width, currentY, { width: col2Width, align: 'right' });
        currentY += (15 * scaleFactor);

        // Amount in Words - Very compact with scaling
        if (amountInWords) {
          doc.fontSize(9 * scaleFactor).font('Helvetica').fillColor('#666666').text('Amount in Words:', margin, currentY);
          currentY += (11 * scaleFactor);
          doc.fontSize(10 * scaleFactor).font('Helvetica-Bold').fillColor('#000000');
          const wordsText = amountInWords.charAt(0).toUpperCase() + amountInWords.slice(1);
          doc.text(wordsText, margin, currentY);
          currentY += (15 * scaleFactor);
        }

        // Payment Method - Very compact with scaling
        if (receiptConfig.showPaymentMethod !== false) {
          doc.fontSize(9 * scaleFactor).font('Helvetica').fillColor('#666666').text('Payment Method: Paid by Square', margin, currentY);
          currentY += (11 * scaleFactor);
          
          if (donation.cardType && donation.cardLast4) {
            doc.fontSize(9 * scaleFactor).font('Helvetica').fillColor('#666666').text(`Card: ${donation.cardType} ending in ${donation.cardLast4}`, margin, currentY);
            currentY += (11 * scaleFactor);
          }
          
          if (receiptConfig.showPreparedBy && receiptConfig.preparedBy) {
            doc.fontSize(9 * scaleFactor).font('Helvetica').fillColor('#666666').text(`Prepared by: ${receiptConfig.preparedBy}`, margin, currentY);
            currentY += (11 * scaleFactor);
          }
          currentY += (5 * scaleFactor);
        }

        // Custom Message - Very compact with scaling
        if (receiptConfig.customMessage) {
          doc.fontSize(9 * scaleFactor).font('Helvetica').fillColor('#000000');
          const messageHeight = doc.heightOfString(receiptConfig.customMessage, { width: contentWidth - 20 });
          doc.rect(margin, currentY, contentWidth, messageHeight + (10 * scaleFactor)).fillColor('#f9fafb').fill();
          doc.text(receiptConfig.customMessage, margin + (5 * scaleFactor), currentY + (5 * scaleFactor), { width: contentWidth - 20 });
          currentY += messageHeight + (18 * scaleFactor);
        }

        // Thank You Message - Very compact with scaling
        if (receiptConfig.thankYouMessage) {
          doc.fontSize(9 * scaleFactor).font('Helvetica').fillColor('#000000').text(receiptConfig.thankYouMessage, margin, currentY, { width: contentWidth, align: 'center' });
          currentY += (15 * scaleFactor);
        }

        // Footer - Very compact with scaling
        currentY += (5 * scaleFactor);
        const footerY = currentY;
        doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();
        currentY = footerY + (8 * scaleFactor);
        
        if (receiptConfig.footerText) {
          doc.fontSize(9 * scaleFactor).font('Helvetica').fillColor('#666666').text(receiptConfig.footerText, margin, currentY, { width: contentWidth, align: 'center' });
          currentY += (12 * scaleFactor);
        }
        
        // Tax Exempt Information - Very compact with scaling
        // Use the same format as ReceiptGeneratorService (matches ReceiptView component)
        if (receiptConfig.includeTaxId && receiptConfig.taxId) {
          const orgName = receiptConfig.organizationName || 'This organization';
          const taxExemptText = `${orgName} (EIN#${receiptConfig.taxId}) is recognized by IRS as 501(c)(3) tax exempt organization${receiptConfig.website ? `, please visit us at ${receiptConfig.website}` : ''}`;
          doc.fontSize(8 * scaleFactor).font('Helvetica').fillColor('#666666');
          doc.text(taxExemptText, margin, currentY, { width: contentWidth, align: 'center' });
          currentY += (12 * scaleFactor);
        }
        
        if (receiptConfig.taxExemptMessage) {
          doc.fontSize(8 * scaleFactor).font('Helvetica').fillColor('#666666').text(receiptConfig.taxExemptMessage, margin, currentY, { width: contentWidth, align: 'center' });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

