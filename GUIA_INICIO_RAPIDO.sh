#!/bin/bash
# GUÍA RÁPIDA DE INICIO - JSON USDT CONVERTER + CONVERTIDOR USD → USDT

## 🚀 INICIO RÁPIDO EN 5 PASOS

### Paso 1: Abrir terminal en la carpeta del proyecto
```bash
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
```

### Paso 2: Instalar dependencias (primera vez)
```bash
npm install
```

### Paso 3: Iniciar servidor y frontend
```bash
npm run dev:full
```

### Paso 4: Abrir navegador
```
http://localhost:4000
```

### Paso 5: ¡A usar!
- Busca el botón "📊 JSON Transacciones" en la navegación
- O usa "Convertidor USD → USDT" para una transacción

---

## 📊 MÓDULOS DISPONIBLES

### A. Convertidor USD → USDT (Una transacción)
```
Ubicación: http://localhost:4000 → "USD → USDT"

Paso 1: SELECCIONAR CUENTA
  └─ Elige una cuenta de fondos.json

Paso 2: REVISAR Y CONFIRMAR
  └─ Verifica monto USD
  └─ Tasa de cambio actualizada

Paso 3: PROCESAR TRANSACCIÓN
  └─ El sistema firma y envía
  └─ Espera confirmación de blockchain

Paso 4: VER RESULTADO
  └─ TX Hash
  └─ Monto USDT recibido
  └─ Link a Etherscan

Tiempo: ~30-60 segundos
```

### B. JSON Transacciones (Lotes masivos)
```
Ubicación: http://localhost:4000 → "📊 JSON Transacciones"

TAB 1: ORACLE DE PRECIOS
  ├─ Tasa USDT/USD actualizada
  ├─ Volumen 24h
  └─ Convertidor rápido USD → USDT

TAB 2: FONDOS JSON
  ├─ Todas las cuentas cargadas
  ├─ Total USD por procesar
  └─ Botones: Recargar, Crear Ejemplo

TAB 3: PROCESAR LOTES
  ├─ Botón grande "Iniciar Procesamiento"
  ├─ Procesa TODAS las cuentas automáticamente
  └─ 2 segundos entre cada una

TAB 4: RESULTADOS
  ├─ Resumen: Total, Exitosas, Fallidas
  ├─ Tabla con TX Hash de cada una
  └─ Links a Etherscan

Tiempo: ~7 segundos por 3 cuentas
```

---

## 📝 ARCHIVO DE CONFIGURACIÓN COMPARTIDO

Ubicación: `server/data/fondos.json`

```json
{
  "metadata": {
    "version": "1.0",
    "description": "Fondos para conversión USD → USDT",
    "created": "2025-01-02T00:00:00Z",
    "total_usd": 150.00
  },
  "configuracion": {
    "tasa_minima": 0.98,
    "tasa_maxima": 1.02,
    "gas_limite": 200000,
    "reintentos_maximos": 3,
    "oracle": "CoinGecko"
  },
  "cuentas_bancarias": [
    {
      "id": 1,
      "nombre": "Cuenta Principal",
      "monto_usd": 100.00,
      "direccion_usdt": "0xac56805515af1552d8ae9ac190050a8e549dd2fb",
      "estado": "pendiente",
      "prioridad": "alta"
    },
    {
      "id": 2,
      "nombre": "Cuenta Secundaria",
      "monto_usd": 50.00,
      "direccion_usdt": "0xac56805515af1552d8ae9ac190050a8e549dd2fb",
      "estado": "pendiente",
      "prioridad": "media"
    }
  ]
}
```

### EDITAR ARCHIVO
Puedes editar `fondos.json` directamente:
- Agregar más cuentas
- Cambiar montos USD
- Cambiar direcciones Ethereum
- Cambiar nombres de cuentas

Los cambios se reflejan automáticamente en ambos módulos.

---

## 🔐 CONFIGURACIÓN .env REQUERIDA

Archivo: `.env` (en raíz del proyecto)

```
# ============================================
# Ethereum RPC (Alchemy)
# ============================================
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ============================================
# Wallet Operadora (Donde guardar USDT)
# ============================================
VITE_ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
VITE_ETH_WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a

# ============================================
# Contrato USDT (Ethereum Mainnet)
# ============================================
VITE_USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

**⚠️ IMPORTANTE:**
- NUNCA compartas tu PRIVATE_KEY
- Guarda .env en seguridad
- No commits .env a git

---

## 🔗 INTEGRACIÓN ENTRE MÓDULOS

### Datos Compartidos
```
├─ fondos.json
│  ├─ Leído por: USD → USDT
│  └─ Leído por: JSON Transacciones
│
└─ Oracle CoinGecko
   ├─ Usado por: USD → USDT
   └─ Usado por: JSON Transacciones
```

### Actualizaciones
```
Cuando USD → USDT convierte:
1. Decrementa monto USD en fondos.json
2. Guarda TX Hash en fondos.json
3. JSON Transacciones ve dato actualizado
   ✓ Sincronización automática

Cuando JSON Transacciones procesa lote:
1. Procesa todas las cuentas
2. Actualiza fondos.json con todos los datos
3. USD → USDT ve datos nuevos
   ✓ Sincronización automática
```

---

## 📊 EJEMPLOS DE USO

### Ejemplo 1: Convertir 100 USD (Una transacción)

```
1. Clic en "USD → USDT"
2. Selecciona "Cuenta Principal"
3. Ingresa 100
4. Paso 2: Confirma tasa
5. Paso 3: Espera procesamiento
6. Paso 4: ✅ 100.11 USDT recibidos
7. TX Hash: 0x...
```

### Ejemplo 2: Procesar lotes (3 cuentas)

```
fondos.json tiene:
- Cuenta 1: $100 USD
- Cuenta 2: $50 USD
- Cuenta 3: $75 USD

1. Clic en "📊 JSON Transacciones"
2. Tab "💰 Fondos JSON" → Muestra todas
3. Tab "⚡ Procesar Lotes"
4. Clic "Iniciar Procesamiento"
5. Sistema procesa las 3 automáticamente
6. ~7 segundos después: TODAS procesadas
7. Tab "✅ Resultados" → Muestra 3 TXs
```

---

## 🔍 VERIFICACIÓN

### Verificar que TODO funciona

```bash
# 1. Verificar servidor está corriendo
curl http://localhost:3000/health
# Respuesta: {"status":"healthy","uptime":...}

# 2. Obtener tasa actual
curl http://localhost:3000/api/json/oracle
# Respuesta: {"success":true,"rate":0.9989,...}

# 3. Leer fondos
curl http://localhost:3000/api/json/fondos
# Respuesta: {"success":true,"data":{...},"total_cuentas":2}

# 4. Convertir 100 USD
curl -X POST http://localhost:3000/api/json/convertir \
  -H "Content-Type: application/json" \
  -d '{"amountUSD":100}'
# Respuesta: {"success":true,"amountUSD":100,"amountUSDT":100.11,...}

# 5. Ver en navegador
http://localhost:4000
# Click en "📊 JSON Transacciones" o "USD → USDT"
```

---

## ❌ TROUBLESHOOTING

### "No se conecta a localhost:4000"
```
Solución:
1. Verificar que npm run dev:full esté ejecutándose
2. Esperar 10 segundos (compilación lenta primera vez)
3. Abrir consola del navegador (F12)
4. Ver si hay errores
5. Reiniciar: Ctrl+C en terminal, npm run dev:full
```

### "Error: Failed to fetch"
```
Solución:
1. Verificar servidor backend esté corriendo (puerto 3000)
2. Revisar .env tiene configuración correcta
3. Probar: curl http://localhost:3000/
4. Si falla: reiniciar npm
```

### "fondos.json no se carga"
```
Solución:
1. Verificar archivo existe: server/data/fondos.json
2. Verificar contenido es JSON válido
3. Click en "✨ Crear Ejemplo" para regenerar
4. Editar manual si es necesario
```

### "TX dice Procesando en Etherscan"
```
Solución:
1. Es normal, blockchain tarda 12-30 segundos
2. Esperar un poco y recargar Etherscan
3. Si sigue 10 minutos: TX probablemente falló (revisar balance)
```

---

## 📚 DOCUMENTACIÓN COMPLETA

Archivos de referencia en el proyecto:

```
├─ RESUMEN_INTEGRACION_FINAL.md     ← EMPIEZA AQUÍ
├─ INTEGRACION_COMPLETA.md
├─ JSON_USDT_CONVERTER_COMPLETO.md
├─ SISTEMA_COMPLETO_VERIFICACION.md
└─ GUIA_INICIO_RAPIDO.sh            ← ESTE ARCHIVO
```

---

## 🎯 PUNTOS CLAVE

✅ **Dos módulos complementarios**
- USD → USDT: Manual, una a la vez
- JSON Transacciones: Automático, múltiples

✅ **Datos compartidos**
- fondos.json actualizado en tiempo real
- Oracle CoinGecko para ambos

✅ **Blockchain real**
- Ethereum Mainnet
- USDT oficial
- TX hashes verificables

✅ **Sincronización automática**
- No hay conflictos
- Ambos ven los mismos datos
- Historiales compartidos

---

## 🚀 ¡LISTO PARA USAR!

1. Terminal: `npm run dev:full`
2. Navegador: `http://localhost:4000`
3. Click en "📊 JSON Transacciones" o "USD → USDT"
4. ¡A convertir!

**¡Ambos módulos funcionan juntos en perfecta sincronización!**









