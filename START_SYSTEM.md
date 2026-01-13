# 🚀 INICIAR SISTEMA COMPLETO USD → USDT

## ✅ CHECKLIST PRE-INICIO

Antes de iniciar el sistema, asegúrate de tener:

- [ ] `.env` configurado con credenciales de Ethereum
- [ ] `fondos.json` con cuentas bancarias en el servidor
- [ ] Node.js instalado
- [ ] Puertos 3000 y 5173 disponibles

---

## 📋 PASO 1: VERIFICAR CONFIGURACIÓN `.env`

Abre: `calculadora-11-15-2025-10-20-am/.env`

Debe tener estas variables:

```bash
# Ethereum / Infura
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
VITE_ETH_PRIVATE_KEY=tu_private_key_aqui
VITE_ETH_WALLET_ADDRESS=tu_wallet_address_aqui

# USDT Contract (ERC-20 Ethereum Mainnet) - No cambies esto
VITE_USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7

# Frontend Port
VITE_PORT=5173

# Backend Port
PORT=3000
```

**⚠️ IMPORTANTE:** 
- Si `VITE_ETH_PRIVATE_KEY` está vacío, usará modo **SIMULADO**
- Para modo **REAL**, rellena con tu clave privada de MetaMask

---

## 📁 PASO 2: VERIFICAR `fondos.json`

Debe estar en: `server/fondos.json`

Estructura esperada:

```json
{
  "cuentas_bancarias": [
    {
      "id": 1,
      "nombre": "Cuenta Principal USD",
      "monto_usd": 50000,
      "direccion_usdt": "0x...",
      "banco": "Mi Banco",
      "moneda": "USD"
    }
  ]
}
```

**Si no existe**, créalo ahora:

```bash
cd server
echo '{"cuentas_bancarias":[]}' > fondos.json
```

---

## 🎯 PASO 3: INSTALAR DEPENDENCIAS

### Backend:
```bash
cd server
npm install
```

### Frontend:
```bash
cd ..
npm install
```

---

## 🔥 PASO 4: INICIAR EL SISTEMA

### Opción A: Terminal Única (Recomendado)

```bash
npm run dev:full
```

Esto inicia automáticamente:
- Backend en `http://localhost:3000`
- Frontend en `http://localhost:5173`

---

### Opción B: Dos Terminales Separadas

**Terminal 1 (Backend):**
```bash
cd server
npm start
```

Deberías ver:
```
✅ [PoR API] Server listening on http://localhost:3000
✅ [CEX.io Prime] Proxy endpoint available...
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

Deberías ver:
```
  ➜  Local:   http://localhost:5173/
```

---

## ✅ VERIFICAR QUE FUNCIONA

1. **Abre el navegador:**
   - Dirección: `http://localhost:5173`

2. **Navegaen a: "Convertidor USD → USDT"**

3. **Verifica los elementos:**
   - ✅ Estado de conexión a Ethereum (debe ser verde)
   - ✅ Balance de la wallet operadora (USDT + ETH)
   - ✅ Selector de cuentas (cargadas desde `fondos.json` o Custody)
   - ✅ Formulario de conversión

---

## 🔧 TROUBLESHOOTING

### Error: "Puerto 3000 ya en uso"

```bash
# Windows - Mata el proceso
taskkill /F /IM node.exe

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Error: "Conexión rechazada a localhost:3000"

```bash
# Verifica que el backend esté corriendo
curl http://localhost:3000/health

# Deberías ver:
{"status":"healthy","uptime":...}
```

### Error: "No hay conexión a Infura"

- Verifica `VITE_INFURA_PROJECT_ID` en `.env`
- Asegúrate de que sea válido en https://infura.io

### Error: "Balance USDT insuficiente"

- El endpoint `/api/ethusd/send-usdt` requiere USDT real en la wallet operadora
- O deja `.env` vacío para usar modo **SIMULADO**

---

## 🎮 MODO DE USO

### 1️⃣ CONVERTIR USD → USDT (Simulado)

```
1. Abre "Convertidor USD → USDT"
2. Selecciona una cuenta con USD
3. Ingresa monto a convertir
4. Ingresa dirección Ethereum destino (0x...)
5. Haz clic en "CONVERTIR"
6. Verifica resultado en la pestaña "Historial"
```

### 2️⃣ CONFIGURAR WALLET (Para transacciones REALES)

```
1. Ve a pestaña "Configuración"
2. Rellena Infura Project ID
3. Rellena Clave Privada (NUNCA la compartas)
4. Rellena Dirección Wallet
5. Haz clic en "Guardar y Probar Conexión"
```

### 3️⃣ VER HISTORIAL

```
- Pestaña "Historial" muestra todas las conversiones
- Haz clic en "Ver en Etherscan" para verificar en blockchain
```

---

## 📊 ENDPOINTS DISPONIBLES

### Frontend -> Backend

```
GET  /api/ethusd/fondos                      → Lee archivo fondos.json
POST /api/ethusd/send-usdt                   → Envía USDT (real o simulado)
GET  /api/ethusd/usdt-balance                → Balance de wallet operadora
```

### Validaciones

```
✅ Dirección Ethereum: 0x... (42 caracteres)
✅ Monto positivo
✅ Cuenta seleccionada
✅ Conexión a Ethereum
```

---

## 🚨 MODO DE DEPURACIÓN

Para ver logs detallados del backend:

```bash
# Terminal Backend
npm start

# Verás:
[USDT Converter] Request received: { amount, toAddress, ... }
[USDT Converter] 🔴 INTENTANDO TRANSACCIÓN REAL EN ETHEREUM MAINNET
[USDT Converter] ✅ TRANSACCIÓN ENVIADA! 0x...
```

---

## 📝 RESUMEN DE FLUJO

```
┌─────────────────────────────────────────────────────────────┐
│                    USUARIO FRONTEND                         │
│  Selecciona cuenta + monto + dirección destino             │
└────────────────────┬────────────────────────────────────────┘
                     │ POST /api/ethusd/send-usdt
                     ↓
        ┌────────────────────────────────┐
        │  BACKEND (Node.js Express)    │
        │  server/index.js              │
        └────────────┬───────────────────┘
                     │
        ┌────────────▼───────────────────┐
        │ Validar credenciales .env     │
        └────────────┬───────────────────┘
                     │
        ╔════════════▼═══════════════════╗
        ║  MODO REAL O SIMULADO?        ║
        ╚════════════╤═══════════════════╝
                     │
         ┌───────────┴───────────┐
         │                       │
    REAL │                       │ SIMULADO
    (si) │                       │ (no .env)
         ↓                       ↓
    ┌─────────────┐      ┌──────────────────┐
    │ Web3.js +   │      │ Hash aleatorio    │
    │ Infura      │      │ + status pending  │
    │ → Ethereum  │      └──────────────────┘
    │ → Mina USDT │
    └─────┬───────┘
          │
          ├─ ✅ Éxito: txHash real
          └─ ❌ Error: mensaje detallado
                │
                ↓
        ┌──────────────────────┐
        │ Devuelve a Frontend  │
        │ {txHash, status,     │
        │  explorerUrl, ...}   │
        └──────────────────────┘
                 │
                 ↓
        ┌──────────────────────┐
        │ Frontend muestra     │
        │ en Historial         │
        │ Ver en Etherscan     │
        └──────────────────────┘
```

---

## 🎯 PRÓXIMOS PASOS

1. ✅ Backend ejecutándose en puerto 3000
2. ✅ Frontend ejecutándose en puerto 5173
3. ✅ Navegar a "Convertidor USD → USDT"
4. ✅ Realizar conversión
5. ✅ Ver resultado en Historial

---

**¿Listo? Ejecuta:**

```bash
npm run dev:full
```

¡Y accede a http://localhost:5173! 🚀









