# 🔄 Integración de Registro de Transacciones

## Cómo Integrar en Cada Módulo

### 1. Importar el Store

```typescript
import { transactionEventStore } from '../lib/transaction-event-store';
```

### 2. Registrar Eventos

#### En Custody Accounts (al crear cuenta):

```typescript
// Después de custodyStore.createAccount(...)
transactionEventStore.recordAccountCreated(
  accountName,
  currency,
  balance,
  accountId
);
```

#### En API VUSD (al crear pledge):

```typescript
// Después de crear el pledge
transactionEventStore.recordPledgeCreated(
  'API_VUSD',
  pledgeId,
  amount,
  beneficiary,
  accountName
);
```

#### En API VUSD (al editar pledge):

```typescript
transactionEventStore.recordPledgeEdited(
  'API_VUSD',
  pledgeId,
  oldAmount,
  newAmount,
  beneficiary
);
```

#### En API VUSD (al eliminar pledge):

```typescript
transactionEventStore.recordPledgeDeleted(
  'API_VUSD',
  pledgeId,
  amount,
  beneficiary
);
```

#### En API VUSD (al generar PoR):

```typescript
transactionEventStore.recordPorGenerated(
  circulatingCap,
  pledgesCount,
  porId
);
```

#### En PoR API1 (al crear payout):

```typescript
transactionEventStore.recordPayoutCreated(
  payoutId,
  amount,
  externalRef,
  pledgeId
);
```

### 3. Los Eventos se Registran Automáticamente

- ✅ Custody Accounts - Balance increase/decrease (YA INTEGRADO)
- ⏳ Custody Accounts - Account created
- ⏳ API VUSD - Pledge created/edited/deleted
- ⏳ API VUSD1 - Pledge created/edited/deleted
- ⏳ API VUSD - PoR generated
- ⏳ PoR API1 - Pledge created
- ⏳ PoR API1 - Payout created/completed

### 4. Verificar Eventos

1. Ir a "Transacciones y Eventos"
2. Ver eventos registrados
3. Filtrar por módulo/tipo
4. Exportar TXT o CSV

## Estado Actual

✅ **YA FUNCIONA:**
- Balance increase/decrease en Custody Accounts

⏳ **POR INTEGRAR:**
- Creación de cuentas
- Creación/edición/eliminación de pledges
- Generación de PoR
- Creación de payouts

**Los eventos se empezarán a registrar automáticamente cuando se agreguen las llamadas en cada módulo.**

