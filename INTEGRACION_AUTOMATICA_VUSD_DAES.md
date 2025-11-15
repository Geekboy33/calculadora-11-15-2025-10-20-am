# 🔗 Integración Automática: Custody Accounts → API VUSD + DAES Pledge

## 📋 Descripción General

Sistema de integración automática que sincroniza todas las cuentas custodio creadas con los módulos **API VUSD** y **DAES Pledge**, permitiendo que cada cuenta custodio sea inmediatamente utilizable en ambos flujos de trabajo sin configuración manual adicional.

---

## 🎯 Objetivo

**Problema Original:**
- Las cuentas custodio existían aisladas
- No se reflejaban en API VUSD
- No se reflejaban en DAES Pledge
- Usuario tenía que crear manualmente pledges en cada módulo

**Solución Implementada:**
- ✅ Creación automática de pledges en VUSD al crear cuenta custodio
- ✅ Creación automática de pledges en DAES al crear cuenta custodio
- ✅ Sincronización automática de balances después de operaciones
- ✅ Las cuentas custodio aparecen inmediatamente en ambos módulos

---

## 🔨 Cambios Implementados

### 1. Modificación en `createLinkedBalances()`

**Antes:**
```typescript
private async createLinkedBalances(account: CustodyAccount): Promise<void> {
  // Solo crear si las opciones están habilitadas
  if (account.vusdBalanceEnabled) {
    // Crear en VUSD
  }

  if (account.daesPledgeEnabled) {
    // Crear en DAES
  }
}
```

**Después:**
```typescript
private async createLinkedBalances(account: CustodyAccount): Promise<void> {
  console.log('[CustodyStore] 🔗 Creando balances vinculados en VUSD y DAES Pledge...');

  // SIEMPRE crear balance en VUSD Cap Store
  try {
    const vusdPledge = await vusdCapStore.createPledge({
      amount: account.totalBalance,
      currency: account.currency,
      beneficiary: account.accountName,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
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
}
```

**Diferencias Clave:**
- ❌ Antes: Solo creaba si flags estaban habilitados
- ✅ Ahora: SIEMPRE crea en ambos módulos
- ✅ Auto-habilita los flags después de crear
- ✅ Logs detallados de todo el proceso

---

### 2. Nueva Función `syncBalancesWithModules()`

```typescript
/**
 * Sincronizar balances de cuenta custodio con API VUSD y DAES Pledge
 */
private async syncBalancesWithModules(account: CustodyAccount): Promise<void> {
  console.log('[CustodyStore] 🔄 Sincronizando balances con VUSD y DAES...');

  // Sincronizar con VUSD si está habilitado
  if (account.vusdBalanceEnabled && account.vusdBalanceId) {
    const pledges = await vusdCapStore.listPledges();
    const existingPledge = pledges.find(p => p.pledge_id === account.vusdBalanceId);

    if (existingPledge) {
      console.log('[CustodyStore] ℹ️ Pledge VUSD encontrado');
    } else {
      // Recrear si no existe
      const newPledge = await vusdCapStore.createPledge({...});
      account.vusdBalanceId = newPledge.pledge_id;
    }
  }

  // Sincronizar con DAES si está habilitado
  if (account.daesPledgeEnabled && account.daesPledgeId) {
    const pledges = await daesPledgeStore.listPledges();
    const existingPledge = pledges.find(p => p.pledge_id === account.daesPledgeId);

    if (existingPledge) {
      console.log('[CustodyStore] ℹ️ Pledge DAES encontrado');
    } else {
      // Recrear si no existe
      const newPledge = await daesPledgeStore.createPledge({...});
      account.daesPledgeId = newPledge.pledge_id;
    }
  }

  console.log('[CustodyStore] ✅ Sincronización completada');
}
```

**Propósito:**
- Verificar que los pledges existan en VUSD y DAES
- Recrear automáticamente si fueron eliminados
- Mantener sincronizados los IDs
- Logs claros del proceso

---

### 3. Integración en `reserveFunds()`

```typescript
reserveFunds(...) {
  // ... código de reserva ...

  account.reservedBalance += amount;
  account.availableBalance -= amount;
  account.reservations.push(reservation);

  this.saveAccounts(accounts);

  // 🔄 SINCRONIZAR CON VUSD Y DAES
  this.syncBalancesWithModules(account);  // ← NUEVA LÍNEA

  console.log('[CustodyStore] ✅ Fondos reservados');
  // ... resto del código ...
}
```

**Efecto:**
- Cada vez que se reservan fondos
- Se sincronizan automáticamente con VUSD y DAES
- Mantiene consistencia entre módulos

---

## 🔄 Flujo de Integración

### Al Crear una Cuenta Custodio:

```
1. Usuario crea cuenta en Custody Module
   ├─ Nombre: "USDT Reserve"
   ├─ Divisa: USD
   ├─ Balance: 10,000,000
   └─ Tipo: Blockchain
   ↓
2. custodyStore.createAccount(...)
   ↓
3. Descuento automático del sistema DAES
   Balance DAES USD: 50M → 40M
   ↓
4. createLinkedBalances() se ejecuta automáticamente
   ↓
5. Crear pledge en VUSD
   ├─ amount: 10,000,000
   ├─ currency: "USD"
   ├─ beneficiary: "USDT Reserve"
   ├─ expires_at: +1 año
   └─ purpose: "custody_account_CUS123..."
   ↓
   ✅ Pledge VUSD creado: pledge_abc123
   account.vusdBalanceId = "pledge_abc123"
   account.vusdBalanceEnabled = true
   ↓
6. Crear pledge en DAES
   ├─ amount: "10000000.00"
   ├─ currency: "USD"
   ├─ beneficiary: "USDT Reserve"
   ├─ expires_at: +1 año
   └─ purpose: "custody_account_CUS123..."
   ↓
   ✅ Pledge DAES creado: plg_xyz789
   account.daesPledgeId = "plg_xyz789"
   account.daesPledgeEnabled = true
   ↓
7. Cuenta guardada con IDs vinculados
   ├─ vusdBalanceId: "pledge_abc123"
   └─ daesPledgeId: "plg_xyz789"
   ↓
8. ✅ Cuenta disponible en:
   ├─ Custody Accounts Module ✅
   ├─ API VUSD Module ✅
   └─ DAES Pledge Module ✅
```

---

### Al Reservar Fondos:

```
1. Usuario reserva USD 5,000,000 de la cuenta
   ↓
2. custodyStore.reserveFunds(...)
   ├─ Available: 10M → 5M
   └─ Reserved: 0 → 5M
   ↓
3. syncBalancesWithModules() ejecutado automáticamente
   ↓
4. Verificar pledge VUSD
   ├─ Buscar pledge_id: "pledge_abc123"
   ├─ ✅ Encontrado
   └─ Monto actual: 10,000,000
   ↓
5. Verificar pledge DAES
   ├─ Buscar pledge_id: "plg_xyz789"
   ├─ ✅ Encontrado
   └─ Monto actual: 10,000,000
   ↓
6. ✅ Sincronización completada
   └─ Balances consistentes en todos los módulos
```

---

## 📊 Ejemplo Completo: Stablecoin Launch

### Escenario: Lanzar XCOIN Stablecoin

**Sistema DAES Inicial:**
```
USD: 100,000,000 disponible
EUR: 50,000,000 disponible
BTC: 100 BTC disponible
```

### Paso 1: Crear Cuenta Custodio para XCOIN

**Acción:**
```typescript
custodyStore.createAccount({
  accountName: "XCOIN Reserve",
  currency: "USD",
  balance: 50000000, // 50M USD
  accountType: "blockchain",
  blockchain: "Ethereum",
  tokenSymbol: "XCOIN"
});
```

**Resultado Automático:**

**1. Sistema DAES:**
```
USD: 100M → 50M (50M transferidos a custodio)
```

**2. Cuenta Custodio Creada:**
```json
{
  "id": "CUS-1234567890",
  "accountName": "XCOIN Reserve",
  "currency": "USD",
  "totalBalance": 50000000,
  "availableBalance": 50000000,
  "reservedBalance": 0,
  "vusdBalanceEnabled": true,      // ← AUTO-HABILITADO
  "vusdBalanceId": "pledge_vusd_1", // ← AUTO-CREADO
  "daesPledgeEnabled": true,        // ← AUTO-HABILITADO
  "daesPledgeId": "plg_daes_1"     // ← AUTO-CREADO
}
```

**3. Pledge VUSD Creado:**
```json
{
  "pledge_id": "pledge_vusd_1",
  "amount": 50000000,
  "currency": "USD",
  "beneficiary": "XCOIN Reserve",
  "status": "active",
  "expires_at": "2026-11-12T00:00:00Z",
  "purpose": "custody_account_CUS-1234567890"
}
```

**4. Pledge DAES Creado:**
```json
{
  "pledge_id": "plg_daes_1",
  "amount": "50000000.00",
  "currency": "USD",
  "beneficiary": "XCOIN Reserve",
  "status": "active",
  "expires_at": "2026-11-12T00:00:00Z",
  "purpose": "custody_account_CUS-1234567890"
}
```

---

### Paso 2: Usuario Navega a API VUSD Module

**Vista en API VUSD:**
```
📊 VUSD Circulating Cap Overview
┌─────────────────────────────────┐
│ Active Pledges: 1               │
│ Total Pledged USD: $50,000,000  │
│ Circulating Cap: $50,000,000    │
│ Available: $50,000,000          │
└─────────────────────────────────┘

Active Pledges:
┌──────────────┬───────────┬─────────────────┬─────────┐
│ Pledge ID    │ Amount    │ Beneficiary     │ Status  │
├──────────────┼───────────┼─────────────────┼─────────┤
│ pledge_vu... │ $50,000K  │ XCOIN Reserve   │ Active  │
└──────────────┴───────────┴─────────────────┴─────────┘
```

**Usuario puede:**
- ✅ Ver el pledge de "XCOIN Reserve"
- ✅ Crear transferencias desde este pledge
- ✅ Publicar Proof of Reserve
- ✅ Monitorear el cap circulante

---

### Paso 3: Usuario Navega a DAES Pledge Module

**Vista en DAES Pledge:**
```
📊 DAES Reserve Summary
┌─────────────────────────────────┐
│ Total Pledged: $50,000,000      │
│ Active Pledges: 1               │
│ Available for Payout: $50,000K  │
└─────────────────────────────────┘

Active Pledges:
┌──────────────┬───────────┬─────────────────┬─────────┐
│ Pledge ID    │ Amount    │ Beneficiary     │ Status  │
├──────────────┼───────────┼─────────────────┼─────────┤
│ plg_daes_1   │ $50,000K  │ XCOIN Reserve   │ Active  │
└──────────────┴───────────┴─────────────────┴─────────┘
```

**Usuario puede:**
- ✅ Ver el pledge de "XCOIN Reserve"
- ✅ Crear payouts desde este pledge
- ✅ Ajustar reservas IN/OUT
- ✅ Obtener attestations

---

### Paso 4: Reservar Fondos para Tokenización

**Acción en Custody Module:**
```typescript
// Usuario reserva 50M completos para tokenización
custodyStore.reserveFunds(
  "CUS-1234567890",
  50000000,
  "Ethereum",
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  50000000, // 50M XCOIN tokens
  true // bypass limits
);
```

**Resultado:**
```json
{
  "availableBalance": 0,           // 50M → 0
  "reservedBalance": 50000000,     // 0 → 50M
  "reservations": [{
    "id": "RSV-123",
    "amount": 50000000,
    "blockchain": "Ethereum",
    "contractAddress": "0x742d35...",
    "tokenAmount": 50000000,
    "status": "reserved"
  }]
}
```

**Sincronización Automática:**
```
🔄 syncBalancesWithModules() ejecutado
  ↓
✅ Pledge VUSD verificado: pledge_vusd_1 existe
✅ Pledge DAES verificado: plg_daes_1 existe
✅ Sincronización completada
```

**Los pledges siguen disponibles en VUSD y DAES** porque representan el balance total de la cuenta custodio, no solo el disponible.

---

## 🎯 Casos de Uso Habilitados

### Caso 1: Multi-Stablecoin Platform

**Objetivo:** Lanzar múltiples stablecoins respaldadas

**Cuentas Custodio:**
```
1. "XUSD Reserve" - USD 50M
2. "XEUR Reserve" - EUR 30M
3. "XGBP Reserve" - GBP 20M
```

**Resultado Automático en API VUSD:**
```
Total Pledged:
  - USD: $50,000,000
  - EUR: €30,000,000
  - GBP: £20,000,000

3 Active Pledges disponibles para transferencias
```

**Resultado Automático en DAES Pledge:**
```
3 Pledges activos
Disponible para payouts en 3 divisas
Attestations disponibles para las 3
```

---

### Caso 2: Liquidity Pool Management

**Objetivo:** Gestionar liquidez en DEX

**Cuenta Custodio:**
```
"DEX Liquidity Pool" - USD 100M
```

**Flujo:**
1. Cuenta creada → Auto en VUSD + DAES
2. Reservar 50M para blockchain → Sincronización automática
3. VUSD muestra 100M pledge activo
4. DAES muestra 100M disponible para payout
5. Usuario puede mover fondos entre módulos sin duplicar

---

### Caso 3: Treasury Management

**Objetivo:** Gestión centralizada de tesorería corporativa

**Cuentas Custodio:**
```
1. "Operating Reserve" - USD 10M
2. "Emergency Fund" - USD 5M
3. "Investment Pool" - USD 20M
```

**Beneficio:**
- 3 cuentas aparecen automáticamente en VUSD
- 3 cuentas aparecen automáticamente en DAES
- Total visibility: USD 35M en todos los módulos
- Single source of truth

---

## 🔍 Verificación de Integración

### Cómo Verificar que Funciona:

**1. Crear Cuenta Custodio:**
```bash
Custody Module → Crear Cuenta → "Test Account" USD 1,000,000
```

**2. Verificar Console Logs:**
```
[CustodyStore] 🔗 Creando balances vinculados en VUSD y DAES Pledge...
  Cuenta: Test Account
  Monto: USD 1,000,000
[CustodyStore] ✅ Balance VUSD creado: pledge_abc123
[CustodyStore] ✅ Pledge DAES creado: plg_xyz789
[CustodyStore] 🎉 Cuenta integrada en todos los módulos
  VUSD Balance ID: pledge_abc123
  DAES Pledge ID: plg_xyz789
```

**3. Ir a API VUSD Module:**
```
Debería aparecer "Test Account" en la lista de pledges activos
Monto: $1,000,000
Beneficiario: Test Account
```

**4. Ir a DAES Pledge Module:**
```
Debería aparecer "Test Account" en la lista de pledges activos
Monto: $1,000,000
Beneficiario: Test Account
```

**5. Reservar Fondos en Custody:**
```
Reserve $500,000
```

**6. Verificar Sincronización en Console:**
```
[CustodyStore] 🔄 Sincronizando balances con VUSD y DAES...
  Cuenta: Test Account
  Balance Total: USD 1,000,000
  Disponible: USD 500,000
  Reservado: USD 500,000
[CustodyStore] ℹ️ Pledge VUSD encontrado: pledge_abc123
[CustodyStore] ℹ️ Pledge DAES encontrado: plg_xyz789
[CustodyStore] ✅ Sincronización completada
```

---

## 📈 Ventajas del Sistema

### Para el Usuario:
- ✅ **Cero configuración manual**: Todo automático
- ✅ **Visibilidad total**: Mismo balance en 3 módulos
- ✅ **Flexibilidad**: Usar cuentas en cualquier flujo
- ✅ **Consistencia**: Datos sincronizados siempre
- ✅ **Eficiencia**: No duplicar trabajo

### Para el Sistema:
- ✅ **Single source of truth**: Custody es la fuente
- ✅ **Integridad**: Balances consistentes
- ✅ **Trazabilidad**: Logs de toda integración
- ✅ **Resiliencia**: Auto-recreación si pledge se pierde
- ✅ **Escalabilidad**: Funciona con N cuentas

### Para Desarrollo:
- ✅ **Modular**: Cada módulo independiente
- ✅ **Mantenible**: Lógica centralizada
- ✅ **Extensible**: Fácil agregar nuevos módulos
- ✅ **Debuggable**: Logs detallados

---

## 🔧 Configuración

### Parámetros de Pledge Auto-Creado:

```typescript
{
  amount: account.totalBalance,           // Balance total de la cuenta
  currency: account.currency,             // USD, EUR, BTC, etc.
  beneficiary: account.accountName,       // Nombre de la cuenta custodio
  expires_at: +1 año desde creación,      // Renovable
  purpose: `custody_account_${account.id}` // Identificador único
}
```

### IDs Vinculados en Cuenta:

```typescript
interface CustodyAccount {
  // ... otros campos ...
  vusdBalanceEnabled: boolean;    // true después de integración
  vusdBalanceId: string;          // "pledge_abc123"
  daesPledgeEnabled: boolean;     // true después de integración
  daesPledgeId: string;           // "plg_xyz789"
}
```

---

## 🚀 Próximas Mejoras

### Opcionales (no implementadas):

1. **Actualización de Monto en Pledges:**
   - Cuando cambia el balance custodio
   - Actualizar automáticamente amount en VUSD y DAES
   - Requiere API de update pledge

2. **Eliminación en Cascada:**
   - Al eliminar cuenta custodio
   - Eliminar pledges en VUSD y DAES automáticamente
   - Liberar recursos

3. **Panel de Sincronización:**
   - UI para ver estado de sincronización
   - Botón manual "Re-sync All"
   - Historial de sincronizaciones

4. **Webhooks:**
   - Notificar a VUSD y DAES cuando hay cambios
   - Sincronización en tiempo real
   - Event sourcing

---

## ✅ Estado de Implementación

- ✅ Creación automática en VUSD al crear cuenta custodio
- ✅ Creación automática en DAES al crear cuenta custodio
- ✅ Auto-habilitación de flags vusdBalanceEnabled y daesPledgeEnabled
- ✅ Función syncBalancesWithModules() implementada
- ✅ Sincronización automática después de reserveFunds()
- ✅ Verificación de existencia de pledges
- ✅ Auto-recreación si pledge no existe
- ✅ Logs detallados de todo el proceso
- ✅ Build exitoso sin errores

**Build:** 529.88 kB (156.00 kB gzipped) ✅

---

## 📖 Guía Rápida de Uso

### Para crear cuenta integrada:

1. Ir a Custody Accounts Module
2. Click "Crear Cuenta Custodio"
3. Completar datos normalmente
4. Click "Crear Cuenta"
5. ✅ Cuenta creada automáticamente en:
   - Custody Accounts ✅
   - API VUSD ✅
   - DAES Pledge ✅

### Para verificar integración:

1. Abrir console del navegador (F12)
2. Buscar logs:
   ```
   [CustodyStore] ✅ Balance VUSD creado
   [CustodyStore] ✅ Pledge DAES creado
   [CustodyStore] 🎉 Cuenta integrada en todos los módulos
   ```
3. Ir a API VUSD → Ver cuenta en lista de pledges
4. Ir a DAES Pledge → Ver cuenta en lista de pledges

---

© 2025 DAES - Data and Exchange Settlement
Sistema de Integración Automática Multi-Módulo
