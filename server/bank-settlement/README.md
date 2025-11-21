# Bank Settlement Module - DAES Core Banking System

## Overview

El módulo **Bank Settlement** es un sistema completo de gestión de instrucciones de liquidación bancaria hacia bancos externos, diseñado con arquitectura limpia (Clean Architecture / Hexagonal) para máxima auditabilidad, seguridad y escalabilidad.

### Características principales

✅ **Instrucciones de liquidación bancaria** hacia Emirates NBD (ENBD) y otros bancos  
✅ **Arquitectura limpia** (Domain → Application → Infrastructure → API)  
✅ **Auditabilidad completa** (cada acción registrada con trazabilidad)  
✅ **Integración con DAES Ledger** (débito automático)  
✅ **Máquina de estados** (PENDING → SENT → COMPLETED / FAILED)  
✅ **Reportes diarios** de liquidación (JSON / CSV)  
✅ **Multi-moneda** (AED, USD, EUR)  
✅ **Validación estricta** (IBANs, SWIFT, montos, transiciones de estado)  
✅ **TypeScript fuertemente tipado** (sin `any`)  
✅ **Tests unitarios** (Jest)

---

## Architecture

```
server/bank-settlement/
├── domain/
│   ├── entities/
│   │   ├── BankSettlementInstruction.ts
│   │   ├── BankDestinationConfig.ts
│   │   └── AuditLog.ts
│   ├── value-objects/
│   │   ├── Currency.ts
│   │   ├── IBAN.ts
│   │   ├── Amount.ts
│   │   └── SettlementStatus.ts
│   ├── services/
│   │   ├── SettlementDomainService.ts
│   │   └── StatusTransitionValidator.ts
│   └── errors/
│       ├── DomainError.ts
│       ├── InvalidStatusTransitionError.ts
│       └── UnsupportedCurrencyError.ts
├── application/
│   ├── use-cases/
│   │   ├── CreateBankSettlementInstruction.ts
│   │   ├── ConfirmBankSettlementInstruction.ts
│   │   ├── GetBankSettlementById.ts
│   │   ├── GenerateDailySettlementReport.ts
│   │   └── GetAuditLogForSettlement.ts
│   ├── interfaces/
│   │   ├── ISettlementRepository.ts
│   │   ├── IAuditLogRepository.ts
│   │   ├── ILedgerService.ts
│   │   └── IBankConfigRepository.ts
│   └── dtos/
│       ├── CreateSettlementDTO.ts
│       ├── ConfirmSettlementDTO.ts
│       └── SettlementReportDTO.ts
├── infrastructure/
│   ├── database/
│   │   ├── migrations/
│   │   │   ├── 001_create_bank_destinations.sql
│   │   │   ├── 002_create_bank_settlement_instructions.sql
│   │   │   └── 003_create_audit_logs.sql
│   │   ├── repositories/
│   │   │   ├── PostgresSettlementRepository.ts
│   │   │   ├── PostgresAuditLogRepository.ts
│   │   │   └── PostgresBankConfigRepository.ts
│   │   └── seeds/
│   │       └── seed_enbd_config.sql
│   ├── services/
│   │   ├── FakeLedgerService.ts (para desarrollo)
│   │   └── DAESLedgerService.ts (integración real)
│   └── config/
│       └── bank-destinations.ts
├── api/
│   ├── routes/
│   │   └── settlement.routes.ts
│   ├── controllers/
│   │   └── SettlementController.ts
│   ├── middleware/
│   │   └── auth.middleware.ts
│   └── validators/
│       └── settlement.validators.ts
├── tests/
│   ├── domain/
│   │   ├── BankSettlementInstruction.test.ts
│   │   └── StatusTransitionValidator.test.ts
│   ├── application/
│   │   ├── CreateBankSettlementInstruction.test.ts
│   │   └── GenerateDailySettlementReport.test.ts
│   └── integration/
│       └── settlement-api.test.ts
└── README.md
```

---

## Database Schema

### Table: `bank_destinations`

```sql
CREATE TABLE bank_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code VARCHAR(20) NOT NULL UNIQUE,
  bank_name VARCHAR(255) NOT NULL,
  bank_address TEXT,
  beneficiary_name VARCHAR(255) NOT NULL,
  swift_code VARCHAR(11) NOT NULL,
  iban_aed VARCHAR(34),
  iban_usd VARCHAR(34),
  iban_eur VARCHAR(34),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bank_destinations_code ON bank_destinations(bank_code);
```

### Table: `bank_settlement_instructions`

```sql
CREATE TABLE bank_settlement_instructions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daes_reference_id VARCHAR(50) NOT NULL UNIQUE,
  bank_code VARCHAR(20) NOT NULL,
  amount DECIMAL(20, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL CHECK (currency IN ('AED', 'USD', 'EUR')),
  beneficiary_name VARCHAR(255) NOT NULL,
  beneficiary_iban VARCHAR(34) NOT NULL,
  swift_code VARCHAR(11) NOT NULL,
  reference_text VARCHAR(140),
  ledger_debit_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SENT', 'COMPLETED', 'FAILED')),
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  enbd_transaction_reference VARCHAR(100),
  executed_by VARCHAR(100),
  executed_at TIMESTAMP,
  failure_reason TEXT,
  FOREIGN KEY (bank_code) REFERENCES bank_destinations(bank_code)
);

CREATE INDEX idx_settlement_status ON bank_settlement_instructions(status);
CREATE INDEX idx_settlement_currency ON bank_settlement_instructions(currency);
CREATE INDEX idx_settlement_executed_at ON bank_settlement_instructions(executed_at);
CREATE INDEX idx_settlement_daes_ref ON bank_settlement_instructions(daes_reference_id);
```

### Table: `settlement_audit_logs`

```sql
CREATE TABLE settlement_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  performed_by VARCHAR(100) NOT NULL,
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (settlement_id) REFERENCES bank_settlement_instructions(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_settlement_id ON settlement_audit_logs(settlement_id);
CREATE INDEX idx_audit_timestamp ON settlement_audit_logs(timestamp);
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd server/bank-settlement
npm install
```

### 2. Setup Database

```bash
# Ejecutar migrations
npm run db:migrate

# Seed ENBD configuration
npm run db:seed
```

### 3. Run Tests

```bash
npm test
```

### 4. Start Server

```bash
npm run dev
```

El servidor estará en: `http://localhost:3000`

---

## API Endpoints

### 1. Create Settlement Instruction

```http
POST /api/bank-settlements
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 1000000.00,
  "currency": "USD",
  "reference": "Monthly liquidity transfer - Nov 2025",
  "requestedBy": "user_12345"
}

Response 201:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "daesReferenceId": "DAES-SET-20251121-A7K3PQ",
  "amount": "1000000.00",
  "currency": "USD",
  "beneficiaryName": "TRADEMORE VALUE CAPITAL FZE",
  "beneficiaryIban": "AE690260001025381452402",
  "swiftCode": "EBILAEADXXX",
  "status": "PENDING",
  "ledgerDebitId": "LEDGER-DEB-20251121-X9M2WK",
  "createdBy": "user_12345",
  "createdAt": "2025-11-21T10:45:00.000Z"
}
```

### 2. Get Settlement by ID

```http
GET /api/bank-settlements/{id}
Authorization: Bearer <token>

Response 200:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "daesReferenceId": "DAES-SET-20251121-A7K3PQ",
  "bankName": "EMIRATES NBD",
  "beneficiaryName": "TRADEMORE VALUE CAPITAL FZE",
  "beneficiaryIban": "AE690260001025381452402",
  "swiftCode": "EBILAEADXXX",
  "currency": "USD",
  "amount": "1000000.00",
  "referenceText": "Monthly liquidity transfer - Nov 2025",
  "status": "PENDING",
  "createdBy": "user_12345",
  "createdAt": "2025-11-21T10:45:00.000Z",
  "ledgerDebitId": "LEDGER-DEB-20251121-X9M2WK"
}
```

### 3. Confirm Settlement (Manual execution)

```http
PATCH /api/bank-settlements/{id}/confirm
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "COMPLETED",
  "enbdTransactionReference": "ENBD-TXN-20251121-987654",
  "executedBy": "treasury_manager_001"
}

Response 200:
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "COMPLETED",
  "enbdTransactionReference": "ENBD-TXN-20251121-987654",
  "executedBy": "treasury_manager_001",
  "executedAt": "2025-11-21T11:30:00.000Z"
}
```

### 4. Get Audit Log

```http
GET /api/bank-settlements/{id}/audit-log
Authorization: Bearer <token>

Response 200:
[
  {
    "id": "...",
    "actionType": "CREATE_INSTRUCTION",
    "performedBy": "user_12345",
    "previousStatus": null,
    "newStatus": "PENDING",
    "timestamp": "2025-11-21T10:45:00.000Z"
  },
  {
    "id": "...",
    "actionType": "UPDATE_STATUS",
    "performedBy": "treasury_manager_001",
    "previousStatus": "PENDING",
    "newStatus": "COMPLETED",
    "timestamp": "2025-11-21T11:30:00.000Z"
  }
]
```

### 5. Generate Daily Report

```http
GET /api/bank-settlements/report?date=2025-11-21&format=json
Authorization: Bearer <token>

Response 200:
[
  {
    "daesReferenceId": "DAES-SET-20251121-A7K3PQ",
    "currency": "USD",
    "amount": "1000000.00",
    "beneficiaryIban": "AE690260001025381452402",
    "enbdTransactionReference": "ENBD-TXN-20251121-987654",
    "status": "COMPLETED",
    "executedBy": "treasury_manager_001",
    "executedAt": "2025-11-21T11:30:00.000Z"
  }
]

// CSV format:
GET /api/bank-settlements/report?date=2025-11-21&format=csv

DAES Reference,Currency,Amount,IBAN,ENBD Ref,Status,Executed By,Executed At
DAES-SET-20251121-A7K3PQ,USD,1000000.00,AE690260001025381452402,ENBD-TXN-20251121-987654,COMPLETED,treasury_manager_001,2025-11-21T11:30:00.000Z
```

---

## Domain Model

### BankSettlementInstruction Entity

```typescript
{
  id: UUID
  daesReferenceId: string (unique)
  bankCode: string
  amount: Amount (value object)
  currency: Currency (enum)
  beneficiaryName: string
  beneficiaryIban: IBAN (value object)
  swiftCode: string
  referenceText?: string
  ledgerDebitId: string
  status: SettlementStatus (enum)
  createdBy: string
  createdAt: Date
  updatedAt: Date
  enbdTransactionReference?: string
  executedBy?: string
  executedAt?: Date
  failureReason?: string
}
```

### Status Life-cycle

```
PENDING → SENT → COMPLETED
   ↓        ↓
 FAILED  FAILED

Transitions permitidas:
✅ PENDING → SENT
✅ PENDING → COMPLETED
✅ PENDING → FAILED
✅ SENT → COMPLETED
✅ SENT → FAILED

Transitions bloqueadas:
❌ COMPLETED → cualquier estado
❌ FAILED → cualquier estado
❌ SENT → PENDING
```

---

## Configuration (ENBD)

```typescript
{
  bankCode: "ENBD",
  bankName: "EMIRATES NBD",
  bankAddress: "DUBAI, UNITED ARAB EMIRATES",
  beneficiaryName: "TRADEMORE VALUE CAPITAL FZE",
  swiftCode: "EBILAEADXXX",
  ibanByCurrency: {
    AED: "AE610260001015381452401",
    USD: "AE690260001025381452402",
    EUR: "AE420260001025381452403"
  }
}
```

---

## Integration with DAES Ledger

Cada settlement instruction:

1. Llama `LedgerService.debitTreasuryAccount(currency, amount, reference)`
2. Recibe `ledgerDebitId`
3. Si el débito falla → no se crea la instrucción
4. Transacción atómica garantizada

### LedgerService Interface

```typescript
interface ILedgerService {
  debitTreasuryAccount(
    currency: string,
    amount: number,
    reference: string,
    requestedBy: string
  ): Promise<{ success: boolean; ledgerDebitId?: string; error?: string }>;

  creditTreasuryAccount(
    currency: string,
    amount: number,
    reference: string,
    requestedBy: string
  ): Promise<{ success: boolean; ledgerCreditId?: string; error?: string }>;
}
```

---

## Security & Permissions

```typescript
Roles requeridos:

POST /api/bank-settlements
  → TREASURY_OPERATOR

PATCH /api/bank-settlements/:id/confirm
  → TREASURY_MANAGER

GET /api/bank-settlements/report
  → TREASURY_VIEWER | TREASURY_MANAGER | TREASURY_OPERATOR

GET /api/bank-settlements/:id
  → TREASURY_VIEWER | TREASURY_MANAGER | TREASURY_OPERATOR

GET /api/bank-settlements/:id/audit-log
  → TREASURY_MANAGER | COMPLIANCE_OFFICER
```

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test BankSettlementInstruction.test
```

### Test Coverage

- ✅ Domain entities validation
- ✅ Status transitions
- ✅ Currency validation
- ✅ IBAN validation
- ✅ Amount validation
- ✅ Use-cases (create, confirm, report)
- ✅ API integration tests

---

## Example Usage

### Scenario: Create and confirm settlement

```typescript
// 1. Create settlement instruction
const createDTO = {
  amount: 500000.00,
  currency: 'USD',
  reference: 'Weekly liquidity settlement',
  requestedBy: 'user_treasury_001'
};

const created = await createSettlementUseCase.execute(createDTO);
// created.daesReferenceId = "DAES-SET-20251121-K9PLM"
// created.status = "PENDING"

// 2. Finance user ejecuta manualmente en ENBD Online Banking
// ...

// 3. Confirm settlement
const confirmDTO = {
  settlementId: created.id,
  status: 'COMPLETED',
  enbdTransactionReference: 'ENBD-TXN-20251121-ABC123',
  executedBy: 'manager_treasury_005'
};

const confirmed = await confirmSettlementUseCase.execute(confirmDTO);
// confirmed.status = "COMPLETED"
// confirmed.executedAt = "2025-11-21T12:00:00.000Z"

// 4. Audit log
const auditLog = await getAuditLogUseCase.execute(created.id);
// [
//   { actionType: "CREATE_INSTRUCTION", performedBy: "user_treasury_001", ... },
//   { actionType: "UPDATE_STATUS", performedBy: "manager_treasury_005", ... }
// ]

// 5. Daily report
const report = await generateReportUseCase.execute('2025-11-21', 'json');
// [ { daesReferenceId: "DAES-SET-20251121-K9PLM", ... } ]
```

---

## Extension to Multiple Banks

Para agregar más bancos (ej: HSBC, Citibank):

1. Insertar nueva fila en `bank_destinations` con:
   - bankCode: "HSBC"
   - IBANs correspondientes
   - SWIFT correspondiente

2. Al crear settlement, especificar `bankCode`:
   ```json
   {
     "bankCode": "HSBC",
     "amount": 100000,
     "currency": "USD",
     ...
   }
   ```

3. El sistema automáticamente:
   - Valida IBANs de HSBC
   - Usa configuración de HSBC
   - Genera instrucción

**No se requieren cambios de código** ✅

---

## Author

**DAES CoreBanking System**  
Data and Exchange Settlement  
© 2025 Digital Commercial Bank Ltd

