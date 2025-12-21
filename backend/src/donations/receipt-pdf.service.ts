import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Donation } from './entities/donation.entity';
import { Temple } from '../temples/entities/temple.entity';
import { formatAmountInWords } from './receipt-helpers';

@Injectable()
export class ReceiptPdfService {
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
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

      const receiptConfig = temple.receiptConfig || {};
      const amount = Number(donation.amount);
      const amountInWords = formatAmountInWords(amount, receiptConfig.showAmountInWords !== false);
      const receiptNumber = donation.receiptNumber || donation.id.substring(0, 8).toUpperCase();
      const donationDate = new Date(donation.createdAt).toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      });

      // Header Section
      const startY = doc.y;
      let currentY = startY;
      
      // Logo (if configured)
      if (receiptConfig.logoUrl) {
        // Note: PDFKit doesn't support loading external images directly in async context
        // For now, we'll skip the logo in PDF or you'd need to download it first
        // This is a limitation - logo would need to be downloaded and embedded
      }
      
      // Header Center Content
      const headerCenterX = 306; // Center of letter size (612/2)
      const headerStartY = currentY;
      
      if (receiptConfig.headerTitle) {
        doc.fontSize(24).font('Helvetica-Bold').text(receiptConfig.headerTitle, { align: 'center' });
        currentY = doc.y;
      }
      
      if (receiptConfig.organizationName) {
        doc.fontSize(20).font('Helvetica-Bold').text(receiptConfig.organizationName, { align: 'center' });
        currentY = doc.y;
      }
      
      if (receiptConfig.organizationSubtitle) {
        doc.fontSize(14).font('Helvetica').fillColor('#666666').text(receiptConfig.organizationSubtitle, { align: 'center' });
        currentY = doc.y;
      }
      
      if (temple.address) {
        doc.fontSize(14).font('Helvetica').fillColor('#666666').text(temple.address, { align: 'center' });
        currentY = doc.y;
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
          doc.fontSize(14).font('Helvetica').fillColor('#666666').text(contactParts.join(' | '), { align: 'center' });
          currentY = doc.y;
        }
      }
      
      doc.moveDown(1);
      currentY = doc.y;

      // Receipt Number and Date
      doc.fontSize(14).font('Helvetica').fillColor('#666666').text('Receipt No:', 50, currentY);
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000').text(receiptNumber, 50, currentY + 20);
      
      doc.fontSize(14).font('Helvetica').fillColor('#666666').text('Date:', { align: 'right', continued: false });
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000').text(donationDate, { align: 'right' });
      doc.y = currentY + 40;
      
      // Draw line
      doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
      doc.moveDown(1);

      // Received From
      doc.fontSize(14).font('Helvetica').fillColor('#666666').text('Received From:');
      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(donation.donorName || 'Anonymous');
      if (donation.donorName && donation.donorPhone) {
        const contactInfo = donation.donorPhone + (donation.donorEmail ? ` | ${donation.donorEmail}` : '');
        doc.fontSize(14).font('Helvetica').fillColor('#666666').text(contactInfo);
      }
      doc.moveDown(1);

      // Transaction Details Table
      const tableTop = doc.y;
      const tableLeft = 50;
      const tableWidth = 512;
      const col1Width = tableWidth * 0.7;
      const col2Width = tableWidth * 0.3;
      
      // Table Header
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Particulars', tableLeft, tableTop);
      doc.text('Amount ($)', tableLeft + col1Width, tableTop, { width: col2Width, align: 'right' });
      
      // Draw header line
      doc.moveTo(tableLeft, tableTop + 15).lineTo(tableLeft + tableWidth, tableTop + 15).lineWidth(2).stroke();
      doc.y = tableTop + 20;
      
      // Table Row
      doc.fontSize(12).font('Helvetica').fillColor('#000000');
      doc.text(donation.category?.name || 'Donation/Aarti', tableLeft, doc.y);
      doc.text(amount.toFixed(2), tableLeft + col1Width, doc.y, { width: col2Width, align: 'right' });
      doc.y += 20;
      
      // Draw row line
      doc.moveTo(tableLeft, doc.y).lineTo(tableLeft + tableWidth, doc.y).stroke();
      doc.y += 5;
      
      // Total Row
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000');
      doc.moveTo(tableLeft, doc.y).lineTo(tableLeft + tableWidth, doc.y).lineWidth(2).stroke();
      doc.y += 5;
      doc.text('Total', tableLeft, doc.y);
      doc.text(`$${amount.toFixed(2)}`, tableLeft + col1Width, doc.y, { width: col2Width, align: 'right' });
      doc.y += 25;

      // Amount in Words
      if (amountInWords) {
        doc.fontSize(14).font('Helvetica').fillColor('#666666').text('Amount in Words:');
        doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text(amountInWords.charAt(0).toUpperCase() + amountInWords.slice(1));
        doc.moveDown(1);
      }

      // Payment Method
      if (receiptConfig.showPaymentMethod !== false) {
        doc.fontSize(14).font('Helvetica').fillColor('#666666').text('Payment Method: Paid by Square');
        if (donation.cardType && donation.cardLast4) {
          doc.fontSize(14).font('Helvetica').fillColor('#666666').text(`Card: ${donation.cardType} ending in ${donation.cardLast4}`);
        }
        if (receiptConfig.showPreparedBy && receiptConfig.preparedBy) {
          doc.fontSize(14).font('Helvetica').fillColor('#666666').text(`Prepared by: ${receiptConfig.preparedBy}`);
        }
        doc.moveDown(1);
      }

      // Custom Message
      if (receiptConfig.customMessage) {
        doc.rect(50, doc.y, 512, 40).fillColor('#f9fafb').fill();
        doc.fontSize(14).font('Helvetica').fillColor('#000000').text(receiptConfig.customMessage, 60, doc.y + 10, { width: 492 });
        doc.y += 50;
      }

      // Thank You Message
      if (receiptConfig.thankYouMessage) {
        doc.fontSize(14).font('Helvetica').fillColor('#000000').text(receiptConfig.thankYouMessage, { align: 'center' });
        doc.moveDown(1);
      }

      // Footer
      doc.moveDown(1);
      const footerY = doc.y;
      doc.moveTo(50, footerY).lineTo(562, footerY).stroke();
      doc.y = footerY + 10;
      
      if (receiptConfig.footerText) {
        doc.fontSize(14).font('Helvetica').fillColor('#666666').text(receiptConfig.footerText, { align: 'center' });
        doc.moveDown(0.5);
      }
      
      // Tax Exempt Information
      if (receiptConfig.includeTaxId && receiptConfig.taxId) {
        const orgName = receiptConfig.organizationName || 'This organization';
        const taxExemptText = `${orgName} (EIN#${receiptConfig.taxId}) is recognized by IRS as 501(c)(3) tax exempt organization${receiptConfig.website ? `, please visit us at ${receiptConfig.website}` : ''}`;
        doc.fontSize(12).font('Helvetica').fillColor('#666666').text(taxExemptText, { align: 'center' });
        doc.moveDown(0.5);
      }
      
      if (receiptConfig.taxExemptMessage) {
        doc.fontSize(12).font('Helvetica').fillColor('#666666').text(receiptConfig.taxExemptMessage, { align: 'center' });
      }

      doc.end();
    });
  }
}

