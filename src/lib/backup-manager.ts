/**
 * Backup Manager - Sistema de Respaldos Automáticos
 * Respaldos programados con almacenamiento en Supabase Storage
 */

import { getSupabaseClient } from './supabase-client';
import { balanceStore } from './balances-store';
import { custodyStore } from './custody-store';
import { notificationsStore } from './notifications-store';

const supabase = getSupabaseClient();

export interface BackupData {
  id: string;
  timestamp: Date;
  type: 'manual' | 'automatic';
  size: number;
  checksum: string;
  data: {
    balances: any;
    custody: any;
    transactions: any;
    metadata: any;
  };
}

export interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'manual' | 'automatic';
  size: number;
  checksumMD5: string;
  status: 'completed' | 'failed' | 'in_progress';
  filename: string;
}

const STORAGE_KEY = 'backup_schedule';
const BUCKET_NAME = 'backups';

class BackupManager {
  private intervalId: NodeJS.Timeout | null = null;
  private isBackupInProgress = false;

  constructor() {
    this.loadSchedule();
    this.initializeBucket();
  }

  /**
   * Initialize Supabase Storage bucket
   */
  private async initializeBucket(): Promise<void> {
    if (!supabase) return;

    try {
      const { data: buckets } = await supabase.storage.listBuckets();

      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);

      if (!bucketExists) {
        await supabase.storage.createBucket(BUCKET_NAME, {
          public: false,
          fileSizeLimit: 52428800 // 50MB
        });

        console.log('[BackupManager] Bucket created successfully');
      }
    } catch (error) {
      console.error('[BackupManager] Error initializing bucket:', error);
    }
  }

  /**
   * Create backup
   */
  async createBackup(type: 'manual' | 'automatic' = 'manual'): Promise<BackupMetadata | null> {
    if (this.isBackupInProgress) {
      notificationsStore.warning(
        'Respaldo en progreso',
        'Ya hay un respaldo ejecutándose. Por favor espera.'
      );
      return null;
    }

    this.isBackupInProgress = true;

    try {
      // Collect data
      const balances = balanceStore.loadBalances();
      const custody = custodyStore.getAccounts();
      const transactions = this.getTransactionsFromLocalStorage();

      const backupData: BackupData = {
        id: crypto.randomUUID(),
        timestamp: new Date(),
        type,
        size: 0,
        checksum: '',
        data: {
          balances: balances || {},
          custody: custody || [],
          transactions: transactions || [],
          metadata: {
            version: '1.0',
            createdBy: 'system',
            environment: 'production'
          }
        }
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      // Calculate size and checksum
      backupData.size = blob.size;
      backupData.checksum = await this.calculateChecksum(jsonString);

      // Generate filename
      const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

      // Upload to Supabase Storage
      if (supabase) {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filename, blob);

        if (uploadError) throw uploadError;
      }

      // Save to localStorage as fallback
      const recentBackups = this.getRecentBackups();
      recentBackups.unshift({
        id: backupData.id,
        timestamp: backupData.timestamp,
        type: backupData.type,
        size: backupData.size,
        checksumMD5: backupData.checksum,
        status: 'completed',
        filename
      });

      // Keep only last 10 backups
      localStorage.setItem('backup_history', JSON.stringify(recentBackups.slice(0, 10)));

      notificationsStore.success(
        'Respaldo completado',
        `Respaldo creado exitosamente (${this.formatSize(backupData.size)})`,
        { priority: 'medium' }
      );

      console.log('[BackupManager] Backup created:', filename);

      return {
        id: backupData.id,
        timestamp: backupData.timestamp,
        type: backupData.type,
        size: backupData.size,
        checksumMD5: backupData.checksum,
        status: 'completed',
        filename
      };
    } catch (error) {
      console.error('[BackupManager] Error creating backup:', error);

      notificationsStore.error(
        'Error en respaldo',
        'No se pudo crear el respaldo. Intenta de nuevo.',
        { priority: 'high' }
      );

      return null;
    } finally {
      this.isBackupInProgress = false;
    }
  }

  /**
   * Restore backup
   */
  async restoreBackup(backupId: string): Promise<boolean> {
    try {
      const backups = this.getRecentBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) {
        throw new Error('Backup not found');
      }

      if (!supabase) {
        throw new Error('Supabase not available');
      }

      // Download from Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(backup.filename);

      if (error) throw error;

      const text = await data.text();
      const backupData: BackupData = JSON.parse(text);

      // Verify checksum
      const checksum = await this.calculateChecksum(text);
      if (checksum !== backupData.checksum) {
        throw new Error('Checksum mismatch - backup may be corrupted');
      }

      // Restore data
      if (backupData.data.balances) {
        localStorage.setItem('Digital Commercial Bank Ltd_analyzed_balances', JSON.stringify(backupData.data.balances));
      }

      if (backupData.data.custody) {
        localStorage.setItem('Digital Commercial Bank Ltd_custody_accounts', JSON.stringify({
          accounts: backupData.data.custody,
          lastSync: new Date().toISOString()
        }));
      }

      if (backupData.data.transactions) {
        localStorage.setItem('transactions_history', JSON.stringify(backupData.data.transactions));
      }

      notificationsStore.success(
        'Respaldo restaurado',
        'Los datos han sido restaurados exitosamente',
        { priority: 'high' }
      );

      console.log('[BackupManager] Backup restored:', backupId);

      // Reload page to reflect changes
      setTimeout(() => window.location.reload(), 2000);

      return true;
    } catch (error) {
      console.error('[BackupManager] Error restoring backup:', error);

      notificationsStore.error(
        'Error en restauración',
        'No se pudo restaurar el respaldo',
        { priority: 'critical' }
      );

      return false;
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleAutoBackup(intervalHours: number): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    this.intervalId = setInterval(() => {
      this.createBackup('automatic');
    }, intervalMs);

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ intervalHours }));

    notificationsStore.info(
      'Respaldos programados',
      `Respaldos automáticos cada ${intervalHours} horas`,
      { priority: 'medium' }
    );

    console.log(`[BackupManager] Auto-backup scheduled every ${intervalHours} hours`);
  }

  /**
   * Stop automatic backups
   */
  stopAutoBackup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    localStorage.removeItem(STORAGE_KEY);

    console.log('[BackupManager] Auto-backup stopped');
  }

  /**
   * Get recent backups
   */
  getRecentBackups(): BackupMetadata[] {
    try {
      const stored = localStorage.getItem('backup_history');
      if (!stored) return [];

      const backups = JSON.parse(stored);

      return backups.map((b: any) => ({
        ...b,
        timestamp: new Date(b.timestamp)
      }));
    } catch (error) {
      console.error('[BackupManager] Error loading backup history:', error);
      return [];
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const backups = this.getRecentBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup) return false;

      // Delete from Supabase Storage
      if (supabase) {
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([backup.filename]);
      }

      // Remove from history
      const filtered = backups.filter(b => b.id !== backupId);
      localStorage.setItem('backup_history', JSON.stringify(filtered));

      console.log('[BackupManager] Backup deleted:', backupId);

      return true;
    } catch (error) {
      console.error('[BackupManager] Error deleting backup:', error);
      return false;
    }
  }

  /**
   * Download backup
   */
  async downloadBackup(backupId: string): Promise<void> {
    try {
      const backups = this.getRecentBackups();
      const backup = backups.find(b => b.id === backupId);

      if (!backup || !supabase) return;

      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(backup.filename);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[BackupManager] Error downloading backup:', error);
    }
  }

  /**
   * Calculate checksum (MD5 equivalent using SubtleCrypto)
   */
  private async calculateChecksum(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Format size
   */
  private formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} bytes`;
  }

  /**
   * Get transactions from localStorage
   */
  private getTransactionsFromLocalStorage(): any {
    try {
      const stored = localStorage.getItem('transactions_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Load schedule
   */
  private loadSchedule(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const { intervalHours } = JSON.parse(stored);
        this.scheduleAutoBackup(intervalHours);
      }
    } catch (error) {
      console.error('[BackupManager] Error loading schedule:', error);
    }
  }
}

// Export singleton instance
export const backupManager = new BackupManager();
