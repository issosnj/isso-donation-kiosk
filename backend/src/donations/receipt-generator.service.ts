import { Injectable } from '@nestjs/common';
import { Donation } from './entities/donation.entity';
import { Temple } from '../temples/entities/temple.entity';
import { formatAmountInWords } from './receipt-helpers';
import { getReceiptLineItems } from './receipt-line-items.util';

@Injectable()
export class ReceiptGeneratorService {
  /**
   * Generates receipt HTML that matches the ReceiptView component format exactly
   */
  generateReceiptHtml(donation: Donation, temple: Temple): string {
    const receiptConfig = temple.receiptConfig || {};
    const amount = Number(donation.amount);
    const receiptRows = getReceiptLineItems(donation);
    const amountInWords = formatAmountInWords(amount, receiptConfig.showAmountInWords !== false);
    const receiptNumber = donation.receiptNumber || donation.id.substring(0, 8).toUpperCase();
    const donationDate = new Date(donation.createdAt).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 32px; background-color: #f9fafb; }
          .receipt-container { max-width: 800px; margin: 0 auto; background-color: white; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header-section { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
          .logo-section { flex-shrink: 0; }
          .logo-section img { width: 96px; height: 96px; object-fit: contain; }
          .header-center { flex: 1; text-align: center; }
          .header-center h1 { font-size: 24px; font-weight: bold; margin-bottom: 8px; margin-top: 0; }
          .header-center h2 { font-size: 20px; font-weight: 600; margin-bottom: 4px; margin-top: 0; }
          .header-center p { font-size: 14px; color: #666; margin: 4px 0; }
          .header-right { flex-shrink: 0; width: 96px; }
          .receipt-number-date { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e5e7eb; }
          .receipt-number-date p { margin: 4px 0; }
          .receipt-number-date .label { font-size: 14px; color: #666; }
          .receipt-number-date .value { font-size: 18px; font-weight: 600; }
          .received-from { margin-bottom: 24px; }
          .received-from .label { font-size: 14px; color: #666; margin-bottom: 4px; }
          .received-from .name { font-size: 16px; font-weight: 600; }
          .received-from .contact { font-size: 14px; color: #666; margin-top: 4px; }
          .transaction-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .transaction-table thead tr { border-bottom: 2px solid #1f2937; }
          .transaction-table th { text-align: left; padding: 8px 16px; font-weight: 600; }
          .transaction-table th.amount-header { text-align: right; }
          .transaction-table tbody tr { border-bottom: 1px solid #d1d5db; }
          .transaction-table td { padding: 8px 16px; }
          .transaction-table td.amount-cell { text-align: right; }
          .transaction-table .total-row { border-top: 2px solid #1f2937; font-weight: 600; }
          .amount-in-words { margin-bottom: 24px; }
          .amount-in-words .label { font-size: 14px; color: #666; margin-bottom: 4px; }
          .amount-in-words .value { font-size: 16px; font-weight: 600; text-transform: capitalize; }
          .payment-method { margin-bottom: 24px; }
          .payment-method p { font-size: 14px; color: #666; margin: 4px 0; }
          .custom-message { margin-bottom: 24px; padding: 16px; background-color: #f9fafb; border-radius: 4px; }
          .custom-message p { font-size: 14px; margin: 0; }
          .thank-you { margin-bottom: 24px; }
          .thank-you p { font-size: 14px; text-align: center; }
          .footer-section { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
          .footer-section p { font-size: 14px; text-align: center; color: #666; margin: 8px 0; }
          .footer-section .tax-exempt { font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <!-- Header -->
          <div class="header-section">
            ${receiptConfig.logoUrl ? `
            <div class="logo-section">
              <img src="${receiptConfig.logoUrl}" alt="Logo" />
            </div>
            ` : '<div class="logo-section"></div>'}
            <div class="header-center">
              ${receiptConfig.headerTitle ? `<h1>${this.escapeHtml(receiptConfig.headerTitle)}</h1>` : ''}
              ${receiptConfig.organizationName ? `<h2>${this.escapeHtml(receiptConfig.organizationName)}</h2>` : ''}
              ${receiptConfig.organizationSubtitle ? `<p>${this.escapeHtml(receiptConfig.organizationSubtitle)}</p>` : ''}
              ${temple.address ? `<p>${this.escapeHtml(temple.address)}</p>` : ''}
              ${receiptConfig.showContactInfo !== false ? `
              <div style="font-size: 14px; color: #666; margin-top: 8px;">
                ${receiptConfig.phone && receiptConfig.phone.trim() ? `<span>Phone: ${this.escapeHtml(receiptConfig.phone)}</span>` : ''}
                ${receiptConfig.phone && receiptConfig.phone.trim() && receiptConfig.email && receiptConfig.email.trim() ? '<span> | </span>' : ''}
                ${receiptConfig.email && receiptConfig.email.trim() ? `<span>Email: ${this.escapeHtml(receiptConfig.email)}</span>` : ''}
                ${receiptConfig.website && receiptConfig.website.trim() ? `
                  ${((receiptConfig.phone && receiptConfig.phone.trim()) || (receiptConfig.email && receiptConfig.email.trim())) ? '<span> | </span>' : ''}
                  <span>Visit: ${this.escapeHtml(receiptConfig.website)}</span>
                ` : ''}
                ${(!receiptConfig.phone || !receiptConfig.phone.trim()) && (!receiptConfig.email || !receiptConfig.email.trim()) && (!receiptConfig.website || !receiptConfig.website.trim()) ? `
                  <span style="color: #9ca3af; font-style: italic;">No contact information provided</span>
                ` : ''}
              </div>
              ` : ''}
            </div>
            <div class="header-right"></div>
          </div>

          <!-- Receipt Number and Date -->
          <div class="receipt-number-date">
            <div>
              <p class="label">Receipt No:</p>
              <p class="value">${this.escapeHtml(receiptNumber)}</p>
            </div>
            <div style="text-align: right;">
              <p class="label">Date:</p>
              <p class="value">${donationDate}</p>
            </div>
          </div>

          <!-- Recipient Information -->
          <div class="received-from">
            <p class="label">Received From:</p>
            <p class="name">${this.escapeHtml(donation.donorName || 'Anonymous')}</p>
            ${donation.donorName && donation.donorPhone ? `
            <p class="contact">
              ${this.escapeHtml(donation.donorPhone)}
              ${donation.donorEmail ? ` | ${this.escapeHtml(donation.donorEmail)}` : ''}
            </p>
            ` : ''}
          </div>

          <!-- Transaction Details Table -->
          <table class="transaction-table">
            <thead>
              <tr>
                <th>Particulars</th>
                <th class="amount-header">Amount ($)</th>
              </tr>
            </thead>
            <tbody>
              ${receiptRows
                .map(
                  (row) => `
              <tr>
                <td>${this.escapeHtml(row.label)}</td>
                <td class="amount-cell">${Number(row.amount).toFixed(2)}</td>
              </tr>`,
                )
                .join('')}
              <tr class="total-row">
                <td>Total</td>
                <td class="amount-cell">$${amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <!-- Amount in Words -->
          ${amountInWords ? `
          <div class="amount-in-words">
            <p class="label">Amount in Words:</p>
            <p class="value">${this.escapeHtml(amountInWords)}</p>
          </div>
          ` : ''}

          <!-- Payment Method -->
          ${receiptConfig.showPaymentMethod !== false ? `
          <div class="payment-method">
            <p>Payment Method: ${donation.stripePaymentIntentId ? 'Paid by Stripe' : donation.squarePaymentId ? 'Paid by Stripe' : 'N/A'}</p>
            ${donation.cardType && donation.cardLast4 ? `
            <p>Card: ${this.escapeHtml(donation.cardType)} ending in ${this.escapeHtml(donation.cardLast4)}</p>
            ` : ''}
            ${receiptConfig.showPreparedBy && receiptConfig.preparedBy ? `
            <p>Prepared by: ${this.escapeHtml(receiptConfig.preparedBy)}</p>
            ` : ''}
          </div>
          ` : ''}

          <!-- Custom Message -->
          ${receiptConfig.customMessage ? `
          <div class="custom-message">
            <p>${this.escapeHtml(receiptConfig.customMessage)}</p>
          </div>
          ` : ''}

          <!-- Thank You Message -->
          ${receiptConfig.thankYouMessage ? `
          <div class="thank-you">
            <p>${this.escapeHtml(receiptConfig.thankYouMessage)}</p>
          </div>
          ` : ''}

          <!-- Footer -->
          <div class="footer-section">
            ${receiptConfig.footerText ? `
            <p>${this.escapeHtml(receiptConfig.footerText)}</p>
            ` : ''}
            
            <!-- Tax Exempt Information -->
            ${receiptConfig.includeTaxId && receiptConfig.taxId ? `
            <p class="tax-exempt">
              ${this.escapeHtml(receiptConfig.organizationName || 'This organization')} (EIN#${this.escapeHtml(receiptConfig.taxId)}) is recognized by IRS as 501(c)(3) tax exempt organization
              ${receiptConfig.website ? `, please visit us at ${this.escapeHtml(receiptConfig.website)}` : ''}
            </p>
            ` : ''}
            ${receiptConfig.taxExemptMessage ? `
            <p class="tax-exempt">${this.escapeHtml(receiptConfig.taxExemptMessage)}</p>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

