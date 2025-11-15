# 🔍 DIAGNÓSTICO: Cuentas Custody No Aparecen en API VUSD

## ❌ **PROBLEMA**

Las cuentas custody están creadas en el módulo **Custody Accounts**, pero cuando vas a **API VUSD** aparece el mensaje:

```
⚠️ No hay Cuentas de Custodia Disponibles
Para crear pledges vinculados a cuentas de custodia, 
primero debes crear cuentas en el módulo correspondiente.
```

---

## 🔍 **PASOS DE DIAGNÓSTICO**

### **Paso 1: Verificar que las Cuentas Existen en localStorage**

1. Abre la aplicación: **http://localhost:4001**
2. Abre la **Consola de Desarrollador** (F12)
3. Ve a la pestaña **Console**
4. Ejecuta este comando:

```javascript
// Ver cuentas en localStorage
const stored = localStorage.getItem('Digital Commercial Bank Ltd_custody_accounts');
if (stored) {
  const data = JSON.parse(stored);
  console.log('✅ Cuentas encontradas:', data.accounts.length);
  console.table(data.accounts.map(a => ({
    ID: a.id,
    Nombre: a.accountName,
    Tipo: a.accountType,
    Moneda: a.currency,
    Total: a.totalBalance,
    Disponible: a.availableBalance
  })));
} else {
  console.error('❌ No hay cuentas en localStorage');
}
```

**Resultado esperado:**
```
✅ Cuentas encontradas: 1 (o el número que tengas)
```

---

### **Paso 2: Verificar Logs de API VUSD**

1. Ve al módulo **API VUSD**
2. Abre la consola (F12)
3. Busca estos logs:

```
[VUSD] 🚀 Inicializando módulo API VUSD...
[VUSD] 📋 Iniciando carga de cuentas custody...
[VUSD] 🔍 Cuentas custody encontradas: { total: X, cuentas: [...] }
```

**Si ves:** `total: 0`
→ El problema está en que `custodyStore.getAccounts()` retorna array vacío

**Si ves:** `total: 1` o más
→ Las cuentas se están cargando, el problema es otra cosa

---

### **Paso 3: Verificar Estado de React**

En la consola, ejecuta:

```javascript
// Verificar el estado del componente (solo funciona si tienes React DevTools)
// Alternativamente, ve a la pestaña Components en DevTools
// Busca: APIVUSDModule -> hooks -> State -> custodyAccounts
```

---

## ✅ **SOLUCIONES SEGÚN EL PROBLEMA**

### **Problema A: localStorage Está Vacío**

**Síntoma:** El comando del Paso 1 retorna `❌ No hay cuentas en localStorage`

**Solución:**
1. Ve al módulo **Custody Accounts**
2. Crea una nueva cuenta
3. Verifica que aparezca en la lista
4. Ejecuta el comando del Paso 1 nuevamente

---

### **Problema B: localStorage Tiene Cuentas Pero API VUSD No Las Ve**

**Síntoma:** 
- Paso 1 muestra cuentas ✅
- Paso 2 muestra `total: 0` ❌

**Causa:** El `custodyStore.getAccounts()` no está leyendo correctamente

**Solución:**
1. Reinicia la aplicación (refresca la página)
2. Ve directamente a API VUSD
3. Verifica los logs

Si persiste, ejecuta en consola:

```javascript
// Forzar recarga del store
import { custodyStore } from './lib/custody-store';
const accounts = custodyStore.getAccounts();
console.log('Cuentas desde store:', accounts.length);
```

---

### **Problema C: Las Cuentas se Cargan Pero No se Muestran**

**Síntoma:**
- Paso 1 muestra cuentas ✅
- Paso 2 muestra `total: 1` o más ✅
- Pero aún dice "No hay cuentas disponibles"

**Causa:** El estado `custodyAccounts` no se está actualizando

**Solución en Código:**

He agregado logs detallados. Reinicia el servidor:

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
npm run dev
```

Luego verifica en la consola que aparezcan estos logs:

```
[VUSD] 📤 Actualizando estado custodyAccounts con: X cuentas
```

---

## 🐛 **CORRECCIONES IMPLEMENTADAS**

He mejorado el código de `APIVUSDModule.tsx` con:

### **1. Logs Detallados de Debugging**

```typescript
const loadCustodyAccounts = async () => {
  console.log('[VUSD] 📋 Iniciando carga de cuentas custody...');
  
  const accounts = custodyStore.getAccounts();

  console.log('[VUSD] 🔍 Cuentas custody encontradas:', {
    total: accounts.length,
    cuentas: accounts.map(a => ({
      id: a.id,
      name: a.accountName,
      type: a.accountType,
      currency: a.currency,
      total: a.totalBalance,
      reserved: a.reservedBalance,
      available: a.availableBalance
    }))
  });

  if (accounts.length === 0) {
    console.warn('[VUSD] ⚠️ No se encontraron cuentas custody en el store');
    console.log('[VUSD] 💡 Verifica que hayas creado cuentas en el módulo Custody Accounts');
  }

  // ... resto del código ...

  console.log('[VUSD] 📤 Actualizando estado custodyAccounts con:', accounts.length, 'cuentas');
  
  setCustodyAccounts(accounts);
};
```

### **2. Inicialización Limpia**

Removí la llamada a `recalculateAllBalances()` que causaba confusión:

```typescript
useEffect(() => {
  console.log('[VUSD] 🚀 Inicializando módulo API VUSD...');
  
  loadData();
  loadCustodyAccounts();  // ← Carga cuentas correctamente
  const interval = setInterval(loadData, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## 🚀 **CÓMO PROBAR LA SOLUCIÓN**

### **1. Reiniciar Servidor**

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'
npm run dev
```

### **2. Abrir Aplicación con Consola**

1. Abre: **http://localhost:4001**
2. Abre **Consola (F12)** desde AHORA
3. Login: **ModoDios / DAES3334**

### **3. Ir a Custody Accounts**

1. Ve al módulo **Custody Accounts**
2. **Si NO tienes cuentas:**
   - Crea una cuenta nueva
   - Pon: Nombre, Tipo (blockchain/banking), Moneda, Balance
   - Guarda
3. **Si YA tienes cuentas:**
   - Verifica que aparezcan en la lista
   - Anota el nombre de una cuenta

### **4. Ir a API VUSD**

1. Ve al módulo **API VUSD**
2. **En la consola deberías ver:**

```
[VUSD] 🚀 Inicializando módulo API VUSD...
[VUSD] 📋 Iniciando carga de cuentas custody...
[VUSD] 🔍 Cuentas custody encontradas: { 
  total: 1, 
  cuentas: [
    {
      id: "...",
      name: "HSBC USD Main",
      type: "banking",
      currency: "USD",
      total: 100000,
      reserved: 0,
      available: 100000
    }
  ]
}
[VUSD] ✅ Cuentas cargadas preservando reservas existentes
[VUSD] 📤 Actualizando estado custodyAccounts con: 1 cuentas
```

3. **Click en "Nuevo Pledge"**
4. **Deberías ver el dropdown** con tu cuenta

---

## 📊 **CHECKLIST DE VERIFICACIÓN**

Marca cada paso que completes:

- [ ] ✅ Ejecuté comando en consola para verificar localStorage
- [ ] ✅ Vi que hay cuentas en localStorage
- [ ] ✅ Reinicié el servidor
- [ ] ✅ Abrí la app con consola abierta (F12)
- [ ] ✅ Entré a Custody Accounts
- [ ] ✅ Verifiqué que mis cuentas aparecen
- [ ] ✅ Entré a API VUSD
- [ ] ✅ Vi los logs de "[VUSD] 🔍 Cuentas custody encontradas"
- [ ] ✅ El log muestra `total: 1` o más
- [ ] ✅ Hice click en "Nuevo Pledge"
- [ ] ✅ Veo el dropdown con mis cuentas

---

## 🆘 **SI SIGUE SIN FUNCIONAR**

### **Opción 1: Limpiar localStorage y Recrear**

```javascript
// En consola
localStorage.removeItem('Digital Commercial Bank Ltd_custody_accounts');
localStorage.removeItem('Digital Commercial Bank Ltd_custody_counter');
// Recarga la página
location.reload();
```

Luego crea una cuenta nueva en Custody Accounts.

---

### **Opción 2: Ver Estructura Completa**

```javascript
// En consola
console.log('🔍 Diagnóstico completo:');
console.log('1. localStorage keys:', Object.keys(localStorage));
console.log('2. Custody data:', localStorage.getItem('Digital Commercial Bank Ltd_custody_accounts'));

// Intentar cargar desde store
try {
  const stored = localStorage.getItem('Digital Commercial Bank Ltd_custody_accounts');
  if (stored) {
    const data = JSON.parse(stored);
    console.log('3. Cuentas parseadas:', data.accounts);
  }
} catch (e) {
  console.error('4. Error parseando:', e);
}
```

---

### **Opción 3: Verificar Imports**

El problema podría ser que `custodyStore` no está importado correctamente.

Verifica en `src/components/APIVUSDModule.tsx` línea 27:

```typescript
import { custodyStore } from '../lib/custody-store';
```

Debe estar presente. (Ya lo verifiqué, está ahí ✅)

---

## 📝 **INFORMACIÓN ADICIONAL**

### **¿Dónde se Guardan las Cuentas?**

- **LocalStorage Key:** `'Digital Commercial Bank Ltd_custody_accounts'`
- **Formato:** JSON con estructura `{ accounts: [...], lastUpdated: "..." }`

### **¿Cómo se Cargan en API VUSD?**

1. `useEffect()` se ejecuta al montar el componente
2. Llama a `loadCustodyAccounts()`
3. Esta función llama a `custodyStore.getAccounts()`
4. El store lee de localStorage
5. Se actualiza el estado con `setCustodyAccounts(accounts)`
6. React re-renderiza el componente
7. El dropdown ahora tiene las opciones

---

## 🎯 **RESULTADO ESPERADO**

Después de seguir estos pasos, deberías ver:

```
┌─────────────────────────────────────────────────────────┐
│ 🗄️ Seleccionar Cuenta Custodio                        │
├─────────────────────────────────────────────────────────┤
│ ▼ [Dropdown con borde púrpura]                         │
│                                                         │
│   • Entrada Manual (Sin cuenta custody)                │
│   • HSBC USD Main · USD 100,000.00 disponible         │
│   • JP Morgan EUR · EUR 85,500.00 disponible          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

**Fecha:** 2025-11-15  
**Problema:** Cuentas Custody no aparecen en API VUSD  
**Cambios:** Logs de debugging agregados  
**Estado:** En diagnóstico

