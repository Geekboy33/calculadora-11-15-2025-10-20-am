/**
 * Proof of Reserves API
 * Sistema de API Keys para lectura pública de reservas
 * Genera datos TXT con información completa de pledges y blockchain
 */

import { unifiedPledgeStore, type UnifiedPledge } from './unified-pledge-store';
import { custodyStore } from './custody-store';
import { balanceStore } from './balances-store';
import { iso20022Store } from './iso20022-store';
import CryptoJS from 'crypto-js';

export interface ProofOfReservesAPIKey {
  id: string;
  key: string; // API Key pública
  name: string; // Nombre descriptivo
  pledge_ids: string[]; // Pledges asociados
  status: 'active' | 'inactive';
  created_at: string;
  last_used?: string;
  usage_count: number;
  // Permissions
  can_download_txt: boolean;
  can_view_balances: boolean;
  can_view_blockchain_data: boolean;
}

export interface ProofOfReservesData {
  api_key_id: string;
  generated_at: string;
  pledges: {
    pledge_id: string;
    amount: number;
    currency: string;
    beneficiary: string;
    status: string;
    created_at: string;
    // Account data
    account_name: string;
    account_number: string;
    institution: string;
    // M2 data
    money_type: string; // "M2"
    // Blockchain data
    blockchain_network?: string;
    contract_address?: string;
    token_symbol?: string;
    anchored_coins?: number;
  }[];
  totals: {
    total_pledged_usd: number;
    total_pledged_eur: number;
    total_pledged_gbp: number;
    active_pledges: number;
  };
  verification_hash: string;
}

class ProofOfReservesAPI {
  private readonly STORAGE_KEY = 'por_api_keys';

  /**
   * Generate new API Key
   */
  generateAPIKey(params: {
    name: string;
    pledge_ids: string[];
    can_download_txt?: boolean;
    can_view_balances?: boolean;
    can_view_blockchain_data?: boolean;
  }): ProofOfReservesAPIKey {
    const apiKey: ProofOfReservesAPIKey = {
      id: `POR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key: this.generateSecureKey(),
      name: params.name,
      pledge_ids: params.pledge_ids,
      status: 'active',
      created_at: new Date().toISOString(),
      usage_count: 0,
      can_download_txt: params.can_download_txt !== false,
      can_view_balances: params.can_view_balances !== false,
      can_view_blockchain_data: params.can_view_blockchain_data !== false
    };

    const keys = this.getAllAPIKeys();
    keys.push(apiKey);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));

    console.log('[PoR API] ✅ API Key generated:', apiKey.id);
    return apiKey;
  }

  /**
   * Get all API keys
   */
  getAllAPIKeys(): ProofOfReservesAPIKey[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[PoR API] Error loading API keys:', error);
      return [];
    }
  }

  /**
   * Get API key by key string
   */
  getAPIKeyByKey(key: string): ProofOfReservesAPIKey | null {
    const keys = this.getAllAPIKeys();
    return keys.find(k => k.key === key && k.status === 'active') || null;
  }

  /**
   * Fetch Proof of Reserves data
   */
  fetchProofOfReserves(apiKey: string): ProofOfReservesData | null {
    const key = this.getAPIKeyByKey(apiKey);

    if (!key) {
      console.error('[PoR API] ❌ Invalid or inactive API key');
      return null;
    }

    // Update usage
    this.updateAPIKeyUsage(key.id);

    // Get pledges data
    const allPledges = unifiedPledgeStore.getPledges();
    const selectedPledges = allPledges.filter(p => key.pledge_ids.includes(p.id));

    const porData: ProofOfReservesData = {
      api_key_id: key.id,
      generated_at: new Date().toISOString(),
      pledges: selectedPledges.map(pledge => {
        // Get M2 balance data
        const m2Data = iso20022Store.extractM2Balance();

        return {
          pledge_id: pledge.id,
          amount: pledge.amount,
          currency: pledge.currency,
          beneficiary: pledge.beneficiary,
          status: pledge.status,
          created_at: pledge.created_at,
          // Account data
          account_name: pledge.account_name,
          account_number: pledge.account_number,
          institution: 'Digital Commercial Bank Ltd',
          // M2 data
          money_type: 'M2',
          // Blockchain data (if permissions allow)
          blockchain_network: key.can_view_blockchain_data ? pledge.blockchain_network : undefined,
          contract_address: key.can_view_blockchain_data ? pledge.contract_address : undefined,
          token_symbol: key.can_view_blockchain_data ? pledge.token_symbol : undefined,
          anchored_coins: key.can_view_blockchain_data ? pledge.anchored_coins : undefined
        };
      }),
      totals: this.calculateTotals(selectedPledges),
      verification_hash: this.generateVerificationHash(selectedPledges)
    };

    return porData;
  }

  /**
   * Generate TXT file content
   */
  generateTXTContent(apiKey: string): string | null {
    const data = this.fetchProofOfReserves(apiKey);

    if (!data) {
      return null;
    }

    const lines: string[] = [];

    lines.push('===============================================');
    lines.push('     PROOF OF RESERVES - ATTESTATION');
    lines.push('===============================================');
    lines.push('');
    lines.push(`Generated: ${new Date(data.generated_at).toUTCString()}`);
    lines.push(`API Key ID: ${data.api_key_id}`);
    lines.push(`Verification Hash: ${data.verification_hash}`);
    lines.push('');
    lines.push('===============================================');
    lines.push('     SUMMARY');
    lines.push('===============================================');
    lines.push('');
    lines.push(`Active Pledges: ${data.totals.active_pledges}`);
    lines.push(`Total Pledged USD: ${data.totals.total_pledged_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    lines.push(`Total Pledged EUR: ${data.totals.total_pledged_eur.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    lines.push(`Total Pledged GBP: ${data.totals.total_pledged_gbp.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    lines.push('');
    lines.push('===============================================');
    lines.push('     PLEDGES DETAIL');
    lines.push('===============================================');
    lines.push('');

    data.pledges.forEach((pledge, index) => {
      lines.push(`--- PLEDGE ${index + 1} ---`);
      lines.push(`Pledge ID: ${pledge.pledge_id}`);
      lines.push(`Amount: ${pledge.currency} ${pledge.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      lines.push(`Beneficiary: ${pledge.beneficiary}`);
      lines.push(`Status: ${pledge.status}`);
      lines.push(`Created: ${new Date(pledge.created_at).toUTCString()}`);
      lines.push('');
      lines.push('CUSTODY ACCOUNT:');
      lines.push(`  Account Name: ${pledge.account_name}`);
      lines.push(`  Account Number: ${pledge.account_number}`);
      lines.push(`  Institution: ${pledge.institution}`);
      lines.push(`  Money Type: ${pledge.money_type}`);
      lines.push('');

      if (pledge.blockchain_network) {
        lines.push('BLOCKCHAIN DATA:');
        lines.push(`  Network: ${pledge.blockchain_network}`);
        lines.push(`  Contract: ${pledge.contract_address || 'N/A'}`);
        lines.push(`  Token: ${pledge.token_symbol || 'N/A'}`);
        lines.push(`  Anchored Coins: ${(pledge.anchored_coins || 0).toLocaleString('en-US', { minimumFractionDigits: 8 })}`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });

    lines.push('===============================================');
    lines.push('     VERIFICATION');
    lines.push('===============================================');
    lines.push('');
    lines.push('This attestation can be verified by:');
    lines.push('1. Checking the verification hash against blockchain records');
    lines.push('2. Validating account balances with custodian banks');
    lines.push('3. Cross-referencing pledge IDs with public registries');
    lines.push('');
    lines.push('Digital signature verification available via API.');
    lines.push('');
    lines.push('===============================================');
    lines.push(`Generated by VUSD Proof of Reserves System`);
    lines.push(`Timestamp: ${Date.now()}`);
    lines.push('===============================================');

    return lines.join('\n');
  }

  /**
   * Download TXT file
   */
  downloadTXT(apiKey: string, filename?: string): void {
    const content = this.generateTXTContent(apiKey);

    if (!content) {
      console.error('[PoR API] Failed to generate TXT content');
      return;
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `proof-of-reserves-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('[PoR API] ✅ TXT file downloaded');
  }

  /**
   * Update API key usage
   */
  private updateAPIKeyUsage(keyId: string): void {
    const keys = this.getAllAPIKeys();
    const key = keys.find(k => k.id === keyId);

    if (key) {
      key.usage_count++;
      key.last_used = new Date().toISOString();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
    }
  }

  /**
   * Calculate totals
   */
  private calculateTotals(pledges: UnifiedPledge[]) {
    return {
      total_pledged_usd: pledges.filter(p => p.currency === 'USD' && p.status === 'ACTIVE').reduce((sum, p) => sum + p.amount, 0),
      total_pledged_eur: pledges.filter(p => p.currency === 'EUR' && p.status === 'ACTIVE').reduce((sum, p) => sum + p.amount, 0),
      total_pledged_gbp: pledges.filter(p => p.currency === 'GBP' && p.status === 'ACTIVE').reduce((sum, p) => sum + p.amount, 0),
      active_pledges: pledges.filter(p => p.status === 'ACTIVE').length
    };
  }

  /**
   * Generate verification hash
   */
  private generateVerificationHash(pledges: UnifiedPledge[]): string {
    const data = pledges.map(p => `${p.id}:${p.amount}:${p.currency}:${p.status}`).join('|');
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Generate secure key
   */
  private generateSecureKey(): string {
    return `por_${CryptoJS.lib.WordArray.random(32).toString()}`;
  }

  /**
   * Revoke API key
   */
  revokeAPIKey(keyId: string): void {
    const keys = this.getAllAPIKeys();
    const key = keys.find(k => k.id === keyId);

    if (key) {
      key.status = 'inactive';
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(keys));
      console.log('[PoR API] ✅ API Key revoked:', keyId);
    }
  }
}

export const proofOfReservesAPI = new ProofOfReservesAPI();
