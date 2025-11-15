# 🔥 EJECUTAR ESTO AHORA - DIAGNÓSTICO Y SOLUCIÓN

## 🎯 **PROBLEMA**

Cuentas custody existen pero NO aparecen en API VUSD y sale **"0"**.

---

## ⚡ **SOLUCIÓN INMEDIATA (3 MINUTOS)**

### **PASO 1: Abrir Consola**

1. Abre: **http://localhost:4001**
2. Login: **ModoDios / DAES3334**
3. Presiona **F12**
4. Click en la pestaña **"Console"**

---

### **PASO 2: Ejecutar Diagnóstico**

**Copia y pega esto en la consola:**

```javascript
console.log('🔍 DIAGNÓSTICO CUSTODY ACCOUNTS');
console.log('================================\n');

const STORAGE_KEY = 'Digital Commercial Bank Ltd_custody_accounts';
const stored = localStorage.getItem(STORAGE_KEY);

if (!stored) {
    console.error('❌ NO HAY CUENTAS EN LOCALSTORAGE');
    console.log('\n💡 SOLUCIÓN: Ve a Custody Accounts y crea una cuenta');
} else {
    const data = JSON.parse(stored);
    console.log(`✅ Encontradas ${data.accounts.length} cuentas\n`);
    
    console.table(data.accounts.map(a => ({
        Nombre: a.accountName,
        Moneda: a.currency,
        Total: a.totalBalance,
        Reservado: a.reservedBalance,
        Disponible: a.availableBalance,
        Estado: a.reservedBalance > 0 ? '✅ CON RESERVAS' : '❌ SIN RESERVAS'
    })));
    
    const conReservas = data.accounts.filter(a => a.reservedBalance > 0);
    
    console.log(`\n📊 RESUMEN:`);
    console.log(`   Total: ${data.accounts.length}`);
    console.log(`   Con reservas: ${conReservas.length}`);
    console.log(`   Sin reservas: ${data.accounts.length - conReservas.length}`);
    
    if (conReservas.length === 0) {
        console.error('\n❌ PROBLEMA ENCONTRADO:');
        console.error('   NINGUNA CUENTA TIENE FONDOS RESERVADOS\n');
        console.log('💡 SOLUCIÓN:');
        console.log('   1. Ve a "Custody Accounts"');
        console.log('   2. Selecciona una cuenta');
        console.log('   3. RESERVA fondos (botón "Reservar")');
        console.log('   4. Vuelve a API VUSD\n');
    } else {
        console.log('\n✅ ESTAS CUENTAS DEBERÍAN APARECER EN API VUSD:');
        conReservas.forEach(a => {
            console.log(`   • ${a.accountName} · ${a.currency} ${a.reservedBalance.toLocaleString()} reservado`);
        });
    }
}

console.log('\n================================');
```

---

### **PASO 3: Leer el Resultado**

#### **Si dice: "❌ NO HAY CUENTAS"**

**Ejecuta esto para crear una cuenta de prueba:**

```javascript
const STORAGE_KEY = 'Digital Commercial Bank Ltd_custody_accounts';

const testAccount = {
    id: 'TEST_' + Date.now(),
    accountType: 'banking',
    accountName: 'HSBC USD MAIN - TEST',
    currency: 'USD',
    totalBalance: 100000,
    reservedBalance: 50000,  // ✅ 50k RESERVADO
    availableBalance: 50000,
    bankName: 'HSBC',
    iban: 'US123456789',
    swiftCode: 'HSBCUS33',
    encryptedData: '',
    verificationHash: '',
    apiId: 'HSBC_USD',
    apiEndpoint: '',
    apiKey: '',
    apiStatus: 'active',
    vusdBalanceEnabled: true,
    daesPledgeEnabled: true,
    iso27001Compliant: true,
    iso20022Compatible: true,
    fatfAmlVerified: true,
    kycVerified: true,
    amlScore: 95,
    riskLevel: 'low',
    createdAt: new Date().toISOString(),
    reservations: [{
        id: 'RSV_' + Date.now(),
        amount: 50000,
        blockchain: 'Ethereum',
        contractAddress: '0x...',
        tokenAmount: 50000,
        status: 'reserved',
        timestamp: new Date().toISOString()
    }]
};

let data = { 
    accounts: [testAccount], 
    lastUpdated: new Date().toISOString() 
};

localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

console.log('✅ CUENTA DE PRUEBA CREADA:');
console.log('   Nombre: HSBC USD MAIN - TEST');
console.log('   Total: USD 100,000');
console.log('   Reservado: USD 50,000  ← ✅');
console.log('   Disponible: USD 50,000');
console.log('\n🔄 Recarga la página (F5) y ve a API VUSD');
```

**Luego:**
1. Presiona **F5** (recargar página)
2. Ve a **API VUSD**
3. Click **"Nuevo Pledge"**
4. **Deberías ver la cuenta**

---

#### **Si dice: "❌ SIN RESERVAS"**

**Significa:** Las cuentas existen pero **NO tienen fondos reservados**

**Solución:**
1. Ve a **"Custody Accounts"**
2. Verás tus cuentas listadas
3. Selecciona una cuenta
4. **Busca el botón para RESERVAR fondos**
5. Reserva un monto (ej: 50000)
6. Verifica que aparezca "Reservado: 50,000"
7. Vuelve a **API VUSD**
8. Presiona **F5** para recargar
9. Click **"Nuevo Pledge"**
10. Ahora sí deberías ver la cuenta

---

#### **Si dice: "✅ CON RESERVAS"**

**Perfecto!** Las cuentas están bien.

**Ahora verifica:**
1. Ve a **API VUSD**
2. Abre consola (F12)
3. Busca el log: `[VUSD] 🔍 Resumen de cuentas`
4. Debe decir: `conReservas: 1` (o más)

**Si dice `conReservas: 0`:**
- Hay un bug en el filtrado
- Manda screenshot de los logs

**Si dice `conReservas: 1`:**
- Las cuentas se están cargando
- Click en "Nuevo Pledge"
- Deberías verlas en el dropdown

---

## 🛠️ **HERRAMIENTA VISUAL**

También puedes usar la herramienta de debug:

```
1. Abre en navegador:
   http://localhost:4001/debug-custody-accounts.html

2. Click en "🔄 Analizar Cuentas"

3. Verás tabla con todas las cuentas

4. Si no hay cuentas con reservas:
   Click "➕ Crear Cuenta de Prueba"

5. Vuelve a http://localhost:4001

6. Ve a API VUSD
```

---

## 📊 **QUÉ ESPERAR VER**

### **En la Consola del Navegador:**

```javascript
[VUSD] 📋 Iniciando carga de cuentas custody...
[VUSD] 💰 Cuenta con reservas encontrada: {
  name: "HSBC USD MAIN",
  currency: "USD",
  totalBalance: 100000,
  reservedBalance: 50000,    ← ✅ Debe ser > 0
  availableBalance: 50000,
  canCreatePledge: true
}
[VUSD] 🔍 Resumen de cuentas: {
  total: 1,
  conReservas: 1,           ← ✅ Debe ser > 0
  sinReservas: 0
}
[VUSD] ✅ Cuentas con reservas cargadas
[VUSD] 📤 Actualizando estado con: 1 cuentas disponibles
```

### **En el Dropdown de "Nuevo Pledge":**

```
┌─────────────────────────────────────────┐
│ 🗄️ Seleccionar Cuenta Custodio         │
├─────────────────────────────────────────┤
│ ▼ [Dropdown]                            │
│   • Entrada Manual (Sin cuenta custody) │
│   • HSBC USD MAIN · USD 50,000.00 reservado │
│                     ↑                    │
│             Debe aparecer así            │
└─────────────────────────────────────────┘
```

---

## 🚨 **VERIFICACIÓN FINAL**

**Ejecuta este código para verificación completa:**

```javascript
// VERIFICACIÓN COMPLETA
console.log('🔍 ===== VERIFICACIÓN FINAL =====\n');

const key = 'Digital Commercial Bank Ltd_custody_accounts';
const data = localStorage.getItem(key);

if (!data) {
    console.error('❌ RESULTADO: NO HAY CUENTAS');
    console.log('✅ ACCIÓN: Ejecutar script de crear cuenta de prueba (arriba)');
} else {
    const parsed = JSON.parse(data);
    const total = parsed.accounts.length;
    const conReservas = parsed.accounts.filter(a => a.reservedBalance > 0).length;
    
    console.log(`📊 Total de cuentas: ${total}`);
    console.log(`📊 Con reservas (>0): ${conReservas}`);
    
    if (conReservas === 0) {
        console.error('\n❌ RESULTADO: CUENTAS EXISTEN PERO SIN RESERVAS');
        console.log('✅ ACCIÓN: Ve a Custody Accounts y RESERVA fondos');
    } else {
        console.log('\n✅ RESULTADO: TODO CORRECTO');
        console.log(`✅ ACCIÓN: Ve a API VUSD, deberías ver ${conReservas} cuenta(s)`);
    }
}

console.log('\n===============================');
```

---

## 📋 **CHECKLIST SIMPLE**

Marca cada uno al completar:

- [ ] 1. Abrí http://localhost:4001
- [ ] 2. Presioné F12 (consola abierta)
- [ ] 3. Login exitoso
- [ ] 4. Ejecuté script de diagnóstico
- [ ] 5. Vi resultado: ¿Hay cuentas? **___** (SÍ/NO)
- [ ] 6. Si SÍ: ¿Tienen Reservado > 0? **___** (SÍ/NO)
- [ ] 7. Si NO tienen reservas: Fui a Custody y reservé fondos
- [ ] 8. Volví a API VUSD
- [ ] 9. Vi logs en consola: `conReservas: ___`
- [ ] 10. Click "Nuevo Pledge"
- [ ] 11. Vi mi cuenta en dropdown: **___** (SÍ/NO)

---

## 🎯 **RESULTADO ESPERADO**

Después de ejecutar los pasos:

1. ✅ Script muestra: "Con reservas: 1" (o más)
2. ✅ Logs de VUSD muestran: `conReservas: 1`
3. ✅ Dropdown muestra: "HSBC USD MAIN · USD 50,000.00 reservado"
4. ✅ Panel muestra: "🔒 Monto RESERVADO: 50,000"

---

**POR FAVOR ejecuta el script de diagnóstico y dime qué resultado te da.**

**¿Muestra "❌ SIN RESERVAS" o "✅ CON RESERVAS"?**
