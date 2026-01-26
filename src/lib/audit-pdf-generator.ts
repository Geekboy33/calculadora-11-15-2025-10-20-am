/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MINT LEMON AUDIT PDF GENERATOR - PREMIUM LEMONCHAIN DESIGN
 * Professional PDF generation with high-quality design and analytics
 * Featuring 15 DAES ISO 4217 Treasury Currencies
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AuditTransaction {
  id: string;
  type: 'LOCK_CREATED' | 'LOCK_APPROVED' | 'LOCK_REJECTED' | 'LOCK_RESERVE_CREATED' | 'MINT_COMPLETED' | 'USD_INJECTION' | 'CERTIFICATION';
  timestamp: string;
  lockId?: string;
  authorizationCode?: string;
  publicationCode?: string;
  amount: string;
  currency: string;
  status: string;
  actor?: string;
  beneficiary?: string;
  bankName?: string;
  blockchain?: {
    txHash?: string;
    blockNumber?: number;
    network?: string;
    chainId?: number;
  };
  signatures?: {
    role: string;
    hash: string;
    timestamp: string;
  }[];
}

export interface AuditReportConfig {
  title: string;
  subtitle: string;
  platform: 'DCB_TREASURY' | 'LEMX_MINTING';
  generatedBy: string;
  dateRange?: {
    from: string;
    to: string;
  };
  includeBlockchainData: boolean;
  includeSignatures: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAES TREASURY CURRENCIES - 15 ISO 4217 Supported
// ═══════════════════════════════════════════════════════════════════════════════

const TREASURY_CURRENCIES = [
  { code: 'USD', iso: '840', name: 'US Dollar', symbol: '$', active: true },
  { code: 'EUR', iso: '978', name: 'Euro', symbol: '€', active: false },
  { code: 'GBP', iso: '826', name: 'British Pound', symbol: '£', active: false },
  { code: 'CHF', iso: '756', name: 'Swiss Franc', symbol: 'Fr', active: false },
  { code: 'JPY', iso: '392', name: 'Japanese Yen', symbol: '¥', active: false },
  { code: 'CAD', iso: '124', name: 'Canadian Dollar', symbol: 'C$', active: false },
  { code: 'AUD', iso: '036', name: 'Australian Dollar', symbol: 'A$', active: false },
  { code: 'SGD', iso: '702', name: 'Singapore Dollar', symbol: 'S$', active: false },
  { code: 'HKD', iso: '344', name: 'Hong Kong Dollar', symbol: 'HK$', active: false },
  { code: 'CNY', iso: '156', name: 'Chinese Yuan', symbol: '¥', active: false },
  { code: 'AED', iso: '784', name: 'UAE Dirham', symbol: 'AED', active: false },
  { code: 'SAR', iso: '682', name: 'Saudi Riyal', symbol: 'SAR', active: false },
  { code: 'INR', iso: '356', name: 'Indian Rupee', symbol: 'Rs', active: false },
  { code: 'BRL', iso: '986', name: 'Brazilian Real', symbol: 'R$', active: false },
  { code: 'MXN', iso: '484', name: 'Mexican Peso', symbol: 'MX$', active: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// PREMIUM COLOR PALETTE - Dark Lemon Theme
// ═══════════════════════════════════════════════════════════════════════════════

const C = {
  // Backgrounds
  bg1: { r: 8, g: 12, b: 10 },      // Darkest
  bg2: { r: 12, g: 18, b: 15 },     // Dark
  bg3: { r: 18, g: 26, b: 22 },     // Medium dark
  bg4: { r: 25, g: 35, b: 30 },     // Card bg
  bg5: { r: 35, g: 48, b: 42 },     // Light card
  
  // Lemon Green Palette
  lemon: { r: 163, g: 230, b: 53 },      // Primary #A3E635
  lemonLight: { r: 190, g: 242, b: 100 }, // Light
  lemonDark: { r: 101, g: 163, b: 13 },   // Dark #65A30D
  lemonMuted: { r: 80, g: 120, b: 50 },   // Muted
  
  // Accent Colors
  cyan: { r: 34, g: 211, b: 238 },     // Info
  purple: { r: 168, g: 85, b: 247 },   // Minted
  gold: { r: 251, g: 191, b: 36 },     // Warning/Pending
  red: { r: 239, g: 68, b: 68 },       // Error/Rejected
  green: { r: 34, g: 197, b: 94 },     // Success
  blue: { r: 59, g: 130, b: 246 },     // Links
  
  // Text
  white: { r: 255, g: 255, b: 255 },
  light: { r: 229, g: 231, b: 235 },
  gray: { r: 156, g: 163, b: 175 },
  muted: { r: 107, g: 114, b: 128 },
  dim: { r: 75, g: 85, b: 99 },
  
  // Special
  black: { r: 0, g: 0, b: 0 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtCompact = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return fmt(num);
};

const fmtDate = (date: string): string => {
  try {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch { return date; }
};

const fmtDateShort = (date: string): string => {
  try {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: '2-digit', year: '2-digit'
    });
  } catch { return date; }
};

const truncHash = (hash: string, len: number = 16): string => {
  if (!hash || hash.length <= len) return hash || 'N/A';
  return hash.slice(0, len / 2) + '...' + hash.slice(-len / 2);
};

const typeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    'LOCK_CREATED': 'Lock Created',
    'LOCK_APPROVED': 'Lock Approved', 
    'LOCK_REJECTED': 'Lock Rejected',
    'LOCK_RESERVE_CREATED': 'Reserve Created',
    'MINT_COMPLETED': 'Mint Completed',
    'USD_INJECTION': 'USD Injection',
    'CERTIFICATION': 'Certification',
  };
  return labels[type] || type || 'Unknown';
};

// ═══════════════════════════════════════════════════════════════════════════════
// PDF GENERATOR CLASS - PREMIUM DESIGN
// ═══════════════════════════════════════════════════════════════════════════════

export class AuditPDFGenerator {
  private doc: jsPDF;
  private W: number;
  private H: number;
  private M: number = 12;
  private Y: number = 0;

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.W = this.doc.internal.pageSize.getWidth();
    this.H = this.doc.internal.pageSize.getHeight();
  }

  private fill(c: { r: number; g: number; b: number }) { this.doc.setFillColor(c.r, c.g, c.b); }
  private text(c: { r: number; g: number; b: number }) { this.doc.setTextColor(c.r, c.g, c.b); }
  private draw(c: { r: number; g: number; b: number }) { this.doc.setDrawColor(c.r, c.g, c.b); }
  private font(size: number, style: 'normal' | 'bold' = 'normal') {
    this.doc.setFontSize(size);
    this.doc.setFont('helvetica', style);
  }

  /**
   * Generate Premium Audit Report
   */
  generateAuditReport(transactions: AuditTransaction[], config: AuditReportConfig): Blob {
    console.log('[MintLemonPDF] Generating premium audit report...');
    
    this.doc = new jsPDF('p', 'mm', 'a4');

    // Page 1: Premium Cover
    this.renderCover(config, transactions);

    // Page 2: Treasury Currencies & Analytics
    this.doc.addPage();
    this.renderAnalytics(transactions, config);

    // Page 3: Full Traceability with Hashes
    this.doc.addPage();
    this.renderTraceability(transactions);

    // Page 4: Transaction History
    this.doc.addPage();
    this.renderTransactions(transactions);

    // Page 5: Blockchain Verification
    if (config.includeBlockchainData) {
      this.doc.addPage();
      this.renderBlockchain(transactions);
    }

    // Page 6: Signatures & Cryptographic Proof
    if (config.includeSignatures) {
      this.doc.addPage();
      this.renderSignatures(transactions);
    }

    // Add page decorations
    this.addPageDecorations(config);

    console.log('[MintLemonPDF] Generation complete');
    return this.doc.output('blob');
  }

  /**
   * COVER PAGE - Premium Design
   */
  private renderCover(config: AuditReportConfig, txs: AuditTransaction[]): void {
    const cx = this.W / 2;
    
    // Full dark background
    this.fill(C.bg1);
    this.doc.rect(0, 0, this.W, this.H, 'F');

    // Top gradient bar
    this.fill(C.lemonDark);
    this.doc.rect(0, 0, this.W, 6, 'F');
    this.fill(C.lemon);
    this.doc.rect(0, 0, this.W, 3, 'F');

    // Decorative corner elements
    this.fill(C.bg3);
    this.doc.triangle(0, 0, 60, 0, 0, 60, 'F');
    this.fill(C.bg2);
    this.doc.triangle(0, 0, 40, 0, 0, 40, 'F');
    
    this.fill(C.bg3);
    this.doc.triangle(this.W, 0, this.W - 60, 0, this.W, 60, 'F');
    this.fill(C.bg2);
    this.doc.triangle(this.W, 0, this.W - 40, 0, this.W, 40, 'F');

    // Logo container with glow effect
    this.fill(C.bg4);
    this.doc.roundedRect(cx - 32, 35, 64, 64, 8, 8, 'F');
    
    this.fill(C.lemon);
    this.doc.roundedRect(cx - 28, 39, 56, 56, 6, 6, 'F');
    
    this.fill(C.bg1);
    this.doc.roundedRect(cx - 24, 43, 48, 48, 5, 5, 'F');

    // MINT LEMON text in logo
    this.font(11, 'bold');
    this.text(C.lemon);
    this.doc.text('MINT', cx, 62, { align: 'center' });
    this.font(14, 'bold');
    this.doc.text('LEMON', cx, 74, { align: 'center' });
    this.font(7, 'normal');
    this.text(C.lemonLight);
    this.doc.text('EXPLORER', cx, 82, { align: 'center' });

    // Main Title
    this.font(32, 'bold');
    this.text(C.white);
    this.doc.text('AUDIT REPORT', cx, 125, { align: 'center' });

    // Subtitle
    this.font(13, 'normal');
    this.text(C.lemon);
    this.doc.text('LEMONCHAIN BLOCKCHAIN VERIFICATION', cx, 138, { align: 'center' });

    // Decorative line
    this.draw(C.lemon);
    this.doc.setLineWidth(0.8);
    this.doc.line(cx - 55, 148, cx + 55, 148);

    // Platform subtitle
    this.font(10, 'normal');
    this.text(C.gray);
    this.doc.text('Treasury Minting Platform - Professional Audit Certificate', cx, 160, { align: 'center' });

    // Stats Card
    const stats = this.calcStats(txs);
    
    this.fill(C.bg3);
    this.doc.roundedRect(this.M, 175, this.W - 2 * this.M, 55, 4, 4, 'F');
    
    this.draw(C.lemon);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(this.M, 175, this.W - 2 * this.M, 55, 4, 4, 'S');

    // Stats grid
    const statsData = [
      { label: 'TOTAL VOLUME', value: '$' + fmtCompact(stats.totalVolume), color: C.lemon },
      { label: 'VUSD MINTED', value: fmtCompact(stats.totalVUSD), color: C.purple },
      { label: 'TRANSACTIONS', value: txs.length.toString(), color: C.cyan },
      { label: 'SUCCESS RATE', value: stats.successRate.toFixed(1) + '%', color: C.green },
    ];

    const sw = (this.W - 2 * this.M) / 4;
    statsData.forEach((s, i) => {
      const x = this.M + sw * i + sw / 2;
      
      this.font(20, 'bold');
      this.text(s.color);
      this.doc.text(s.value, x, 198, { align: 'center' });
      
      this.font(7, 'normal');
      this.text(C.muted);
      this.doc.text(s.label, x, 212, { align: 'center' });
    });

    // Report Details Card
    this.fill(C.bg4);
    this.doc.roundedRect(this.M, 240, this.W - 2 * this.M, 32, 3, 3, 'F');

    this.font(8, 'normal');
    const col1 = this.M + 5;
    const col2 = this.M + 50;
    const col3 = this.W / 2 + 5;
    const col4 = this.W / 2 + 45;

    this.text(C.muted);
    this.doc.text('Report ID:', col1, 252);
    this.text(C.lemon);
    this.doc.text('AUDIT-' + Date.now().toString(36).toUpperCase(), col2, 252);

    this.text(C.muted);
    this.doc.text('Generated:', col1, 262);
    this.text(C.light);
    this.doc.text(fmtDate(new Date().toISOString()), col2, 262);

    this.text(C.muted);
    this.doc.text('Network:', col3, 252);
    this.text(C.cyan);
    this.doc.text('LemonChain (ID: 1006)', col4, 252);

    this.text(C.muted);
    this.doc.text('VUSD Contract:', col3, 262);
    this.text(C.purple);
    this.doc.text('0x0bF07...1011b', col4, 262);

    // Bottom Badge
    this.fill(C.lemon);
    this.doc.roundedRect(cx - 45, this.H - 28, 90, 16, 8, 8, 'F');
    
    this.font(9, 'bold');
    this.text(C.bg1);
    this.doc.text('LEMONCHAIN VERIFIED', cx, this.H - 17, { align: 'center' });

    // Bottom accent
    this.fill(C.lemon);
    this.doc.rect(0, this.H - 4, this.W, 4, 'F');
  }

  /**
   * ANALYTICS PAGE - With Treasury Currencies
   */
  private renderAnalytics(txs: AuditTransaction[], config: AuditReportConfig): void {
    // Dark background
    this.fill(C.bg1);
    this.doc.rect(0, 0, this.W, this.H, 'F');

    // Top bar
    this.fill(C.lemon);
    this.doc.rect(0, 0, this.W, 2, 'F');

    this.Y = 15;

    // Section: Treasury Currencies
    this.fill(C.lemon);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 10, 2, 2, 'F');
    
    this.font(11, 'bold');
    this.text(C.bg1);
    this.doc.text('DAES TREASURY CURRENCIES - ISO 4217', this.M + 5, this.Y + 7);
    
    this.Y += 15;

    // Currencies Grid (5 columns x 3 rows)
    const cw = (this.W - 2 * this.M - 20) / 5;
    const ch = 18;
    
    TREASURY_CURRENCIES.forEach((curr, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = this.M + col * (cw + 4);
      const y = this.Y + row * (ch + 3);

      // Currency box
      if (curr.active) {
        this.fill(C.bg4);
        this.doc.roundedRect(x, y, cw, ch, 2, 2, 'F');
        this.draw(C.lemon);
        this.doc.setLineWidth(0.5);
        this.doc.roundedRect(x, y, cw, ch, 2, 2, 'S');
      } else {
        this.fill(C.bg3);
        this.doc.roundedRect(x, y, cw, ch, 2, 2, 'F');
      }

      // Currency code
      this.font(9, 'bold');
      this.text(curr.active ? C.lemon : C.gray);
      this.doc.text(curr.code, x + 3, y + 7);

      // Symbol
      this.font(7, 'normal');
      this.text(curr.active ? C.lemonLight : C.muted);
      this.doc.text(curr.symbol, x + cw - 8, y + 7);

      // ISO code
      this.font(6, 'normal');
      this.text(C.dim);
      this.doc.text('ISO ' + curr.iso, x + 3, y + 14);

      // Active badge
      if (curr.active) {
        this.fill(C.lemon);
        this.doc.roundedRect(x + cw - 22, y + 10, 18, 6, 1, 1, 'F');
        this.font(5, 'bold');
        this.text(C.bg1);
        this.doc.text('VUSD', x + cw - 13, y + 14, { align: 'center' });
      }
    });

    this.Y += 3 * (ch + 3) + 10;

    // Section: Analytics Dashboard
    this.fill(C.cyan);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 10, 2, 2, 'F');
    
    this.font(11, 'bold');
    this.text(C.bg1);
    this.doc.text('ANALYTICS DASHBOARD', this.M + 5, this.Y + 7);
    
    this.Y += 15;

    const stats = this.calcStats(txs);

    // Metrics Row
    this.fill(C.bg3);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 28, 3, 3, 'F');

    const metrics = [
      { label: 'LOCKS', value: stats.lockCreated, color: C.gold },
      { label: 'APPROVED', value: stats.lockApproved, color: C.lemon },
      { label: 'REJECTED', value: stats.lockRejected, color: C.red },
      { label: 'RESERVES', value: stats.reserveCreated, color: C.cyan },
      { label: 'MINTED', value: stats.mintCompleted, color: C.purple },
    ];

    const mw = (this.W - 2 * this.M) / metrics.length;
    metrics.forEach((m, i) => {
      const x = this.M + mw * i + mw / 2;
      
      this.font(16, 'bold');
      this.text(m.color);
      this.doc.text(m.value.toString(), x, this.Y + 13, { align: 'center' });
      
      this.font(6, 'normal');
      this.text(C.muted);
      this.doc.text(m.label, x, this.Y + 22, { align: 'center' });
    });

    this.Y += 35;

    // Two column layout
    const colW = (this.W - 2 * this.M - 5) / 2;

    // Left: Volume Analysis
    this.fill(C.bg4);
    this.doc.roundedRect(this.M, this.Y, colW, 55, 3, 3, 'F');

    this.font(9, 'bold');
    this.text(C.white);
    this.doc.text('Volume Analysis', this.M + 5, this.Y + 10);

    const volumes = [
      { label: 'Total USD Locked', value: '$' + fmt(stats.totalVolume), color: C.gold },
      { label: 'Total VUSD Minted', value: '$' + fmt(stats.totalVUSD), color: C.purple },
      { label: 'Average Transaction', value: '$' + fmt(stats.avgTransaction), color: C.cyan },
      { label: 'Largest Transaction', value: '$' + fmt(stats.maxTransaction), color: C.lemon },
    ];

    volumes.forEach((v, i) => {
      const vy = this.Y + 20 + i * 9;
      this.font(7, 'normal');
      this.text(C.muted);
      this.doc.text(v.label, this.M + 5, vy);
      this.text(v.color);
      this.doc.text(v.value, this.M + colW - 5, vy, { align: 'right' });
    });

    // Right: Network Stats
    const rx = this.M + colW + 5;
    this.fill(C.bg4);
    this.doc.roundedRect(rx, this.Y, colW, 55, 3, 3, 'F');

    this.font(9, 'bold');
    this.text(C.white);
    this.doc.text('LemonChain Network', rx + 5, this.Y + 10);

    const netStats = [
      { label: 'Network', value: 'LemonChain Mainnet', color: C.lemon },
      { label: 'Chain ID', value: '1006', color: C.cyan },
      { label: 'Consensus', value: 'Proof of Authority', color: C.purple },
      { label: 'Block Time', value: '~3 seconds', color: C.green },
    ];

    netStats.forEach((n, i) => {
      const ny = this.Y + 20 + i * 9;
      this.font(7, 'normal');
      this.text(C.muted);
      this.doc.text(n.label, rx + 5, ny);
      this.text(n.color);
      this.doc.text(n.value, rx + colW - 5, ny, { align: 'right' });
    });

    this.Y += 62;

    // Recent Activity
    this.font(9, 'bold');
    this.text(C.white);
    this.doc.text('Recent Activity Timeline', this.M, this.Y);
    this.Y += 6;

    const recent = txs.slice(0, 8);
    recent.forEach((tx, i) => {
      this.fill(i % 2 === 0 ? C.bg3 : C.bg4);
      this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 7, 1, 1, 'F');

      this.font(7, 'normal');
      
      // Status dot
      const dotColor = tx.status === 'completed' || tx.status === 'approved' ? C.lemon : 
                       tx.status === 'rejected' ? C.red : C.gold;
      this.fill(dotColor);
      this.doc.circle(this.M + 5, this.Y + 3.5, 1.5, 'F');

      this.text(C.gray);
      this.doc.text(fmtDateShort(tx.timestamp), this.M + 12, this.Y + 5);
      
      this.text(C.light);
      this.doc.text(typeLabel(tx.type), this.M + 40, this.Y + 5);
      
      this.text(C.gold);
      this.doc.text(tx.authorizationCode || 'N/A', this.M + 80, this.Y + 5);
      
      this.text(C.white);
      this.doc.text('$' + fmt(tx.amount), this.W - this.M - 5, this.Y + 5, { align: 'right' });

      this.Y += 8;
    });
  }

  /**
   * TRACEABILITY PAGE - Full Hash Details
   */
  private renderTraceability(txs: AuditTransaction[]): void {
    this.fill(C.bg1);
    this.doc.rect(0, 0, this.W, this.H, 'F');

    this.fill(C.lemon);
    this.doc.rect(0, 0, this.W, 2, 'F');

    this.Y = 15;

    // Title
    this.fill(C.gold);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 10, 2, 2, 'F');
    
    this.font(11, 'bold');
    this.text(C.bg1);
    this.doc.text('COMPLETE TRACEABILITY - BLOCKCHAIN HASHES', this.M + 5, this.Y + 7);

    this.Y += 18;

    // Info box
    this.fill(C.bg3);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 18, 2, 2, 'F');
    
    this.font(7, 'normal');
    this.text(C.gray);
    this.doc.text('All transaction hashes are cryptographically verified on LemonChain (Chain ID: 1006)', this.M + 5, this.Y + 7);
    this.text(C.cyan);
    this.doc.text('VUSD Contract: 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b', this.M + 5, this.Y + 14);

    this.Y += 25;

    // Process each transaction with full details
    txs.forEach((tx, i) => {
      if (this.Y > this.H - 50) {
        this.doc.addPage();
        this.fill(C.bg1);
        this.doc.rect(0, 0, this.W, this.H, 'F');
        this.fill(C.lemon);
        this.doc.rect(0, 0, this.W, 2, 'F');
        this.Y = 15;
      }

      // Transaction card
      const cardHeight = 38 + (tx.signatures?.length || 0) * 6;
      
      this.fill(i % 2 === 0 ? C.bg3 : C.bg4);
      this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, cardHeight, 2, 2, 'F');

      // Header row
      const statusColor = tx.status === 'completed' || tx.status === 'approved' ? C.lemon :
                          tx.status === 'rejected' ? C.red : C.gold;
      
      this.fill(statusColor);
      this.doc.roundedRect(this.M + 2, this.Y + 2, 4, 4, 1, 1, 'F');

      this.font(8, 'bold');
      this.text(C.white);
      this.doc.text('#' + (i + 1) + ' ' + typeLabel(tx.type), this.M + 10, this.Y + 6);

      this.font(7, 'normal');
      this.text(C.gold);
      this.doc.text(tx.authorizationCode || 'N/A', this.M + 70, this.Y + 6);

      this.text(C.gray);
      this.doc.text(fmtDate(tx.timestamp), this.W - this.M - 5, this.Y + 6, { align: 'right' });

      // Transaction details
      let detailY = this.Y + 14;

      // Lock ID
      this.font(6, 'bold');
      this.text(C.muted);
      this.doc.text('LOCK ID:', this.M + 5, detailY);
      this.font(6, 'normal');
      this.text(C.light);
      this.doc.text(tx.lockId || 'N/A', this.M + 25, detailY);

      // Amount
      this.text(C.muted);
      this.doc.text('AMOUNT:', this.M + 100, detailY);
      this.text(C.lemon);
      this.doc.text('$' + fmt(tx.amount) + ' ' + tx.currency, this.M + 120, detailY);

      detailY += 6;

      // TX Hash (Full)
      this.font(6, 'bold');
      this.text(C.muted);
      this.doc.text('TX HASH:', this.M + 5, detailY);
      this.font(5, 'normal');
      this.text(C.cyan);
      const txHash = tx.blockchain?.txHash || 'Pending blockchain confirmation';
      this.doc.text(txHash, this.M + 25, detailY);

      detailY += 6;

      // Block Number
      this.font(6, 'bold');
      this.text(C.muted);
      this.doc.text('BLOCK:', this.M + 5, detailY);
      this.font(6, 'normal');
      this.text(C.purple);
      this.doc.text(tx.blockchain?.blockNumber?.toString() || 'Pending', this.M + 25, detailY);

      // Network
      this.text(C.muted);
      this.doc.text('NETWORK:', this.M + 60, detailY);
      this.text(C.lemon);
      this.doc.text(tx.blockchain?.network || 'LemonChain', this.M + 85, detailY);

      // Chain ID
      this.text(C.muted);
      this.doc.text('CHAIN ID:', this.M + 120, detailY);
      this.text(C.cyan);
      this.doc.text((tx.blockchain?.chainId || 1006).toString(), this.M + 145, detailY);

      detailY += 6;

      // Publication Code (if exists)
      if (tx.publicationCode) {
        this.font(6, 'bold');
        this.text(C.muted);
        this.doc.text('PUB CODE:', this.M + 5, detailY);
        this.font(6, 'normal');
        this.text(C.purple);
        this.doc.text(tx.publicationCode, this.M + 30, detailY);
        detailY += 6;
      }

      // Signatures
      if (tx.signatures && tx.signatures.length > 0) {
        this.font(6, 'bold');
        this.text(C.gold);
        this.doc.text('SIGNATURES (' + tx.signatures.length + '):', this.M + 5, detailY);
        detailY += 5;

        tx.signatures.forEach((sig, si) => {
          this.font(5, 'normal');
          this.text(C.gray);
          this.doc.text((si + 1) + '. ' + sig.role + ':', this.M + 8, detailY);
          this.text(C.cyan);
          this.doc.text(sig.hash, this.M + 40, detailY);
          detailY += 5;
        });
      }

      // Beneficiary & Bank
      if (tx.beneficiary || tx.bankName) {
        this.font(6, 'bold');
        this.text(C.muted);
        this.doc.text('BENEFICIARY:', this.M + 5, detailY);
        this.font(6, 'normal');
        this.text(C.light);
        this.doc.text((tx.beneficiary || 'N/A') + (tx.bankName ? ' (' + tx.bankName + ')' : ''), this.M + 35, detailY);
      }

      this.Y += cardHeight + 4;
    });

    // Summary
    if (this.Y < this.H - 20) {
      this.Y += 5;
      this.fill(C.bg4);
      this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 12, 2, 2, 'F');
      
      this.font(8, 'bold');
      this.text(C.lemon);
      this.doc.text('Total Traced: ' + txs.length + ' transactions', this.M + 5, this.Y + 8);
      
      const withHash = txs.filter(t => t.blockchain?.txHash).length;
      this.text(C.cyan);
      this.doc.text('With TX Hash: ' + withHash, this.W / 2, this.Y + 8, { align: 'center' });
      
      const withSigs = txs.filter(t => t.signatures && t.signatures.length > 0).length;
      this.text(C.purple);
      this.doc.text('With Signatures: ' + withSigs, this.W - this.M - 5, this.Y + 8, { align: 'right' });
    }
  }

  /**
   * SIGNATURES PAGE - Cryptographic Proof
   */
  private renderSignatures(txs: AuditTransaction[]): void {
    this.fill(C.bg1);
    this.doc.rect(0, 0, this.W, this.H, 'F');

    this.fill(C.lemon);
    this.doc.rect(0, 0, this.W, 2, 'F');

    this.Y = 15;

    // Title
    this.fill(C.purple);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 10, 2, 2, 'F');
    
    this.font(11, 'bold');
    this.text(C.white);
    this.doc.text('CRYPTOGRAPHIC SIGNATURES & PROOF', this.M + 5, this.Y + 7);

    this.Y += 18;

    // Explanation box
    this.fill(C.bg3);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 22, 2, 2, 'F');
    
    this.font(7, 'normal');
    this.text(C.gray);
    this.doc.text('Each minting operation requires multiple cryptographic signatures for security:', this.M + 5, this.Y + 7);
    
    this.text(C.gold);
    this.doc.text('1st Signature: DCB Treasury / DAES', this.M + 5, this.Y + 14);
    this.text(C.lemon);
    this.doc.text('2nd Signature: Treasury Minting', this.M + 70, this.Y + 14);
    this.text(C.purple);
    this.doc.text('3rd Signature: VUSDMinter Contract', this.M + 135, this.Y + 14);

    this.Y += 28;

    // Filter transactions with signatures
    const txsWithSigs = txs.filter(t => t.signatures && t.signatures.length > 0);

    if (txsWithSigs.length === 0) {
      this.fill(C.bg4);
      this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 20, 2, 2, 'F');
      this.font(9, 'normal');
      this.text(C.muted);
      this.doc.text('No signatures recorded yet', this.W / 2, this.Y + 12, { align: 'center' });
      return;
    }

    // Signatures table header
    this.fill(C.bg4);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 8, 1, 1, 'F');

    this.font(6, 'bold');
    this.text(C.lemon);
    this.doc.text('AUTH CODE', this.M + 3, this.Y + 5.5);
    this.doc.text('ROLE', this.M + 40, this.Y + 5.5);
    this.doc.text('SIGNATURE HASH', this.M + 70, this.Y + 5.5);
    this.doc.text('TIMESTAMP', this.W - this.M - 25, this.Y + 5.5);

    this.Y += 10;

    // List all signatures
    txsWithSigs.forEach((tx, ti) => {
      tx.signatures?.forEach((sig, si) => {
        if (this.Y > this.H - 20) {
          this.doc.addPage();
          this.fill(C.bg1);
          this.doc.rect(0, 0, this.W, this.H, 'F');
          this.fill(C.lemon);
          this.doc.rect(0, 0, this.W, 2, 'F');
          this.Y = 15;
        }

        const rowColor = (ti + si) % 2 === 0 ? C.bg2 : C.bg3;
        this.fill(rowColor);
        this.doc.rect(this.M, this.Y, this.W - 2 * this.M, 7, 'F');

        this.font(6, 'normal');

        // Auth code (only on first sig of each tx)
        if (si === 0) {
          this.text(C.gold);
          this.doc.text(tx.authorizationCode || 'N/A', this.M + 3, this.Y + 5);
        }

        // Role
        const roleColor = sig.role.includes('DCB') || sig.role.includes('DAES') ? C.gold :
                          sig.role.includes('Treasury') || sig.role.includes('Minting') ? C.lemon : C.purple;
        this.text(roleColor);
        this.doc.text(sig.role.substring(0, 18), this.M + 40, this.Y + 5);

        // Hash
        this.text(C.cyan);
        this.doc.text(sig.hash || 'N/A', this.M + 70, this.Y + 5);

        // Timestamp
        this.text(C.gray);
        this.doc.text(sig.timestamp ? fmtDateShort(sig.timestamp) : 'N/A', this.W - this.M - 25, this.Y + 5);

        this.Y += 7;
      });

      // Separator between transactions
      this.Y += 2;
    });

    // Summary
    this.Y += 5;
    this.fill(C.bg4);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 15, 2, 2, 'F');
    
    const totalSigs = txsWithSigs.reduce((sum, tx) => sum + (tx.signatures?.length || 0), 0);
    
    this.font(8, 'bold');
    this.text(C.white);
    this.doc.text('Signature Summary', this.M + 5, this.Y + 6);
    
    this.font(7, 'normal');
    this.text(C.lemon);
    this.doc.text('Total Signatures: ' + totalSigs, this.M + 5, this.Y + 12);
    this.text(C.cyan);
    this.doc.text('Transactions with Signatures: ' + txsWithSigs.length, this.M + 60, this.Y + 12);
    this.text(C.purple);
    this.doc.text('Avg Signatures/TX: ' + (totalSigs / txsWithSigs.length).toFixed(1), this.M + 130, this.Y + 12);
  }

  /**
   * TRANSACTIONS PAGE
   */
  private renderTransactions(txs: AuditTransaction[]): void {
    this.fill(C.bg1);
    this.doc.rect(0, 0, this.W, this.H, 'F');

    this.fill(C.lemon);
    this.doc.rect(0, 0, this.W, 2, 'F');

    this.Y = 15;

    // Title
    this.fill(C.purple);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 10, 2, 2, 'F');
    
    this.font(11, 'bold');
    this.text(C.white);
    this.doc.text('TRANSACTION HISTORY', this.M + 5, this.Y + 7);
    
    this.font(9, 'normal');
    this.doc.text(txs.length + ' transactions', this.W - this.M - 5, this.Y + 7, { align: 'right' });

    this.Y += 15;

    // Table Header
    this.fill(C.bg4);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 8, 1, 1, 'F');

    this.font(6, 'bold');
    this.text(C.lemon);
    
    const cols = [
      { x: this.M + 3, label: 'DATE' },
      { x: this.M + 28, label: 'TYPE' },
      { x: this.M + 58, label: 'AUTH CODE' },
      { x: this.M + 92, label: 'AMOUNT' },
      { x: this.M + 118, label: 'STATUS' },
      { x: this.M + 145, label: 'TX HASH' },
    ];
    cols.forEach(c => this.doc.text(c.label, c.x, this.Y + 5.5));

    this.Y += 10;

    // Table Rows
    txs.forEach((tx, i) => {
      if (this.Y > this.H - 25) {
        this.doc.addPage();
        this.fill(C.bg1);
        this.doc.rect(0, 0, this.W, this.H, 'F');
        this.fill(C.lemon);
        this.doc.rect(0, 0, this.W, 2, 'F');
        this.Y = 15;
      }

      this.fill(i % 2 === 0 ? C.bg2 : C.bg3);
      this.doc.rect(this.M, this.Y, this.W - 2 * this.M, 7, 'F');

      this.font(6, 'normal');
      
      this.text(C.gray);
      this.doc.text(fmtDateShort(tx.timestamp), cols[0].x, this.Y + 5);
      
      this.text(C.light);
      this.doc.text(typeLabel(tx.type).substring(0, 14), cols[1].x, this.Y + 5);
      
      this.text(C.gold);
      this.doc.text(tx.authorizationCode || 'N/A', cols[2].x, this.Y + 5);
      
      this.text(C.white);
      this.doc.text('$' + fmt(tx.amount), cols[3].x, this.Y + 5);
      
      const statusColor = tx.status === 'completed' || tx.status === 'approved' ? C.lemon :
                          tx.status === 'rejected' ? C.red : C.gold;
      this.text(statusColor);
      this.doc.text((tx.status || 'N/A').toUpperCase(), cols[4].x, this.Y + 5);
      
      this.text(C.cyan);
      this.doc.text(truncHash(tx.blockchain?.txHash || '', 16), cols[5].x, this.Y + 5);

      this.Y += 7;
    });

    // Summary
    this.Y += 5;
    this.fill(C.bg4);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 10, 2, 2, 'F');
    
    this.font(8, 'normal');
    this.text(C.gray);
    this.doc.text('Total: ' + txs.length + ' transactions', this.M + 5, this.Y + 7);
    
    const verified = txs.filter(t => t.blockchain?.txHash).length;
    this.text(C.lemon);
    this.doc.text('Verified on LemonChain: ' + verified, this.W - this.M - 5, this.Y + 7, { align: 'right' });
  }

  /**
   * BLOCKCHAIN PAGE
   */
  private renderBlockchain(txs: AuditTransaction[]): void {
    this.fill(C.bg1);
    this.doc.rect(0, 0, this.W, this.H, 'F');

    this.fill(C.lemon);
    this.doc.rect(0, 0, this.W, 2, 'F');

    this.Y = 15;

    // Title
    this.fill(C.lemon);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 10, 2, 2, 'F');
    
    this.font(11, 'bold');
    this.text(C.bg1);
    this.doc.text('BLOCKCHAIN VERIFICATION', this.M + 5, this.Y + 7);

    this.Y += 18;

    // Network Card
    this.fill(C.bg3);
    this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 40, 3, 3, 'F');

    // Logo
    this.fill(C.lemon);
    this.doc.roundedRect(this.M + 5, this.Y + 5, 30, 30, 4, 4, 'F');
    
    this.fill(C.bg1);
    this.doc.roundedRect(this.M + 8, this.Y + 8, 24, 24, 3, 3, 'F');
    
    this.font(7, 'bold');
    this.text(C.lemon);
    this.doc.text('MINT', this.M + 20, this.Y + 18, { align: 'center' });
    this.font(8, 'bold');
    this.doc.text('LEMON', this.M + 20, this.Y + 26, { align: 'center' });

    // Network info
    this.font(12, 'bold');
    this.text(C.white);
    this.doc.text('LemonChain Mainnet', this.M + 45, this.Y + 14);
    
    this.font(8, 'normal');
    this.text(C.gray);
    this.doc.text('Chain ID: 1006  |  RPC: rpc.lemonchain.io  |  Explorer: explorer.lemonchain.io', this.M + 45, this.Y + 24);
    
    this.text(C.cyan);
    this.doc.text('VUSD Contract: 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b', this.M + 45, this.Y + 34);

    this.Y += 50;

    // Verified Transactions
    const verified = txs.filter(t => t.blockchain?.txHash);
    
    this.font(10, 'bold');
    this.text(C.white);
    this.doc.text('Verified Transactions (' + verified.length + ')', this.M, this.Y);
    
    this.Y += 8;

    verified.slice(0, 18).forEach((tx, i) => {
      if (this.Y > this.H - 20) return;

      this.fill(i % 2 === 0 ? C.bg3 : C.bg4);
      this.doc.roundedRect(this.M, this.Y, this.W - 2 * this.M, 8, 1, 1, 'F');

      this.font(7, 'normal');
      
      this.text(C.gold);
      this.doc.text(tx.authorizationCode || 'N/A', this.M + 3, this.Y + 5.5);
      
      this.text(C.cyan);
      this.doc.text(tx.blockchain?.txHash || 'N/A', this.M + 45, this.Y + 5.5);
      
      this.text(C.gray);
      this.doc.text('Block: ' + (tx.blockchain?.blockNumber || 'N/A'), this.W - this.M - 3, this.Y + 5.5, { align: 'right' });

      this.Y += 9;
    });

    if (verified.length > 18) {
      this.font(8, 'normal');
      this.text(C.muted);
      this.doc.text('... and ' + (verified.length - 18) + ' more verified transactions', this.W / 2, this.Y + 8, { align: 'center' });
    }
  }

  /**
   * Add page decorations (headers, footers, page numbers)
   */
  private addPageDecorations(config: AuditReportConfig): void {
    const total = this.doc.getNumberOfPages();
    
    for (let i = 2; i <= total; i++) {
      this.doc.setPage(i);
      
      // Footer
      this.fill(C.bg3);
      this.doc.rect(0, this.H - 10, this.W, 10, 'F');
      
      this.font(7, 'normal');
      this.text(C.muted);
      this.doc.text('Mint Lemon Explorer - Treasury Minting Platform', this.M, this.H - 4);
      
      this.text(C.lemon);
      this.doc.text('Page ' + i + ' of ' + total, this.W / 2, this.H - 4, { align: 'center' });
      
      this.text(C.muted);
      this.doc.text('LemonChain Verified', this.W - this.M, this.H - 4, { align: 'right' });
    }
  }

  /**
   * Calculate statistics
   */
  private calcStats(txs: AuditTransaction[]) {
    const lockCreated = txs.filter(t => t.type === 'LOCK_CREATED').length;
    const lockApproved = txs.filter(t => t.type === 'LOCK_APPROVED').length;
    const lockRejected = txs.filter(t => t.type === 'LOCK_REJECTED').length;
    const reserveCreated = txs.filter(t => t.type === 'LOCK_RESERVE_CREATED').length;
    const mintCompleted = txs.filter(t => t.type === 'MINT_COMPLETED').length;

    const amounts = txs.map(t => parseFloat(t.amount || '0')).filter(a => !isNaN(a) && a > 0);
    
    const totalVolume = txs
      .filter(t => t.type === 'LOCK_CREATED' || t.type === 'LOCK_APPROVED')
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

    const totalVUSD = txs
      .filter(t => t.type === 'MINT_COMPLETED')
      .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

    const avgTransaction = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const maxTransaction = amounts.length > 0 ? Math.max(...amounts) : 0;

    const totalProcessed = lockApproved + lockRejected + mintCompleted;
    const successRate = totalProcessed > 0 ? ((lockApproved + mintCompleted) / totalProcessed) * 100 : 100;

    return { lockCreated, lockApproved, lockRejected, reserveCreated, mintCompleted, totalVolume, totalVUSD, avgTransaction, maxTransaction, successRate };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const downloadAuditPDF = (txs: AuditTransaction[], config: AuditReportConfig): void => {
  console.log('[MintLemonPDF] Starting download...');
  try {
    const gen = new AuditPDFGenerator();
    const blob = gen.generateAuditReport(txs, config);
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MINT_LEMON_AUDIT_' + new Date().toISOString().split('T')[0] + '.pdf';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url); }, 100);
    console.log('[MintLemonPDF] Download complete');
  } catch (e) {
    console.error('[MintLemonPDF] Error:', e);
    throw e;
  }
};

export const convertToAuditTransaction = (e: any): AuditTransaction => ({
  id: e.id || '',
  type: e.type || 'LOCK_CREATED',
  timestamp: e.timestamp || new Date().toISOString(),
  lockId: e.lockId || '',
  authorizationCode: e.authorizationCode || '',
  publicationCode: e.publicationCode || '',
  amount: e.amount || '0',
  currency: e.type === 'MINT_COMPLETED' ? 'VUSD' : 'USD',
  status: e.status || 'pending',
  actor: e.actor || '',
  beneficiary: e.details?.beneficiary || '',
  bankName: e.details?.bankName || '',
  blockchain: e.blockchain || {},
  signatures: e.signatures || [],
});

export default AuditPDFGenerator;
