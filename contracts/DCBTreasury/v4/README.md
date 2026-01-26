# 🏦 DCB Treasury Smart Contracts v4.0

## 💎 USD-Backed LUSD Minting System

Sistema de contratos inteligentes de nivel profesional para la tokenización de USD y el respaldo 1:1 de LUSD en LemonChain.

---

## 📋 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FLUJO DE 3 FIRMAS                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │   💵 USD.sol        │    │  🔒 LockReserve.sol │    │  💎 LUSDMinter.sol  │                     │
│  │                     │    │                     │    │                     │                     │
│  │  PRIMERA FIRMA      │───▶│  SEGUNDA FIRMA      │───▶│  TERCERA FIRMA      │                     │
│  │  (DCB Treasury)     │    │  (Treasury Minting) │    │  (LUSD Minting)     │                     │
│  │                     │    │                     │    │                     │                     │
│  │  • Tokeniza USD     │    │  • Acepta Lock      │    │  • Consume Reserva  │                     │
│  │  • ISO 20022/SWIFT  │    │  • Crea Reserva     │    │  • Mintea LUSD 1:1  │                     │
│  │  • Valida Banco     │    │  • Auth Code        │    │  • Mint Explorer    │                     │
│  └─────────────────────┘    └─────────────────────┘    └─────────────────────┘                     │
│                                                                                                     │
│  ════════════════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                                     │
│  📊 RESULTADO: LUSD respaldado 1:1 por USD tokenizados con trazabilidad completa                   │
│                                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Contratos

### 1. USD.sol - Token USD Tokenizado

**Dirección:** `Pendiente de deploy`  
**Licencia:** MIT (Open Source)

#### Características:
- ✅ ERC-20 compliant con 6 decimales
- ✅ Soporte ISO 20022 (pacs.008, pacs.009, camt.053, camt.054)
- ✅ Soporte SWIFT (MT103, MT202, MT940, MT950)
- ✅ Almacenamiento de hash XML on-chain
- ✅ Integración sistema DAES
- ✅ Certificación multi-firma de bancos
- ✅ Firmas EIP-712
- ✅ Protección contra reentrancy
- ✅ Pausable (emergency stop)
- ✅ Control de acceso basado en roles
- ✅ Tracking de inyecciones con audit trail completo
- ✅ 15 divisas DAES soportadas

#### Roles:
- `MINTER_ROLE` - Puede tokenizar USD
- `BANK_SIGNER_ROLE` - Firmantes de bancos certificados
- `DAES_OPERATOR_ROLE` - Operadores del sistema DAES
- `TREASURY_MINTING_ROLE` - Contrato Treasury Minting
- `COMPLIANCE_ROLE` - Oficiales de cumplimiento

---

### 2. LockReserve.sol - Reserva de Lock USD

**Dirección:** `Pendiente de deploy`  
**Licencia:** MIT (Open Source)

#### Características:
- ✅ Recibe inyecciones USD aceptadas
- ✅ Mantiene USD en reserva como respaldo de LUSD
- ✅ Generación de Segunda Firma
- ✅ Soporte para consumo parcial de locks
- ✅ Audit trail completo con tres firmas
- ✅ Tracking de ratio de reserva (USD:LUSD)
- ✅ Integración con contrato LUSD Minting
- ✅ Códigos de autorización para Mint with Code

#### Roles:
- `OPERATOR_ROLE` - Operadores de Treasury Minting
- `LUSD_MINTING_ROLE` - Contrato LUSD Minter
- `RESERVE_MANAGER_ROLE` - Gestores de reserva

---

### 3. LUSDMinter.sol - Minter LUSD con Explorer

**Dirección:** `Pendiente de deploy`  
**Licencia:** MIT (Open Source)

#### Características:
- ✅ Generación de Tercera Firma (autorización final)
- ✅ Minting LUSD con verificación de respaldo USD
- ✅ Mint Explorer con audit trail completo
- ✅ Códigos de publicación para tracking
- ✅ Sistema de verificación de tres firmas
- ✅ Enforcement de ratio 1:1 USD:LUSD
- ✅ Transparencia y auditabilidad completa

#### Roles:
- `MINTER_ROLE` - Operadores de minting
- `EXPLORER_MANAGER_ROLE` - Gestores del explorer

---

## 🔗 Contratos Oficiales LemonChain

| Contrato | Dirección | Decimales |
|----------|-----------|-----------|
| **LUSD** | `0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99` | 6 |

---

## 🌐 Red LemonChain

| Parámetro | Valor |
|-----------|-------|
| **Chain ID** | 8866 |
| **RPC URL** | https://rpc.lemonchain.io |
| **Explorer** | https://explorer.lemonchain.io |
| **Símbolo** | LEMON |

---

## 📊 Divisas DAES Soportadas

| ISO | Nombre | Estado |
|-----|--------|--------|
| USD | US Dollar | ✅ MINT |
| EUR | Euro | 🔒 RESERVE |
| GBP | British Pound | 🔒 RESERVE |
| JPY | Japanese Yen | 🔒 RESERVE |
| CHF | Swiss Franc | 🔒 RESERVE |
| AUD | Australian Dollar | 🔒 RESERVE |
| CAD | Canadian Dollar | 🔒 RESERVE |
| CNY | Chinese Yuan | 🔒 RESERVE |
| HKD | Hong Kong Dollar | 🔒 RESERVE |
| SGD | Singapore Dollar | 🔒 RESERVE |
| AED | UAE Dirham | 🔒 RESERVE |
| SAR | Saudi Riyal | 🔒 RESERVE |
| KRW | South Korean Won | 🔒 RESERVE |
| INR | Indian Rupee | 🔒 RESERVE |
| BRL | Brazilian Real | 🔒 RESERVE |

---

## 🔐 Seguridad

### Estándares Implementados:
- ✅ OpenZeppelin Contracts v5.0
- ✅ ReentrancyGuard en todas las funciones críticas
- ✅ Pausable para emergencias
- ✅ AccessControl para permisos granulares
- ✅ SafeERC20 para transferencias seguras
- ✅ Custom errors para gas efficiency
- ✅ EIP-712 para firmas tipadas

### Auditoría:
- [ ] Auditoría interna completada
- [ ] Auditoría externa pendiente

---

## 📝 Flujo Detallado

### 1. Tokenización USD (Primera Firma)

```solidity
// DCB Treasury tokeniza USD con mensaje ISO 20022
USD.injectUSD(
    amount,           // Monto en 6 decimales
    beneficiary,      // Dirección beneficiaria
    MessageType.ISO_PACS_008,
    messageId,        // ID único del mensaje
    xmlHash,          // Hash del payload XML
    uetr,             // UETR
    instructionId,
    endToEndId,
    debtorBIC,
    creditorBIC,
    bankId,
    bankSignature     // Firma EIP-712 del banco
);
// → Genera: injectionId, dcbSignature (PRIMERA FIRMA)
// → Estado: PENDING
```

### 2. Aceptación Lock (Segunda Firma)

```solidity
// Treasury Minting acepta el lock
LockReserve.acceptLock(lockId);
// → Genera: secondSignature (SEGUNDA FIRMA), authorizationCode
// → Estado: ACCEPTED

// Mover a reserva
LockReserve.moveToReserve(lockId);
// → Estado: IN_RESERVE
```

### 3. Minting LUSD (Tercera Firma)

```solidity
// Mint with Code - consume reserva y mintea LUSD
LUSDMinter.mintAndPublish(
    lockReserveId,
    amount,
    beneficiary,
    authorizationCode,
    bankName,
    firstSignature,
    secondSignature
);
// → Genera: thirdSignature (TERCERA FIRMA), publicationCode
// → Mintea LUSD 1:1 con USD respaldo
// → Publica en Mint Explorer
```

---

## 🚀 Deployment

### Requisitos:
- Node.js >= 18
- Hardhat >= 2.19
- Cuenta con LEMON para gas

### Orden de Deploy:

```bash
# 1. Deploy USD Token
npx hardhat run scripts/deploy-usd.js --network lemonchain

# 2. Deploy Lock Reserve
npx hardhat run scripts/deploy-lock-reserve.js --network lemonchain

# 3. Deploy LUSD Minter
npx hardhat run scripts/deploy-lusd-minter.js --network lemonchain

# 4. Configurar contratos
npx hardhat run scripts/configure-contracts.js --network lemonchain
```

### Configuración Post-Deploy:

```solidity
// En USD.sol
USD.setLockReserveContract(lockReserveAddress);
USD.setTreasuryMintingContract(treasuryMintingAddress);

// En LockReserve.sol
LockReserve.setLUSDMintingContract(lusdMinterAddress);

// En LUSDMinter.sol
LUSDMinter.setUSDContract(usdAddress);
LUSDMinter.setLockReserveContract(lockReserveAddress);
```

---

## 📄 Licencia

MIT License - Open Source & Public

---

## 👥 Equipo

**Digital Commercial Bank Ltd**  
- Security: security@digitalcommercialbank.com
- Technical: tech@digitalcommercialbank.com

---

## 📚 Referencias

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [EIP-712: Typed Structured Data Hashing](https://eips.ethereum.org/EIPS/eip-712)
- [ISO 20022 Standard](https://www.iso20022.org/)
- [SWIFT Standards](https://www.swift.com/standards)
- [LemonChain Documentation](https://docs.lemonchain.io)
