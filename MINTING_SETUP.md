# 🚀 GUÍA DE CONFIGURACIÓN PARA MINTING DE dUSDT

## Paso 1: Crear un Contrato dUSDT en Remix (Opcional)

Si deseas hacer minting **REAL en Ethereum Sepolia (testnet)**, necesitas un contrato dUSDT personalizado.

### Opción A: Desplegar tu propio contrato (RECOMENDADO)

Ve a: https://remix.ethereum.org/

**Copia este código en un archivo nuevo `dUSDT.sol`:**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract dUSDT is ERC20, Ownable {
    constructor() ERC20("Digital USDT", "dUSDT") {}
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
    
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
```

**Pasos en Remix:**
1. Copia el código en `dUSDT.sol`
2. Compila (Compiler: 0.8.0+)
3. Conecta MetaMask a **Sepolia Testnet**
4. Deploy en Sepolia
5. Copia la dirección del contrato desplegado

---

## Paso 2: Obtener TestETH

Ve a https://www.infura.io/faucet/sepolia y solicita TestETH

---

## Paso 3: Actualizar `.env`

Agrega estas variables:

```bash
# =============================================================================
# ETHEREUM NETWORK CONFIGURATION
# =============================================================================
ETHEREUM_NETWORK=sepolia
# O usa "mainnet" para producción

# =============================================================================
# dUSDT CONTRATO (Tu contrato personalizado)
# =============================================================================
VITE_dUSDT_CONTRACT_ADDRESS=0x...  # Reemplaza con tu dirección de contrato
dUSDT_CONTRACT_ADDRESS=0x...       # Reemplaza con tu dirección de contrato

# =============================================================================
# INFURA CONFIGURATION
# =============================================================================
VITE_INFURA_PROJECT_ID=tu_project_id_aqui
INFURA_PROJECT_ID=tu_project_id_aqui

# =============================================================================
# ETHEREUM WALLET (Tu wallet que va a hacer el minting)
# =============================================================================
VITE_ETH_WALLET_ADDRESS=0x...     # Tu dirección de wallet
ETH_WALLET_ADDRESS=0x...          # Tu dirección de wallet

VITE_ETH_PRIVATE_KEY=0x...        # Tu private key
ETH_PRIVATE_KEY=0x...             # Tu private key
```

---

## Paso 4: Dar Permisos de Minting al Contrato

En Remix, después de desplegar:

1. Ve al contrato desplegado
2. Ejecuta `transferOwnership(0x...)` con la dirección del backend si es diferente
3. O mantén la wallet como owner si es la misma

---

## Paso 5: Reiniciar Backend

```bash
npm run dev:full
```

---

## Paso 6: Probar Minting

1. Abre el módulo "USD → USDT"
2. Ingresa:
   - **Monto:** 100 USD
   - **Dirección destino:** tu wallet en Sepolia
3. Haz clic en "CONVERTIR"
4. Verifica el hash en Sepolia Etherscan

---

## 📋 Resumen de Variables Necesarias

```
✅ VITE_INFURA_PROJECT_ID         → Tu Project ID de Infura
✅ VITE_ETH_WALLET_ADDRESS        → Tu wallet (0x...)
✅ VITE_ETH_PRIVATE_KEY           → Private key de tu wallet
✅ VITE_dUSDT_CONTRACT_ADDRESS    → Dirección del contrato dUSDT
✅ ETHEREUM_NETWORK               → "sepolia" o "mainnet"
```

---

## 🔗 Recursos Útiles

- **Remix IDE:** https://remix.ethereum.org/
- **Sepolia Faucet:** https://www.infura.io/faucet/sepolia
- **Sepolia Explorer:** https://sepolia.etherscan.io/
- **MetaMask:** https://metamask.io/

---

## ⚠️ Notas Importantes

- **Sepolia es testnet:** Los tokens no tienen valor real
- **Private Key:** NUNCA compartas tu private key
- **Gas:** Necesitas TestETH en Sepolia para pagar gas
- **Owner:** Solo el owner puede hacer minting









