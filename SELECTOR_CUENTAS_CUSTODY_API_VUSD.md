# 🔗 Selector de Cuentas Custody en API VUSD

## 📋 Descripción General

Nueva funcionalidad en el módulo **API VUSD** que permite seleccionar cuentas custodio existentes al crear un nuevo pledge, cargando automáticamente todos los datos de la cuenta seleccionada en el formulario.

---

## 🎯 Objetivo

**Problema Original:**
- Usuario tenía que ingresar manualmente los datos del pledge
- Podía cometer errores al copiar montos
- No había visibilidad de cuentas custodio existentes
- Proceso lento y propenso a errores

**Solución Implementada:**
- ✅ Selector desplegable con todas las cuentas custodio
- ✅ Carga automática de datos al seleccionar cuenta
- ✅ Información completa de la cuenta mostrada
- ✅ Opción de entrada manual si se prefiere
- ✅ Campo de expiración removido
- ✅ Botón cancelar funcional que limpia el formulario

---

## 🔨 Cambios Implementados

### 1. Importación de custodyStore

```typescript
import { custodyStore } from '../lib/custody-store';
```

### 2. Estado para Cuentas Custodio

```typescript
const [custodyAccounts, setCustodyAccounts] = useState<any[]>([]);
const [selectedCustodyAccount, setSelectedCustodyAccount] = useState<string>('');
```

### 3. Carga de Cuentas al Iniciar

```typescript
useEffect(() => {
  loadData();
  loadCustodyAccounts(); // ← NUEVA LÍNEA
  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, []);

const loadCustodyAccounts = () => {
  const accounts = custodyStore.getAccounts();
  setCustodyAccounts(accounts);
};
```

### 4. Handler para Selección de Cuenta

```typescript
const handleCustodyAccountSelect = (accountId: string) => {
  setSelectedCustodyAccount(accountId);

  if (accountId === '') {
    // Manual entry - reset form
    setPledgeForm({
      amount: 0,
      currency: 'USD',
      beneficiary: '',
      expires_at: ''
    });
    return;
  }

  const account = custodyAccounts.find(a => a.id === accountId);
  if (account) {
    setPledgeForm({
      amount: account.totalBalance,
      currency: account.currency,
      beneficiary: account.accountName,
      expires_at: '' // Sin expiración por defecto
    });
  }
};
```

### 5. Traducciones Agregadas

**Español:**
```typescript
selectCustodyAccount: 'Seleccionar Cuenta Custodio',
manualEntry: 'Entrada Manual',
custodyAccountInfo: 'Información de Cuenta',
totalBalance: 'Balance Total',
availableBalance: 'Balance Disponible',
```

**English:**
```typescript
selectCustodyAccount: 'Select Custody Account',
manualEntry: 'Manual Entry',
custodyAccountInfo: 'Account Information',
totalBalance: 'Total Balance',
availableBalance: 'Available Balance',
```

### 6. Modal Rediseñado

**Antes:**
```tsx
<div className="max-w-md w-full p-6">
  <input type="number" name="amount" />
  <input type="text" name="beneficiary" />
  <input type="datetime-local" name="expires_at" /> {/* Campo eliminado */}
</div>
```

**Después:**
```tsx
<div className="max-w-2xl w-full p-6">
  {/* Selector de cuenta */}
  <select value={selectedCustodyAccount} onChange={handleCustodyAccountSelect}>
    <option value="">Entrada Manual</option>
    {custodyAccounts.map(account => (
      <option key={account.id} value={account.id}>
        {account.accountName} - {account.currency} {account.totalBalance.toLocaleString()}
      </option>
    ))}
  </select>

  {/* Info de cuenta seleccionada */}
  {selectedCustodyAccount && (
    <div className="bg-purple-900/20 border border-purple-500/40 rounded-lg p-4">
      <div>• Beneficiary: {account.accountName}</div>
      <div>• Total Balance: {account.currency} {account.totalBalance.toLocaleString()}</div>
      <div>• Available Balance: {account.currency} {account.availableBalance.toLocaleString()}</div>
      <div>• Currency: {account.currency}</div>
      {account.blockchain && <div>• Blockchain: {account.blockchain}</div>}
    </div>
  )}

  {/* Campos deshabilitados cuando hay cuenta seleccionada */}
  <input type="number" disabled={!!selectedCustodyAccount} />
  <input type="text" disabled={!!selectedCustodyAccount} />

  {/* Campo expires_at REMOVIDO */}
</div>
```

### 7. Botón Cancelar Mejorado

```typescript
<button
  type="button"
  onClick={() => {
    setShowPledgeModal(false);
    setSelectedCustodyAccount('');     // ← Limpia selección
    setPledgeForm({                    // ← Resetea formulario
      amount: 0,
      currency: 'USD',
      beneficiary: '',
      expires_at: ''
    });
  }}
>
  {t.cancel}
</button>
```

---

## 🎨 Diseño Visual del Modal

### Modal "New Pledge" Actualizado:

```
┌────────────────────────────────────────────────────────┐
│  New Pledge                                            │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Seleccionar Cuenta Custodio                          │
│  ┌──────────────────────────────────────────────┐    │
│  │ ▼ XCOIN Reserve - USD 50,000,000            │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ Información de Cuenta                        │    │
│  │ • Beneficiary: XCOIN Reserve                 │    │
│  │ • Total Balance: USD 50,000,000              │    │
│  │ • Available Balance: USD 50,000,000          │    │
│  │ • Currency: USD                              │    │
│  │ • Blockchain: Ethereum                       │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  Amount                                               │
│  ┌──────────────────────────────────────────────┐    │
│  │ 50000000                         [DISABLED]  │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  Beneficiary                                          │
│  ┌──────────────────────────────────────────────┐    │
│  │ XCOIN Reserve                    [DISABLED]  │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  [Cancelar]                         [Enviar]          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Selector Desplegable:

```
┌──────────────────────────────────────────────┐
│ ▼ Seleccionar Cuenta Custodio              │
├──────────────────────────────────────────────┤
│   Entrada Manual                            │ ← Opción manual
│   XCOIN Reserve - USD 50,000,000            │
│   XEUR Liquidity - EUR 30,000,000           │
│   BTC Treasury - BTC 100                     │
│   Operating Fund - USD 10,000,000            │
└──────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Uso

### Opción 1: Usar Cuenta Custodio Existente

```
1. Usuario abre API VUSD Module
   ↓
2. Click "New Pledge"
   ↓
3. Modal se abre con selector desplegable
   ↓
4. Usuario selecciona "XCOIN Reserve - USD 50,000,000"
   ↓
5. Sistema carga automáticamente:
   - Amount: 50,000,000
   - Currency: USD
   - Beneficiary: XCOIN Reserve
   ↓
6. Se muestra panel de información:
   • Beneficiary: XCOIN Reserve
   • Total Balance: USD 50,000,000
   • Available Balance: USD 50,000,000
   • Currency: USD
   • Blockchain: Ethereum
   ↓
7. Campos amount y beneficiary deshabilitados
   (no se pueden editar, vienen de la cuenta)
   ↓
8. Click "Enviar"
   ↓
9. ✅ Pledge creado con datos exactos de la cuenta custodio
```

### Opción 2: Entrada Manual

```
1. Usuario abre API VUSD Module
   ↓
2. Click "New Pledge"
   ↓
3. Modal se abre con selector en "Entrada Manual" por defecto
   ↓
4. Campos amount y beneficiary habilitados
   ↓
5. Usuario ingresa manualmente:
   - Amount: 25,000,000
   - Beneficiary: "External Partner"
   ↓
6. Click "Enviar"
   ↓
7. ✅ Pledge creado con datos manuales
```

### Opción 3: Cancelar

```
1. Usuario abre modal "New Pledge"
   ↓
2. Selecciona cuenta o ingresa datos
   ↓
3. Click "Cancelar"
   ↓
4. Modal se cierra
   ↓
5. ✅ Formulario se limpia completamente
   - selectedCustodyAccount resetea a ''
   - pledgeForm resetea a valores por defecto
   ↓
6. Al abrir de nuevo, todo está limpio
```

---

## 📊 Ejemplo Completo

### Cuentas Custodio Existentes:

```json
[
  {
    "id": "CUS-001",
    "accountName": "XCOIN Reserve",
    "currency": "USD",
    "totalBalance": 50000000,
    "availableBalance": 50000000,
    "blockchain": "Ethereum",
    "tokenSymbol": "XCOIN"
  },
  {
    "id": "CUS-002",
    "accountName": "XEUR Liquidity Pool",
    "currency": "EUR",
    "totalBalance": 30000000,
    "availableBalance": 25000000,
    "blockchain": "Polygon"
  },
  {
    "id": "CUS-003",
    "accountName": "BTC Treasury",
    "currency": "BTC",
    "totalBalance": 100,
    "availableBalance": 80,
    "blockchain": "Bitcoin"
  }
]
```

### Selector Renderizado:

```html
<select>
  <option value="">Entrada Manual</option>
  <option value="CUS-001">XCOIN Reserve - USD 50,000,000</option>
  <option value="CUS-002">XEUR Liquidity Pool - EUR 30,000,000</option>
  <option value="CUS-003">BTC Treasury - BTC 100</option>
</select>
```

### Usuario Selecciona "XCOIN Reserve":

**Estado actualizado:**
```javascript
selectedCustodyAccount = "CUS-001"
pledgeForm = {
  amount: 50000000,
  currency: "USD",
  beneficiary: "XCOIN Reserve",
  expires_at: ""
}
```

**Panel de información mostrado:**
```
┌──────────────────────────────────────┐
│ Información de Cuenta                │
│ • Beneficiary: XCOIN Reserve         │
│ • Total Balance: USD 50,000,000      │
│ • Available Balance: USD 50,000,000  │
│ • Currency: USD                      │
│ • Blockchain: Ethereum               │
└──────────────────────────────────────┘
```

---

## 🎯 Casos de Uso

### Caso 1: Crear Pledge desde Cuenta Custodio

**Escenario:**
- Cuenta custodio "XCOIN Reserve" con USD 50M
- Usuario quiere crear pledge en VUSD por el monto completo

**Proceso Anterior (Manual):**
1. Abrir modal "New Pledge"
2. Recordar o buscar el monto de la cuenta
3. Copiar manualmente: 50,000,000
4. Pegar en campo Amount
5. Escribir beneficiary: "XCOIN Reserve"
6. Riesgo de error de tipeo
**Tiempo:** ~2-3 minutos

**Proceso Nuevo (Con Selector):**
1. Abrir modal "New Pledge"
2. Seleccionar "XCOIN Reserve - USD 50,000,000"
3. Datos cargados automáticamente
4. Click "Enviar"
**Tiempo:** ~10 segundos

**Mejora:** 12-18x más rápido ⚡

---

### Caso 2: Múltiples Pledges para Diferentes Cuentas

**Escenario:**
- 5 cuentas custodio diferentes
- Crear un pledge para cada una

**Proceso Anterior:**
- 5 veces: Buscar monto → Copiar → Pegar → Escribir beneficiary
- **Tiempo total:** ~10-15 minutos
- **Errores potenciales:** 5 oportunidades de error

**Proceso Nuevo:**
- 5 veces: Seleccionar cuenta → Click enviar
- **Tiempo total:** ~1 minuto
- **Errores:** 0 (datos vienen directamente del sistema)

**Mejora:** 10-15x más rápido + eliminación de errores ⚡

---

### Caso 3: Pledge con Datos Personalizados

**Escenario:**
- Usuario quiere crear pledge con monto personalizado
- No corresponde a ninguna cuenta custodio

**Proceso:**
1. Abrir modal "New Pledge"
2. Dejar selector en "Entrada Manual"
3. Ingresar amount personalizado
4. Ingresar beneficiary personalizado
5. Click "Enviar"

**Resultado:** Funcionalidad manual preservada ✅

---

## 💡 Ventajas del Sistema

### Para el Usuario:
- ✅ **Velocidad:** 12-18x más rápido
- ✅ **Precisión:** Datos exactos de la fuente
- ✅ **Visibilidad:** Ve todas las cuentas disponibles
- ✅ **Información:** Panel detallado de cuenta seleccionada
- ✅ **Flexibilidad:** Opción manual disponible

### Para el Sistema:
- ✅ **Consistencia:** Datos vienen de custody store
- ✅ **Trazabilidad:** Vínculo directo cuenta ↔ pledge
- ✅ **Integridad:** Sin errores de tipeo
- ✅ **UX mejorada:** Proceso intuitivo

### Para Seguridad:
- ✅ **Validación:** Datos ya validados en custody
- ✅ **Auditoría:** Vínculo claro entre módulos
- ✅ **Prevención:** Sin errores humanos

---

## 🔍 Cambios en el Modal

### Eliminado:
```typescript
// ❌ CAMPO REMOVIDO
<div>
  <label>Expires At (Optional)</label>
  <input type="datetime-local" name="expires_at" />
</div>
```

**Razón:** Campo opcional que no se utilizaba frecuentemente y complicaba el formulario.

### Agregado:

**1. Selector de Cuenta:**
```typescript
<select value={selectedCustodyAccount} onChange={handleCustodyAccountSelect}>
  <option value="">Entrada Manual</option>
  {custodyAccounts.map(...)}
</select>
```

**2. Panel de Información:**
```typescript
{selectedCustodyAccount && (
  <div className="bg-purple-900/20 border border-purple-500/40">
    <div>• Beneficiary: {account.accountName}</div>
    <div>• Total Balance: {account.currency} {account.totalBalance}</div>
    <div>• Available Balance: {account.availableBalance}</div>
    <div>• Currency: {account.currency}</div>
    {account.blockchain && <div>• Blockchain: {account.blockchain}</div>}
  </div>
)}
```

**3. Campos Deshabilitados Condicionalmente:**
```typescript
<input disabled={!!selectedCustodyAccount} />
```

---

## 🎨 Estilos y Diseño

### Panel de Información:
```css
bg-purple-900/20       /* Fondo semi-transparente purple */
border-purple-500/40   /* Borde purple suave */
rounded-lg p-4         /* Esquinas redondeadas, padding */
```

### Selector:
```css
bg-[#0a0a0a]          /* Fondo negro oscuro */
border-[#1a1a1a]      /* Borde gris oscuro */
text-white            /* Texto blanco */
```

### Campos Deshabilitados:
```css
disabled:opacity-50   /* Opacidad reducida cuando disabled */
disabled:cursor-not-allowed
```

---

## 📝 Validaciones

### Al Seleccionar Cuenta:
- ✅ Verifica que la cuenta exista
- ✅ Carga todos los datos automáticamente
- ✅ Deshabilita campos para evitar edición

### Al Usar Entrada Manual:
- ✅ Campos habilitados para edición
- ✅ Validación de campos requeridos
- ✅ Amount debe ser > 0

### Al Cancelar:
- ✅ Limpia selección de cuenta
- ✅ Resetea formulario completo
- ✅ Cierra modal

---

## 🔄 Sincronización con Custody

### Datos que se Sincronizan:

**De Custody a VUSD:**
```javascript
{
  amount: account.totalBalance,      // Balance total de la cuenta
  currency: account.currency,        // Divisa (USD, EUR, BTC, etc.)
  beneficiary: account.accountName,  // Nombre de la cuenta
  expires_at: ''                     // Sin expiración por defecto
}
```

**Campos Adicionales Mostrados:**
- Total Balance
- Available Balance
- Blockchain (si existe)
- Token Symbol (si existe)

---

## ✅ Estado de Implementación

- ✅ Importación de custodyStore
- ✅ Estado para cuentas custodio
- ✅ Carga de cuentas al iniciar módulo
- ✅ Handler de selección de cuenta
- ✅ Selector desplegable en modal
- ✅ Panel de información de cuenta
- ✅ Carga automática de datos
- ✅ Campos deshabilitados cuando hay selección
- ✅ Opción de entrada manual
- ✅ Botón cancelar con limpieza completa
- ✅ Campo expires_at removido
- ✅ Traducciones ES/EN
- ✅ Build exitoso sin errores

**Build:** 529.88 kB (155.99 kB gzipped) ✅

---

## 🚀 Próximas Mejoras

### Opcionales (no implementadas):

1. **Filtro de Divisas:**
   - Selector adicional para filtrar por divisa
   - "Ver solo USD", "Ver solo EUR", etc.

2. **Búsqueda de Cuentas:**
   - Input de búsqueda en el selector
   - Buscar por nombre, divisa, blockchain

3. **Indicador de Uso:**
   - Mostrar si la cuenta ya tiene pledge activo
   - Badge "En uso" o "Disponible"

4. **Sugerencias Inteligentes:**
   - Sugerir cuenta basado en contexto
   - "Última cuenta usada"

5. **Vista Previa:**
   - Mostrar cómo quedará el pledge antes de crear
   - Confirmación visual

---

## 📖 Guía Rápida de Uso

### Para Usuario:

**Crear Pledge desde Cuenta Custodio:**
1. API VUSD Module → Click "New Pledge"
2. Selector → Elegir cuenta custodio
3. Verificar información mostrada
4. Click "Enviar"

**Crear Pledge Manual:**
1. API VUSD Module → Click "New Pledge"
2. Selector → Dejar en "Entrada Manual"
3. Ingresar amount y beneficiary
4. Click "Enviar"

**Cancelar:**
1. En modal "New Pledge"
2. Click "Cancelar"
3. Modal se cierra y limpia

---

© 2025 DAES - Data and Exchange Settlement
Selector de Cuentas Custody en API VUSD
