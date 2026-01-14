#!/usr/bin/env pwsh

<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}







<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}







<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}







<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}







<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}







<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}







<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}






<#
.SYNOPSIS
Script para configurar .env.local con las claves de Alchemy

.DESCRIPTION
Actualiza automáticamente el archivo .env.local con:
- RPC Alchemy
- Private Key (si se proporciona)
- Wallet Address
- Contratos USDT
#>

param(
    [string]$PrivateKey,
    [string]$WalletAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9"
)

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      ⚙️  CONFIGURAR .env.local PARA SWAP USDT        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$envContent = @"
# ==========================================
# ETHEREUM RPC - ALCHEMY
# ==========================================

VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
VITE_ETH_WS_URL=wss://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# ==========================================
# PRIVATE KEY & WALLET
# ==========================================

VITE_ETH_PRIVATE_KEY=$($PrivateKey -or 'your_private_key_here')
VITE_ETH_WALLET_ADDRESS=$WalletAddress

# ==========================================
# USDT CONTRACTS
# ==========================================

VITE_USDT_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
VITE_USDT_MINTER_CONTRACT=0x291893448191b49d79901Abdb07dCE4EE346b2a6

# ==========================================
# INFURA (ALTERNATIVA)
# ==========================================

VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
"@

try {
    # Crear o actualizar .env.local
    $envPath = ".env.local"
    
    if (Test-Path $envPath) {
        Write-Host "📝 Actualizando $envPath..." -ForegroundColor Yellow
        # Backup
        Copy-Item $envPath "$envPath.backup"
        Write-Host "   ✅ Backup creado: $envPath.backup" -ForegroundColor Green
    } else {
        Write-Host "📝 Creando $envPath..." -ForegroundColor Yellow
    }
    
    # Escribir configuración
    $envContent | Out-File -FilePath $envPath -Encoding UTF8 -Force
    
    Write-Host "`n✅ Configuración completada!" -ForegroundColor Green
    Write-Host "`n📊 Detalles:" -ForegroundColor Cyan
    Write-Host "   RPC Alchemy: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh" -ForegroundColor White
    Write-Host "   Wallet: $WalletAddress" -ForegroundColor White
    
    if ($PrivateKey) {
        Write-Host "   Private Key: ✅ CONFIGURADA" -ForegroundColor Green
    } else {
        Write-Host "   Private Key: ⚠️  NECESITAS AGREGAR" -ForegroundColor Yellow
        Write-Host "`n   👉 Edita .env.local y reemplaza 'your_private_key_here'" -ForegroundColor Magenta
        Write-Host "   👉 Tu private key desde MetaMask (sin 0x)" -ForegroundColor Magenta
    }
    
    Write-Host "`n🚀 Próximo paso:" -ForegroundColor Cyan
    Write-Host "   node swap-test.mjs 100 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a" -ForegroundColor Yellow
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
}








