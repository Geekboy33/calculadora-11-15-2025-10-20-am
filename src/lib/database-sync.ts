/**
 * Database Sync Service
 * Sincroniza los stores locales con la base de datos IndexedDB
 * para persistencia y auditoría
 */

import { ledgerDB, DBProfile, DBAccount, DBTransaction } from './database';
import { profilesStore, ProfileRecord } from './profiles-store';
import { custodyStore } from './custody-store';
import { balanceStore } from './balance-store';

// ID del perfil activo actual (para asociar cuentas y transacciones)
let activeProfileId: string | null = null;

/**
 * Inicializa la sincronización de la base de datos
 */
export async function initDatabaseSync() {
  try {
    await ledgerDB.init();
    console.log('[DatabaseSync] ✅ Database initialized');

    // Suscribirse a cambios en profiles-store
    profilesStore.subscribe(async (state) => {
      activeProfileId = state.activeProfileId;
      
      // Sincronizar perfiles con la base de datos
      for (const profile of state.profiles) {
        await syncProfile(profile);
      }
    });

    // Log inicial
    await ledgerDB.addAuditLog('SYSTEM_START', 'system', 'Database sync initialized');

    return true;
  } catch (error) {
    console.error('[DatabaseSync] Error initializing:', error);
    return false;
  }
}

/**
 * Sincroniza un perfil con la base de datos
 */
async function syncProfile(profile: ProfileRecord) {
  try {
    const existingProfiles = await ledgerDB.getAllProfiles();
    const exists = existingProfiles.find(p => p.id === profile.id);

    if (!exists) {
      // Crear nuevo perfil en DB
      await ledgerDB.createProfile({
        name: profile.name,
        email: undefined,
        role: 'operator',
        isActive: true,
        settings: {
          description: profile.description,
          stats: profile.stats,
        },
      });
    }
  } catch (error) {
    console.error('[DatabaseSync] Error syncing profile:', error);
  }
}

/**
 * Registra una transacción en la base de datos
 */
export async function logTransaction(
  type: 'credit' | 'debit' | 'transfer' | 'fee' | 'interest',
  amount: number,
  currency: string,
  description: string,
  module: string,
  status: 'pending' | 'completed' | 'failed' | 'cancelled' = 'completed',
  metadata?: Record<string, unknown>
): Promise<DBTransaction | null> {
  try {
    const reference = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    
    const tx = await ledgerDB.createTransaction({
      profileId: activeProfileId || 'default',
      accountId: 'default',
      type,
      amount,
      currency,
      description,
      reference,
      status,
      module,
      metadata,
    });

    console.log('[DatabaseSync] Transaction logged:', reference);
    return tx;
  } catch (error) {
    console.error('[DatabaseSync] Error logging transaction:', error);
    return null;
  }
}

/**
 * Registra una cuenta en la base de datos
 */
export async function logAccount(
  accountNumber: string,
  accountName: string,
  currency: string,
  balance: number,
  bankName: string,
  accountType: 'checking' | 'savings' | 'custody' | 'trading' = 'checking',
  metadata?: Record<string, unknown>
): Promise<DBAccount | null> {
  try {
    // Verificar si ya existe
    const existing = await ledgerDB.getAllAccounts();
    const exists = existing.find(a => a.accountNumber === accountNumber);
    
    if (exists) {
      // Actualizar balance
      await ledgerDB.updateAccount(exists.id, { balance, updatedAt: new Date().toISOString() });
      return exists;
    }

    const account = await ledgerDB.createAccount({
      profileId: activeProfileId || 'default',
      accountNumber,
      accountName,
      currency,
      balance,
      bankName,
      accountType,
      isActive: true,
      metadata,
    });

    console.log('[DatabaseSync] Account logged:', accountNumber);
    return account;
  } catch (error) {
    console.error('[DatabaseSync] Error logging account:', error);
    return null;
  }
}

/**
 * Registra una configuración de API en la base de datos
 */
export async function logAPIConfig(
  name: string,
  module: string,
  baseUrl: string,
  environment: 'test' | 'production',
  settings?: Record<string, unknown>
) {
  try {
    await ledgerDB.saveAPIConfig({
      name,
      module,
      baseUrl,
      environment,
      isActive: true,
      settings: settings || {},
    });
    console.log('[DatabaseSync] API config logged:', name);
  } catch (error) {
    console.error('[DatabaseSync] Error logging API config:', error);
  }
}

/**
 * Registra un evento en el log de auditoría
 */
export async function logAuditEvent(
  action: string,
  module: string,
  details: string
) {
  try {
    await ledgerDB.addAuditLog(action, module, details, activeProfileId || undefined);
  } catch (error) {
    console.error('[DatabaseSync] Error logging audit event:', error);
  }
}

/**
 * Sincroniza las cuentas custody con la base de datos
 */
export async function syncCustodyAccounts() {
  try {
    const accounts = custodyStore.getState().accounts;
    
    for (const account of accounts) {
      await ledgerDB.saveCustodyAccount({
        profileId: activeProfileId || 'default',
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        currency: account.currency,
        balance: account.balance,
      });
    }
    
    console.log('[DatabaseSync] Custody accounts synced:', accounts.length);
  } catch (error) {
    console.error('[DatabaseSync] Error syncing custody accounts:', error);
  }
}

/**
 * Obtiene estadísticas de la base de datos
 */
export async function getDatabaseStats() {
  return await ledgerDB.getStats();
}

/**
 * Exporta todos los datos de la base de datos
 */
export async function exportAllData() {
  return await ledgerDB.exportAllData();
}

// Auto-inicialización
if (typeof window !== 'undefined') {
  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initDatabaseSync, 1000);
    });
  } else {
    setTimeout(initDatabaseSync, 1000);
  }
}

