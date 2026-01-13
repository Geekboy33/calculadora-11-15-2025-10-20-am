#!/bin/bash

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF




cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF




cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF




cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF




cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF




cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF




cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF



cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🧪 TEST CONVERSION REAL: 100 USD → USDT 🧪                      ║
║                                                                              ║
║              Sistema: USD to USDT Bridge - Ethereum Mainnet                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

📊 INFORMACIÓN DEL TEST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Cantidad USD:          100 USD
Comisión:              1% (1 USD)
USDT esperados:        99 USDT
Red:                   Ethereum Mainnet
Confirmación:          1 bloque
Endpoint:              POST /api/uniswap/swap

EOF

echo ""
echo "🚀 Iniciando test de conversión real..."
echo ""

# Variables
AMOUNT=100
RECIPIENT="0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
SLIPPAGE=1
TIMESTAMP=$(date +%s%3N)

echo "⏰ Timestamp: $TIMESTAMP"
echo ""

echo "📡 PASO 1: Enviando solicitud al backend..."
echo ""
echo "curl -X POST http://localhost:3000/api/uniswap/swap \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{"
echo "    \"amount\": $AMOUNT,"
echo "    \"recipientAddress\": \"$RECIPIENT\","
echo "    \"slippageTolerance\": $SLIPPAGE"
echo "  }'"
echo ""

# Hacer la solicitud
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT,
    \"recipientAddress\": \"$RECIPIENT\",
    \"slippageTolerance\": $SLIPPAGE
  }")

echo "✅ Respuesta recibida del backend:"
echo ""
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Parsear respuesta
SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash' 2>/dev/null)
USDT_AMOUNT=$(echo "$RESPONSE" | jq -r '.amountUSDT' 2>/dev/null)
ORACLE_PRICE=$(echo "$RESPONSE" | jq -r '.oraclePrice' 2>/dev/null)
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
ETHERSCAN=$(echo "$RESPONSE" | jq -r '.etherscanUrl' 2>/dev/null)

echo "📊 PASO 2: Analizando resultado..."
echo ""

if [ "$SUCCESS" = "true" ]; then
  echo "✅ CONVERSIÓN EXITOSA"
  echo ""
  echo "📈 Detalles de la transacción:"
  echo "   • USD Ingreso: $AMOUNT USD"
  echo "   • USDT Salida: $USDT_AMOUNT USDT"
  echo "   • Precio Oráculo: $ORACLE_PRICE"
  echo "   • Status: $STATUS"
  echo "   • TX Hash: $TX_HASH"
  echo "   • Red: Ethereum Mainnet"
  echo ""
  echo "🔗 Verificar en Etherscan:"
  echo "   $ETHERSCAN"
  echo ""
  echo "✅ TEST COMPLETADO EXITOSAMENTE"
  exit 0
else
  ERROR=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null)
  echo "❌ CONVERSION FALLIDA"
  echo ""
  echo "Error: $ERROR"
  echo ""
  echo "❌ TEST FALLIDO"
  exit 1
fi

EOF




