#!/bin/bash

# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi




# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi




# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi




# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi




# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi




# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi




# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi



# Test de conversión 100 USD a USDT - Versión simplificada sin jq

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🧪 TEST CONVERSION: 100 USD → USDT (Real)            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Verificar servidor
echo "1️⃣ Verificando servidor backend..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  echo "✅ Servidor disponible en localhost:3000"
else
  echo "❌ ERROR: Servidor no disponible"
  echo "   Inicia el servidor con: npm run dev:full"
  exit 1
fi

echo ""
echo "2️⃣ Enviando solicitud de conversión..."
echo ""
echo "Detalles:"
echo "  • Cantidad: 100 USD"
echo "  • Dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a"
echo "  • Slippage: 1%"
echo ""

# Hacer llamada a API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/uniswap/swap \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "recipientAddress": "0x05316B102FE62574b9cBd45709f8F1B6C00beC8a",
    "slippageTolerance": 1
  }')

echo "3️⃣ Respuesta del servidor:"
echo ""
echo "$RESPONSE"
echo ""

# Verificar si fue exitosa (búsqueda simple)
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ CONVERSION EXITOSA"
  echo ""
  # Extraer información clave (sin jq)
  if echo "$RESPONSE" | grep -q '"txHash"'; then
    TX_HASH=$(echo "$RESPONSE" | grep -o '"txHash":"[^"]*' | cut -d'"' -f4)
    echo "📍 TX Hash: $TX_HASH"
    echo "🔗 Etherscan: https://etherscan.io/tx/$TX_HASH"
  fi
  if echo "$RESPONSE" | grep -q '"amountUSDT"'; then
    AMOUNT=$(echo "$RESPONSE" | grep -o '"amountUSDT":[^,]*' | cut -d':' -f2)
    echo "💰 USDT recibidos: $AMOUNT"
  fi
  if echo "$RESPONSE" | grep -q '"oraclePrice"'; then
    PRICE=$(echo "$RESPONSE" | grep -o '"oraclePrice":[^,]*' | cut -d':' -f2)
    echo "📊 Precio Oráculo: $PRICE"
  fi
  echo ""
  echo "✨ TEST EXITOSO - Conversión completada"
  exit 0
else
  echo "❌ ERROR EN CONVERSIÓN"
  exit 1
fi





