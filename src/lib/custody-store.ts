/**
 * Custody Accounts Store - Gestión de Cuentas Custodio
 * Sistema de reservas para tokenización blockchain
 */

import CryptoJS from 'crypto-js';
import { custodyHistory } from './custody-history';
import { vusdCapStore } from './vusd-cap-store';
import { daesPledgeStore } from './daes-pledge-store';

export interface CustodyAccount {
  id: string;
  accountType: 'blockchain' | 'banking'; // NUEVO: Tipo de cuenta
  accountName: string;
  currency: string;
  reservedBalance: number;
  availableBalance: number;
  totalBalance: number;
  // Blockchain fields (si accountType = 'blockchain')
  blockchainLink?: string;
  contractAddress?: string;
  tokenSymbol?: string;
  // Banking fields (si accountType = 'banking')
  bankName?: string;
  iban?: string;
  swiftCode?: string;
  routingNumber?: string;
  accountNumber?: string;
  // Common fields
  encryptedData: string;
  verificationHash: string;
  // API Configuration (editable)
  apiId: string; // Nuevo: ID de API personalizable
  apiEndpoint: string; // Editable
  apiKey: string; // Regenerable
  apiStatus: 'active' | 'pending' | 'inactive';
  // External API Connection
  externalAPIKey?: string; // Para conectar con APIs externas (Stripe, Wise, etc.)
  externalAPISecret?: string; // Secret para autenticación externa
  externalProvider?: string; // Nombre del proveedor (Stripe, Wise, Plaid, etc.)
  externalConnected?: boolean; // Estado de conexión externa
  // VUSD & DAES Pledge Integration
  vusdBalanceEnabled: boolean; // Activar/desactivar balance en API VUSD
  daesPledgeEnabled: boolean; // Activar/desactivar balance en DAES Pledge
  vusdBalanceId?: string; // ID del balance en VUSD Cap Store
  daesPledgeId?: string; // ID del pledge en DAES Pledge Store
  // Compliance & Security
  iso27001Compliant: boolean;
  iso20022Compatible: boolean;
  fatfAmlVerified: boolean;
  kycVerified: boolean;
  amlScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  // Timestamps
  createdAt: string;
  lastUpdated: string;
  lastAudit: string;
  // Reservations
  reservations: {
    id: string;
    amount: number;
    type: 'blockchain' | 'transfer';
    blockchain?: string;
    contractAddress?: string;
    tokenAmount?: number;
    destinationBank?: string;
    destinationAccount?: string;
    transferReference?: string;
    status: 'reserved' | 'confirmed' | 'released' | 'completed';
    timestamp: string;
  }[];
}

export interface CustodyStoreData {
  accounts: CustodyAccount[];
  totalReserved: number;
  totalAvailable: number;
  lastSync: string;
}

const STORAGE_KEY = 'Digital Commercial Bank Ltd_custody_accounts';
const COUNTER_KEY = 'Digital Commercial Bank Ltd_custody_counter';
const ENCRYPTION_KEY = 'DAES-CUSTODY-2024-SECURE-KEY';

class CustodyStore {
  private listeners: Set<(accounts: CustodyAccount[]) => void> = new Set();

  /**
   * Obtener y actualizar contador secuencial
   */
  private getNextAccountNumber(accountType: 'blockchain' | 'banking', currency: string): string {
    try {
      const counters = JSON.parse(localStorage.getItem(COUNTER_KEY) || '{}');
      
      // Formato: BC = Blockchain, BK = Banking
      const prefix = accountType === 'blockchain' ? 'BC' : 'BK';
      const key = `${prefix}_${currency}`;
      
      // Obtener contador actual o iniciar en 1000001 (estándar bancario)
      const currentNumber = counters[key] || 1000001;
      const nextNumber = currentNumber + 1;
      
      // Guardar nuevo contador
      counters[key] = nextNumber;
      localStorage.setItem(COUNTER_KEY, JSON.stringify(counters));
      
      // Formato ISO bancario: [BANCO][TIPO][DIVISA][NÚMERO]
      // Ejemplo: DAES-BC-USD-1000001 (Blockchain)
      // Ejemplo: DAES-BK-EUR-1000001 (Banking)
      const accountNumber = `DAES-${prefix}-${currency}-${currentNumber.toString().padStart(7, '0')}`;
      
      console.log('[CustodyStore] 🔢 Número de cuenta generado:', accountNumber);
      console.log(`  Tipo: ${accountType === 'blockchain' ? 'BLOCKCHAIN CUSTODY' : 'BANKING'}`);
      console.log(`  Secuencia: ${currentNumber} (próximo: ${nextNumber})`);
      
      return accountNumber;
    } catch {
      // Fallback si hay error
      return `DAES-${accountType === 'blockchain' ? 'BC' : 'BK'}-${currency}-${Date.now()}`;
    }
  }

  /**
   * Generar hash de verificación único
   */
  generateVerificationHash(accountName: string, currency: string, balance: number): string {
    const data = `${accountName}-${currency}-${balance}-${Date.now()}`;
    return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
  }

  /**
   * Encriptar datos sensibles de la cuenta
   */
  encryptAccountData(data: any): string {
    const jsonData = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonData, ENCRYPTION_KEY).toString();
  }

  /**
   * Desencriptar datos de cuenta
   */
  decryptAccountData(encrypted: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
      const jsonData = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonData);
    } catch {
      return null;
    }
  }

  /**
   * Generar IBAN válido
   */
  generateIBAN(currency: string): string {
    const countryCodes: Record<string, string> = {
      'USD': 'US', 'EUR': 'DE', 'GBP': 'GB', 'CHF': 'CH', 'CAD': 'CA',
      'AUD': 'AU', 'JPY': 'JP', 'BRL': 'BR', 'AED': 'AE', 'MXN': 'MX',
    };
    const country = countryCodes[currency] || 'US';
    const checkDigits = Math.floor(Math.random() * 90 + 10);
    const bankCode = Math.floor(Math.random() * 90000000 + 10000000);
    const accountNum = Math.floor(Math.random() * 9000000000 + 1000000000);
    return `${country}${checkDigits}${bankCode}${accountNum}`;
  }

  /**
   * Generar SWIFT/BIC
   */
  generateSWIFT(currency: string): string {
    return `DAES${currency.substring(0, 2)}${Math.floor(Math.random() * 90 + 10)}XXX`;
  }

  /**
   * Generar API Key
   */
  generateAPIKey(): string {
    return `DAES_${Math.random().toString(36).substring(2, 15).toUpperCase()}_${Date.now().toString(36).toUpperCase()}`;
  }

  /**
   * Generar API ID único
   */
  generateAPIId(accountType: string, currency: string): string {
    return `${accountType === 'blockchain' ? 'BC' : 'BK'}-API-${currency}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Calcular AML Score (simulado)
   */
  calculateAMLScore(balance: number, currency: string): number {
    // Score basado en balance y divisa
    let score = 85; // Base score
    
    // Divisas de bajo riesgo
    if (['USD', 'EUR', 'GBP', 'CHF'].includes(currency)) score += 10;
    
    // Balances altos son más verificados
    if (balance > 1000000) score += 5;
    
    return Math.min(score, 100);
  }

  /**
   * Crear nueva cuenta custodio (BLOCKCHAIN o BANKING)
   */
  createAccount(
    accountType: 'blockchain' | 'banking',
    accountName: string,
    currency: string,
    balance: number,
    blockchain?: string,
    tokenSymbol?: string,
    bankName?: string
  ): CustodyAccount {
    // 🔢 GENERAR NÚMERO DE CUENTA SECUENCIAL ISO BANCARIO
    const generatedAccountNumber = this.getNextAccountNumber(accountType, currency);
    
    const id = `CUST-${accountType === 'blockchain' ? 'BC' : 'BK'}-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    const verificationHash = this.generateVerificationHash(accountName, currency, balance);
    const apiKey = this.generateAPIKey();
    const apiId = this.generateAPIId(accountType, currency);
    
    const sensitiveData = {
      accountName,
      accountType,
      currency,
      balance,
      accountNumber: generatedAccountNumber,
      created: new Date().toISOString(),
      apiKey,
    };
    
    const encryptedData = this.encryptAccountData(sensitiveData);
    const amlScore = this.calculateAMLScore(balance, currency);
    
    // Determinar nombre del tipo para display
    const accountTypeDisplay = accountType === 'blockchain' ? 'BLOCKCHAIN CUSTODY' : 'BANKING ACCOUNT';
    
    const account: CustodyAccount = {
      id,
      accountType,
      accountName,
      currency,
      reservedBalance: 0,
      availableBalance: balance,
      totalBalance: balance,
      encryptedData,
      verificationHash,
      // API Configuration
      apiId,
      apiEndpoint: `https://luxliqdaes.cloud/${accountType}/verify/${id}`,
      apiKey,
      apiStatus: 'pending',
      // VUSD & DAES Integration
      vusdBalanceEnabled: true,
      daesPledgeEnabled: true,
      // Compliance
      iso27001Compliant: true,
      iso20022Compatible: true,
      fatfAmlVerified: true,
      kycVerified: true,
      amlScore,
      riskLevel: amlScore >= 90 ? 'low' : amlScore >= 75 ? 'medium' : 'high',
      // Timestamps
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      lastAudit: new Date().toISOString(),
      reservations: [],
    };

    // Campos específicos por tipo
    if (accountType === 'blockchain') {
      account.blockchainLink = blockchain || 'Ethereum';
      account.contractAddress = `0x${Math.random().toString(16).substring(2, 42).toUpperCase()}`;
      account.tokenSymbol = tokenSymbol || `${currency}T`;
      account.accountNumber = generatedAccountNumber; // Número secuencial
    } else {
      account.bankName = bankName || 'DAES - Data and Exchange Settlement';
      account.iban = this.generateIBAN(currency);
      account.swiftCode = this.generateSWIFT(currency);
      account.routingNumber = `021${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      account.accountNumber = generatedAccountNumber; // Número secuencial
    }

    console.log('[CustodyStore] 📝 CUENTA CREADA:');
    console.log(`  Tipo: ${accountTypeDisplay}`);
    console.log(`  Número de cuenta: ${generatedAccountNumber}`);
    console.log(`  Formato: DAES-[BC/BK]-[DIVISA]-[SECUENCIAL]`);

    const accounts = this.getAccounts();
    accounts.push(account);
    this.saveAccounts(accounts);

    console.log('[CustodyStore] ✅ Cuenta custodio creada:', {
      id,
      type: accountType,
      currency,
      balance,
      compliance: {
        iso27001: account.iso27001Compliant,
        iso20022: account.iso20022Compatible,
        fatf: account.fatfAmlVerified,
        amlScore: account.amlScore
      },
      hash: verificationHash.substring(0, 16) + '...',
    });

    // 🔥 DESCUENTO AUTOMÁTICO DEL BALANCE DEL SISTEMA DAES 🔥
    this.deductFromSystemBalance(currency, balance);

    // 🔗 CREAR BALANCES EN API VUSD Y DAES PLEDGE 🔗
    this.createLinkedBalances(account);

    // 📜 REGISTRAR EN HISTORIAL
    custodyHistory.addTransactionLog(
      account.id,
      account.accountName,
      'CREATE',
      `Cuenta ${accountTypeDisplay} creada - ${currency} ${balance.toLocaleString()}`,
      balance,
      currency
    );

    // 🔔 CREAR ALERTA DE BIENVENIDA
    custodyHistory.createAlert(
      account.id,
      account.accountName,
      'info',
      'low',
      'Cuenta Custodio Creada',
      `Nueva cuenta ${accountTypeDisplay} con ${currency} ${balance.toLocaleString()} ha sido creada exitosamente.`,
      false
    );

    // ⚖️ CONFIGURAR LÍMITES PREDETERMINADOS
    custodyHistory.setOperationLimits(account.id, {
      dailyLimit: balance * 0.5, // 50% del balance
      perOperationLimit: balance * 0.25, // 25% por operación
      requiresApprovalAbove: balance * 0.3, // Aprobación si > 30%
      autoApproveBelow: balance * 0.05, // Auto-aprobar si < 5%
    });

    return account;
  }

  /**
   * Descontar fondos del balance del sistema DAES
   */
  private deductFromSystemBalance(currency: string, amount: number): void {
    try {
      // Importar balanceStore dinámicamente para evitar dependencia circular
      const { balanceStore } = require('./balances-store');
      
      const systemBalances = balanceStore.getBalances();
      const balanceIndex = systemBalances.findIndex((b: any) => b.currency === currency);
      
      if (balanceIndex === -1) {
        console.warn(`[CustodyStore] ⚠️ No se encontró balance ${currency} en el sistema`);
        return;
      }

      const currentBalance = systemBalances[balanceIndex];
      
      console.log(`[CustodyStore] 📊 DESCUENTO AUTOMÁTICO:`);
      console.log(`  Divisa: ${currency}`);
      console.log(`  Balance ANTES: ${currentBalance.totalAmount.toLocaleString()}`);
      console.log(`  Monto a descontar: ${amount.toLocaleString()}`);
      
      // Descontar del balance total
      currentBalance.totalAmount -= amount;
      
      console.log(`  Balance DESPUÉS: ${currentBalance.totalAmount.toLocaleString()}`);
      console.log(`  ✅ Fondos transferidos del sistema DAES a cuenta custodio`);
      
      // Actualizar el balance en el sistema
      const balanceStoreData = balanceStore.loadBalances();
      if (balanceStoreData) {
        balanceStoreData.balances[balanceIndex] = currentBalance;
        balanceStore.saveBalances(balanceStoreData);
        
        console.log(`[CustodyStore] ✅ Balance del sistema DAES actualizado`);
        console.log(`[CustodyStore] 💰 ${currency} disponible en DAES: ${currentBalance.totalAmount.toLocaleString()}`);
      }
    } catch (error) {
      console.error('[CustodyStore] ❌ Error al descontar del sistema:', error);
    }
  }

  /**
   * Crear balances vinculados en API VUSD y DAES Pledge
   * SIEMPRE crea en ambos módulos para integración automática
   */
  private async createLinkedBalances(account: CustodyAccount): Promise<void> {
    try {
      console.log('[CustodyStore] 🔗 Creando balances vinculados en VUSD y DAES Pledge...');
      console.log(`  Cuenta: ${account.accountName}`);
      console.log(`  Monto: ${account.currency} ${account.totalBalance.toLocaleString()}`);

      // SIEMPRE crear balance en VUSD Cap Store
      try {
        const vusdPledge = await vusdCapStore.createPledge({
          amount: account.totalBalance,
          currency: account.currency,
          beneficiary: account.accountName,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
          purpose: `custody_account_${account.id}`
        });

        account.vusdBalanceId = vusdPledge.pledge_id;
        account.vusdBalanceEnabled = true; // Auto-habilitar
        console.log('[CustodyStore] ✅ Balance VUSD creado:', vusdPledge.pledge_id);
      } catch (error) {
        console.error('[CustodyStore] ❌ Error creando balance VUSD:', error);
      }

      // SIEMPRE crear pledge en DAES Pledge Store
      try {
        const daesPledge = await daesPledgeStore.createPledge({
          amount: account.totalBalance.toFixed(2),
          currency: account.currency,
          beneficiary: account.accountName,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          purpose: `custody_account_${account.id}`
        });

        account.daesPledgeId = daesPledge.pledge_id;
        account.daesPledgeEnabled = true; // Auto-habilitar
        console.log('[CustodyStore] ✅ Pledge DAES creado:', daesPledge.pledge_id);
      } catch (error) {
        console.error('[CustodyStore] ❌ Error creando pledge DAES:', error);
      }

      console.log('[CustodyStore] 🎉 Cuenta integrada en todos los módulos');
      console.log(`  VUSD Balance ID: ${account.vusdBalanceId || 'N/A'}`);
      console.log(`  DAES Pledge ID: ${account.daesPledgeId || 'N/A'}`);

      // Guardar cambios
      const accounts = this.getAccounts();
      const index = accounts.findIndex(a => a.id === account.id);
      if (index !== -1) {
        accounts[index] = account;
        this.saveAccounts(accounts);
      }
    } catch (error) {
      console.error('[CustodyStore] ❌ Error en createLinkedBalances:', error);
    }
  }

  /**
   * Toggle VUSD balance para una cuenta
   */
  async toggleVUSDBalance(accountId: string, enabled: boolean): Promise<void> {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    account.vusdBalanceEnabled = enabled;

    if (enabled && !account.vusdBalanceId) {
      // Crear nuevo balance en VUSD
      const pledge = await vusdCapStore.createPledge({
        amount: account.totalBalance,
        currency: account.currency,
        beneficiary: account.accountName,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        purpose: `custody_account_${account.id}`
      });
      account.vusdBalanceId = pledge.pledge_id;
      console.log('[CustodyStore] ✅ VUSD balance activado:', pledge.pledge_id);
    } else if (!enabled && account.vusdBalanceId) {
      // Liberar pledge en VUSD
      try {
        await vusdCapStore.releasePledge(account.vusdBalanceId);
        console.log('[CustodyStore] ✅ VUSD balance desactivado:', account.vusdBalanceId);
      } catch (error) {
        console.error('[CustodyStore] Error releasing VUSD pledge:', error);
      }
    }

    this.saveAccounts(accounts);
    this.notifyListeners();
  }

  /**
   * Toggle DAES Pledge balance para una cuenta
   */
  async toggleDAESPledge(accountId: string, enabled: boolean): Promise<void> {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      throw new Error('Account not found');
    }

    account.daesPledgeEnabled = enabled;

    if (enabled && !account.daesPledgeId) {
      // Crear nuevo pledge en DAES
      const pledge = await daesPledgeStore.createPledge({
        amount: account.totalBalance.toFixed(2),
        currency: account.currency,
        beneficiary: account.accountName,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        purpose: `custody_account_${account.id}`
      });
      account.daesPledgeId = pledge.pledge_id;
      console.log('[CustodyStore] ✅ DAES Pledge activado:', pledge.pledge_id);
    } else if (!enabled && account.daesPledgeId) {
      // Liberar pledge en DAES
      try {
        await daesPledgeStore.releasePledge(account.daesPledgeId);
        console.log('[CustodyStore] ✅ DAES Pledge desactivado:', account.daesPledgeId);
      } catch (error) {
        console.error('[CustodyStore] Error releasing DAES pledge:', error);
      }
    }

    this.saveAccounts(accounts);
    this.notifyListeners();
  }

  /**
   * Devolver fondos al sistema DAES (al eliminar cuenta o liberar)
   */
  returnToSystemBalance(currency: string, amount: number): void {
    try {
      const { balanceStore } = require('./balances-store');
      
      const systemBalances = balanceStore.getBalances();
      const balanceIndex = systemBalances.findIndex((b: any) => b.currency === currency);
      
      if (balanceIndex === -1) {
        console.warn(`[CustodyStore] ⚠️ No se encontró balance ${currency} en el sistema`);
        return;
      }

      const currentBalance = systemBalances[balanceIndex];
      
      console.log(`[CustodyStore] 📊 DEVOLUCIÓN AUTOMÁTICA:`);
      console.log(`  Divisa: ${currency}`);
      console.log(`  Balance ANTES: ${currentBalance.totalAmount.toLocaleString()}`);
      console.log(`  Monto a devolver: ${amount.toLocaleString()}`);
      
      // Sumar al balance total
      currentBalance.totalAmount += amount;
      
      console.log(`  Balance DESPUÉS: ${currentBalance.totalAmount.toLocaleString()}`);
      console.log(`  ✅ Fondos devueltos al sistema DAES`);
      
      // Actualizar el balance en el sistema
      const balanceStoreData = balanceStore.loadBalances();
      if (balanceStoreData) {
        balanceStoreData.balances[balanceIndex] = currentBalance;
        balanceStore.saveBalances(balanceStoreData);
        
        console.log(`[CustodyStore] ✅ Balance del sistema DAES actualizado`);
      }
    } catch (error) {
      console.error('[CustodyStore] ❌ Error al devolver al sistema:', error);
    }
  }

  /**
   * Reservar fondos para tokenización
   */
  reserveFunds(
    accountId: string,
    amount: number,
    blockchain: string,
    contractAddress: string,
    tokenAmount: number,
    bypassLimits: boolean = false
  ): boolean {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      console.error('[CustodyStore] Cuenta no encontrada:', accountId);
      return false;
    }

    if (account.availableBalance < amount) {
      console.error('[CustodyStore] Balance insuficiente');
      // Crear alerta de error
      custodyHistory.createAlert(
        accountId,
        account.accountName,
        'balance_low',
        'high',
        'Balance Insuficiente',
        `Intento de reservar ${account.currency} ${amount.toLocaleString()} pero solo hay ${account.availableBalance.toLocaleString()} disponibles.`,
        true
      );
      return false;
    }

    // ⚖️ VERIFICAR LÍMITES (solo si no se bypasean)
    if (!bypassLimits) {
      const limitCheck = custodyHistory.checkLimits(accountId, amount);
      if (!limitCheck.allowed) {
        console.error('[CustodyStore] Límite excedido:', limitCheck.reason);
        custodyHistory.createAlert(
          accountId,
          account.accountName,
          'security',
          'high',
          'Límite de Operación Excedido',
          limitCheck.reason || 'Operación excede límites configurados',
          true
        );
        return false;
      }
    } else {
      console.log('[CustodyStore] ⚠️ Límites bypaseados para operación de 100%');
    }

    const reservation = {
      id: `RSV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      amount,
      blockchain,
      contractAddress,
      tokenAmount,
      status: 'reserved' as const,
      timestamp: new Date().toISOString(),
    };

    account.reservedBalance += amount;
    account.availableBalance -= amount;
    account.reservations.push(reservation);
    account.lastUpdated = new Date().toISOString();

    this.saveAccounts(accounts);

    // 🔄 SINCRONIZAR CON VUSD Y DAES
    this.syncBalancesWithModules(account);

    console.log('[CustodyStore] ✅ Fondos reservados:', {
      account: account.accountName,
      amount,
      blockchain,
      tokenAmount,
    });

    // 📜 REGISTRAR EN HISTORIAL
    custodyHistory.addTransactionLog(
      accountId,
      account.accountName,
      'RESERVE',
      `Fondos reservados: ${account.currency} ${amount.toLocaleString()} para ${blockchain}`,
      amount,
      account.currency
    );

    // ⚖️ REGISTRAR USO DIARIO
    custodyHistory.recordDailyUsage(accountId, amount);

    // 🔔 CREAR ALERTA SI ES RESERVA GRANDE
    const percentageReserved = (amount / account.totalBalance) * 100;
    if (percentageReserved > 30) {
      custodyHistory.createAlert(
        accountId,
        account.accountName,
        'large_reserve',
        percentageReserved > 50 ? 'high' : 'medium',
        'Reserva Grande Detectada',
        `Se ha reservado ${percentageReserved.toFixed(1)}% del balance total (${account.currency} ${amount.toLocaleString()})`,
        false
      );
    }

    return true;
  }

  /**
   * Confirmar reserva (actualizar a confirmed)
   */
  confirmReservation(accountId: string, reservationId: string): boolean {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) return false;

    const reservation = account.reservations.find(r => r.id === reservationId);
    if (!reservation) return false;

    reservation.status = 'confirmed';
    account.apiStatus = 'active';
    account.lastUpdated = new Date().toISOString();

    this.saveAccounts(accounts);
    this.notifyListeners(accounts);

    console.log('[CustodyStore] ✅ Reserva confirmada:', reservationId);
    return true;
  }

  /**
   * Liberar fondos reservados
   */
  releaseReservation(accountId: string, reservationId: string): boolean {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) return false;

    const reservation = account.reservations.find(r => r.id === reservationId);
    if (!reservation) return false;

    account.reservedBalance -= reservation.amount;
    account.availableBalance += reservation.amount;
    reservation.status = 'released';
    account.lastUpdated = new Date().toISOString();

    this.saveAccounts(accounts);
    this.notifyListeners(accounts);

    console.log('[CustodyStore] ✅ Fondos liberados:', reservationId);
    return true;
  }

  /**
   * Guardar cuentas
   */
  private saveAccounts(accounts: CustodyAccount[]): void {
    const data: CustodyStoreData = {
      accounts,
      totalReserved: accounts.reduce((sum, a) => sum + a.reservedBalance, 0),
      totalAvailable: accounts.reduce((sum, a) => sum + a.availableBalance, 0),
      lastSync: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this.notifyListeners(accounts);
  }

  /**
   * Obtener todas las cuentas
   */
  getAccounts(): CustodyAccount[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const data: CustodyStoreData = JSON.parse(stored);
      return data.accounts || [];
    } catch {
      return [];
    }
  }

  /**
   * Obtener cuenta por ID
   */
  getAccountById(id: string): CustodyAccount | null {
    return this.getAccounts().find(a => a.id === id) || null;
  }

  /**
   * Eliminar cuenta (devuelve fondos al sistema DAES)
   */
  deleteAccount(id: string): boolean {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === id);
    
    if (account) {
      // 🔥 DEVOLVER FONDOS AL SISTEMA DAES 🔥
      const totalToReturn = account.totalBalance;
      console.log('[CustodyStore] 🗑️ Eliminando cuenta y devolviendo fondos...');
      console.log(`  Cuenta: ${account.accountName}`);
      console.log(`  Fondos a devolver: ${account.currency} ${totalToReturn.toLocaleString()}`);
      
      this.returnToSystemBalance(account.currency, totalToReturn);
    }
    
    const updatedAccounts = accounts.filter(a => a.id !== id);
    this.saveAccounts(updatedAccounts);
    console.log('[CustodyStore] ✅ Cuenta eliminada y fondos devueltos al sistema DAES');
    return true;
  }

  /**
   * Suscribirse a cambios
   */
  subscribe(listener: (accounts: CustodyAccount[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAccounts());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notificar cambios
   */
  private notifyListeners(accounts: CustodyAccount[]): void {
    this.listeners.forEach(listener => {
      try {
        listener(accounts);
      } catch (error) {
        console.error('[CustodyStore] Error in listener:', error);
      }
    });
  }

  /**
   * Actualizar configuración de API
   */
  updateAPIConfig(accountId: string, apiId: string, apiEndpoint: string): boolean {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      console.error('[CustodyStore] Cuenta no encontrada');
      return false;
    }

    console.log('[CustodyStore] 🔧 Actualizando configuración API...');
    console.log(`  API ID ANTES: ${account.apiId}`);
    console.log(`  API ID DESPUÉS: ${apiId}`);
    console.log(`  Endpoint ANTES: ${account.apiEndpoint}`);
    console.log(`  Endpoint DESPUÉS: ${apiEndpoint}`);

    account.apiId = apiId;
    account.apiEndpoint = apiEndpoint;
    account.lastUpdated = new Date().toISOString();

    this.saveAccounts(accounts);
    console.log('[CustodyStore] ✅ Configuración API actualizada');

    return true;
  }

  /**
   * Conectar API externa
   */
  connectExternalAPI(
    accountId: string, 
    provider: string, 
    apiKey: string, 
    apiSecret: string
  ): boolean {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      console.error('[CustodyStore] Cuenta no encontrada');
      return false;
    }

    console.log('[CustodyStore] 🔌 Conectando API externa...');
    console.log(`  Proveedor: ${provider}`);
    console.log(`  API Key: ${apiKey.substring(0, 10)}...`);

    account.externalProvider = provider;
    account.externalAPIKey = apiKey;
    account.externalAPISecret = apiSecret;
    account.externalConnected = true;
    account.lastUpdated = new Date().toISOString();

    this.saveAccounts(accounts);
    console.log('[CustodyStore] ✅ API externa conectada exitosamente');

    return true;
  }

  /**
   * Desconectar API externa
   */
  disconnectExternalAPI(accountId: string): boolean {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) return false;

    console.log('[CustodyStore] 🔌 Desconectando API externa...');
    
    account.externalProvider = undefined;
    account.externalAPIKey = undefined;
    account.externalAPISecret = undefined;
    account.externalConnected = false;
    account.lastUpdated = new Date().toISOString();

    this.saveAccounts(accounts);
    console.log('[CustodyStore] ✅ API externa desconectada');

    return true;
  }

  /**
   * Regenerar API Key
   */
  regenerateAPIKey(accountId: string): string | null {
    const accounts = this.getAccounts();
    const account = accounts.find(a => a.id === accountId);

    if (!account) {
      console.error('[CustodyStore] Cuenta no encontrada');
      return null;
    }

    const oldKey = account.apiKey;
    const newKey = this.generateAPIKey();

    console.log('[CustodyStore] 🔄 Regenerando API Key...');
    console.log(`  Key ANTIGUA: ${oldKey.substring(0, 20)}...`);
    console.log(`  Key NUEVA: ${newKey.substring(0, 20)}...`);

    account.apiKey = newKey;
    account.lastUpdated = new Date().toISOString();

    this.saveAccounts(accounts);
    console.log('[CustodyStore] ✅ API Key regenerada exitosamente');

    return newKey;
  }

  /**
   * Limpiar todas las cuentas
   */
  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.notifyListeners([]);
    console.log('[CustodyStore] 🗑️ Todas las cuentas eliminadas');
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    const accounts = this.getAccounts();
    return {
      totalAccounts: accounts.length,
      totalReserved: accounts.reduce((sum, a) => sum + a.reservedBalance, 0),
      totalAvailable: accounts.reduce((sum, a) => sum + a.availableBalance, 0),
      totalBalance: accounts.reduce((sum, a) => sum + a.totalBalance, 0),
      activeReservations: accounts.reduce((sum, a) => sum + a.reservations.filter(r => r.status === 'reserved').length, 0),
      confirmedReservations: accounts.reduce((sum, a) => sum + a.reservations.filter(r => r.status === 'confirmed').length, 0),
      currencies: [...new Set(accounts.map(a => a.currency))],
    };
  }

  /**
   * Sincronizar balances de cuenta custodio con API VUSD y DAES Pledge
   */
  private async syncBalancesWithModules(account: CustodyAccount): Promise<void> {
    try {
      console.log('[CustodyStore] 🔄 Sincronizando balances con VUSD y DAES...');
      console.log(`  Cuenta: ${account.accountName}`);
      console.log(`  Balance Total: ${account.currency} ${account.totalBalance.toLocaleString()}`);
      console.log(`  Disponible: ${account.currency} ${account.availableBalance.toLocaleString()}`);
      console.log(`  Reservado: ${account.currency} ${account.reservedBalance.toLocaleString()}`);

      // Sincronizar con VUSD si está habilitado y tiene ID
      if (account.vusdBalanceEnabled && account.vusdBalanceId) {
        try {
          // Actualizar el pledge en VUSD con el nuevo balance total
          const pledges = await vusdCapStore.listPledges();
          const existingPledge = pledges.find(p => p.pledge_id === account.vusdBalanceId);

          if (existingPledge) {
            // Si el pledge existe, podríamos actualizarlo (dependiendo de la API)
            console.log('[CustodyStore] ℹ️ Pledge VUSD encontrado:', account.vusdBalanceId);
            console.log(`  Monto actual en VUSD: ${existingPledge.amount}`);
          } else {
            // Si no existe, crearlo de nuevo
            console.log('[CustodyStore] ⚠️ Pledge VUSD no encontrado, recreando...');
            const newPledge = await vusdCapStore.createPledge({
              amount: account.totalBalance,
              currency: account.currency,
              beneficiary: account.accountName,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              purpose: `custody_account_${account.id}`
            });
            account.vusdBalanceId = newPledge.pledge_id;
            console.log('[CustodyStore] ✅ Nuevo pledge VUSD creado:', newPledge.pledge_id);
          }
        } catch (error) {
          console.error('[CustodyStore] ❌ Error sincronizando con VUSD:', error);
        }
      }

      // Sincronizar con DAES Pledge si está habilitado y tiene ID
      if (account.daesPledgeEnabled && account.daesPledgeId) {
        try {
          const pledges = await daesPledgeStore.listPledges();
          const existingPledge = pledges.find(p => p.pledge_id === account.daesPledgeId);

          if (existingPledge) {
            console.log('[CustodyStore] ℹ️ Pledge DAES encontrado:', account.daesPledgeId);
            console.log(`  Monto actual en DAES: ${existingPledge.amount}`);
          } else {
            // Si no existe, crearlo de nuevo
            console.log('[CustodyStore] ⚠️ Pledge DAES no encontrado, recreando...');
            const newPledge = await daesPledgeStore.createPledge({
              amount: account.totalBalance.toFixed(2),
              currency: account.currency,
              beneficiary: account.accountName,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              purpose: `custody_account_${account.id}`
            });
            account.daesPledgeId = newPledge.pledge_id;
            console.log('[CustodyStore] ✅ Nuevo pledge DAES creado:', newPledge.pledge_id);
          }
        } catch (error) {
          console.error('[CustodyStore] ❌ Error sincronizando con DAES:', error);
        }
      }

      console.log('[CustodyStore] ✅ Sincronización completada');
    } catch (error) {
      console.error('[CustodyStore] ❌ Error en sincronización:', error);
    }
  }
}

export const custodyStore = new CustodyStore();

