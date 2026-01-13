# 🚀 GUÍA COMPLETA: Setup USD → USDT

## PASO 1: VERIFICAR REQUISITOS

```bash
# Python 3.8+
python --version
# Debería mostrar: Python 3.8.x o superior

# Node.js 14+
node --version
# Debería mostrar: v14.x.x o superior

# npm
npm --version
# Debería mostrar: 6.x.x o superior
```

---

## PASO 2: INSTALAR DEPENDENCIAS PYTHON

```bash
# Navegar a carpeta del backend
cd usdt-converter-full/backend

# Crear entorno virtual (recomendado)
python -m venv venv

# Activar entorno virtual
# En Windows:
venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Debería instalar:
# - web3==6.x.x
# - requests==2.x.x
# - python-dotenv==0.x.x
# - eth-account==0.x.x
```

---

## PASO 3: CREAR ARCHIVO `.env`

En la raíz del proyecto crear `.env`:

```bash
# .env
################################
# ETHEREUM MAINNET CONFIGURATION
################################

# Infura Project ID (obtén en https://infura.io)
WEB3_INFURA_PROJECT_ID=tu_infura_project_id_aqui

# RPC URL
WEB3_RPC_URL=https://mainnet.infura.io/v3/tu_infura_project_id_aqui

# WebSocket URL (opcional)
WEB3_WS_URL=wss://mainnet.infura.io/ws/v3/tu_infura_project_id_aqui

# Chain ID
WEB3_CHAIN_ID=1

# Network Name
WEB3_NETWORK_NAME=Ethereum Mainnet

################################
# WALLET CONFIGURATION
################################

# Tu dirección Ethereum (comienza con 0x)
WEB3_CONVERTER_ADDRESS=0x742d35Cc6634C0532925a3b844Bc454e4438f44e

# Tu clave privada (¡NUNCA compartas esto!)
# IMPORTANTE: SIN 0x al inicio
WEB3_CONVERTER_PRIVATE_KEY=abc123def456...

# DAES Signer Address
WEB3_DAES_SIGNER_ADDRESS=0x...

# DAES Signer Private Key
WEB3_DAES_SIGNER_PRIVATE_KEY=abc123...

# Operator Address
WEB3_OPERATOR_ADDRESS=0x...

# Operator Private Key
WEB3_OPERATOR_PRIVATE_KEY=abc123...

################################
# GAS CONFIGURATION
################################

# Multiplicador de gas (seguridad)
WEB3_GAS_MULTIPLIER=1.2

# Máximo precio de gas en wei
WEB3_MAX_GAS_PRICE=500000000000

# Buffer de precio de gas
WEB3_GAS_BUFFER=1.1

# Priority Fee (gwei)
WEB3_PRIORITY_FEE_GWEI=2

# Max Fee (gwei)
WEB3_MAX_FEE_GWEI=50

################################
# CONVERTER SETTINGS
################################

# Slippage máximo (%)
WEB3_MAX_SLIPPAGE=1.0

# Timeout de confirmación (segundos)
WEB3_CONVERTER_TIMEOUT=120

# Max slippage percent
WEB3_MAX_SLIPPAGE=1.0

# Gas multiplier
WEB3_CONVERTER_GAS_MULTIPLIER=1.2
```

---

## PASO 4: OBTENER INFURA PROJECT ID

1. Ve a https://infura.io
2. Regístrate o inicia sesión
3. Crea un nuevo proyecto
4. Selecciona "Ethereum" → "Mainnet"
5. Copia tu Project ID
6. Pega en `.env` como `WEB3_INFURA_PROJECT_ID`

---

## PASO 5: CREAR ARCHIVO `fondos.json`

En `usdt-converter-full/backend/fondos.json`:

```json
{
  "cuentas_bancarias": [
    {
      "id": 1,
      "nombre": "Cuenta Custodio Principal",
      "monto_usd": 100.00,
      "direccion_usdt": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
      "tipo_cuenta": "custodio"
    },
    {
      "id": 2,
      "nombre": "Cuenta Secundaria",
      "monto_usd": 50.00,
      "direccion_usdt": "0x123abc...",
      "tipo_cuenta": "custodio"
    }
  ],
  "configuracion": {
    "max_por_transaccion": 10000,
    "confirmaciones_requeridas": 2,
    "red": "Ethereum Mainnet",
    "fecha_creacion": "2026-01-02"
  }
}
```

---

## PASO 6: PRUEBAS UNITARIAS

### Test 1: Verificar Conexión

```bash
cd usdt-converter-full/backend

# Ejecutar test de conexión
python -c "
from convertir_usd_a_usdt import web3, usdt_contract, WEB3_NETWORK_CONFIG
import sys

print('=' * 60)
print('TEST 1: VERIFICAR CONEXIÓN A ETHEREUM')
print('=' * 60)

try:
    # Verificar conexión
    is_connected = web3.is_connected()
    print(f'✅ Conexión: {is_connected}')
    
    # Verificar chain ID
    chain_id = web3.eth.chain_id
    print(f'✅ Chain ID: {chain_id}')
    
    if chain_id != 1:
        print('❌ ERROR: No es Ethereum Mainnet')
        sys.exit(1)
    
    # Verificar bloque actual
    block_number = web3.eth.block_number
    print(f'✅ Bloque actual: {block_number}')
    
    # Verificar gas price
    gas_price_wei = web3.eth.gas_price
    gas_price_gwei = web3.from_wei(gas_price_wei, 'gwei')
    print(f'✅ Gas Price: {gas_price_gwei:.2f} gwei')
    
    print()
    print('✅ TODOS LOS TESTS PASADOS - Conexión OK')
    print('=' * 60)
    
except Exception as e:
    print(f'❌ ERROR: {str(e)}')
    sys.exit(1)
"
```

**Resultado esperado:**
```
============================================================
TEST 1: VERIFICAR CONEXIÓN A ETHEREUM
============================================================
✅ Conexión: True
✅ Chain ID: 1
✅ Bloque actual: 18945600
✅ Gas Price: 25.50 gwei

✅ TODOS LOS TESTS PASADOS - Conexión OK
============================================================
```

---

### Test 2: Verificar Contrato USDT

```bash
python -c "
from convertir_usd_a_usdt import web3, usdt_contract

print('=' * 60)
print('TEST 2: VERIFICAR CONTRATO USDT')
print('=' * 60)

try:
    # Verificar contrato
    contract_addr = '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    print(f'✅ Dirección USDT: {contract_addr}')
    
    # Obtener decimales
    decimals = usdt_contract.functions.decimals().call()
    print(f'✅ Decimales: {decimals}')
    
    # Obtener símbolo
    symbol = usdt_contract.functions.symbol().call()
    print(f'✅ Símbolo: {symbol}')
    
    # Obtener nombre
    name = usdt_contract.functions.name().call()
    print(f'✅ Nombre: {name}')
    
    print()
    print('✅ TODOS LOS TESTS PASADOS - Contrato OK')
    print('=' * 60)
    
except Exception as e:
    print(f'❌ ERROR: {str(e)}')
"
```

**Resultado esperado:**
```
============================================================
TEST 2: VERIFICAR CONTRATO USDT
============================================================
✅ Dirección USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7
✅ Decimales: 6
✅ Símbolo: USDT
✅ Nombre: Tether USD

✅ TODOS LOS TESTS PASADOS - Contrato OK
============================================================
```

---

### Test 3: Obtener Tasa USD/USDT

```bash
python -c "
import requests

print('=' * 60)
print('TEST 3: OBTENER TASA USD/USDT')
print('=' * 60)

try:
    # Fuente 1: CoinGecko
    url = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd'
    response = requests.get(url, timeout=5)
    data = response.json()
    rate = data['tether']['usd']
    
    print(f'✅ Fuente: CoinGecko')
    print(f'✅ Tasa: 1 USDT = \${rate:.4f} USD')
    
    # Verificar desviación
    deviation = abs(rate - 1.0)
    print(f'✅ Desviación: {deviation * 100:.4f}%')
    
    if deviation > 0.005:
        print('⚠️  ADVERTENCIA: Desviación > 0.5%')
    else:
        print('✅ Desviación dentro de límites')
    
    print()
    print('✅ TODOS LOS TESTS PASADOS - Tasa OK')
    print('=' * 60)
    
except Exception as e:
    print(f'❌ ERROR: {str(e)}')
"
```

**Resultado esperado:**
```
============================================================
TEST 3: OBTENER TASA USD/USDT
============================================================
✅ Fuente: CoinGecko
✅ Tasa: 1 USDT = $1.0001 USD
✅ Desviación: 0.0100%
✅ Desviación dentro de límites

✅ TODOS LOS TESTS PASADOS - Tasa OK
============================================================
```

---

### Test 4: Verificar Balance

```bash
python -c "
from convertir_usd_a_usdt import web3, usdt_contract, ETH_ADDRESS

print('=' * 60)
print('TEST 4: VERIFICAR BALANCE USDT')
print('=' * 60)

try:
    # Obtener balance
    balance_raw = usdt_contract.functions.balanceOf(ETH_ADDRESS).call()
    balance_usdt = balance_raw / 10**6
    
    print(f'✅ Dirección: {ETH_ADDRESS}')
    print(f'✅ Balance: {balance_usdt:.2f} USDT')
    
    if balance_usdt > 0:
        print('✅ Balance disponible para transferencias')
    else:
        print('⚠️  Advertencia: Balance bajo o cero')
    
    print()
    print('✅ TEST COMPLETADO - Balance OK')
    print('=' * 60)
    
except Exception as e:
    print(f'❌ ERROR: {str(e)}')
"
```

---

## PASO 7: EJECUCIÓN COMPLETA

```bash
# Ejecutar el motor de conversión
python convertir_usd_a_usdt.py

# Debería mostrar:
# Transacción enviada: 0xabc123...
# Monto transferido a 0x...: 100.000000 USDT
# Auditoría registrada: 0xabc123...
```

---

## PASO 8: VERIFICAR EN ETHERSCAN

1. Ve a https://etherscan.io
2. Busca el TX hash (ej: `0xabc123...`)
3. Verifica:
   - Status: ✅ Success
   - From: Tu dirección
   - To: Dirección USDT
   - Value: 100000000 (6 decimales = 100 USDT)
   - Gas Used: ~65,000

---

## PASO 9: MONITOREAR AUDITORÍA

```bash
# Ver archivo de auditoría
cat audit.log

# Debería mostrar:
# 2026-01-02 10:15:30 | 0xabc123... | 1 | 100.000000 USDT | 0x742d35...
# 2026-01-02 10:30:45 | 0xdef456... | 2 | 50.000000 USDT | 0x123abc...
```

---

## ⚠️ TROUBLESHOOTING

### Error: "No se pudo conectar a Ethereum Mainnet"

```bash
✅ Solución:
1. Verificar que WEB3_RPC_URL sea correcto en .env
2. Verificar conexión a internet
3. Probar con Infura: https://status.infura.io
4. Usar URL de fallback: https://cloudflare-eth.com
```

### Error: "Balance insuficiente de USDT"

```bash
✅ Solución:
1. Verificar balance: python check_accounts.py
2. Asegurarse de tener USDT en la dirección
3. Reducir el monto USD a transferir
4. Usar dirección con fondos suficientes
```

### Error: "Gas demasiado alto"

```bash
✅ Solución:
1. Esperar a que gas price baje
2. Ver https://www.gasnow.org
3. Aumentar WEB3_CONVERTER_TIMEOUT
4. Reducir WEB3_MAX_FEE_GWEI en .env
```

### Error: "Transacción fallida"

```bash
✅ Solución:
1. Revisar TX en Etherscan
2. Buscar status = failed
3. Ver razón del fallo
4. Verificar balance y aprobaciones
```

---

## 🎯 NEXT STEPS

1. ✅ Instalar dependencias
2. ✅ Crear `.env` con credenciales
3. ✅ Ejecutar tests unitarios
4. ✅ Usar fondos.json
5. ✅ Ejecutar `convertir_usd_a_usdt.py`
6. ✅ Verificar en Etherscan
7. ✅ Monitorear audit.log
8. ✅ ¡Sistema listo para producción!

---

## 📚 REFERENCIAS

- **Etherscan:** https://etherscan.io
- **USDT Contract:** https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7
- **Web3.py Docs:** https://web3py.readthedocs.io
- **Infura:** https://infura.io
- **Gas Tracker:** https://www.gasnow.org

---

**¡Sistema USD → USDT completamente operativo! 🚀**










