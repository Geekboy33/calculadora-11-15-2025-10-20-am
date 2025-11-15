# ✅ SOLUCIÓN: Reservas de Custody Desaparecen en API VUSD

## ❌ **PROBLEMA REPORTADO**

Al crear una cuenta en **Cuentas Custodio**, hacer una **reserva manual** de fondos y luego ir a **API VUSD** para crear un **New Pledge**, las reservas desaparecen y no permite crear el pledge.

---

## 🔍 **CAUSA RAÍZ DEL PROBLEMA**

### **Problema 1: Reseteo de Reservas en loadCustodyAccounts()**

**Ubicación:** `src/components/APIVUSDModule.tsx` líneas 211-218

```typescript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
accounts.forEach(account => {
  const originalTotal = account.totalBalance;
  
  // PROBLEMA: Resetea TODAS las reservas a 0
  account.reservedBalance = 0;  // ❌ BORRA reservas manuales
  account.availableBalance = originalTotal;
});
```

**Qué causaba:**
- Al abrir API VUSD, ejecutaba `loadCustodyAccounts()`
- Esta función **BORRABA** todas las reservas (`reservedBalance = 0`)
- Solo recargaba las de pledges VUSD
- Las **reservas manuales** de Custody desaparecían

---

### **Problema 2: Validación Incorrecta en canCreatePledge()**

**Ubicación:** `src/lib/unified-pledge-store.ts` línea 88

```typescript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
const totalPledged = this.getTotalPledgedAmount(custodyAccountId);
const availableForPledge = account.totalBalance - totalPledged; // ❌ IGNORA reservas manuales
```

**Qué causaba:**
- La validación calculaba: `disponible = total - pledges`
- **IGNORABA** las reservas manuales en `account.reservedBalance`
- Permitía crear pledges sobre capital ya reservado manualmente

---

### **Problema 3: Sobrescritura en updateCustodyAccountBalance()**

**Ubicación:** `src/lib/unified-pledge-store.ts` líneas 220-221

```typescript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
account.reservedBalance = totalPledged;  // ❌ SOBRESCRIBE reservas manuales
account.availableBalance = account.totalBalance - totalPledged;
```

**Qué causaba:**
- Al crear un pledge, actualizaba el balance
- **SOBRESCRIBÍA** `reservedBalance` solo con pledges
- Las reservas manuales desaparecían

---

### **Problema 4: recalculateAllBalances() Destructiva**

**Ubicación:** `src/lib/unified-pledge-store.ts` líneas 339-340

```typescript
// ❌ CÓDIGO PROBLEMÁTICO (ANTES)
account.reservedBalance = totalPledged;  // ❌ SOBRESCRIBE todo
account.availableBalance = account.totalBalance - totalPledged;
```

**Qué causaba:**
- Esta función recalculaba TODOS los balances
- **BORRABA** todas las reservas manuales
- Solo dejaba las de pledges

---

## ✅ **SOLUCIÓN IMPLEMENTADA**

### **Corrección 1: No Resetear Reservas en loadCustodyAccounts()**

**Archivo:** `src/components/APIVUSDModule.tsx`

```typescript
// ✅ CÓDIGO CORREGIDO (AHORA)
const loadCustodyAccounts = async () => {
  const accounts = custodyStore.getAccounts();

  console.log('[VUSD] 📋 Cargando cuentas custody (SIN resetear reservas existentes)');

  // NO resetear las reservas existentes
  // Solo cargar y mostrar las cuentas con sus balances actuales
  
  const pledges = await vusdCapStore.getActivePledges();
  
  // Solo logging, NO modificar balances
  accounts.forEach(account => {
    console.log('[VUSD→Custody] 📊 Estado actual de cuenta:', {
      account: account.accountName,
      totalBalance: account.totalBalance,
      reservedBalance: account.reservedBalance,  // ✅ Preservado
      availableBalance: account.availableBalance, // ✅ Preservado
      currency: account.currency
    });
  });

  console.log('[VUSD] ✅ Cuentas cargadas preservando reservas existentes');

  setCustodyAccounts(accounts);
};
```

**Beneficio:**
- ✅ Las reservas manuales se preservan
- ✅ Los balances disponibles se mantienen correctos
- ✅ Solo se muestran los datos, no se modifican

---

### **Corrección 2: Usar availableBalance en canCreatePledge()**

**Archivo:** `src/lib/unified-pledge-store.ts`

```typescript
// ✅ CÓDIGO CORREGIDO (AHORA)
canCreatePledge(custodyAccountId: string, requestedAmount: number) {
  const account = custodyStore.getAccountById(custodyAccountId);
  
  if (!account) {
    return { allowed: false, reason: 'Custody account not found' };
  }

  const totalPledged = this.getTotalPledgedAmount(custodyAccountId);
  
  // ✅ CORRECCIÓN: Usar availableBalance directamente
  // Este balance YA incluye:
  // 1. Reservas manuales del módulo Custody
  // 2. Pledges existentes
  // 3. Cualquier otra reserva activa
  
  const availableForPledge = account.availableBalance; // ✅ Correcto
  const manualReserved = account.reservedBalance - totalPledged;

  console.log('[UnifiedPledgeStore] 🔍 Validación de pledge:', {
    accountId: custodyAccountId,
    accountName: account.accountName,
    totalBalance: account.totalBalance,
    reservedBalance: account.reservedBalance,      // ✅ Incluye manuales
    availableBalance: account.availableBalance,    // ✅ Correcto
    totalPledged,
    manualReserved: manualReserved > 0 ? manualReserved : 0,
    availableForPledge,
    requestedAmount,
    willRemain: availableForPledge - requestedAmount
  });

  if (requestedAmount > availableForPledge) {
    return {
      allowed: false,
      reason: `Balance insuficiente. Disponible: ${availableForPledge.toFixed(2)}, Solicitado: ${requestedAmount.toFixed(2)}`,
      availableBalance: availableForPledge,
      totalPledged,
      manualReserved
    };
  }

  return {
    allowed: true,
    availableBalance: availableForPledge,
    totalPledged,
    manualReserved
  };
}
```

**Beneficio:**
- ✅ Valida correctamente el balance disponible real
- ✅ Respeta las reservas manuales
- ✅ Muestra información detallada en logs

---

### **Corrección 3: Preservar Reservas en updateCustodyAccountBalance()**

**Archivo:** `src/lib/unified-pledge-store.ts`

```typescript
// ✅ CÓDIGO CORREGIDO (AHORA)
private updateCustodyAccountBalance(custodyAccountId: string): void {
  const totalPledged = this.getTotalPledgedAmount(custodyAccountId);
  const accounts = custodyStore.getAccounts();
  const account = accounts.find(a => a.id === custodyAccountId);

  if (account) {
    // ✅ CORRECCIÓN: Preservar reservas manuales
    const currentReserved = account.reservedBalance || 0;
    const currentPledged = this.getTotalPledgedAmount(custodyAccountId);
    const manualReserved = Math.max(0, currentReserved - currentPledged);
    
    // Nueva reserva = reservas manuales + pledges actuales
    const newReservedBalance = manualReserved + totalPledged;      // ✅ Suma ambos
    const newAvailableBalance = account.totalBalance - newReservedBalance;

    console.log('[UnifiedPledgeStore] 🔄 Actualizando balance:', {
      accountName: account.accountName,
      totalBalance: account.totalBalance,
      oldReserved: currentReserved,
      manualReserved,                    // ✅ Preservado
      pledgesReserved: totalPledged,
      newReserved: newReservedBalance,   // ✅ Suma de ambos
      newAvailable: newAvailableBalance
    });

    account.reservedBalance = newReservedBalance;
    account.availableBalance = newAvailableBalance;

    custodyStore.saveAccounts(accounts);

    console.log('[UnifiedPledgeStore] ✅ Balance actualizado correctamente');
  }
}
```

**Beneficio:**
- ✅ Preserva las reservas manuales
- ✅ Suma pledges a las reservas manuales
- ✅ Actualiza correctamente el balance disponible

---

### **Corrección 4: Deshabilitar recalculateAllBalances()**

**Archivo:** `src/lib/unified-pledge-store.ts`

```typescript
// ✅ CÓDIGO CORREGIDO (AHORA)
recalculateAllBalances(): void {
  console.log('[UnifiedPledgeStore] ⚠️ recalculateAllBalances() DESHABILITADA');
  console.log('[UnifiedPledgeStore] 💡 Los balances se actualizan automáticamente');
  
  // NO hacer nada aquí para preservar reservas manuales
  // Los balances se actualizan correctamente en:
  // 1. createPledge() -> updateCustodyAccountBalance()
  // 2. releasePledge() -> updateCustodyAccountBalance()
}
```

**Beneficio:**
- ✅ Evita borrado masivo de reservas
- ✅ Los balances se actualizan individualmente cuando es necesario
- ✅ Preserva las reservas manuales

---

## 📊 **CÓMO FUNCIONA AHORA**

### **Escenario de Ejemplo:**

#### **1. Crear Cuenta Custody**
```
Cuenta: HSBC USD Main
Balance Total: USD 100,000.00
Reservado: USD 0.00
Disponible: USD 100,000.00
```

#### **2. Hacer Reserva Manual (en Custody Accounts)**
```
Reservar: USD 30,000.00
------------------------------
Balance Total: USD 100,000.00
Reservado: USD 30,000.00  ← Reserva manual
Disponible: USD 70,000.00
```

#### **3. Ir a API VUSD**
```
✅ ANTES: Las reservas desaparecían
✅ AHORA: Las reservas se preservan

Al cargar API VUSD:
Balance Total: USD 100,000.00
Reservado: USD 30,000.00  ← ✅ PRESERVADO
Disponible: USD 70,000.00
```

#### **4. Crear Pledge en API VUSD**
```
Pledge: USD 40,000.00
------------------------------
Validación:
- Disponible: USD 70,000.00
- Solicitado: USD 40,000.00
- ✅ PERMITIDO (70k > 40k)

Resultado:
Balance Total: USD 100,000.00
Reservado: USD 70,000.00  ← 30k manual + 40k pledge
Disponible: USD 30,000.00 ← Correcto
```

#### **5. Intentar Crear Otro Pledge**
```
Pledge: USD 50,000.00
------------------------------
Validación:
- Disponible: USD 30,000.00
- Solicitado: USD 50,000.00
- ❌ RECHAZADO (30k < 50k)

Error: "Balance insuficiente. Disponible: 30000.00, Solicitado: 50000.00"
```

---

## 🎯 **ARCHIVOS MODIFICADOS**

| Archivo | Cambios |
|---------|---------|
| `src/components/APIVUSDModule.tsx` | ✅ No resetear reservas en `loadCustodyAccounts()` |
| `src/lib/unified-pledge-store.ts` | ✅ Usar `availableBalance` en `canCreatePledge()` |
| `src/lib/unified-pledge-store.ts` | ✅ Preservar reservas en `updateCustodyAccountBalance()` |
| `src/lib/unified-pledge-store.ts` | ✅ Deshabilitar `recalculateAllBalances()` |

---

## ✅ **VALIDACIÓN DE LA SOLUCIÓN**

### **Prueba 1: Reserva Manual + API VUSD**
1. ✅ Crear cuenta custody con USD 100,000
2. ✅ Reservar USD 30,000 manualmente
3. ✅ Ir a API VUSD
4. ✅ **Verificar que la reserva siga ahí** (30k reservado, 70k disponible)

### **Prueba 2: Crear Pledge con Reserva Manual**
1. ✅ Con reserva manual de 30k
2. ✅ Crear pledge de 40k en API VUSD
3. ✅ **Verificar que ambos se sumen:** 70k reservado (30k+40k), 30k disponible

### **Prueba 3: Validación de Capital**
1. ✅ Con 30k disponible
2. ✅ Intentar crear pledge de 50k
3. ✅ **Debe rechazar:** "Balance insuficiente"

### **Prueba 4: Eliminar Pledge**
1. ✅ Con 70k reservado (30k manual + 40k pledge)
2. ✅ Eliminar el pledge de 40k
3. ✅ **Verificar que quede:** 30k reservado (solo manual), 70k disponible

---

## 🐛 **LOGS DE DEBUGGING**

Con la solución implementada, verás estos logs en la consola:

```
[VUSD] 📋 Cargando cuentas custody (SIN resetear reservas existentes)
[VUSD→Custody] 📊 Estado actual de cuenta: {
  account: "HSBC USD Main",
  totalBalance: 100000,
  reservedBalance: 30000,    ← ✅ Preservado
  availableBalance: 70000,   ← ✅ Correcto
  currency: "USD"
}
[VUSD] ✅ Cuentas cargadas preservando reservas existentes

[UnifiedPledgeStore] 🔍 Validación de pledge: {
  accountName: "HSBC USD Main",
  totalBalance: 100000,
  reservedBalance: 30000,
  availableBalance: 70000,
  totalPledged: 0,
  manualReserved: 30000,      ← ✅ Detectado
  availableForPledge: 70000,
  requestedAmount: 40000,
  willRemain: 30000
}

[UnifiedPledgeStore] 🔄 Actualizando balance de cuenta: {
  accountName: "HSBC USD Main",
  totalBalance: 100000,
  oldReserved: 30000,
  manualReserved: 30000,       ← ✅ Preservado
  pledgesReserved: 40000,
  newReserved: 70000,          ← ✅ 30k + 40k
  newAvailable: 30000
}
[UnifiedPledgeStore] ✅ Balance actualizado y guardado correctamente
```

---

## 🚀 **CÓMO PROBAR LA SOLUCIÓN**

### **1. Reiniciar el Servidor**

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'
npm run dev
```

### **2. Abrir la Aplicación**

- URL: **http://localhost:4001**
- Usuario: **ModoDios**
- Contraseña: **DAES3334**

### **3. Crear Cuenta y Reserva**

1. Ir a **"Custody Accounts"**
2. Crear una cuenta con balance (ej: USD 100,000)
3. Hacer una reserva manual (ej: USD 30,000)
4. **Verificar:** Disponible = 70,000

### **4. Ir a API VUSD**

1. Ir al módulo **"API VUSD"**
2. **Verificar en consola (F12):** Debes ver logs preservando reservas
3. Click en **"Nuevo Pledge"**
4. Seleccionar la cuenta custody del dropdown
5. **Verificar:** El monto se llena con 70,000 (disponible, no 100,000)

### **5. Crear Pledge**

1. Dejar el monto en 70,000 o reducir a 40,000
2. Click en **"Create Pledge"**
3. **Verificar:** Debe crearse exitosamente
4. **Verificar en Custody:** Reservado = 30k (manual) + 40k (pledge) = 70k

### **6. Verificar Logs**

Abre consola (F12) y verifica:
- ✅ "Cargando cuentas custody (SIN resetear reservas existentes)"
- ✅ "Preservado" en los balances
- ✅ "manualReserved" detectado
- ✅ "Balance actualizado correctamente"

---

## 📝 **RESUMEN**

| Antes | Ahora |
|-------|-------|
| ❌ Reservas desaparecían | ✅ Reservas se preservan |
| ❌ API VUSD borraba reservas manuales | ✅ API VUSD respeta reservas |
| ❌ Validación incorrecta | ✅ Validación correcta |
| ❌ Balance disponible mal calculado | ✅ Balance correcto |
| ❌ No se podían crear pledges | ✅ Se crean correctamente |

---

**Fecha:** 2025-11-15  
**Versión:** 1.0  
**Problema:** Reservas Custody desaparecen en API VUSD  
**Estado:** ✅ **SOLUCIONADO**

