/**
 * Bank Settlement API Server
 * Servidor Express con endpoints de settlement
 */

import express from 'express';
import cors from 'cors';
import { SettlementController } from './controllers/SettlementController';
import { createSettlementRoutes } from './routes/settlement.routes';

// Use Cases
import { CreateBankSettlementInstruction } from '../application/use-cases/CreateBankSettlementInstruction';
import { ConfirmBankSettlementInstruction } from '../application/use-cases/ConfirmBankSettlementInstruction';
import { GetBankSettlementById } from '../application/use-cases/GetBankSettlementById';
import { GetAuditLogForSettlement } from '../application/use-cases/GetAuditLogForSettlement';
import { GenerateDailySettlementReport } from '../application/use-cases/GenerateDailySettlementReport';

// Infrastructure
import { InMemorySettlementRepository } from '../infrastructure/database/repositories/InMemorySettlementRepository';
import { InMemoryAuditLogRepository } from '../infrastructure/database/repositories/InMemoryAuditLogRepository';
import { InMemoryBankConfigRepository } from '../infrastructure/database/repositories/InMemoryBankConfigRepository';
import { DAESLedgerService } from '../infrastructure/services/DAESLedgerService';
// import { FakeLedgerService } from '../infrastructure/services/FakeLedgerService';

const PORT = process.env.SETTLEMENT_PORT || 3001;

// Inicializar repositorios (In-Memory para demo)
const settlementRepo = new InMemorySettlementRepository();
const auditLogRepo = new InMemoryAuditLogRepository();
const bankConfigRepo = new InMemoryBankConfigRepository();

// Ledger service (usar DAESLedgerService para integración real)
const ledgerService = new DAESLedgerService();
// const ledgerService = new FakeLedgerService(); // Para testing aislado

// Inicializar use cases
const createSettlementUseCase = new CreateBankSettlementInstruction(
  settlementRepo,
  auditLogRepo,
  bankConfigRepo,
  ledgerService
);

const confirmSettlementUseCase = new ConfirmBankSettlementInstruction(
  settlementRepo,
  auditLogRepo
);

const getSettlementUseCase = new GetBankSettlementById(settlementRepo);

const getAuditLogUseCase = new GetAuditLogForSettlement(auditLogRepo);

const generateReportUseCase = new GenerateDailySettlementReport(
  settlementRepo,
  auditLogRepo
);

// Inicializar controller
const settlementController = new SettlementController(
  createSettlementUseCase,
  confirmSettlementUseCase,
  getSettlementUseCase,
  getAuditLogUseCase,
  generateReportUseCase
);

// Crear app Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DAES Bank Settlement API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/bank-settlements', createSettlementRoutes(settlementController));

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Error Handler]', err);
  
  res.status(err.statusCode || 500).json({
    error: err.code || 'INTERNAL_ERROR',
    message: err.message || 'An unexpected error occurred'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏦  DAES BANK SETTLEMENT API                           ║
║                                                           ║
║   Status: ONLINE                                         ║
║   Port: ${PORT}                                             ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                           ║
║   Endpoints:                                             ║
║   POST   /api/bank-settlements                           ║
║   GET    /api/bank-settlements/:id                       ║
║   PATCH  /api/bank-settlements/:id/confirm               ║
║   GET    /api/bank-settlements/:id/audit-log             ║
║   GET    /api/bank-settlements/report                    ║
║                                                           ║
║   Bank: EMIRATES NBD (ENBD)                              ║
║   Beneficiary: TRADEMORE VALUE CAPITAL FZE               ║
║   Currencies: AED, USD, EUR                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

export { app };

