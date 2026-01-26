/**
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *  DCB PROFESSIONAL TRANSFER RECEIPT GENERATOR v3.1
 *  Digital Commercial Bank Ltd. - LemonChain Network
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * 
 *  High-quality banking receipt - Clean, Professional Design
 *  - ORIGIN: DCB Account (Digital Commercial Bank)
 *  - INTERMEDIARY: Sberbank Settlement Account (40702810669000001880)
 *  - BENEFICIARY: Final recipient
 *  - Proper currency symbols (₽ for RUB)
 *  - Multi-language support (ES/EN/RU)
 * 
 *  Version: 3.1.0 | Updated: January 2026
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export interface DCBTransferReceiptData {
  transferId: string;
  amount: number;
  currency: string;
  transferDate: string;
  transferTime?: string;
  reference?: string;
  concept?: string;
  
  // Origin (DCB Account)
  originAccountNumber: string;
  originAccountName?: string;
  originBank?: string;
  
  // Intermediary (Sberbank Settlement Account - 40702810669000001880)
  intermediaryAccountNumber: string;
  intermediaryAccountName?: string;
  intermediaryBank?: string;
  
  // Final Beneficiary
  beneficiaryName: string;
  beneficiaryAccountNumber: string;
  beneficiaryBank?: string;
  beneficiaryBIC?: string;
  beneficiaryINN?: string;
  beneficiaryKPP?: string;
  
  // Legacy fields for backward compatibility
  custodyAccountName?: string;
  custodyAccountNumber?: string;
  custodyBankName?: string;
  payerAccountNumber?: string;
  payerName?: string;
  payerBank?: string;
  payerINN?: string;
  payerKPP?: string;
  
  signatureInfo?: {
    signerName?: string;
    signatureId?: string;
    algorithm?: string;
    timestamp?: string;
    multiSignature?: {
      total: number;
      collected: number;
      signers?: string[];
    };
  };
  
  status?: 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'SIGNED' | 'SUBMITTED';
  mode?: 'REAL' | 'LOCAL' | 'SANDBOX';
  language?: 'es' | 'en' | 'ru';
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

const translations = {
  es: {
    title: 'COMPROBANTE DE TRANSFERENCIA',
    subtitle: 'Digital Commercial Bank Ltd.',
    receiptNo: 'Comprobante Nº',
    date: 'Fecha',
    time: 'Hora',
    amount: 'IMPORTE',
    currency: 'Moneda',
    originAccount: 'CUENTA ORIGEN (DCB)',
    account: 'Cuenta',
    bank: 'Banco',
    accountName: 'Titular',
    intermediaryAccount: 'CUENTA INTERMEDIARIA',
    beneficiary: 'BENEFICIARIO FINAL',
    beneficiaryName: 'Nombre',
    beneficiaryAccount: 'Cuenta',
    beneficiaryBank: 'Banco',
    bic: 'BIC',
    concept: 'CONCEPTO',
    status: 'Estado',
    reference: 'Referencia',
    transactionId: 'ID Transacción',
    footer1: 'Este documento es un comprobante oficial de transferencia bancaria.',
    footer2: 'Digital Commercial Bank Ltd. | Licencia Bancaria DCB-2024-001',
    footer3: 'ISO 27001 Certified | FATF Compliant | Swift Member',
    completed: 'COMPLETADO',
    pending: 'PENDIENTE',
    processing: 'EN PROCESO',
    signed: 'FIRMADO',
    submitted: 'ENVIADO',
  },
  en: {
    title: 'TRANSFER RECEIPT',
    subtitle: 'Digital Commercial Bank Ltd.',
    receiptNo: 'Receipt No.',
    date: 'Date',
    time: 'Time',
    amount: 'AMOUNT',
    currency: 'Currency',
    originAccount: 'ORIGIN ACCOUNT (DCB)',
    account: 'Account',
    bank: 'Bank',
    accountName: 'Account Holder',
    intermediaryAccount: 'INTERMEDIARY ACCOUNT',
    beneficiary: 'FINAL BENEFICIARY',
    beneficiaryName: 'Name',
    beneficiaryAccount: 'Account',
    beneficiaryBank: 'Bank',
    bic: 'BIC',
    concept: 'PURPOSE',
    status: 'Status',
    reference: 'Reference',
    transactionId: 'Transaction ID',
    footer1: 'This document is an official bank transfer receipt.',
    footer2: 'Digital Commercial Bank Ltd. | Banking License DCB-2024-001',
    footer3: 'ISO 27001 Certified | FATF Compliant | Swift Member',
    completed: 'COMPLETED',
    pending: 'PENDING',
    processing: 'PROCESSING',
    signed: 'SIGNED',
    submitted: 'SUBMITTED',
  },
  ru: {
    title: 'ПЛАТЕЖНОЕ ПОРУЧЕНИЕ',
    subtitle: 'Digital Commercial Bank Ltd.',
    receiptNo: 'Квитанция №',
    date: 'Дата',
    time: 'Время',
    amount: 'СУММА',
    currency: 'Валюта',
    originAccount: 'СЧЕТ ОТПРАВИТЕЛЯ (DCB)',
    account: 'Счет',
    bank: 'Банк',
    accountName: 'Владелец счета',
    intermediaryAccount: 'ПРОМЕЖУТОЧНЫЙ СЧЕТ',
    beneficiary: 'КОНЕЧНЫЙ ПОЛУЧАТЕЛЬ',
    beneficiaryName: 'Наименование',
    beneficiaryAccount: 'Счет',
    beneficiaryBank: 'Банк',
    bic: 'БИК',
    concept: 'НАЗНАЧЕНИЕ ПЛАТЕЖА',
    status: 'Статус',
    reference: 'Референс',
    transactionId: 'ID Транзакции',
    footer1: 'Данный документ является официальной квитанцией банковского перевода.',
    footer2: 'Digital Commercial Bank Ltd. | Банковская лицензия DCB-2024-001',
    footer3: 'ISO 27001 Certified | FATF Compliant | Swift Member',
    completed: 'ИСПОЛНЕНО',
    pending: 'ОЖИДАНИЕ',
    processing: 'В ОБРАБОТКЕ',
    signed: 'ПОДПИСАНО',
    submitted: 'ОТПРАВЛЕНО',
  }
};

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

function detectLanguage(): 'es' | 'en' | 'ru' {
  try {
    const stored = localStorage.getItem('daes_language');
    if (stored === 'es' || stored === 'en' || stored === 'ru') return stored;
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('es')) return 'es';
    if (browserLang.startsWith('ru')) return 'ru';
    return 'en';
  } catch {
    return 'en';
  }
}

function formatAmount(amount: number, currency: string): string {
  // Format number with spaces as thousand separators (Russian style)
  const formatted = amount.toLocaleString('ru-RU', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  // For RUB, put the symbol AFTER the number with a space
  if (currency === 'RUB' || currency === 'RUR') {
    return `${formatted} ₽`;
  }
  
  const symbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', CHF: 'Fr.', JPY: '¥', CNY: '¥',
  };
  
  return (symbols[currency] || currency + ' ') + formatted;
}

function getStatusText(status: string | undefined, t: typeof translations.en): string {
  switch (status) {
    case 'COMPLETED': return t.completed;
    case 'PENDING': return t.pending;
    case 'PROCESSING': return t.processing;
    case 'SIGNED': return t.signed;
    case 'SUBMITTED': return t.submitted;
    default: return t.completed;
  }
}

function getStatusColor(status: string | undefined): [number, number, number] {
  switch (status) {
    case 'COMPLETED': return [0, 128, 0];
    case 'PENDING': return [255, 140, 0];
    case 'PROCESSING': return [30, 144, 255];
    case 'SIGNED': return [75, 0, 130];
    case 'SUBMITTED': return [0, 128, 128];
    default: return [0, 128, 0];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// MAIN RECEIPT GENERATOR - CLEAN PROFESSIONAL DESIGN
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export function generateDCBTransferReceipt(data: DCBTransferReceiptData): void {
  const lang = data.language || detectLanguage();
  const t = translations[lang];
  
  // Resolve account fields (new format or legacy)
  const originAccount = data.originAccountNumber || 'DCB-MAIN-001';
  const originName = data.originAccountName || 'Digital Commercial Bank Ltd.';
  const originBank = data.originBank || 'Digital Commercial Bank';
  
  const intermediaryAccount = data.intermediaryAccountNumber || data.payerAccountNumber || data.custodyAccountNumber || '';
  const intermediaryName = data.intermediaryAccountName || data.payerName || data.custodyAccountName || '';
  const intermediaryBank = data.intermediaryBank || data.payerBank || data.custodyBankName || 'Sberbank Russia (PAO)';
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;
  
  // ════════════════════════════════════════════════════════════════════════════
  // HEADER - Clean Corporate Style
  // ════════════════════════════════════════════════════════════════════════════
  
  // Top accent line
  pdf.setFillColor(0, 82, 147);
  pdf.rect(0, 0, pageWidth, 8, 'F');
  
  // Bank name
  y = 20;
  pdf.setTextColor(0, 82, 147);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DIGITAL COMMERCIAL BANK', pageWidth / 2, y, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(t.subtitle, pageWidth / 2, y + 7, { align: 'center' });
  
  // Title
  y = 40;
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, y, contentWidth, 12, 'F');
  pdf.setDrawColor(0, 82, 147);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y, margin, y + 12);
  pdf.line(margin, y + 12, margin + contentWidth, y + 12);
  
  pdf.setTextColor(0, 82, 147);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.title, margin + 5, y + 8);
  
  // Receipt number and date on the right
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  const receiptNum = data.transferId.slice(-12).toUpperCase();
  pdf.text(`${t.receiptNo} ${receiptNum}`, pageWidth - margin - 5, y + 5, { align: 'right' });
  
  const dateTimeStr = data.transferTime 
    ? `${data.transferDate} | ${data.transferTime}`
    : data.transferDate;
  pdf.text(dateTimeStr, pageWidth - margin - 5, y + 10, { align: 'right' });
  
  y = 60;
  
  // ════════════════════════════════════════════════════════════════════════════
  // AMOUNT SECTION - Prominent Display with ₽ Symbol
  // ════════════════════════════════════════════════════════════════════════════
  
  pdf.setFillColor(0, 82, 147);
  pdf.roundedRect(margin, y, contentWidth, 28, 2, 2, 'F');
  
  pdf.setTextColor(200, 220, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.amount, margin + 10, y + 10);
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(26);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatAmount(data.amount, data.currency), margin + 10, y + 22);
  
  // Status badge
  const statusColor = getStatusColor(data.status);
  pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  pdf.roundedRect(pageWidth - margin - 45, y + 8, 40, 12, 2, 2, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(getStatusText(data.status, t), pageWidth - margin - 25, y + 16, { align: 'center' });
  
  y = 96;
  
  // ════════════════════════════════════════════════════════════════════════════
  // ORIGIN ACCOUNT SECTION (DCB)
  // ════════════════════════════════════════════════════════════════════════════
  
  pdf.setTextColor(0, 82, 147);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.originAccount, margin, y);
  
  y += 5;
  pdf.setFillColor(240, 248, 255);
  pdf.setDrawColor(0, 82, 147);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');
  
  // Account number
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.account + ':', margin + 5, y + 8);
  
  pdf.setTextColor(0, 82, 147);
  pdf.setFontSize(11);
  pdf.setFont('courier', 'bold');
  pdf.text(originAccount, margin + 30, y + 8);
  
  // Account name
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.accountName + ':', margin + 5, y + 16);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(originName, margin + 30, y + 16);
  
  // Bank
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.bank + ':', margin + 5, y + 24);
  
  pdf.setTextColor(60, 60, 60);
  pdf.setFont('helvetica', 'normal');
  pdf.text(originBank, margin + 30, y + 24);
  
  y += 36;
  
  // ════════════════════════════════════════════════════════════════════════════
  // INTERMEDIARY ACCOUNT SECTION (Sberbank - ending in 156)
  // ════════════════════════════════════════════════════════════════════════════
  
  pdf.setTextColor(139, 90, 43);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.intermediaryAccount, margin, y);
  
  y += 5;
  pdf.setFillColor(255, 252, 240);
  pdf.setDrawColor(210, 180, 120);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');
  
  // Account number
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.account + ':', margin + 5, y + 8);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('courier', 'bold');
  pdf.text(intermediaryAccount, margin + 30, y + 8);
  
  // Account name (if available)
  if (intermediaryName) {
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(t.accountName + ':', margin + 5, y + 16);
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    const nameText = intermediaryName.length > 50 ? intermediaryName.slice(0, 47) + '...' : intermediaryName;
    pdf.text(nameText, margin + 30, y + 16);
  }
  
  // Bank
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.bank + ':', margin + 5, y + 24);
  
  pdf.setTextColor(60, 60, 60);
  pdf.setFont('helvetica', 'normal');
  pdf.text(intermediaryBank, margin + 30, y + 24);
  
  y += 36;
  
  // ════════════════════════════════════════════════════════════════════════════
  // BENEFICIARY SECTION (Final Recipient)
  // ════════════════════════════════════════════════════════════════════════════
  
  pdf.setTextColor(0, 128, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.beneficiary, margin, y);
  
  y += 5;
  pdf.setFillColor(245, 255, 245);
  pdf.setDrawColor(100, 180, 100);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(margin, y, contentWidth, 36, 2, 2, 'FD');
  
  // Beneficiary name
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.beneficiaryName + ':', margin + 5, y + 8);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const benefName = data.beneficiaryName.length > 55 ? data.beneficiaryName.slice(0, 52) + '...' : data.beneficiaryName;
  pdf.text(benefName, margin + 35, y + 8);
  
  // Account
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.beneficiaryAccount + ':', margin + 5, y + 17);
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont('courier', 'bold');
  pdf.text(data.beneficiaryAccountNumber, margin + 35, y + 17);
  
  // Bank and BIC
  if (data.beneficiaryBank) {
    pdf.setTextColor(100, 100, 100);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(t.beneficiaryBank + ':', margin + 5, y + 26);
    
    pdf.setTextColor(60, 60, 60);
    const bankBenef = data.beneficiaryBank.length > 45 ? data.beneficiaryBank.slice(0, 42) + '...' : data.beneficiaryBank;
    pdf.text(bankBenef, margin + 35, y + 26);
  }
  
  if (data.beneficiaryBIC) {
    pdf.setTextColor(100, 100, 100);
    pdf.text(t.bic + ':', margin + 5, y + 33);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('courier', 'bold');
    pdf.setFontSize(9);
    pdf.text(data.beneficiaryBIC, margin + 20, y + 33);
  }
  
  y += 44;
  
  // ════════════════════════════════════════════════════════════════════════════
  // CONCEPT/PURPOSE SECTION
  // ════════════════════════════════════════════════════════════════════════════
  
  if (data.concept) {
    pdf.setTextColor(0, 82, 147);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text(t.concept, margin, y);
    
    y += 5;
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');
    
    pdf.setTextColor(40, 40, 40);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const conceptText = data.concept.length > 110 ? data.concept.slice(0, 107) + '...' : data.concept;
    pdf.text(conceptText, margin + 5, y + 10);
    
    y += 24;
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // TRANSACTION DETAILS
  // ════════════════════════════════════════════════════════════════════════════
  
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + contentWidth, y);
  
  y += 8;
  
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text(t.transactionId + ':', margin, y);
  pdf.setTextColor(60, 60, 60);
  pdf.setFont('courier', 'normal');
  pdf.text(data.transferId, margin + 35, y);
  
  if (data.reference) {
    pdf.setTextColor(100, 100, 100);
    pdf.setFont('helvetica', 'normal');
    pdf.text(t.reference + ':', margin + 100, y);
    pdf.setTextColor(60, 60, 60);
    pdf.text(data.reference.slice(0, 25), margin + 125, y);
  }
  
  // ════════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ════════════════════════════════════════════════════════════════════════════
  
  const footerY = pdf.internal.pageSize.getHeight() - 30;
  
  // Footer line
  pdf.setDrawColor(0, 82, 147);
  pdf.setLineWidth(0.5);
  pdf.line(margin, footerY, margin + contentWidth, footerY);
  
  // Footer text
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text(t.footer1, pageWidth / 2, footerY + 6, { align: 'center' });
  pdf.text(t.footer2, pageWidth / 2, footerY + 11, { align: 'center' });
  pdf.setFont('helvetica', 'bold');
  pdf.text(t.footer3, pageWidth / 2, footerY + 16, { align: 'center' });
  
  // Generation timestamp
  pdf.setTextColor(150, 150, 150);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`, margin, footerY + 22);
  
  // Bottom accent line
  pdf.setFillColor(0, 82, 147);
  pdf.rect(0, pdf.internal.pageSize.getHeight() - 5, pageWidth, 5, 'F');
  
  // ════════════════════════════════════════════════════════════════════════════
  // SAVE PDF
  // ════════════════════════════════════════════════════════════════════════════
  
  const filename = `DCB_Receipt_${data.transferId.slice(-10)}_${data.transferDate.replace(/-/g, '')}.pdf`;
  pdf.save(filename);
  
  console.log(`[DCBTransferReceipt] ✅ Receipt generated: ${filename}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

export function generateReceiptFromCustodyTransaction(
  transaction: {
    id: string;
    amount: number;
    currency: string;
    transactionDate: string;
    transactionTime?: string;
    reference?: string;
    description?: string;
    sourceAccount?: string;
    sourceBank?: string;
  },
  custodyAccount: {
    accountName: string;
    accountNumber?: string;
    bankName?: string;
  },
  beneficiary: {
    name: string;
    accountNumber: string;
    bank?: string;
    bic?: string;
  }
): void {
  generateDCBTransferReceipt({
    transferId: transaction.id,
    amount: Math.abs(transaction.amount),
    currency: transaction.currency,
    transferDate: transaction.transactionDate,
    transferTime: transaction.transactionTime,
    reference: transaction.reference,
    concept: transaction.description,
    // Origin: DCB
    originAccountNumber: 'DCB-CUSTODY-001',
    originAccountName: 'DCB Custody Services',
    originBank: 'Digital Commercial Bank Ltd.',
    // Intermediary
    intermediaryAccountNumber: custodyAccount.accountNumber || 'N/A',
    intermediaryAccountName: custodyAccount.accountName,
    intermediaryBank: custodyAccount.bankName || 'Sberbank Russia (PAO)',
    // Beneficiary
    beneficiaryName: beneficiary.name,
    beneficiaryAccountNumber: beneficiary.accountNumber,
    beneficiaryBank: beneficiary.bank,
    beneficiaryBIC: beneficiary.bic,
    status: 'COMPLETED',
  });
}

export function quickGenerateReceipt(
  amount: number,
  currency: string,
  payerAccount: string,
  custodyAccountName: string,
  custodyAccountNumber: string,
  beneficiaryName: string,
  beneficiaryAccount: string,
  options?: {
    payerName?: string;
    payerBank?: string;
    payerINN?: string;
    payerKPP?: string;
    beneficiaryBank?: string;
    beneficiaryBIC?: string;
    beneficiaryINN?: string;
    beneficiaryKPP?: string;
    concept?: string;
    date?: string;
    time?: string;
    reference?: string;
    status?: 'COMPLETED' | 'PENDING' | 'PROCESSING' | 'SIGNED' | 'SUBMITTED';
    mode?: 'REAL' | 'LOCAL' | 'SANDBOX';
    signatureInfo?: DCBTransferReceiptData['signatureInfo'];
  }
): void {
  const now = new Date();
  const transferId = `TRF-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  
  generateDCBTransferReceipt({
    transferId,
    amount,
    currency,
    transferDate: options?.date || now.toISOString().split('T')[0],
    transferTime: options?.time || now.toTimeString().split(' ')[0],
    reference: options?.reference,
    concept: options?.concept,
    // Origin: DCB Account
    originAccountNumber: 'DCB-MAIN-001',
    originAccountName: custodyAccountName,
    originBank: 'Digital Commercial Bank Ltd.',
    // Intermediary: Sberbank Account (the one with ...156)
    intermediaryAccountNumber: payerAccount,
    intermediaryAccountName: options?.payerName,
    intermediaryBank: options?.payerBank || 'Sberbank Russia (PAO)',
    // Beneficiary
    beneficiaryName,
    beneficiaryAccountNumber: beneficiaryAccount,
    beneficiaryBank: options?.beneficiaryBank,
    beneficiaryBIC: options?.beneficiaryBIC,
    status: options?.status || 'COMPLETED',
    mode: options?.mode,
  });
}

export function generateSberbankPaymentReceipt(
  payment: {
    id: string;
    externalId: string;
    amount: number;
    currency?: string;
    date: string;
    status: string;
    mode?: string;
    payerName: string;
    payerInn?: string;
    payerKpp?: string;
    payerAccount: string;
    payerBankBic?: string;
    payeeName: string;
    payeeInn?: string;
    payeeKpp?: string;
    payeeAccount: string;
    payeeBankBic?: string;
    purpose?: string;
    multiSignature?: {
      totalSigners: number;
      collectedSignatures: number;
      signatures?: Array<{ signerName: string; algorithm?: string }>;
    };
    digest?: string;
  }
): void {
  generateDCBTransferReceipt({
    transferId: payment.externalId || payment.id,
    amount: payment.amount,
    currency: payment.currency || 'RUB',
    transferDate: payment.date,
    transferTime: new Date().toTimeString().slice(0, 8),
    concept: payment.purpose,
    
    // ORIGIN: DCB Account (Digital Commercial Bank)
    originAccountNumber: 'DCB-SBER-MAIN-001',
    originAccountName: 'DCB Treasury Account',
    originBank: 'Digital Commercial Bank Ltd.',
    
    // INTERMEDIARY: ООО "ПОИНТЕР" Settlement Account (Corporate)
    intermediaryAccountNumber: '40702810669000001880', // ООО "ПОИНТЕР" Settlement Account
    intermediaryAccountName: 'ООО "ПОИНТЕР"',
    intermediaryBank: 'УЛЬЯНОВСКОЕ ОТДЕЛЕНИЕ N8588 ПАО СБЕРБАНК',
    
    // BENEFICIARY: Final recipient
    beneficiaryName: payment.payeeName,
    beneficiaryAccountNumber: payment.payeeAccount,
    beneficiaryBank: 'Sberbank Russia (PAO)',
    beneficiaryBIC: payment.payeeBankBic,
    
    status: payment.status as DCBTransferReceiptData['status'] || 'COMPLETED',
    mode: payment.mode as DCBTransferReceiptData['mode'],
  });
}
