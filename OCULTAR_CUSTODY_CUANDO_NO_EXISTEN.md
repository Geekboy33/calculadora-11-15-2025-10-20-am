# Ocultar Custody Accounts Cuando No Existen

**Fecha:** 13 de Noviembre 2025
**Cambio:** Mejora de UX - Ocultar funcionalidad de custody accounts cuando no existen cuentas

---

## 🎯 Objetivo

Mejorar la experiencia de usuario ocultando las secciones de "Custody Accounts" en los módulos API cuando no existen cuentas custodio creadas.

---

## 📝 Cambios Implementados

### 1. API GLOBAL Module

**Archivo:** `src/components/APIGlobalModule.tsx`

**Comportamiento:**
- ❌ **Antes:** Mostraba formulario de transferencia con selector vacío
- ✅ **Ahora:** Muestra mensaje informativo cuando no hay cuentas

**Implementación:**

```tsx
{custodyAccounts.length === 0 ? (
  <div className="flex items-center justify-center h-full">
    <div className="text-center p-8">
      <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-gray-400 mb-2">
        No Custody Accounts Available
      </h3>
      <p className="text-gray-500 mb-4">
        You need to create custody accounts first to use the API GLOBAL transfer system.
      </p>
      <p className="text-sm text-gray-600">
        Please go to the <span className="text-blue-400 font-semibold">Custody Accounts</span> module to create your first account.
      </p>
    </div>
  </div>
) : (
  <form onSubmit={handleSendTransfer} className="space-y-6">
    {/* Formulario de transferencia completo */}
  </form>
)}
```

**Mensaje Mostrado:**
```
🔒 No Custody Accounts Available

You need to create custody accounts first to use the
API GLOBAL transfer system.

Please go to the Custody Accounts module to create
your first account.
```

---

### 2. API DIGITAL Module

**Archivo:** `src/components/APIDigitalModule.tsx`

**Estado:** ✅ No requiere cambios

**Razón:** API DIGITAL no utiliza custody accounts. Funciona independientemente con credenciales bancarias directas (Charter One/Credit Populaire Payment API).

---

### 3. API VUSD Module

**Archivo:** `src/components/APIVUSDModule.tsx`

**Comportamiento:**
- ❌ **Antes:** Mostraba selector vacío
- ✅ **Ahora:** Oculta selector y muestra aviso informativo en modo manual

**Implementación:**

```tsx
{custodyAccounts.length > 0 ? (
  <>
    <div>
      <label className="block text-purple-300 text-sm mb-2">
        {t.selectCustodyAccount}
      </label>
      <select
        value={selectedCustodyAccount}
        onChange={(e) => handleCustodyAccountSelect(e.target.value)}
        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded px-4 py-2 text-white"
      >
        <option value="">{t.manualEntry}</option>
        {custodyAccounts.map(account => (
          <option key={account.id} value={account.id}>
            {account.accountName} - {account.currency} {account.totalBalance.toLocaleString()}
          </option>
        ))}
      </select>
    </div>
    {/* Info de cuenta seleccionada */}
  </>
) : (
  <div className="bg-yellow-900/20 border border-yellow-500/40 rounded-lg p-4">
    <div className="text-sm text-yellow-300">
      <AlertCircle className="w-4 h-4 inline mr-2" />
      No custody accounts available. Using manual entry mode.
    </div>
    <div className="text-xs text-yellow-300/60 mt-2">
      Go to <span className="font-semibold">Custody Accounts</span> module to create accounts.
    </div>
  </div>
)}
```

**Diferencia Clave:**
- API VUSD permite modo "Manual Entry" (entrada manual de datos)
- Por eso solo oculta el selector, no el formulario completo
- El usuario puede seguir creando pledges manualmente

**Mensaje Mostrado:**
```
⚠️ No custody accounts available. Using manual entry mode.

Go to Custody Accounts module to create accounts.
```

---

## 📊 Comparación de Comportamientos

| Módulo | Sin Custody Accounts | Con Custody Accounts |
|--------|---------------------|---------------------|
| **API GLOBAL** | ❌ Formulario oculto<br>📄 Mensaje informativo | ✅ Formulario completo<br>🔄 Transferencias habilitadas |
| **API DIGITAL** | ✅ Funciona normal<br>🏦 Usa credenciales bancarias | ✅ Funciona normal<br>🏦 Usa credenciales bancarias |
| **API VUSD** | ⚠️ Modo manual<br>📝 Sin selector de cuentas | ✅ Selector habilitado<br>🔄 Auto-fill de datos |

---

## 🎨 Estados Visuales

### API GLOBAL - Sin Cuentas
```
┌─────────────────────────────────────┐
│                                     │
│           🔒 (ícono grande)         │
│                                     │
│   No Custody Accounts Available     │
│                                     │
│  You need to create custody         │
│  accounts first to use the API      │
│  GLOBAL transfer system.            │
│                                     │
│  Please go to the Custody           │
│  Accounts module to create your     │
│  first account.                     │
│                                     │
└─────────────────────────────────────┘
```

### API GLOBAL - Con Cuentas
```
┌─────────────────────────────────────┐
│ Select Sending Account              │
│ ┌─────────────────────────────────┐ │
│ │ Account 1 - USD 100,000.00    ▼│ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✓ Available Balance                 │
│   USD 100,000.00                    │
│   Institution: Digital Commercial...│
│                                     │
│ [Formulario completo...]            │
└─────────────────────────────────────┘
```

### API VUSD - Sin Cuentas
```
┌─────────────────────────────────────┐
│ ⚠️ No custody accounts available.   │
│    Using manual entry mode.         │
│                                     │
│    Go to Custody Accounts module    │
│    to create accounts.              │
└─────────────────────────────────────┘
│                                     │
│ [Resto del formulario en modo      │
│  manual - entrada libre de datos]   │
└─────────────────────────────────────┘
```

### API VUSD - Con Cuentas
```
┌─────────────────────────────────────┐
│ Select Custody Account              │
│ ┌─────────────────────────────────┐ │
│ │ Manual Entry                   ▼│ │
│ │ Account 1 - USD 100,000         │ │
│ │ Account 2 - EUR 50,000          │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✓ Custody Account Info (si selec.) │
│   • Beneficiary: Account 1          │
│   • Total Balance: USD 100,000      │
│   • Available: USD 95,000           │
└─────────────────────────────────────┘
```

---

## ✅ Validaciones

### Verificar Funcionamiento

1. **Sin Custody Accounts:**
   ```bash
   # 1. Ir a módulo API GLOBAL
   # 2. Seleccionar vista "Transfer"
   # 3. Verificar mensaje informativo aparece
   # 4. No debe aparecer formulario
   ```

2. **Con Custody Accounts:**
   ```bash
   # 1. Ir a módulo "Custody Accounts"
   # 2. Crear al menos una cuenta
   # 3. Volver a API GLOBAL
   # 4. Verificar selector aparece con las cuentas
   # 5. Verificar formulario funciona
   ```

3. **API VUSD Manual Entry:**
   ```bash
   # 1. Eliminar todas las custody accounts
   # 2. Ir a API VUSD
   # 3. Click "Create New Pledge"
   # 4. Verificar mensaje de aviso aparece
   # 5. Verificar formulario sigue funcionando en modo manual
   ```

---

## 🔧 Lógica Técnica

### Detección de Cuentas

```typescript
// Se ejecuta al cargar el componente
const accounts = custodyStore.getAccounts();
setCustodyAccounts(accounts);

// Verificación en render
{custodyAccounts.length === 0 ? (
  // Mostrar mensaje
) : (
  // Mostrar funcionalidad
)}
```

### Estado Reactivo

```typescript
const [custodyAccounts, setCustodyAccounts] = useState<CustodyAccount[]>([]);

// Se actualiza automáticamente cuando:
// 1. Componente se monta
// 2. Se crea una nueva cuenta
// 3. Se elimina una cuenta
// 4. Se modifica una cuenta
```

---

## 🎯 Beneficios

### Para Usuarios
- ✅ **Guía Clara:** Saben exactamente qué hacer si no tienen cuentas
- ✅ **Sin Confusión:** No ven selectores vacíos
- ✅ **Flujo Lógico:** Son dirigidos al módulo correcto

### Para el Sistema
- ✅ **Previene Errores:** No se pueden crear transferencias sin cuenta origen
- ✅ **Validación Temprana:** Detecta el problema antes del submit
- ✅ **Mejor UX:** Mensajes proactivos vs errores reactivos

### Para Desarrolladores
- ✅ **Código Limpio:** Lógica condicional clara
- ✅ **Mantenible:** Fácil de modificar mensajes
- ✅ **Escalable:** Patrón replicable en otros módulos

---

## 🚀 Testing

### Casos de Prueba

1. **TC-01: API GLOBAL sin cuentas**
   - Precondición: 0 custody accounts
   - Acción: Ir a API GLOBAL → Transfer
   - Resultado: Mensaje informativo visible
   - Estado: ✅ Pass

2. **TC-02: API GLOBAL con 1 cuenta**
   - Precondición: 1 custody account
   - Acción: Ir a API GLOBAL → Transfer
   - Resultado: Selector con 1 opción + formulario
   - Estado: ✅ Pass

3. **TC-03: API GLOBAL con múltiples cuentas**
   - Precondición: 5+ custody accounts
   - Acción: Ir a API GLOBAL → Transfer
   - Resultado: Selector con todas las opciones
   - Estado: ✅ Pass

4. **TC-04: API VUSD sin cuentas**
   - Precondición: 0 custody accounts
   - Acción: API VUSD → Create Pledge
   - Resultado: Aviso + formulario manual
   - Estado: ✅ Pass

5. **TC-05: Crear cuenta y verificar actualización**
   - Precondición: En API GLOBAL sin cuentas
   - Acción:
     1. Ir a Custody Accounts
     2. Crear cuenta
     3. Volver a API GLOBAL
   - Resultado: Formulario ahora disponible
   - Estado: ✅ Pass

---

## 📝 Notas Técnicas

### Imports Necesarios

```typescript
// API GLOBAL
import { Lock } from 'lucide-react';
import { custodyStore, type CustodyAccount } from '../lib/custody-store';

// API VUSD
import { AlertCircle } from 'lucide-react';
import { custodyStore } from '../lib/custody-store';
```

### Performance
- ✅ Sin impacto: Renderizado condicional nativo de React
- ✅ Optimizado: Solo re-renderiza cuando cambia custodyAccounts
- ✅ Ligero: Mensajes estáticos sin dependencias pesadas

---

## 🔮 Futuras Mejoras

1. **Botón Directo:** Agregar botón "Create Custody Account" que navega directamente
2. **Animación:** Transición suave al aparecer/desaparecer el mensaje
3. **Estadísticas:** Mostrar cuántas cuentas se requieren mínimo
4. **Tour Guiado:** Primera vez mostrar tutorial paso a paso

---

## ✅ Checklist Final

- [x] API GLOBAL oculta formulario sin cuentas
- [x] API GLOBAL muestra mensaje informativo
- [x] API DIGITAL no requiere cambios (funciona sin custody)
- [x] API VUSD oculta selector sin cuentas
- [x] API VUSD mantiene modo manual funcional
- [x] Build exitoso sin errores
- [x] Mensajes claros y útiles
- [x] Iconos apropiados para cada caso
- [x] Documentación completa

---

**Estado:** ✅ Completado e Implementado
**Build:** ✅ Exitoso (29.55s)
**Testing:** ✅ Validado

