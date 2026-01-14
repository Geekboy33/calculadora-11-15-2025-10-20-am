/**
 * DCB Integration Routes - Módulo de Integración con DCB Platform
 * 
 * Este módulo proporciona endpoints REST para que el backend DCB pueda
 * interactuar con el sistema DAES para:
 * - Gestión de cuentas bancarias
 * - Procesamiento de transferencias
 * - Operaciones de cambio de divisas (FX)
 * 
 * Base URL: /api/dcb
 */

import express from 'express';
import { getApiKeys, findKeyByApiKey } from '../storage.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const fondosFile = path.join(dataDir, 'fondos.json');

const router = express.Router();

// Helper para leer fondos
function getFondos() {
  try {
    if (fs.existsSync(fondosFile)) {
      return JSON.parse(fs.readFileSync(fondosFile, 'utf-8'));
    }
    return { balances: {}, accounts: [] };
  } catch (error) {
    console.error('[DCB Integration] Error leyendo fondos:', error);
    return { balances: {}, accounts: [] };
  }
}

// Helper para guardar fondos
function saveFondos(data) {
  try {
    fs.writeFileSync(fondosFile, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('[DCB Integration] Error guardando fondos:', error);
    return false;
  }
}

// Middleware de autenticación simplificado
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  
  if (!bearer) {
    return res.status(401).json({ 
      success: false, 
      error: 'Missing Authorization header',
      message: 'Se requiere Bearer token en el header Authorization'
    });
  }
  
  // Buscar API key
  const keys = getApiKeys();
  const key = keys.find(k => k.apiKey === bearer && k.status !== 'revoked');
  
  if (!key) {
    return res.status(403).json({ 
      success: false, 
      error: 'Invalid API key',
      message: 'API key no válida o revocada'
    });
  }
  
  req.apiKeyData = key;
  next();
}

// ============================================================================
// CUENTAS BANCARIAS
// ============================================================================

/**
 * GET /api/dcb/accounts/user/:userId
 * Obtiene todas las cuentas de un usuario
 */
router.get('/accounts/user/:userId', requireAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const fondos = getFondos();
    
    // Filtrar cuentas del usuario
    const userAccounts = (fondos.accounts || []).filter(acc => acc.ownerId === userId);
    
    // Transformar a formato esperado por DCB
    const accounts = userAccounts.map(acc => ({
      accountId: acc.id || acc.accountId,
      accountNumber: acc.accountNumber || acc.number,
      accountType: acc.type || 'CHECKING',
      currency: acc.currency || 'USD',
      balance: {
        available: acc.balance?.available || acc.availableBalance || 0,
        blocked: acc.balance?.blocked || acc.blockedBalance || 0,
        total: acc.balance?.total || acc.totalBalance || 0,
      },
      status: acc.status || 'ACTIVE',
      openedDate: acc.openedDate || acc.createdAt || new Date().toISOString(),
      ownerId: acc.ownerId || userId,
      ownerName: acc.ownerName || acc.owner?.name || 'Unknown',
      iban: acc.iban,
      swiftCode: acc.swiftCode,
    }));
    
    res.json({
      accounts,
      total: accounts.length,
    });
  } catch (error) {
    console.error('[DCB Integration] Error obteniendo cuentas:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/dcb/accounts/:accountId
 * Obtiene detalle de una cuenta específica
 */
router.get('/accounts/:accountId', requireAuth, (req, res) => {
  try {
    const { accountId } = req.params;
    const fondos = getFondos();
    
    const account = (fondos.accounts || []).find(
      acc => (acc.id === accountId || acc.accountId === accountId)
    );
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
        message: `Cuenta ${accountId} no encontrada`,
      });
    }
    
    res.json({
      accountId: account.id || account.accountId,
      accountNumber: account.accountNumber || account.number,
      accountType: account.type || 'CHECKING',
      currency: account.currency || 'USD',
      balance: {
        available: account.balance?.available || account.availableBalance || 0,
        blocked: account.balance?.blocked || account.blockedBalance || 0,
        total: account.balance?.total || account.totalBalance || 0,
      },
      status: account.status || 'ACTIVE',
      openedDate: account.openedDate || account.createdAt || new Date().toISOString(),
      ownerId: account.ownerId,
      ownerName: account.ownerName || account.owner?.name || 'Unknown',
      iban: account.iban,
      swiftCode: account.swiftCode,
    });
  } catch (error) {
    console.error('[DCB Integration] Error obteniendo cuenta:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/dcb/accounts/:accountId/balance
 * Obtiene saldo actual de una cuenta
 */
router.get('/accounts/:accountId/balance', requireAuth, (req, res) => {
  try {
    const { accountId } = req.params;
    const fondos = getFondos();
    
    const account = (fondos.accounts || []).find(
      acc => (acc.id === accountId || acc.accountId === accountId)
    );
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
        message: `Cuenta ${accountId} no encontrada`,
      });
    }
    
    res.json({
      accountId: account.id || account.accountId,
      availableBalance: account.balance?.available || account.availableBalance || 0,
      blockedBalance: account.balance?.blocked || account.blockedBalance || 0,
      totalBalance: account.balance?.total || account.totalBalance || 0,
      currency: account.currency || 'USD',
      lastUpdate: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DCB Integration] Error obteniendo saldo:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/dcb/accounts/:accountId/movements
 * Obtiene movimientos de una cuenta
 */
router.get('/accounts/:accountId/movements', requireAuth, (req, res) => {
  try {
    const { accountId } = req.params;
    const { fromDate, toDate, page = 1, limit = 20, type } = req.query;
    
    const fondos = getFondos();
    const account = (fondos.accounts || []).find(
      acc => (acc.id === accountId || acc.accountId === accountId)
    );
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }
    
    // Obtener movimientos (si existen en la estructura)
    let movements = account.movements || account.transactions || [];
    
    // Filtrar por fecha si se proporciona
    if (fromDate) {
      movements = movements.filter(m => new Date(m.date || m.timestamp) >= new Date(fromDate));
    }
    if (toDate) {
      movements = movements.filter(m => new Date(m.date || m.timestamp) <= new Date(toDate));
    }
    if (type) {
      movements = movements.filter(m => m.type === type || m.transactionType === type);
    }
    
    // Paginación
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginatedMovements = movements.slice(start, end);
    
    // Transformar a formato esperado
    const formattedMovements = paginatedMovements.map(m => ({
      movementId: m.id || m.movementId || m.transactionId,
      accountId: accountId,
      transactionType: m.type || m.transactionType || 'TRANSFER',
      amount: m.amount || 0,
      currency: m.currency || account.currency || 'USD',
      description: m.description || m.reference || '',
      reference: m.reference || m.id || '',
      date: m.date || m.timestamp || new Date().toISOString(),
      status: m.status || 'COMPLETED',
      counterparty: m.counterparty ? {
        name: m.counterparty.name,
        accountNumber: m.counterparty.accountNumber,
        bankCode: m.counterparty.bankCode,
      } : undefined,
    }));
    
    res.json({
      movements: formattedMovements,
      total: movements.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('[DCB Integration] Error obteniendo movimientos:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/dcb/accounts
 * Crea una nueva cuenta bancaria
 */
router.post('/accounts', requireAuth, (req, res) => {
  try {
    const { userId, accountType, currency, initialDeposit } = req.body;
    
    if (!userId || !accountType || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Se requieren: userId, accountType, currency',
      });
    }
    
    const fondos = getFondos();
    if (!fondos.accounts) {
      fondos.accounts = [];
    }
    
    // Generar ID único
    const accountId = `ACC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const accountNumber = `${currency}-${Date.now()}`;
    
    const newAccount = {
      id: accountId,
      accountId: accountId,
      accountNumber: accountNumber,
      type: accountType,
      currency: currency,
      balance: {
        available: initialDeposit || 0,
        blocked: 0,
        total: initialDeposit || 0,
      },
      status: 'ACTIVE',
      openedDate: new Date().toISOString(),
      ownerId: userId,
      ownerName: 'User',
      movements: [],
      transactions: [],
    };
    
    fondos.accounts.push(newAccount);
    saveFondos(fondos);
    
    res.status(201).json({
      accountId: newAccount.accountId,
      accountNumber: newAccount.accountNumber,
      accountType: newAccount.type,
      currency: newAccount.currency,
      balance: newAccount.balance,
      status: newAccount.status,
      openedDate: newAccount.openedDate,
    });
  } catch (error) {
    console.error('[DCB Integration] Error creando cuenta:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// TRANSFERENCIAS Y PAGOS
// ============================================================================

/**
 * POST /api/dcb/transfers
 * Procesa una transferencia
 */
router.post('/transfers', requireAuth, (req, res) => {
  try {
    const {
      fromAccountId,
      toAccountId,
      toIban,
      toSwiftCode,
      amount,
      currency,
      description,
      reference,
      transferType,
    } = req.body;
    
    if (!fromAccountId || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Se requieren: fromAccountId, amount, currency',
      });
    }
    
    if (transferType === 'INTERNAL' && !toAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Missing toAccountId for internal transfer',
      });
    }
    
    if (transferType === 'EXTERNAL' && !toIban) {
      return res.status(400).json({
        success: false,
        error: 'Missing toIban for external transfer',
      });
    }
    
    const fondos = getFondos();
    const fromAccount = (fondos.accounts || []).find(
      acc => (acc.id === fromAccountId || acc.accountId === fromAccountId)
    );
    
    if (!fromAccount) {
      return res.status(404).json({
        success: false,
        error: 'Source account not found',
      });
    }
    
    // Validar saldo
    const availableBalance = fromAccount.balance?.available || fromAccount.availableBalance || 0;
    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        message: 'Saldo insuficiente',
      });
    }
    
    // Calcular comisión (0.1% por defecto)
    const fee = amount * 0.001;
    const total = amount + fee;
    
    // Actualizar saldo de cuenta origen
    fromAccount.balance = {
      available: availableBalance - total,
      blocked: fromAccount.balance?.blocked || 0,
      total: (fromAccount.balance?.total || fromAccount.totalBalance || 0) - total,
    };
    
    // Si es transferencia interna, actualizar cuenta destino
    if (transferType === 'INTERNAL' && toAccountId) {
      const toAccount = (fondos.accounts || []).find(
        acc => (acc.id === toAccountId || acc.accountId === toAccountId)
      );
      
      if (toAccount) {
        toAccount.balance = {
          available: (toAccount.balance?.available || toAccount.availableBalance || 0) + amount,
          blocked: toAccount.balance?.blocked || 0,
          total: (toAccount.balance?.total || toAccount.totalBalance || 0) + amount,
        };
      }
    }
    
    // Registrar movimiento
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const movement = {
      id: transactionId,
      transactionId: transactionId,
      type: 'DEBIT',
      transactionType: 'TRANSFER',
      amount: -amount,
      currency: currency,
      description: description || 'Transferencia',
      reference: reference || transactionId,
      date: new Date().toISOString(),
      status: transferType === 'INTERNAL' ? 'COMPLETED' : 'PENDING',
      counterparty: toAccountId ? {
        accountNumber: toAccountId,
      } : {
        iban: toIban,
        swiftCode: toSwiftCode,
      },
    };
    
    if (!fromAccount.movements) {
      fromAccount.movements = [];
    }
    fromAccount.movements.push(movement);
    
    saveFondos(fondos);
    
    res.json({
      transactionId: transactionId,
      status: transferType === 'INTERNAL' ? 'COMPLETED' : 'PENDING',
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      toIban: toIban,
      amount: amount,
      currency: currency,
      description: description,
      reference: reference || transactionId,
      fees: {
        amount: fee,
        currency: currency,
      },
      executedAt: new Date().toISOString(),
      completedAt: transferType === 'INTERNAL' ? new Date().toISOString() : undefined,
    });
  } catch (error) {
    console.error('[DCB Integration] Error procesando transferencia:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/dcb/payments/user/:userId
 * Obtiene historial de pagos de un usuario
 */
router.get('/payments/user/:userId', requireAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const { fromDate, toDate, page = 1, limit = 20, status } = req.query;
    
    const fondos = getFondos();
    const userAccounts = (fondos.accounts || []).filter(acc => acc.ownerId === userId);
    
    // Recopilar todos los movimientos de las cuentas del usuario
    let allMovements = [];
    userAccounts.forEach(account => {
      const movements = account.movements || account.transactions || [];
      movements.forEach(m => {
        allMovements.push({
          ...m,
          accountId: account.id || account.accountId,
        });
      });
    });
    
    // Filtrar por fecha
    if (fromDate) {
      allMovements = allMovements.filter(m => new Date(m.date || m.timestamp) >= new Date(fromDate));
    }
    if (toDate) {
      allMovements = allMovements.filter(m => new Date(m.date || m.timestamp) <= new Date(toDate));
    }
    if (status) {
      allMovements = allMovements.filter(m => (m.status || 'COMPLETED') === status);
    }
    
    // Paginación
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const start = (pageNum - 1) * limitNum;
    const end = start + limitNum;
    const paginatedMovements = allMovements.slice(start, end);
    
    // Transformar a formato de pagos
    const payments = paginatedMovements
      .filter(m => m.type === 'DEBIT' || m.transactionType === 'TRANSFER')
      .map(m => ({
        transactionId: m.id || m.transactionId,
        status: m.status || 'COMPLETED',
        fromAccountId: m.accountId,
        toAccountId: m.counterparty?.accountNumber,
        toIban: m.counterparty?.iban,
        amount: Math.abs(m.amount || 0),
        currency: m.currency || 'USD',
        description: m.description,
        reference: m.reference,
        fees: {
          amount: 0,
          currency: m.currency || 'USD',
        },
        executedAt: m.date || m.timestamp,
        completedAt: m.status === 'COMPLETED' ? (m.date || m.timestamp) : undefined,
      }));
    
    res.json({
      payments,
      total: allMovements.length,
      page: pageNum,
      limit: limitNum,
    });
  } catch (error) {
    console.error('[DCB Integration] Error obteniendo historial de pagos:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/dcb/payments/:transactionId
 * Obtiene detalle de un pago específico
 */
router.get('/payments/:transactionId', requireAuth, (req, res) => {
  try {
    const { transactionId } = req.params;
    const fondos = getFondos();
    
    // Buscar en todas las cuentas
    let foundMovement = null;
    let account = null;
    
    for (const acc of (fondos.accounts || [])) {
      const movements = acc.movements || acc.transactions || [];
      const movement = movements.find(m => 
        (m.id === transactionId || m.transactionId === transactionId)
      );
      
      if (movement) {
        foundMovement = movement;
        account = acc;
        break;
      }
    }
    
    if (!foundMovement) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }
    
    res.json({
      transactionId: foundMovement.id || foundMovement.transactionId,
      status: foundMovement.status || 'COMPLETED',
      fromAccountId: account.id || account.accountId,
      toAccountId: foundMovement.counterparty?.accountNumber,
      toIban: foundMovement.counterparty?.iban,
      amount: Math.abs(foundMovement.amount || 0),
      currency: foundMovement.currency || 'USD',
      description: foundMovement.description,
      reference: foundMovement.reference,
      fees: {
        amount: 0,
        currency: foundMovement.currency || 'USD',
      },
      executedAt: foundMovement.date || foundMovement.timestamp,
      completedAt: foundMovement.status === 'COMPLETED' ? (foundMovement.date || foundMovement.timestamp) : undefined,
      traceId: transactionId,
      settlementDate: foundMovement.status === 'COMPLETED' ? (foundMovement.date || foundMovement.timestamp) : undefined,
    });
  } catch (error) {
    console.error('[DCB Integration] Error obteniendo detalle de pago:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// CAMBIO DE DIVISAS (FX)
// ============================================================================

/**
 * GET /api/dcb/fx/rates
 * Obtiene tasas de cambio actuales
 */
router.get('/fx/rates', requireAuth, (req, res) => {
  try {
    const { base = 'USD' } = req.query;
    
    // Tasas de ejemplo (en producción, esto vendría de un servicio real)
    const rates = {
      USD: { buyRate: 1.0, sellRate: 1.0, midRate: 1.0 },
      EUR: { buyRate: 0.92, sellRate: 0.93, midRate: 0.925 },
      GBP: { buyRate: 0.79, sellRate: 0.80, midRate: 0.795 },
      AED: { buyRate: 3.67, sellRate: 3.68, midRate: 3.675 },
      SAR: { buyRate: 3.75, sellRate: 3.76, midRate: 3.755 },
      JPY: { buyRate: 150.0, sellRate: 151.0, midRate: 150.5 },
      CNY: { buyRate: 7.2, sellRate: 7.3, midRate: 7.25 },
      CHF: { buyRate: 0.88, sellRate: 0.89, midRate: 0.885 },
    };
    
    res.json({
      baseCurrency: base,
      timestamp: new Date().toISOString(),
      rates: rates,
    });
  } catch (error) {
    console.error('[DCB Integration] Error obteniendo tasas:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * GET /api/dcb/fx/rate
 * Obtiene tasa para un par de monedas específico
 */
router.get('/fx/rate', requireAuth, (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters',
        message: 'Se requieren: from, to',
      });
    }
    
    if (from === to) {
      return res.json({ rate: 1.0 });
    }
    
    // Tasas de ejemplo (en producción, esto vendría de un servicio real)
    const rateMap = {
      'USD-EUR': 0.925,
      'EUR-USD': 1.081,
      'USD-GBP': 0.795,
      'GBP-USD': 1.258,
      'USD-AED': 3.675,
      'AED-USD': 0.272,
      'USD-SAR': 3.755,
      'SAR-USD': 0.266,
      'USD-JPY': 150.5,
      'JPY-USD': 0.0066,
      'USD-CNY': 7.25,
      'CNY-USD': 0.138,
      'USD-CHF': 0.885,
      'CHF-USD': 1.130,
    };
    
    const rate = rateMap[`${from}-${to}`] || 1.0;
    
    res.json({ rate });
  } catch (error) {
    console.error('[DCB Integration] Error obteniendo tasa:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/dcb/fx/quote
 * Genera cotización de conversión
 */
router.post('/fx/quote', requireAuth, (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount } = req.body;
    
    if (!fromCurrency || !toCurrency || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Se requieren: fromCurrency, toCurrency, amount',
      });
    }
    
    // Obtener tasa (simplificado)
    const rate = fromCurrency === toCurrency ? 1.0 : 0.925; // Ejemplo EUR/USD
    const result = amount * rate;
    const fees = result * 0.001; // 0.1% de comisión
    
    const quoteId = `QUOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 30000); // 30 segundos
    
    res.json({
      quoteId: quoteId,
      fromCurrency: fromCurrency,
      toCurrency: toCurrency,
      amount: amount,
      rate: rate,
      result: result - fees,
      fees: {
        amount: fees,
        currency: toCurrency,
      },
      expiresAt: expiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DCB Integration] Error generando cotización:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/dcb/fx/exchange
 * Ejecuta intercambio de divisas
 */
router.post('/fx/exchange', requireAuth, (req, res) => {
  try {
    const {
      quoteId,
      fromAccountId,
      toAccountId,
      fromCurrency,
      toCurrency,
      amount,
      rate,
    } = req.body;
    
    if (!fromAccountId || !toAccountId || !fromCurrency || !toCurrency || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }
    
    const fondos = getFondos();
    const fromAccount = (fondos.accounts || []).find(
      acc => (acc.id === fromAccountId || acc.accountId === fromAccountId)
    );
    const toAccount = (fondos.accounts || []).find(
      acc => (acc.id === toAccountId || acc.accountId === toAccountId)
    );
    
    if (!fromAccount || !toAccount) {
      return res.status(404).json({
        success: false,
        error: 'Account not found',
      });
    }
    
    // Validar saldo
    const availableBalance = fromAccount.balance?.available || fromAccount.availableBalance || 0;
    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }
    
    // Calcular conversión
    const exchangeRate = rate || (fromCurrency === toCurrency ? 1.0 : 0.925);
    const toAmount = amount * exchangeRate;
    const fees = toAmount * 0.001;
    const finalAmount = toAmount - fees;
    
    // Actualizar saldos
    fromAccount.balance = {
      available: availableBalance - amount,
      blocked: fromAccount.balance?.blocked || 0,
      total: (fromAccount.balance?.total || fromAccount.totalBalance || 0) - amount,
    };
    
    toAccount.balance = {
      available: (toAccount.balance?.available || toAccount.availableBalance || 0) + finalAmount,
      blocked: toAccount.balance?.blocked || 0,
      total: (toAccount.balance?.total || toAccount.totalBalance || 0) + finalAmount,
    };
    
    // Registrar transacciones
    const exchangeId = `FX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!fromAccount.movements) fromAccount.movements = [];
    if (!toAccount.movements) toAccount.movements = [];
    
    fromAccount.movements.push({
      id: exchangeId,
      transactionId: exchangeId,
      type: 'DEBIT',
      transactionType: 'FX_EXCHANGE',
      amount: -amount,
      currency: fromCurrency,
      description: `FX Exchange to ${toCurrency}`,
      reference: exchangeId,
      date: new Date().toISOString(),
      status: 'COMPLETED',
    });
    
    toAccount.movements.push({
      id: exchangeId,
      transactionId: exchangeId,
      type: 'CREDIT',
      transactionType: 'FX_EXCHANGE',
      amount: finalAmount,
      currency: toCurrency,
      description: `FX Exchange from ${fromCurrency}`,
      reference: exchangeId,
      date: new Date().toISOString(),
      status: 'COMPLETED',
    });
    
    saveFondos(fondos);
    
    res.json({
      exchangeId: exchangeId,
      status: 'COMPLETED',
      fromAccountId: fromAccountId,
      toAccountId: toAccountId,
      fromCurrency: fromCurrency,
      toCurrency: toCurrency,
      fromAmount: amount,
      toAmount: finalAmount,
      rate: exchangeRate,
      fees: {
        amount: fees,
        currency: toCurrency,
      },
      executedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DCB Integration] Error ejecutando intercambio:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message,
    });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'DCB Integration API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;



