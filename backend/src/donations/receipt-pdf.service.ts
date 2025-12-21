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
        // Use smaller margins and more compact layout to ensure content fits
        const doc = new PDFDocument({ margin: 35, size: 'LETTER', autoFirstPage: true });
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
        const margin = 35; // Further reduced margin
        const contentWidth = pageWidth - (margin * 2);
        const maxContentHeight = pageHeight - (margin * 2); // Maximum usable height
        let currentY = margin;

        // Header Section - Logo on left, content in center
        const logoSize = 70; // Further reduced logo size
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
            doc.fontSize(9).font('Helvetica').fillColor('#999999').text('Logo', logoX + 10, logoY + 30);
          }
        }

        // Header Center Content - Use smaller, more compact font sizes
        const headerCenterX = pageWidth / 2;
        let headerY = currentY;

        if (receiptConfig.headerTitle) {
          doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000'); // Further reduced
          const titleHeight = doc.heightOfString(receiptConfig.headerTitle, { width: contentWidth - logoSize - 20, align: 'center' });
          doc.text(receiptConfig.headerTitle, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
          headerY += titleHeight + 5; // Further reduced spacing
        }

        if (receiptConfig.organizationName) {
          doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000'); // Further reduced
          const orgHeight = doc.heightOfString(receiptConfig.organizationName, { width: contentWidth - logoSize - 20, align: 'center' });
          doc.text(receiptConfig.organizationName, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
          headerY += orgHeight + 2; // Further reduced spacing
        }

        if (receiptConfig.organizationSubtitle) {
          doc.fontSize(10).font('Helvetica').fillColor('#666666'); // Further reduced
          const subtitleHeight = doc.heightOfString(receiptConfig.organizationSubtitle, { width: contentWidth - logoSize - 20, align: 'center' });
          doc.text(receiptConfig.organizationSubtitle, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
          headerY += subtitleHeight + 2; // Further reduced spacing
        }

        if (temple.address) {
          doc.fontSize(10).font('Helvetica').fillColor('#666666'); // Further reduced
          const addressHeight = doc.heightOfString(temple.address, { width: contentWidth - logoSize - 20, align: 'center' });
          doc.text(temple.address, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
          headerY += addressHeight + 2; // Further reduced spacing
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
            doc.fontSize(10).font('Helvetica').fillColor('#666666'); // Further reduced
            const contactText = contactParts.join(' | ');
            const contactHeight = doc.heightOfString(contactText, { width: contentWidth - logoSize - 20, align: 'center' });
            doc.text(contactText, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
            headerY += contactHeight + 2; // Further reduced spacing
          }
        }

        // Set Y position after header (use the maximum of logo bottom or header content bottom)
        currentY = Math.max(logoY + logoSize, headerY) + 12; // Further reduced spacing

        // Receipt Number and Date - More compact
        const receiptLabelY = currentY;
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Receipt No:', margin, receiptLabelY); // Further reduced
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text(receiptNumber, margin, receiptLabelY + 13); // Further reduced
        
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Date:', pageWidth - margin - 100, receiptLabelY, { align: 'right', width: 100 }); // Further reduced
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000').text(donationDate, pageWidth - margin - 100, receiptLabelY + 13, { align: 'right', width: 100 }); // Further reduced
        
        currentY = receiptLabelY + 28; // Further reduced
        
        // Draw line
        doc.moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
        currentY += 12; // Further reduced

        // Received From - More compact
        doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Received From:', margin, currentY); // Further reduced
        currentY += 13; // Further reduced
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text(donation.donorName || 'Anonymous', margin, currentY); // Further reduced
        currentY += 14; // Further reduced
        
        if (donation.donorName && donation.donorPhone) {
          const contactInfo = donation.donorPhone + (donation.donorEmail ? ` | ${donation.donorEmail}` : '');
          doc.fontSize(10).font('Helvetica').fillColor('#666666').text(contactInfo, margin, currentY); // Further reduced
          currentY += 14; // Further reduced
        }
        currentY += 6; // Further reduced

        // Calculate total content height and apply scaling if needed
        // Estimate remaining content height
        let estimatedRemainingHeight = 0;
        
        // Transaction table
        estimatedRemainingHeight += 30;
        // Amount in words
        if (amountInWords) estimatedRemainingHeight += 35;
        // Payment method
        if (receiptConfig.showPaymentMethod !== false) {
          estimatedRemainingHeight += 20;
          if (donation.cardType && donation.cardLast4) estimatedRemainingHeight += 15;
          if (receiptConfig.showPreparedBy && receiptConfig.preparedBy) estimatedRemainingHeight += 15;
        }
        // Custom message
        if (receiptConfig.customMessage) estimatedRemainingHeight += 30;
        // Thank you
        if (receiptConfig.thankYouMessage) estimatedRemainingHeight += 20;
        // Footer
        estimatedRemainingHeight += 30;
        if (receiptConfig.footerText) estimatedRemainingHeight += 16;
        if (receiptConfig.includeTaxId && receiptConfig.taxId) estimatedRemainingHeight += 20;
        if (receiptConfig.taxExemptMessage) estimatedRemainingHeight += 16;
        
        const totalEstimatedHeight = currentY + estimatedRemainingHeight;
        const scaleFactor = totalEstimatedHeight > maxContentHeight ? maxContentHeight / totalEstimatedHeight : 1;
        
        // Apply scaling to font sizes if needed
        const baseFontScale = scaleFactor < 1 ? Math.max(0.75, scaleFactor) : 1;
        
        // Transaction Details Table - More compact
        const tableTop = currentY;
        const tableLeft = margin;
        const tableWidth = contentWidth;
        const col1Width = tableWidth * 0.7;
        const col2Width = tableWidth * 0.3;
        
        // Table Header
        doc.fontSize(9 * baseFontScale).font('Helvetica-Bold').fillColor('#000000'); // Further reduced
        doc.text('Particulars', tableLeft, tableTop);
        doc.text('Amount ($)', tableLeft + col1Width, tableTop, { width: col2Width, align: 'right' });
        
        // Draw header line
        const headerLineY = tableTop + 10; // Further reduced
        doc.moveTo(tableLeft, headerLineY).lineTo(tableLeft + tableWidth, headerLineY).lineWidth(2).stroke();
        currentY = headerLineY + 3; // Further reduced
        
        // Table Row
        doc.fontSize(9 * baseFontScale).font('Helvetica').fillColor('#000000'); // Further reduced
        // Show category name if category was selected, otherwise show "Donation" for preset amounts
        doc.text(donation.category?.name || 'Donation', tableLeft, currentY);
        doc.text(amount.toFixed(2), tableLeft + col1Width, currentY, { width: col2Width, align: 'right' });
        currentY += 14; // Further reduced
        
        // Draw row line
        doc.moveTo(tableLeft, currentY).lineTo(tableLeft + tableWidth, currentY).stroke();
        currentY += 3; // Further reduced
        
        // Total Row
        doc.fontSize(9 * baseFontScale).font('Helvetica-Bold').fillColor('#000000'); // Further reduced
        doc.moveTo(tableLeft, currentY).lineTo(tableLeft + tableWidth, currentY).lineWidth(2).stroke();
        currentY += 3; // Further reduced
        doc.text('Total', tableLeft, currentY);
        doc.text(`$${amount.toFixed(2)}`, tableLeft + col1Width, currentY, { width: col2Width, align: 'right' });
        currentY += 18; // Further reduced

        // Amount in Words - More compact
        if (amountInWords) {
          doc.fontSize(10 * baseFontScale).font('Helvetica').fillColor('#666666').text('Amount in Words:', margin, currentY); // Further reduced
          currentY += 13; // Further reduced
          doc.fontSize(12 * baseFontScale).font('Helvetica-Bold').fillColor('#000000'); // Further reduced
          const wordsText = amountInWords.charAt(0).toUpperCase() + amountInWords.slice(1);
          doc.text(wordsText, margin, currentY);
          currentY += 18; // Further reduced
        }

        // Payment Method - More compact
        if (receiptConfig.showPaymentMethod !== false) {
          doc.fontSize(10 * baseFontScale).font('Helvetica').fillColor('#666666').text('Payment Method: Paid by Square', margin, currentY); // Further reduced
          currentY += 13; // Further reduced
          
          if (donation.cardType && donation.cardLast4) {
            doc.fontSize(10 * baseFontScale).font('Helvetica').fillColor('#666666').text(`Card: ${donation.cardType} ending in ${donation.cardLast4}`, margin, currentY); // Further reduced
            currentY += 13; // Further reduced
          }
          
          if (receiptConfig.showPreparedBy && receiptConfig.preparedBy) {
            doc.fontSize(10 * baseFontScale).font('Helvetica').fillColor('#666666').text(`Prepared by: ${receiptConfig.preparedBy}`, margin, currentY); // Further reduced
            currentY += 13; // Further reduced
          }
          currentY += 6; // Further reduced
        }

        // Custom Message - More compact
        if (receiptConfig.customMessage) {
          doc.fontSize(10 * baseFontScale).font('Helvetica').fillColor('#000000'); // Further reduced
          const messageHeight = doc.heightOfString(receiptConfig.customMessage, { width: contentWidth - 20 });
          doc.rect(margin, currentY, contentWidth, messageHeight + 12).fillColor('#f9fafb').fill(); // Further reduced padding
          doc.text(receiptConfig.customMessage, margin + 6, currentY + 6, { width: contentWidth - 20 }); // Further reduced padding
          currentY += messageHeight + 20; // Further reduced
        }

        // Thank You Message - More compact
        if (receiptConfig.thankYouMessage) {
          doc.fontSize(10 * baseFontScale).font('Helvetica').fillColor('#000000').text(receiptConfig.thankYouMessage, headerCenterX, currentY, { width: contentWidth, align: 'center' }); // Further reduced
          currentY += 18; // Further reduced
        }

        // Footer - More compact
        currentY += 6; // Further reduced
        const footerY = currentY;
        doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();
        currentY = footerY + 10; // Further reduced
        
        if (receiptConfig.footerText) {
          doc.fontSize(10 * baseFontScale).font('Helvetica').fillColor('#666666').text(receiptConfig.footerText, headerCenterX, currentY, { width: contentWidth, align: 'center' }); // Further reduced
          currentY += 14; // Further reduced
        }
        
        // Tax Exempt Information - More compact
        // Use the same format as ReceiptGeneratorService (matches ReceiptView component)
        if (receiptConfig.includeTaxId && receiptConfig.taxId) {
          const orgName = receiptConfig.organizationName || 'This organization';
          const taxExemptText = `${orgName} (EIN#${receiptConfig.taxId}) is recognized by IRS as 501(c)(3) tax exempt organization${receiptConfig.website ? `, please visit us at ${receiptConfig.website}` : ''}`;
          doc.fontSize(9 * baseFontScale).font('Helvetica').fillColor('#666666').text(taxExemptText, headerCenterX, currentY, { width: contentWidth, align: 'center' }); // Further reduced
          currentY += 14; // Further reduced
        }
        
        if (receiptConfig.taxExemptMessage) {
          doc.fontSize(9 * baseFontScale).font('Helvetica').fillColor('#666666').text(receiptConfig.taxExemptMessage, headerCenterX, currentY, { width: contentWidth, align: 'center' }); // Further reduced
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

