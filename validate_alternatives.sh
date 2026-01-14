#!/bin/bash
# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi



# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi



# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi



# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi



# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi



# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi



# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi


# Validation Script - Verifica que todas las alternativas estén correctamente implementadas

echo "🔍 VERIFICANDO IMPLEMENTACIÓN DE ALTERNATIVAS USDT"
echo "=================================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador
checks_passed=0
checks_failed=0

# Función para hacer checks
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 (NO ENCONTRADO)"
        ((checks_failed++))
    fi
}

check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $1 contiene '$2'"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NO contiene '$2'"
        ((checks_failed++))
    fi
}

echo "📁 ARCHIVOS CREADOS:"
echo "==================="

# Contratos
echo ""
echo "Contratos Solidity:"
check_file "server/contracts/USDTProxyDelegator.sol"
check_file "server/contracts/USDTPoolWithdrawer.sol"

# Rutas
echo ""
echo "Rutas Backend:"
check_file "server/routes/delegator-routes.js"
check_file "server/routes/pool-withdrawer-routes.js"

# Scripts
echo ""
echo "Scripts Deploy:"
check_file "server/scripts/deployDelegator.js"
check_file "server/scripts/deployPoolWithdrawer.js"

# Documentación
echo ""
echo "Documentación:"
check_file "USDT_ALTERNATIVES_COMPLETE.md"
check_file "QUICK_START_ALTERNATIVES.md"
check_file "ALTERNATIVE_SOLUTIONS_SUMMARY.md"
check_file "ARCHITECTURE_COMPLETE.md"

# Verificaciones de contenido
echo ""
echo "📋 VERIFICACIONES DE CONTENIDO:"
echo "==============================="

echo ""
echo "Delegador Contract:"
check_content "server/contracts/USDTProxyDelegator.sol" "function emitIssueEvent"
check_content "server/contracts/USDTProxyDelegator.sol" "function registerIssuance"

echo ""
echo "Pool Withdrawer Contract:"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromCurve3Pool"
check_content "server/contracts/USDTPoolWithdrawer.sol" "function withdrawFromBalancer"

echo ""
echo "Delegador Routes:"
check_content "server/routes/delegator-routes.js" "POST /api/delegator/emit-issue"
check_content "server/routes/delegator-routes.js" "GET /api/delegator/status"

echo ""
echo "Pool Withdrawer Routes:"
check_content "server/routes/pool-withdrawer-routes.js" "POST /api/pool-withdrawer/withdraw-from-curve"
check_content "server/routes/pool-withdrawer-routes.js" "GET /api/pool-withdrawer/curve-exchange-rate"

echo ""
echo "Servidor Index.js:"
check_content "server/index.js" "delegatorRoutes"
check_content "server/index.js" "poolWithdrawerRoutes"
check_content "server/index.js" "/api/delegator"
check_content "server/index.js" "/api/pool-withdrawer"

# Resumen
echo ""
echo "=================================================="
echo "📊 RESUMEN DE VALIDACIÓN:"
echo "=================================================="
echo -e "✓ Checks Pasados: ${GREEN}$checks_passed${NC}"
echo -e "✗ Checks Fallidos: ${RED}$checks_failed${NC}"

if [ $checks_failed -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ TODOS LOS CHECKS PASARON${NC}"
    echo ""
    echo "🚀 PRÓXIMOS PASOS:"
    echo "1. npm run dev:full"
    echo "2. node server/scripts/deployDelegator.js"
    echo "3. node server/scripts/deployPoolWithdrawer.js"
    echo "4. Probar endpoints"
    exit 0
else
    echo ""
    echo -e "${RED}❌ ALGUNOS CHECKS FALLARON${NC}"
    exit 1
fi





