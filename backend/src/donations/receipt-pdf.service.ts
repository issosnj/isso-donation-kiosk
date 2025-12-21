import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Donation } from './entities/donation.entity';
import { Temple } from '../temples/entities/temple.entity';

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
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on('error', reject);

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
    });
  }
}

