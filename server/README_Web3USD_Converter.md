# 🪙 Web3 USD to USDT Converter

## 📖 Descripción

Este módulo integra el convertidor USD a USDT basado en Web3.py dentro del sistema DAES Web3USD. Permite convertir fondos bancarios en USD a tokens USDT en la blockchain de Ethereum.

## 🔧 Configuración

### Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# ============================================================================
# WEB3 USD CONVERTER CONFIGURATION
# ============================================================================

# Infura Configuration (for USDT conversions)
WEB3_INFURA_PROJECT_ID=YOUR_INFURA_PROJECT_ID_HERE

# Converter Wallet (separate from minter/operator)
WEB3_CONVERTER_PRIVATE_KEY=YOUR_CONVERTER_PRIVATE_KEY_HERE

# Conversion Parameters
WEB3_MAX_SLIPPAGE=1.0
WEB3_CONVERTER_GAS_MULTIPLIER=1.2
WEB3_CONVERTER_TIMEOUT=120
WEB3_MAX_FEE_GWEI=50
WEB3_PRIORITY_FEE_GWEI=2
```

### Cómo Obtener las Credenciales

#### INFURA_PROJECT_ID:
1. Ve a https://infura.io/
2. Regístrate (gratis)
3. Crea un proyecto: "Mi Convertidor USDT"
4. Copia tu "Project ID" (32 caracteres)

#### WEB3_CONVERTER_PRIVATE_KEY:
1. Abre MetaMask
2. Haz clic en los 3 puntos > Settings > Advanced > Export Private Key
3. **⚠️ ADVERTENCIA**: ¡Nunca compartas esta clave!

## 🚀 Uso del Convertidor

### 1. Verificar Estado

```bash
curl http://localhost:3000/api/web3usd/converter/health
```

### 2. Obtener Precio USDT

```bash
curl http://localhost:3000/api/web3usd/converter/usdt-price
```

### 3. Simular Conversión (sin enviar TX)

```bash
curl -X POST http://localhost:3000/api/web3usd/converter/test-conversion \
  -H "Content-Type: application/json" \
  -d '{
    "usd_amount": 1.0,
    "to_address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
  }'
```

### 4. Ejecutar Conversión Real

```bash
curl -X POST http://localhost:3000/api/web3usd/converter/convert \
  -H "Content-Type: application/json" \
  -d '{
    "request_id": "conversion-2025-01-01",
    "timestamp": "2025-01-01T10:00:00Z",
    "cuentas_bancarias": [
      {
        "id": 1,
        "nombre": "Mi Cuenta Principal",
        "monto_usd": 50.00,
        "direccion_usdt": "TU_DIRECCION_METAMASK_AQUI"
      }
    ]
  }'
```

## 📁 Archivos de Ejemplo

### fondos.example.json
Archivo JSON de ejemplo para conversiones:

```json
{
  "request_id": "test-conversion-2025-01-01",
  "timestamp": "2025-01-01T10:00:00Z",
  "cuentas_bancarias": [
    {
      "id": 1,
      "nombre": "Cuenta Principal de Prueba",
      "monto_usd": 1.00,
      "direccion_usdt": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    }
  ]
}
```

## 🧪 Scripts de Prueba

### test_converter.py
Script Python para probar todas las funcionalidades:

```bash
python test_converter.py
```

### usdt_converter_standalone.py
Versión standalone del convertidor original:

```bash
python usdt_converter_standalone.py
```

## 📞 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/web3usd/converter/health` | Estado del convertidor |
| `GET` | `/api/web3usd/converter/usdt-price` | Precio USDT/USD |
| `GET` | `/api/web3usd/converter/usdt-balance/{address}` | Balance USDT |
| `POST` | `/api/web3usd/converter/test-conversion` | Simular conversión |
| `POST` | `/api/web3usd/converter/convert` | Ejecutar conversión real |

## ⚠️ Consideraciones de Seguridad

1. **Nunca** compartas tus claves privadas
2. **Siempre** verifica las direcciones de destino
3. **Configura** límites de slippage apropiados
4. **Monitorea** las transacciones en Etherscan
5. **Mantén** suficiente ETH para gas

## 🔄 Flujo de Conversión

```
Usuario → API /converter/convert
    ↓
Validar JSON → Obtener precio → Calcular USDT
    ↓
Verificar balance → Firmar TX → Enviar a blockchain
    ↓
Esperar confirmación → Devolver resultado con hash
```

## 💡 Características

- ✅ Conversión USD → USDT en tiempo real
- ✅ Múltiples fuentes de precio (CoinGecko, Binance, Kraken)
- ✅ Verificación automática de slippage
- ✅ ABI completo y verificado de USDT
- ✅ Optimización automática de gas
- ✅ Confirmación de transacciones
- ✅ Integración completa con DAES

## 🆘 Solución de Problemas

### Error: "Infura project ID required"
- Configura `WEB3_INFURA_PROJECT_ID` en el .env

### Error: "Insufficient USDT balance"
- Asegúrate de tener USDT en la wallet del convertidor
- Verifica la dirección correcta

### Error: "Price slippage too high"
- Ajusta `WEB3_MAX_SLIPPAGE` en el .env
- O espera a que el precio se estabilice

### Error: "Transaction timeout"
- Aumenta `WEB3_CONVERTER_TIMEOUT` en el .env
- Verifica congestión de la red Ethereum

## 📞 Soporte

Para soporte técnico contacta al equipo de desarrollo DAES.