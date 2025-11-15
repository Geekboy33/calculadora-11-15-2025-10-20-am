/**
 * DAES Pledge/Escrow Store
 * Sistema de gestión de pledges y escrow para VUSD con DAES Integration
 * Spec: 2025-11-12 01:10 UTC
 */

import CryptoJS from 'crypto-js';

export interface Pledge {
  pledge_id: string;
  amount: string;
  currency: string;
  beneficiary: string;
  expires_at: string;
  purpose: string;
  status: 'ACTIVE' | 'RELEASED' | 'EXPIRED' | 'ADJUSTED';
  available: string;
  reserved: string;
  created_at: string;
  updated_at: string;
}

export interface PledgeAdjustment {
  adjustment_id: string;
  pledge_id: string;
  type: 'IN' | 'OUT';
  amount: string;
  reason: string;
  performed_by: string;
  timestamp: string;
}

export interface Payout {
  payout_id: string;
  external_ref: string;
  amount: string;
  currency: string;
  beneficiary: {
    name: string;
    iban?: string;
    swift?: string;
    account_number?: string;
    routing_number?: string;
  };
  channel: string;
  pledge_id?: string;
  state: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  callback_url?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface ReserveSummary {
  total_usd: string;
  pledged_usd: string;
  unpledged_usd: string;
  active_pledges: number;
  total_payouts_pending: string;
  as_of: string;
}

export interface Attestation {
  attestation_id: string;
  hash: string;
  signature: string;
  timestamp: string;
  pdf_url: string;
  csv_url: string;
  reserves_total: string;
  pledges_total: string;
}

export interface WebhookEvent {
  event_id: string;
  event_type: 'PLEDGE_CREATED' | 'PLEDGE_ADJUSTED' | 'PLEDGE_RELEASED' | 'PAYOUT_COMPLETED' | 'PAYOUT_FAILED';
  payload: unknown;
  timestamp: string;
  signature: string;
  retry_count: number;
  delivered: boolean;
}

export interface ReconciliationReport {
  date: string;
  total_pledges: string;
  total_payouts: string;
  net_movement: string;
  opening_balance: string;
  closing_balance: string;
  csv_data: string;
  signature: string;
}

class DAESPledgeStore {
  private pledges: Pledge[] = [];
  private adjustments: PledgeAdjustment[] = [];
  private payouts: Payout[] = [];
  private webhookEvents: WebhookEvent[] = [];
  private apiKey: string = '';
  private apiSecret: string = '';
  private baseUrl: string = 'https://api.daes.world';

  // OAuth2 & HMAC Authentication
  setCredentials(apiKey: string, apiSecret: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    if (baseUrl) this.baseUrl = baseUrl;
  }

  private generateHMACSignature(timestamp: string, body: string): string {
    const message = timestamp + body;
    return CryptoJS.HmacSHA256(message, this.apiSecret).toString(CryptoJS.enc.Base64);
  }

  private validateWebhookSignature(signature: string, timestamp: string, body: string): boolean {
    const expectedSignature = this.generateHMACSignature(timestamp, body);
    return signature === expectedSignature;
  }

  private isTimestampValid(timestamp: string): boolean {
    const timestampDate = new Date(timestamp);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - timestampDate.getTime());
    const fiveMinutes = 5 * 60 * 1000;
    return diffMs <= fiveMinutes;
  }

  // 1) POST /v1/pledges - Create Pledge
  async createPledge(data: {
    amount: string;
    currency: string;
    beneficiary: string;
    expires_at: string;
    purpose: string;
    idempotencyKey?: string;
  }): Promise<Pledge> {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify(data);
    const signature = this.generateHMACSignature(timestamp, body);

    const pledge: Pledge = {
      pledge_id: `PL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      amount: data.amount,
      currency: data.currency,
      beneficiary: data.beneficiary,
      expires_at: data.expires_at,
      purpose: data.purpose,
      status: 'ACTIVE',
      available: data.amount,
      reserved: '0.00',
      created_at: timestamp,
      updated_at: timestamp,
    };

    this.pledges.push(pledge);

    // Trigger webhook
    this.triggerWebhook('PLEDGE_CREATED', pledge);

    console.log('[DAES] Pledge created:', pledge);
    return pledge;
  }

  // 2) GET /v1/pledges - List Pledges
  async listPledges(status?: 'ACTIVE' | 'RELEASED' | 'EXPIRED'): Promise<Pledge[]> {
    if (status) {
      return this.pledges.filter(p => p.status === status);
    }
    return [...this.pledges];
  }

  // 3) GET /v1/pledges/:pledge_id - Get Pledge Details
  async getPledge(pledgeId: string): Promise<Pledge | null> {
    return this.pledges.find(p => p.pledge_id === pledgeId) || null;
  }

  // 4a) POST /v1/pledges/:pledge_id/adjust - Adjust Pledge (IN/OUT)
  async adjustPledge(pledgeId: string, type: 'IN' | 'OUT', amount: string, reason: string): Promise<PledgeAdjustment> {
    const pledge = this.pledges.find(p => p.pledge_id === pledgeId);
    if (!pledge) throw new Error('Pledge not found');
    if (pledge.status !== 'ACTIVE') throw new Error('Pledge is not active');

    const adjustment: PledgeAdjustment = {
      adjustment_id: `ADJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pledge_id: pledgeId,
      type,
      amount,
      reason,
      performed_by: 'system',
      timestamp: new Date().toISOString(),
    };

    const amountNum = parseFloat(amount);
    const currentAvailable = parseFloat(pledge.available);

    if (type === 'IN') {
      pledge.available = (currentAvailable + amountNum).toFixed(2);
    } else {
      if (currentAvailable < amountNum) {
        throw new Error('Insufficient available amount');
      }
      pledge.available = (currentAvailable - amountNum).toFixed(2);
    }

    pledge.updated_at = adjustment.timestamp;
    pledge.status = 'ADJUSTED';
    this.adjustments.push(adjustment);

    // Trigger webhook
    this.triggerWebhook('PLEDGE_ADJUSTED', { pledge, adjustment });

    console.log('[DAES] Pledge adjusted:', adjustment);
    return adjustment;
  }

  // 4b) POST /v1/pledges/:pledge_id/release - Release Pledge
  async releasePledge(pledgeId: string): Promise<Pledge> {
    const pledge = this.pledges.find(p => p.pledge_id === pledgeId);
    if (!pledge) throw new Error('Pledge not found');

    pledge.status = 'RELEASED';
    pledge.updated_at = new Date().toISOString();

    // Trigger webhook
    this.triggerWebhook('PLEDGE_RELEASED', pledge);

    console.log('[DAES] Pledge released:', pledge);
    return pledge;
  }

  // Delete Pledge (physical removal)
  async deletePledge(pledgeId: string): Promise<void> {
    const pledgeIndex = this.pledges.findIndex(p => p.pledge_id === pledgeId);
    if (pledgeIndex === -1) throw new Error('Pledge not found');

    const pledge = this.pledges[pledgeIndex];

    // Remove from array
    this.pledges.splice(pledgeIndex, 1);

    // Trigger webhook
    this.triggerWebhook('PLEDGE_DELETED', pledge);

    console.log('[DAES] Pledge deleted:', pledge);
  }

  // 6) GET /v1/reserves/summary - Reserve Summary
  async getReserveSummary(): Promise<ReserveSummary> {
    const activePledges = this.pledges.filter(p => p.status === 'ACTIVE');
    const pledgedUSD = activePledges.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalUSD = 10000000; // Mock value
    const unpledgedUSD = totalUSD - pledgedUSD;

    const pendingPayouts = this.payouts.filter(p => p.state === 'PENDING' || p.state === 'PROCESSING');
    const totalPayoutsPending = pendingPayouts.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return {
      total_usd: totalUSD.toFixed(2),
      pledged_usd: pledgedUSD.toFixed(2),
      unpledged_usd: unpledgedUSD.toFixed(2),
      active_pledges: activePledges.length,
      total_payouts_pending: totalPayoutsPending.toFixed(2),
      as_of: new Date().toISOString(),
    };
  }

  // 7) GET /v1/attestations/latest - Latest Attestation
  async getLatestAttestation(): Promise<Attestation> {
    const summary = await this.getReserveSummary();
    const dataString = JSON.stringify(summary);
    const hash = CryptoJS.SHA256(dataString).toString();
    const signature = this.generateHMACSignature(summary.as_of, dataString);

    return {
      attestation_id: `ATT-${Date.now()}`,
      hash,
      signature,
      timestamp: summary.as_of,
      pdf_url: `${this.baseUrl}/attestations/${hash}.pdf`,
      csv_url: `${this.baseUrl}/attestations/${hash}.csv`,
      reserves_total: summary.total_usd,
      pledges_total: summary.pledged_usd,
    };
  }

  // 8) POST /v1/payouts - Create Payout
  async createPayout(data: {
    external_ref: string;
    amount: string;
    currency: string;
    beneficiary: {
      name: string;
      iban?: string;
      swift?: string;
      account_number?: string;
      routing_number?: string;
    };
    channel: string;
    pledge_id?: string;
    callback_url?: string;
    idempotencyKey?: string;
  }): Promise<Payout> {
    const timestamp = new Date().toISOString();

    // Validate pledge if provided
    if (data.pledge_id) {
      const pledge = this.pledges.find(p => p.pledge_id === data.pledge_id);
      if (!pledge) throw new Error('Pledge not found');
      if (pledge.status !== 'ACTIVE') throw new Error('Pledge is not active');

      const available = parseFloat(pledge.available);
      const payoutAmount = parseFloat(data.amount);
      if (available < payoutAmount) {
        throw new Error('Insufficient pledge balance');
      }

      // Reserve amount
      pledge.available = (available - payoutAmount).toFixed(2);
      pledge.reserved = (parseFloat(pledge.reserved) + payoutAmount).toFixed(2);
    }

    const payout: Payout = {
      payout_id: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      external_ref: data.external_ref,
      amount: data.amount,
      currency: data.currency,
      beneficiary: data.beneficiary,
      channel: data.channel,
      pledge_id: data.pledge_id,
      state: 'PENDING',
      callback_url: data.callback_url,
      created_at: timestamp,
    };

    this.payouts.push(payout);

    // Simulate processing with exponential backoff
    setTimeout(() => this.processPayout(payout.payout_id), 5000);

    console.log('[DAES] Payout created:', payout);
    return payout;
  }

  private async processPayout(payoutId: string) {
    const payout = this.payouts.find(p => p.payout_id === payoutId);
    if (!payout) return;

    payout.state = 'PROCESSING';

    // Simulate success/failure (90% success rate)
    setTimeout(() => {
      const success = Math.random() > 0.1;

      if (success) {
        payout.state = 'COMPLETED';
        payout.completed_at = new Date().toISOString();
        this.triggerWebhook('PAYOUT_COMPLETED', payout);

        // Unreserve from pledge
        if (payout.pledge_id) {
          const pledge = this.pledges.find(p => p.pledge_id === payout.pledge_id);
          if (pledge) {
            const payoutAmount = parseFloat(payout.amount);
            pledge.reserved = (parseFloat(pledge.reserved) - payoutAmount).toFixed(2);
            pledge.amount = (parseFloat(pledge.amount) - payoutAmount).toFixed(2);
          }
        }
      } else {
        payout.state = 'FAILED';
        payout.error_message = 'Payment processing failed';
        this.triggerWebhook('PAYOUT_FAILED', payout);

        // Unreserve and restore available
        if (payout.pledge_id) {
          const pledge = this.pledges.find(p => p.pledge_id === payout.pledge_id);
          if (pledge) {
            const payoutAmount = parseFloat(payout.amount);
            pledge.reserved = (parseFloat(pledge.reserved) - payoutAmount).toFixed(2);
            pledge.available = (parseFloat(pledge.available) + payoutAmount).toFixed(2);
          }
        }
      }

      console.log('[DAES] Payout processed:', payout);
    }, 3000);
  }

  // 10) GET /v1/transactions/:external_ref - Get Transaction Status
  async getTransactionByRef(externalRef: string): Promise<Payout | null> {
    return this.payouts.find(p => p.external_ref === externalRef) || null;
  }

  // 11) GET /v1/reconciliation - Daily Reconciliation Report
  async getReconciliationReport(date: string): Promise<ReconciliationReport> {
    const dateObj = new Date(date);
    const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
    const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));

    const dayPledges = this.pledges.filter(p => {
      const created = new Date(p.created_at);
      return created >= startOfDay && created <= endOfDay;
    });

    const dayPayouts = this.payouts.filter(p => {
      const created = new Date(p.created_at);
      return created >= startOfDay && created <= endOfDay;
    });

    const totalPledges = dayPledges.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPayouts = dayPayouts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const netMovement = totalPledges - totalPayouts;

    const csvData = this.generateCSV(dayPledges, dayPayouts);
    const signature = this.generateHMACSignature(date, csvData);

    return {
      date,
      total_pledges: totalPledges.toFixed(2),
      total_payouts: totalPayouts.toFixed(2),
      net_movement: netMovement.toFixed(2),
      opening_balance: '10000000.00',
      closing_balance: (10000000 + netMovement).toFixed(2),
      csv_data: csvData,
      signature,
    };
  }

  private generateCSV(pledges: Pledge[], payouts: Payout[]): string {
    let csv = 'Type,ID,Amount,Currency,Status,Timestamp\n';

    pledges.forEach(p => {
      csv += `PLEDGE,${p.pledge_id},${p.amount},${p.currency},${p.status},${p.created_at}\n`;
    });

    payouts.forEach(p => {
      csv += `PAYOUT,${p.payout_id},${p.amount},${p.currency},${p.state},${p.created_at}\n`;
    });

    return csv;
  }

  // Webhook Management
  private triggerWebhook(eventType: WebhookEvent['event_type'], payload: unknown) {
    const timestamp = new Date().toISOString();
    const body = JSON.stringify(payload);
    const signature = this.generateHMACSignature(timestamp, body);

    const event: WebhookEvent = {
      event_id: `WH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      event_type: eventType,
      payload,
      timestamp,
      signature,
      retry_count: 0,
      delivered: false,
    };

    this.webhookEvents.push(event);

    // Simulate webhook delivery with exponential backoff
    this.deliverWebhook(event);
  }

  private async deliverWebhook(event: WebhookEvent, retryDelay = 1000) {
    // Simulate delivery (80% success rate)
    const success = Math.random() > 0.2;

    if (success) {
      event.delivered = true;
      console.log('[DAES] Webhook delivered:', event.event_type, event.event_id);
    } else {
      event.retry_count++;

      if (event.retry_count < 10) {
        const nextDelay = retryDelay * 2; // Exponential backoff
        setTimeout(() => this.deliverWebhook(event, nextDelay), retryDelay);
        console.log('[DAES] Webhook retry scheduled:', event.event_type, event.retry_count);
      } else {
        console.error('[DAES] Webhook delivery failed after max retries:', event.event_id);
      }
    }
  }

  getWebhookEvents(): WebhookEvent[] {
    return [...this.webhookEvents];
  }

  getPayouts(): Payout[] {
    return [...this.payouts];
  }

  getAdjustments(): PledgeAdjustment[] {
    return [...this.adjustments];
  }

  // Clear all data (for testing)
  clearAll() {
    this.pledges = [];
    this.adjustments = [];
    this.payouts = [];
    this.webhookEvents = [];
  }
}

export const daesPledgeStore = new DAESPledgeStore();
