# 🚨 DIAGNÓSTICO URGENTE: Cuentas Custody No Aparecen

## 🎯 **PROBLEMA**

Las cuentas custody existen pero **NO aparecen en API VUSD** y sale **"0"**.

---

## 🔍 **DIAGNÓSTICO EN 3 PASOS**

### **PASO 1: Verificar que las Cuentas Existen**

1. Abre: **http://localhost:4001**
2. Login: **ModoDios / DAES3334**
3. Presiona **F12** para abrir consola
4. **Pega este código en la consola:**

```javascript
const stored = localStorage.getItem('Digital Commercial Bank Ltd_custody_accounts');
if (!stored) {
    console.error('❌ NO HAY CUENTAS');
} else {
    const data = JSON.parse(stored);
    console.log('✅ Cuentas encontradas:', data.accounts.length);
    console.table(data.accounts.map(a => ({
        Nombre: a.accountName,
        Total: a.totalBalance,
        Reservado: a.reservedBalance,
        Disponible: a.availableBalance,
        Estado: a.reservedBalance > 0 ? '✅ CON RESERVAS' : '❌ SIN RESERVAS'
    })));
}
```

### **Resultado A: "❌ NO HAY CUENTAS"**

**Significa:** No hay cuentas creadas

**Solución:**
1. Ve a **Custody Accounts**
2. Crea una cuenta nueva
3. **IMPORTANTE:** Después de crear, haz una RESERVA de fondos
4. Ejecuta el código del Paso 1 nuevamente

---

### **Resultado B: "✅ Cuentas encontradas: 1" (o más)**

**Ahora revisa la tabla:**

#### **Si dice "❌ SIN RESERVAS":**

**¡ESE ES EL PROBLEMA!**

Las cuentas existen pero **NO tienen fondos reservados**.

**Solución:**
1. Ve a **Custody Accounts**
2. Selecciona la cuenta
3. **Busca el botón "Reservar Fondos"** o similar
4. Reserva un monto (ej: 50000)
5. Verifica que ahora diga "Reservado: 50000"
6. Vuelve a API VUSD

#### **Si dice "✅ CON RESERVAS":**

**Las cuentas están correctas, el problema es otro.**

Continúa al **PASO 2**.

---

### **PASO 2: Verificar Logs de API VUSD**

1. Con la consola abierta (F12)
2. Ve al módulo **API VUSD**
3. Busca estos logs:

```
[VUSD] 📋 Iniciando carga de cuentas custody...
[VUSD] 🔍 Resumen de cuentas: { total: X, conReservas: Y, ... }
```

**Si ves:** `conReservas: 0`
- Significa que el filtro está funcionando
- Pero ninguna cuenta tiene reservas > 0
- **Solución:** Ve al Paso 1, Resultado B

**Si ves:** `conReservas: 1` (o más)
- Las cuentas se están cargando correctamente
- El problema es en la UI
- Continúa al **PASO 3**

---

### **PASO 3: Verificar UI del Modal**

1. En **API VUSD**, click en **"Nuevo Pledge"**
2. Busca el dropdown
3. **¿Qué ves?**

#### **Opción A: Dropdown vacío o solo "Entrada Manual"**

**Ejecuta en consola:**
```javascript
// Verificar estado de React
window.location.reload(); // Refresca la página
```

Luego vuelve a API VUSD y verifica nuevamente.

#### **Opción B: Aparece mensaje "No hay cuentas con reservas"**

**Esto es CORRECTO** si no tienes reservas.

**Solución:**
1. Ve a Custody Accounts
2. **RESERVA fondos** (no solo crear cuenta)
3. Vuelve a API VUSD

---

## 🔧 **HERRAMIENTA DE DIAGNÓSTICO**

He creado una herramienta visual para diagnosticar:

1. Abre en tu navegador:
```
http://localhost:4001/debug-custody-accounts.html
```

2. Verás:
   - ✅ Si hay datos en localStorage
   - ✅ Tabla con todas las cuentas
   - ✅ Estado de cada cuenta
   - ✅ Botones para crear cuenta de prueba

3. **Si no hay cuentas con reservas:**
   - Click en **"➕ Crear Cuenta de Prueba"**
   - Esto creará una cuenta con USD 50,000 RESERVADO
   - Vuelve a API VUSD y deberías verla

---

## 📊 **TABLA DE DIAGNÓSTICO**

| Síntoma | Causa | Solución |
|---------|-------|----------|
| No hay cuentas en localStorage | No creaste cuentas | Crear en Custody Accounts |
| Cuentas existen pero Reservado = 0 | No hiciste reserva | Reservar fondos en Custody |
| Reservado > 0 pero no aparece en VUSD | Cache del navegador | Refresh (F5) |
| conReservas: 0 en logs | Ninguna tiene reservas | Reservar fondos |
| conReservas: 1 pero no se ve | Bug de UI | Reportar con screenshot |

---

## ⚡ **SOLUCIÓN RÁPIDA - CREAR CUENTA DE PRUEBA**

**Ejecuta esto en la consola del navegador (F12):**

```javascript
const STORAGE_KEY = 'Digital Commercial Bank Ltd_custody_accounts';
const stored = localStorage.getItem(STORAGE_KEY);
let data = stored ? JSON.parse(stored) : { accounts: [], lastUpdated: new Date().toISOString() };

const testAccount = {
    id: 'TEST_' + Date.now(),
    accountType: 'banking',
    accountName: 'TEST HSBC USD - CON RESERVAS',
    currency: 'USD',
    totalBalance: 100000,
    reservedBalance: 50000,  // ✅ CON 50k RESERVADO
    availableBalance: 50000,
    bankName: 'HSBC',
    iban: 'TEST1234567890',
    encryptedData: '',
    verificationHash: '',
    apiId: 'TEST',
    apiEndpoint: '',
    apiKey: '',
    apiStatus: 'active',
    vusdBalanceEnabled: true,
    daesPledgeEnabled: true,
    iso27001Compliant: false,
    iso20022Compatible: false,
    fatfAmlVerified: false,
    kycVerified: false,
    amlScore: 0,
    riskLevel: 'low',
    createdAt: new Date().toISOString(),
    reservations: []
};

data.accounts.push(testAccount);
data.lastUpdated = new Date().toISOString();
localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

console.log('✅ Cuenta de prueba creada:');
console.log('   Nombre: TEST HSBC USD - CON RESERVAS');
console.log('   Balance Total: USD 100,000');
console.log('   Reservado: USD 50,000');
console.log('   Disponible: USD 50,000');
console.log('\n🔄 Ahora recarga la página (F5) y ve a API VUSD');
```

**Después de ejecutar:**
1. Recarga la página (F5)
2. Ve a **API VUSD**
3. Click **"Nuevo Pledge"**
4. **Deberías ver:** `TEST HSBC USD - CON RESERVAS · USD 50,000.00 reservado`

---

## 🎯 **CHECKLIST DE VERIFICACIÓN**

Ejecuta cada paso y marca:

- [ ] 1. Ejecuté código de diagnóstico en consola
- [ ] 2. Vi resultado: ¿Hay cuentas? SÍ/NO
- [ ] 3. Si HAY cuentas, ¿tienen Reservado > 0? SÍ/NO
- [ ] 4. Si NO tienen reservas, fui a Custody Accounts
- [ ] 5. Seleccioné cuenta y reservé fondos
- [ ] 6. Volví a API VUSD
- [ ] 7. Abrí consola y vi logs de `[VUSD] 🔍 Resumen`
- [ ] 8. El log muestra `conReservas: 1` o más
- [ ] 9. Hice click en "Nuevo Pledge"
- [ ] 10. Vi mi cuenta en el dropdown

---

## 🆘 **SI NADA FUNCIONA - SOLUCIÓN DEFINITIVA**

### **Opción 1: Usar Herramienta de Debug**

```
Abre: http://localhost:4001/debug-custody-accounts.html

1. Click en "🔄 Analizar Cuentas"
2. Ver tabla de cuentas
3. Si no hay cuentas con reservas:
   - Click "➕ Crear Cuenta de Prueba"
4. Volver a http://localhost:4001
5. Ir a API VUSD
```

### **Opción 2: Script Automático**

```javascript
// Ejecutar en consola para crear cuenta de prueba
fetch('http://localhost:4001/diagnostic-script.js')
  .then(r => r.text())
  .then(script => eval(script))
  .catch(() => {
    // Si falla, copiar el código de arriba directamente
  });
```

---

## 📞 **REPORTE DE ESTADO**

**Por favor ejecuta los pasos de diagnóstico y repórtame:**

1. ¿Cuántas cuentas muestra el código de diagnóstico?
2. ¿Cuántas tienen "Reservado" > 0?
3. ¿Qué dice el log `[VUSD] 🔍 Resumen de cuentas`?

Con esa información podré dar la solución exacta.

---

**Fecha:** 2025-11-15  
**Prioridad:** 🔥 URGENTE  
**Estado:** En diagnóstico

