/**
 * API Keys Store
 * Manages API keys for external integrations
 */

import { getSupabaseClient } from './supabase-client';

export interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  api_secret?: string; // Only available on creation
  status: 'active' | 'revoked' | 'expired';
  permissions: {
    read_pledges: boolean;
    create_pledges: boolean;
    update_pledges: boolean;
    delete_pledges: boolean;
  };
  rate_limit: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ApiKeyUsage {
  total_requests: number;
  success_rate: number;
  endpoints: string[];
  recent_requests: Array<{
    endpoint: string;
    method: string;
    status_code: number;
    created_at: string;
  }>;
}

class ApiKeysStore {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
  }

  /**
   * Get authorization headers
   */
  private async getHeaders(): Promise<HeadersInit> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }

    if (!session || !session.access_token) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated. Please log in again.');
      }

      const { data: refreshData } = await supabase.auth.refreshSession();
      if (!refreshData.session) {
        throw new Error('Could not refresh session. Please log in again.');
      }

      return {
        'Authorization': `Bearer ${refreshData.session.access_token}`,
        'Content-Type': 'application/json',
      };
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * List all API keys
   */
  async listKeys(): Promise<ApiKey[]> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api-keys-manager`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch API keys');
    }

    const data = await response.json();
    return data.keys;
  }

  /**
   * Create a new API key
   */
  async createKey(params: {
    name: string;
    permissions?: Partial<ApiKey['permissions']>;
    rate_limit?: number;
    expires_in_days?: number;
    custody_account?: any;
    pledge?: any;
  }): Promise<{ key: ApiKey; warning: string }> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api-keys-manager`, {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create API key');
    }

    const data = await response.json();
    return data;
  }

  /**
   * Update an API key
   */
  async updateKey(
    keyId: string,
    updates: {
      name?: string;
      status?: 'active' | 'revoked';
      permissions?: Partial<ApiKey['permissions']>;
      rate_limit?: number;
    }
  ): Promise<ApiKey> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api-keys-manager/${keyId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update API key');
    }

    const data = await response.json();
    return data.key;
  }

  /**
   * Delete an API key
   */
  async deleteKey(keyId: string): Promise<void> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api-keys-manager/${keyId}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete API key');
    }
  }

  /**
   * Get usage statistics for an API key
   */
  async getKeyUsage(keyId: string): Promise<ApiKeyUsage> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/api-keys-manager/${keyId}/usage`, {
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch usage statistics');
    }

    const data = await response.json();
    return data.usage;
  }

  /**
   * Test API credentials
   */
  async testCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/vusd1-pledges-api/stats`, {
        headers: {
          'X-API-Key': apiKey,
          'X-API-Secret': apiSecret,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiKeysStore = new ApiKeysStore();
