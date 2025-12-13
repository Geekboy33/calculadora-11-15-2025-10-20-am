/**
 * LEDGER DAES TERMINAL - Sistema de Base de Datos
 * Usa IndexedDB para persistencia local con soporte completo para:
 * - Perfiles de usuario
 * - Cuentas bancarias
 * - Historiales de transacciones
 * - Configuraciones de APIs
 * - Auditoría y logs
 */

// ════════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ════════════════════════════════════════════════════════════════════════════

export interface DBProfile {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'operator' | 'viewer';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  settings: Record<string, unknown>;
}

export interface DBAccount {
  id: string;
  profileId: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  balance: number;
  bankName: string;
  accountType: 'checking' | 'savings' | 'custody' | 'trading';
  createdAt: string;
  updatedAt: string;
  sequenceNumber: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface DBTransaction {
  id: string;
  profileId: string;
  accountId: string;
  type: 'credit' | 'debit' | 'transfer' | 'fee' | 'interest';
  amount: number;
  currency: string;
  description: string;
  reference: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  counterparty?: string;
  module: string;
  metadata?: Record<string, unknown>;
}

export interface DBAPIConfig {
  id: string;
  name: string;
  module: string;
  baseUrl: string;
  apiKey?: string;
  accessToken?: string;
  environment: 'test' | 'production';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastConnected?: string;
  settings: Record<string, unknown>;
}

export interface DBAuditLog {
  id: string;
  profileId?: string;
  action: string;
  module: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DBBlackScreen {
  id: string;
  profileId: string;
  data: Record<string, unknown>;
  createdAt: string;
  txnReference: string;
}

export interface DBCustodyAccount {
  id: string;
  profileId: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface DBSberbankPayment {
  id: string;
  profileId: string;
  externalId: string;
  number: string;
  date: string;
  amount: number;
  status: string;
  payerName: string;
  payeeName: string;
  purpose: string;
  createdAt: string;
  response?: Record<string, unknown>;
}

// ════════════════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL DE BASE DE DATOS
// ════════════════════════════════════════════════════════════════════════════

const DB_NAME = 'LedgerDAESTerminal';
const DB_VERSION = 1;

class LedgerDatabase {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  // Nombres de los stores
  private stores = {
    profiles: 'profiles',
    accounts: 'accounts',
    transactions: 'transactions',
    apiConfigs: 'apiConfigs',
    auditLogs: 'auditLogs',
    blackScreens: 'blackScreens',
    custodyAccounts: 'custodyAccounts',
    sberbankPayments: 'sberbankPayments',
    settings: 'settings',
  };

  // ════════════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ════════════════════════════════════════════════════════════════════════

  async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[Database] Error opening database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('[Database] ✅ Database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        console.log('[Database] Creating/upgrading database schema...');

        // Profiles store
        if (!db.objectStoreNames.contains(this.stores.profiles)) {
          const profileStore = db.createObjectStore(this.stores.profiles, { keyPath: 'id' });
          profileStore.createIndex('name', 'name', { unique: false });
          profileStore.createIndex('email', 'email', { unique: false });
          profileStore.createIndex('isActive', 'isActive', { unique: false });
          profileStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Accounts store
        if (!db.objectStoreNames.contains(this.stores.accounts)) {
          const accountStore = db.createObjectStore(this.stores.accounts, { keyPath: 'id' });
          accountStore.createIndex('profileId', 'profileId', { unique: false });
          accountStore.createIndex('accountNumber', 'accountNumber', { unique: false });
          accountStore.createIndex('currency', 'currency', { unique: false });
          accountStore.createIndex('sequenceNumber', 'sequenceNumber', { unique: false });
          accountStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Transactions store
        if (!db.objectStoreNames.contains(this.stores.transactions)) {
          const txStore = db.createObjectStore(this.stores.transactions, { keyPath: 'id' });
          txStore.createIndex('profileId', 'profileId', { unique: false });
          txStore.createIndex('accountId', 'accountId', { unique: false });
          txStore.createIndex('type', 'type', { unique: false });
          txStore.createIndex('status', 'status', { unique: false });
          txStore.createIndex('createdAt', 'createdAt', { unique: false });
          txStore.createIndex('module', 'module', { unique: false });
        }

        // API Configs store
        if (!db.objectStoreNames.contains(this.stores.apiConfigs)) {
          const apiStore = db.createObjectStore(this.stores.apiConfigs, { keyPath: 'id' });
          apiStore.createIndex('module', 'module', { unique: false });
          apiStore.createIndex('isActive', 'isActive', { unique: false });
        }

        // Audit Logs store
        if (!db.objectStoreNames.contains(this.stores.auditLogs)) {
          const auditStore = db.createObjectStore(this.stores.auditLogs, { keyPath: 'id' });
          auditStore.createIndex('profileId', 'profileId', { unique: false });
          auditStore.createIndex('action', 'action', { unique: false });
          auditStore.createIndex('module', 'module', { unique: false });
          auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Black Screens store
        if (!db.objectStoreNames.contains(this.stores.blackScreens)) {
          const bsStore = db.createObjectStore(this.stores.blackScreens, { keyPath: 'id' });
          bsStore.createIndex('profileId', 'profileId', { unique: false });
          bsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Custody Accounts store
        if (!db.objectStoreNames.contains(this.stores.custodyAccounts)) {
          const custodyStore = db.createObjectStore(this.stores.custodyAccounts, { keyPath: 'id' });
          custodyStore.createIndex('profileId', 'profileId', { unique: false });
          custodyStore.createIndex('currency', 'currency', { unique: false });
        }

        // Sberbank Payments store
        if (!db.objectStoreNames.contains(this.stores.sberbankPayments)) {
          const sberbankStore = db.createObjectStore(this.stores.sberbankPayments, { keyPath: 'id' });
          sberbankStore.createIndex('profileId', 'profileId', { unique: false });
          sberbankStore.createIndex('externalId', 'externalId', { unique: true });
          sberbankStore.createIndex('status', 'status', { unique: false });
          sberbankStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains(this.stores.settings)) {
          db.createObjectStore(this.stores.settings, { keyPath: 'key' });
        }

        console.log('[Database] ✅ Schema created successfully');
      };
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // MÉTODOS GENÉRICOS CRUD
  // ════════════════════════════════════════════════════════════════════════

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    if (!this.db) await this.init();
    const transaction = this.db!.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  // ════════════════════════════════════════════════════════════════════════
  // PERFILES
  // ════════════════════════════════════════════════════════════════════════

  async createProfile(profile: Omit<DBProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<DBProfile> {
    const store = await this.getStore(this.stores.profiles, 'readwrite');
    const newProfile: DBProfile = {
      ...profile,
      id: this.generateId(),
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newProfile);
      request.onsuccess = () => {
        this.addAuditLog('CREATE_PROFILE', 'profiles', `Profile created: ${newProfile.name}`, newProfile.id);
        resolve(newProfile);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getProfile(id: string): Promise<DBProfile | undefined> {
    const store = await this.getStore(this.stores.profiles);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProfiles(): Promise<DBProfile[]> {
    const store = await this.getStore(this.stores.profiles);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateProfile(id: string, updates: Partial<DBProfile>): Promise<DBProfile | undefined> {
    const existing = await this.getProfile(id);
    if (!existing) return undefined;

    const store = await this.getStore(this.stores.profiles, 'readwrite');
    const updated: DBProfile = {
      ...existing,
      ...updates,
      id,
      updatedAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => {
        this.addAuditLog('UPDATE_PROFILE', 'profiles', `Profile updated: ${updated.name}`, id);
        resolve(updated);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProfile(id: string): Promise<boolean> {
    const profile = await this.getProfile(id);
    const store = await this.getStore(this.stores.profiles, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        this.addAuditLog('DELETE_PROFILE', 'profiles', `Profile deleted: ${profile?.name || id}`, id);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // CUENTAS
  // ════════════════════════════════════════════════════════════════════════

  async createAccount(account: Omit<DBAccount, 'id' | 'createdAt' | 'updatedAt' | 'sequenceNumber'>): Promise<DBAccount> {
    // Get next sequence number
    const allAccounts = await this.getAllAccounts();
    const nextSequence = allAccounts.length + 1;

    const store = await this.getStore(this.stores.accounts, 'readwrite');
    const newAccount: DBAccount = {
      ...account,
      id: this.generateId(),
      sequenceNumber: nextSequence,
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newAccount);
      request.onsuccess = () => {
        this.addAuditLog('CREATE_ACCOUNT', 'accounts', `Account created: ${newAccount.accountNumber} (${newAccount.currency})`, newAccount.profileId);
        resolve(newAccount);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAccount(id: string): Promise<DBAccount | undefined> {
    const store = await this.getStore(this.stores.accounts);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllAccounts(): Promise<DBAccount[]> {
    const store = await this.getStore(this.stores.accounts);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAccountsByProfile(profileId: string): Promise<DBAccount[]> {
    const store = await this.getStore(this.stores.accounts);
    const index = store.index('profileId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(profileId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateAccount(id: string, updates: Partial<DBAccount>): Promise<DBAccount | undefined> {
    const existing = await this.getAccount(id);
    if (!existing) return undefined;

    const store = await this.getStore(this.stores.accounts, 'readwrite');
    const updated: DBAccount = {
      ...existing,
      ...updates,
      id,
      updatedAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => {
        this.addAuditLog('UPDATE_ACCOUNT', 'accounts', `Account updated: ${updated.accountNumber}`, updated.profileId);
        resolve(updated);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAccount(id: string): Promise<boolean> {
    const account = await this.getAccount(id);
    const store = await this.getStore(this.stores.accounts, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        this.addAuditLog('DELETE_ACCOUNT', 'accounts', `Account deleted: ${account?.accountNumber || id}`, account?.profileId);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // TRANSACCIONES
  // ════════════════════════════════════════════════════════════════════════

  async createTransaction(tx: Omit<DBTransaction, 'id' | 'createdAt'>): Promise<DBTransaction> {
    const store = await this.getStore(this.stores.transactions, 'readwrite');
    const newTx: DBTransaction = {
      ...tx,
      id: this.generateId(),
      createdAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newTx);
      request.onsuccess = () => {
        this.addAuditLog('CREATE_TRANSACTION', tx.module, `Transaction: ${tx.type} ${tx.amount} ${tx.currency}`, tx.profileId);
        resolve(newTx);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTransactions(): Promise<DBTransaction[]> {
    const store = await this.getStore(this.stores.transactions);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTransactionsByProfile(profileId: string): Promise<DBTransaction[]> {
    const store = await this.getStore(this.stores.transactions);
    const index = store.index('profileId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(profileId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTransactionsByModule(module: string): Promise<DBTransaction[]> {
    const store = await this.getStore(this.stores.transactions);
    const index = store.index('module');
    return new Promise((resolve, reject) => {
      const request = index.getAll(module);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTransaction(id: string): Promise<boolean> {
    const store = await this.getStore(this.stores.transactions, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => {
        this.addAuditLog('DELETE_TRANSACTION', 'transactions', `Transaction deleted: ${id}`);
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // API CONFIGS
  // ════════════════════════════════════════════════════════════════════════

  async saveAPIConfig(config: Omit<DBAPIConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<DBAPIConfig> {
    const store = await this.getStore(this.stores.apiConfigs, 'readwrite');
    const newConfig: DBAPIConfig = {
      ...config,
      id: this.generateId(),
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(newConfig);
      request.onsuccess = () => {
        this.addAuditLog('CREATE_API_CONFIG', config.module, `API configured: ${config.name}`);
        resolve(newConfig);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAPIConfigByModule(module: string): Promise<DBAPIConfig | undefined> {
    const store = await this.getStore(this.stores.apiConfigs);
    const index = store.index('module');
    return new Promise((resolve, reject) => {
      const request = index.get(module);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllAPIConfigs(): Promise<DBAPIConfig[]> {
    const store = await this.getStore(this.stores.apiConfigs);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateAPIConfig(id: string, updates: Partial<DBAPIConfig>): Promise<DBAPIConfig | undefined> {
    const existing = await this.getAPIConfig(id);
    if (!existing) return undefined;

    const store = await this.getStore(this.stores.apiConfigs, 'readwrite');
    const updated: DBAPIConfig = {
      ...existing,
      ...updates,
      id,
      updatedAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  async getAPIConfig(id: string): Promise<DBAPIConfig | undefined> {
    const store = await this.getStore(this.stores.apiConfigs);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteAPIConfig(id: string): Promise<boolean> {
    const store = await this.getStore(this.stores.apiConfigs, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // AUDIT LOGS
  // ════════════════════════════════════════════════════════════════════════

  async addAuditLog(action: string, module: string, details: string, profileId?: string): Promise<void> {
    try {
      const store = await this.getStore(this.stores.auditLogs, 'readwrite');
      const log: DBAuditLog = {
        id: this.generateId(),
        profileId,
        action,
        module,
        details,
        timestamp: this.getCurrentTimestamp(),
      };
      store.add(log);
    } catch (error) {
      console.error('[Database] Error adding audit log:', error);
    }
  }

  async getAllAuditLogs(): Promise<DBAuditLog[]> {
    const store = await this.getStore(this.stores.auditLogs);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const logs = request.result || [];
        // Sort by timestamp descending
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        resolve(logs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAuditLogs(): Promise<void> {
    const store = await this.getStore(this.stores.auditLogs, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // BLACK SCREENS
  // ════════════════════════════════════════════════════════════════════════

  async saveBlackScreen(profileId: string, data: Record<string, unknown>, txnReference: string): Promise<DBBlackScreen> {
    const store = await this.getStore(this.stores.blackScreens, 'readwrite');
    const record: DBBlackScreen = {
      id: this.generateId(),
      profileId,
      data,
      txnReference,
      createdAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => {
        this.addAuditLog('CREATE_BLACKSCREEN', 'blackscreen', `BlackScreen generated: ${txnReference}`, profileId);
        resolve(record);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllBlackScreens(): Promise<DBBlackScreen[]> {
    const store = await this.getStore(this.stores.blackScreens);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBlackScreen(id: string): Promise<boolean> {
    const store = await this.getStore(this.stores.blackScreens, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // CUSTODY ACCOUNTS
  // ════════════════════════════════════════════════════════════════════════

  async saveCustodyAccount(account: Omit<DBCustodyAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<DBCustodyAccount> {
    const store = await this.getStore(this.stores.custodyAccounts, 'readwrite');
    const record: DBCustodyAccount = {
      ...account,
      id: this.generateId(),
      createdAt: this.getCurrentTimestamp(),
      updatedAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => {
        this.addAuditLog('CREATE_CUSTODY', 'custody', `Custody account: ${account.accountNumber}`, account.profileId);
        resolve(record);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllCustodyAccounts(): Promise<DBCustodyAccount[]> {
    const store = await this.getStore(this.stores.custodyAccounts);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteCustodyAccount(id: string): Promise<boolean> {
    const store = await this.getStore(this.stores.custodyAccounts, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SBERBANK PAYMENTS
  // ════════════════════════════════════════════════════════════════════════

  async saveSberbankPayment(payment: Omit<DBSberbankPayment, 'id' | 'createdAt'>): Promise<DBSberbankPayment> {
    const store = await this.getStore(this.stores.sberbankPayments, 'readwrite');
    const record: DBSberbankPayment = {
      ...payment,
      id: this.generateId(),
      createdAt: this.getCurrentTimestamp(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => {
        this.addAuditLog('CREATE_SBERBANK', 'sberbank', `Payment: ${payment.amount} RUB to ${payment.payeeName}`, payment.profileId);
        resolve(record);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSberbankPayments(): Promise<DBSberbankPayment[]> {
    const store = await this.getStore(this.stores.sberbankPayments);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSberbankPayment(id: string): Promise<boolean> {
    const store = await this.getStore(this.stores.sberbankPayments, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // SETTINGS
  // ════════════════════════════════════════════════════════════════════════

  async setSetting(key: string, value: unknown): Promise<void> {
    const store = await this.getStore(this.stores.settings, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSetting<T>(key: string): Promise<T | undefined> {
    const store = await this.getStore(this.stores.settings);
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value);
      request.onerror = () => reject(request.error);
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // EXPORT / IMPORT
  // ════════════════════════════════════════════════════════════════════════

  async exportAllData(): Promise<Record<string, unknown[]>> {
    const data: Record<string, unknown[]> = {};
    
    data.profiles = await this.getAllProfiles();
    data.accounts = await this.getAllAccounts();
    data.transactions = await this.getAllTransactions();
    data.apiConfigs = await this.getAllAPIConfigs();
    data.auditLogs = await this.getAllAuditLogs();
    data.blackScreens = await this.getAllBlackScreens();
    data.custodyAccounts = await this.getAllCustodyAccounts();
    data.sberbankPayments = await this.getAllSberbankPayments();

    return data;
  }

  async getStats(): Promise<{
    profiles: number;
    accounts: number;
    transactions: number;
    apiConfigs: number;
    auditLogs: number;
    blackScreens: number;
    custodyAccounts: number;
    sberbankPayments: number;
  }> {
    return {
      profiles: (await this.getAllProfiles()).length,
      accounts: (await this.getAllAccounts()).length,
      transactions: (await this.getAllTransactions()).length,
      apiConfigs: (await this.getAllAPIConfigs()).length,
      auditLogs: (await this.getAllAuditLogs()).length,
      blackScreens: (await this.getAllBlackScreens()).length,
      custodyAccounts: (await this.getAllCustodyAccounts()).length,
      sberbankPayments: (await this.getAllSberbankPayments()).length,
    };
  }

  // Clear all data (dangerous!)
  async clearAllData(): Promise<void> {
    const storeNames = Object.values(this.stores);
    for (const storeName of storeNames) {
      const store = await this.getStore(storeName, 'readwrite');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    console.log('[Database] All data cleared');
  }
}

// Singleton instance
export const ledgerDB = new LedgerDatabase();

// Initialize on import
ledgerDB.init().catch(console.error);

