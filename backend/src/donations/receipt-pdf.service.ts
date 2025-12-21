import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Donation } from './entities/donation.entity';
import { Temple } from '../temples/entities/temple.entity';
import { formatAmountInWords } from './receipt-helpers';
import { ReceiptGeneratorService } from './receipt-generator.service';

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
        const doc = new PDFDocument({ margin: 40, size: 'LETTER' });
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
        const margin = 40; // Reduced margin for more space
        const contentWidth = pageWidth - (margin * 2);
        const maxContentHeight = pageHeight - (margin * 2); // Maximum usable height
        let currentY = margin;

        // Header Section - Logo on left, content in center
        const logoSize = 80; // Reduced logo size
        const logoX = margin;
        const logoY = currentY;
        
        // Try to load logo if URL is provided
        if (receiptConfig.logoUrl) {
          try {
            // For now, we'll leave space for logo - actual image embedding would require downloading the image first
            // This is a placeholder - logo would need to be downloaded and embedded
            doc.rect(logoX, logoY, logoSize, logoSize).stroke();
            doc.fontSize(9).font('Helvetica').fillColor('#999999').text('Logo', logoX + 10, logoY + 35);
          } catch (error) {
            console.log('[ReceiptPdfService] Could not load logo:', error);
          }
        }

        // Header Center Content - Use smaller, more compact font sizes
        const headerCenterX = pageWidth / 2;
        let headerY = currentY;

        if (receiptConfig.headerTitle) {
          doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000'); // Reduced from 24
          const titleHeight = doc.heightOfString(receiptConfig.headerTitle, { width: contentWidth - logoSize - 20, align: 'center' });
          doc.text(receiptConfig.headerTitle, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
          headerY += titleHeight + 6; // Reduced spacing
        }

        if (receiptConfig.organizationName) {
          doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000'); // Reduced from 20
          const orgHeight = doc.heightOfString(receiptConfig.organizationName, { width: contentWidth - logoSize - 20, align: 'center' });
          doc.text(receiptConfig.organizationName, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
          headerY += orgHeight + 3; // Reduced spacing
        }

        if (receiptConfig.organizationSubtitle) {
          doc.fontSize(11).font('Helvetica').fillColor('#666666'); // Reduced from 14
          const subtitleHeight = doc.heightOfString(receiptConfig.organizationSubtitle, { width: contentWidth - logoSize - 20, align: 'center' });
          doc.text(receiptConfig.organizationSubtitle, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
          headerY += subtitleHeight + 3; // Reduced spacing
        }

        if (temple.address) {
          doc.fontSize(11).font('Helvetica').fillColor('#666666'); // Reduced from 14
          const addressHeight = doc.heightOfString(temple.address, { width: contentWidth - logoSize - 20, align: 'center' });
          doc.text(temple.address, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
          headerY += addressHeight + 3; // Reduced spacing
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
            doc.fontSize(11).font('Helvetica').fillColor('#666666'); // Reduced from 14
            const contactText = contactParts.join(' | ');
            const contactHeight = doc.heightOfString(contactText, { width: contentWidth - logoSize - 20, align: 'center' });
            doc.text(contactText, headerCenterX, headerY, { width: contentWidth - logoSize - 20, align: 'center' });
            headerY += contactHeight + 3; // Reduced spacing
          }
        }

        // Set Y position after header (use the maximum of logo bottom or header content bottom)
        currentY = Math.max(logoY + logoSize, headerY) + 15; // Reduced spacing

        // Receipt Number and Date - More compact
        const receiptLabelY = currentY;
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text('Receipt No:', margin, receiptLabelY); // Reduced from 14
        doc.fontSize(15).font('Helvetica-Bold').fillColor('#000000').text(receiptNumber, margin, receiptLabelY + 15); // Reduced from 18
        
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text('Date:', pageWidth - margin - 100, receiptLabelY, { align: 'right', width: 100 }); // Reduced from 14
        doc.fontSize(15).font('Helvetica-Bold').fillColor('#000000').text(donationDate, pageWidth - margin - 100, receiptLabelY + 15, { align: 'right', width: 100 }); // Reduced from 18
        
        currentY = receiptLabelY + 32; // Reduced from 40
        
        // Draw line
        doc.moveTo(margin, currentY).lineTo(pageWidth - margin, currentY).stroke();
        currentY += 15; // Reduced from 20

        // Received From - More compact
        doc.fontSize(11).font('Helvetica').fillColor('#666666').text('Received From:', margin, currentY); // Reduced from 14
        currentY += 15; // Reduced from 18
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text(donation.donorName || 'Anonymous', margin, currentY); // Reduced from 16
        currentY += 16; // Reduced from 20
        
        if (donation.donorName && donation.donorPhone) {
          const contactInfo = donation.donorPhone + (donation.donorEmail ? ` | ${donation.donorEmail}` : '');
          doc.fontSize(11).font('Helvetica').fillColor('#666666').text(contactInfo, margin, currentY); // Reduced from 14
          currentY += 16; // Reduced from 20
        }
        currentY += 8; // Reduced from 10

        // Transaction Details Table - More compact
        const tableTop = currentY;
        const tableLeft = margin;
        const tableWidth = contentWidth;
        const col1Width = tableWidth * 0.7;
        const col2Width = tableWidth * 0.3;
        
        // Table Header
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000'); // Reduced from 12
        doc.text('Particulars', tableLeft, tableTop);
        doc.text('Amount ($)', tableLeft + col1Width, tableTop, { width: col2Width, align: 'right' });
        
        // Draw header line
        const headerLineY = tableTop + 12; // Reduced from 15
        doc.moveTo(tableLeft, headerLineY).lineTo(tableLeft + tableWidth, headerLineY).lineWidth(2).stroke();
        currentY = headerLineY + 4; // Reduced from 5
        
        // Table Row
        doc.fontSize(10).font('Helvetica').fillColor('#000000'); // Reduced from 12
        // Show category name if category was selected, otherwise show "Donation" for preset amounts
        doc.text(donation.category?.name || 'Donation', tableLeft, currentY);
        doc.text(amount.toFixed(2), tableLeft + col1Width, currentY, { width: col2Width, align: 'right' });
        currentY += 16; // Reduced from 20
        
        // Draw row line
        doc.moveTo(tableLeft, currentY).lineTo(tableLeft + tableWidth, currentY).stroke();
        currentY += 4; // Reduced from 5
        
        // Total Row
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000'); // Reduced from 12
        doc.moveTo(tableLeft, currentY).lineTo(tableLeft + tableWidth, currentY).lineWidth(2).stroke();
        currentY += 4; // Reduced from 5
        doc.text('Total', tableLeft, currentY);
        doc.text(`$${amount.toFixed(2)}`, tableLeft + col1Width, currentY, { width: col2Width, align: 'right' });
        currentY += 20; // Reduced from 25

        // Amount in Words - More compact
        if (amountInWords) {
          doc.fontSize(11).font('Helvetica').fillColor('#666666').text('Amount in Words:', margin, currentY); // Reduced from 14
          currentY += 15; // Reduced from 18
          doc.fontSize(13).font('Helvetica-Bold').fillColor('#000000'); // Reduced from 16
          const wordsText = amountInWords.charAt(0).toUpperCase() + amountInWords.slice(1);
          doc.text(wordsText, margin, currentY);
          currentY += 20; // Reduced from 25
        }

        // Payment Method - More compact
        if (receiptConfig.showPaymentMethod !== false) {
          doc.fontSize(11).font('Helvetica').fillColor('#666666').text('Payment Method: Paid by Square', margin, currentY); // Reduced from 14
          currentY += 15; // Reduced from 18
          
          if (donation.cardType && donation.cardLast4) {
            doc.fontSize(11).font('Helvetica').fillColor('#666666').text(`Card: ${donation.cardType} ending in ${donation.cardLast4}`, margin, currentY); // Reduced from 14
            currentY += 15; // Reduced from 18
          }
          
          if (receiptConfig.showPreparedBy && receiptConfig.preparedBy) {
            doc.fontSize(11).font('Helvetica').fillColor('#666666').text(`Prepared by: ${receiptConfig.preparedBy}`, margin, currentY); // Reduced from 14
            currentY += 15; // Reduced from 18
          }
          currentY += 8; // Reduced from 10
        }

        // Custom Message - More compact
        if (receiptConfig.customMessage) {
          doc.fontSize(11).font('Helvetica').fillColor('#000000'); // Reduced from 14
          const messageHeight = doc.heightOfString(receiptConfig.customMessage, { width: contentWidth - 20 });
          doc.rect(margin, currentY, contentWidth, messageHeight + 15).fillColor('#f9fafb').fill(); // Reduced padding
          doc.text(receiptConfig.customMessage, margin + 8, currentY + 8, { width: contentWidth - 20 }); // Reduced padding
          currentY += messageHeight + 25; // Reduced from 30
        }

        // Thank You Message - More compact
        if (receiptConfig.thankYouMessage) {
          doc.fontSize(11).font('Helvetica').fillColor('#000000').text(receiptConfig.thankYouMessage, headerCenterX, currentY, { width: contentWidth, align: 'center' }); // Reduced from 14
          currentY += 20; // Reduced from 25
        }

        // Footer - More compact
        currentY += 8; // Reduced from 10
        const footerY = currentY;
        doc.moveTo(margin, footerY).lineTo(pageWidth - margin, footerY).stroke();
        currentY = footerY + 12; // Reduced from 15
        
        if (receiptConfig.footerText) {
          doc.fontSize(11).font('Helvetica').fillColor('#666666').text(receiptConfig.footerText, headerCenterX, currentY, { width: contentWidth, align: 'center' }); // Reduced from 14
          currentY += 16; // Reduced from 20
        }
        
        // Tax Exempt Information - More compact
        // Use the same format as ReceiptGeneratorService (matches ReceiptView component)
        if (receiptConfig.includeTaxId && receiptConfig.taxId) {
          const orgName = receiptConfig.organizationName || 'This organization';
          const taxExemptText = `${orgName} (EIN#${receiptConfig.taxId}) is recognized by IRS as 501(c)(3) tax exempt organization${receiptConfig.website ? `, please visit us at ${receiptConfig.website}` : ''}`;
          doc.fontSize(10).font('Helvetica').fillColor('#666666').text(taxExemptText, headerCenterX, currentY, { width: contentWidth, align: 'center' }); // Reduced from 12
          currentY += 16; // Reduced from 20
        }
        
        if (receiptConfig.taxExemptMessage) {
          doc.fontSize(10).font('Helvetica').fillColor('#666666').text(receiptConfig.taxExemptMessage, headerCenterX, currentY, { width: contentWidth, align: 'center' }); // Reduced from 12
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

