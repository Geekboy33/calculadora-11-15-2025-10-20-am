#!/bin/bash

# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac




# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac




# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac




# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac




# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac




# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac




# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac



# =============================================================================
# USDT MINTER - SCRIPT DE DEPLOYMENT Y TESTING AUTOMÁTICO
# =============================================================================
# Este script automatiza:
# 1. Validación de dependencias
# 2. Validación de configuración .env
# 3. Deploy del contrato (manual en Remix)
# 4. Pruebas de los endpoints API
# 5. Ejecutar emisión de USDT

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          USDT MINTER - DEPLOYMENT & TEST SCRIPT            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"

# =============================================================================
# FUNCIÓN: Validar dependencias
# =============================================================================
check_dependencies() {
  echo -e "${YELLOW}🔍 PASO 1: Verificando dependencias...${NC}\n"
  
  # Verificar Node.js
  if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"
  
  # Verificar npm
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm no está instalado${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ npm: $(npm --version)${NC}"
  
  # Verificar git (opcional)
  if command -v git &> /dev/null; then
    echo -e "${GREEN}✅ git: $(git --version | cut -d' ' -f3)${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Validar .env
# =============================================================================
check_env() {
  echo -e "${YELLOW}🔑 PASO 2: Validando archivo .env...${NC}\n"
  
  if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Archivo .env no existe${NC}"
    echo -e "${YELLOW}Creando .env con template...${NC}"
    cat > .env << 'EOF'
# Ethereum Mainnet RPC
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj

# Owner/Signer Private Key (KEEP SECRET!)
ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036

# USDT Minter Contract Address (after deployment)
USDT_MINTER_ADDRESS=0x...

# Tokens
USDT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
EOF
    echo -e "${YELLOW}✅ Archivo .env creado. Por favor, editar y configurar.${NC}"
  fi
  
  # Validar variables críticas
  if grep -q "ETH_RPC_URL=" .env && grep -q "ETH_PRIVATE_KEY=" .env; then
    echo -e "${GREEN}✅ .env configurado${NC}"
  else
    echo -e "${RED}❌ Variables requeridas en .env${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Instalar dependencias npm
# =============================================================================
install_dependencies() {
  echo -e "${YELLOW}📦 PASO 3: Instalando dependencias npm...${NC}\n"
  
  # Verificar si package.json existe
  if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json no existe${NC}"
    exit 1
  fi
  
  # Instalar ethers.js si no está instalado
  if ! grep -q '"ethers"' package.json; then
    echo -e "${YELLOW}Instalando ethers.js...${NC}"
    npm install ethers --save
  fi
  
  # Instalar dependencias
  npm install
  
  echo -e "${GREEN}✅ Dependencias instaladas${NC}\n"
}

# =============================================================================
# FUNCIÓN: Validar configuración del servidor
# =============================================================================
validate_setup() {
  echo -e "${YELLOW}🔐 PASO 4: Validando configuración (requiere servidor corriendo)...${NC}\n"
  
  # Verificar si el servidor está corriendo
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia el servidor con: npm run dev:full${NC}"
    echo ""
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/validate-setup...${NC}"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/validate-setup \
    -H "Content-Type: application/json")
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Configuración válida${NC}"
  else
    echo -e "${RED}❌ Error en configuración${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Obtener status del minter
# =============================================================================
check_status() {
  echo -e "${YELLOW}📊 PASO 5: Verificando status del minter...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${YELLOW}⚠️  El servidor no está corriendo${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando GET /api/usdt-minter/status...${NC}"
  
  RESPONSE=$(curl -s http://localhost:3000/api/usdt-minter/status)
  
  echo "$RESPONSE" | jq .
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Prueba de emisión
# =============================================================================
test_issuance() {
  echo -e "${YELLOW}⚡ PASO 6: Prueba de emisión de USDT...${NC}\n"
  
  if ! curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${RED}❌ El servidor no está corriendo${NC}"
    echo -e "${YELLOW}Inicia con: npm run dev:full${NC}"
    return
  fi
  
  echo -e "${BLUE}Llamando POST /api/usdt-minter/issue...${NC}"
  echo -e "${BLUE}Amount: 100 USDT${NC}\n"
  
  RESPONSE=$(curl -s -X POST http://localhost:3000/api/usdt-minter/issue \
    -H "Content-Type: application/json" \
    -d '{
      "amount": 100,
      "reason": "Automated test"
    }')
  
  echo "$RESPONSE" | jq .
  
  if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
    echo -e "${GREEN}✅ Emisión exitosa${NC}"
    TX_HASH=$(echo "$RESPONSE" | jq -r '.txHash')
    echo -e "${BLUE}Etherscan: https://etherscan.io/tx/$TX_HASH${NC}"
  else
    echo -e "${RED}❌ Error en emisión${NC}"
  fi
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Ejecutar script Node.js
# =============================================================================
run_node_script() {
  echo -e "${YELLOW}🚀 PASO 7: Ejecutando script Node.js...${NC}\n"
  
  if [ ! -f "blockchain/scripts/createMoreTokens.js" ]; then
    echo -e "${RED}❌ Script blockchain/scripts/createMoreTokens.js no existe${NC}"
    return
  fi
  
  echo -e "${BLUE}Ejecutando: node blockchain/scripts/createMoreTokens.js${NC}\n"
  
  node blockchain/scripts/createMoreTokens.js
  
  echo ""
}

# =============================================================================
# FUNCIÓN: Mostrar próximos pasos
# =============================================================================
show_next_steps() {
  echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║                    PRÓXIMOS PASOS                          ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}\n"
  
  echo -e "${YELLOW}1. DEPLOY DEL CONTRATO (Manual en Remix)${NC}"
  echo -e "   - Ir a: https://remix.ethereum.org"
  echo -e "   - Copiar: blockchain/contracts/USDTMinter.sol"
  echo -e "   - Compilar y Deploy en Ethereum Mainnet"
  echo -e "   - Copiar dirección del contrato\n"
  
  echo -e "${YELLOW}2. ACTUALIZAR .env${NC}"
  echo -e "   USDT_MINTER_ADDRESS=0x[dirección_del_contrato]\n"
  
  echo -e "${YELLOW}3. INICIAR SERVIDOR${NC}"
  echo -e "   npm run dev:full\n"
  
  echo -e "${YELLOW}4. EMITIR USDT${NC}"
  echo -e "   node blockchain/scripts/createMoreTokens.js\n"
  
  echo -e "${YELLOW}5. VERIFICAR EN ETHERSCAN${NC}"
  echo -e "   https://etherscan.io\n"
  
  echo -e "${GREEN}✅ Sistema USDT Minter listo para usar${NC}\n"
}

# =============================================================================
# MAIN: Menú de opciones
# =============================================================================

case "${1:-full}" in
  "dependencies")
    check_dependencies
    ;;
  "env")
    check_env
    ;;
  "install")
    check_dependencies
    check_env
    install_dependencies
    ;;
  "validate")
    validate_setup
    ;;
  "status")
    check_status
    ;;
  "test")
    test_issuance
    ;;
  "run")
    run_node_script
    ;;
  "full")
    check_dependencies
    check_env
    install_dependencies
    validate_setup
    check_status
    show_next_steps
    ;;
  *)
    echo -e "${YELLOW}Uso:${NC}"
    echo -e "  $0 dependencies    # Verificar dependencias"
    echo -e "  $0 env             # Validar .env"
    echo -e "  $0 install         # Instalar todo"
    echo -e "  $0 validate        # Validar configuración"
    echo -e "  $0 status          # Ver status del minter"
    echo -e "  $0 test            # Prueba de emisión"
    echo -e "  $0 run             # Ejecutar script Node.js"
    echo -e "  $0 full            # Ejecutar todo (default)\n"
    ;;
esac




