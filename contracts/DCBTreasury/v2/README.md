# DCB Treasury Smart Contracts v2.0.0

## Digital Commercial Bank Ltd - LemonChain Treasury Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)](https://soliditylang.org/)
[![Chain](https://img.shields.io/badge/Chain-LemonChain-green)](https://lemonchain.io/)

---

## 📋 Overview

Production-grade smart contracts for the DCB Treasury Certification Platform on LemonChain. These contracts implement a complete stablecoin issuance and custody system with enterprise-level security features.

---

## 🏗️ Contracts

### 1. LUSD.sol - Lemon USD Stablecoin
**Address:** `0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99`

The main stablecoin contract implementing:
- ERC-20 Standard Compliance
- EIP-2612 Permit (Gasless Approvals)
- Role-Based Access Control (RBAC)
- Pausable Operations
- Whitelist/Blacklist Support
- Oracle Price Feed Integration
- Collateral Ratio Tracking
- Mint/Burn with Audit References

**Roles:**
| Role | Description |
|------|-------------|
| DEFAULT_ADMIN_ROLE | Full administrative access |
| MINTER_ROLE | Can mint new tokens |
| BURNER_ROLE | Can burn tokens |
| PAUSER_ROLE | Can pause/unpause transfers |
| OPERATOR_ROLE | Can update collateral and operational params |
| BLACKLISTER_ROLE | Can manage blacklist |

---

### 2. BankRegistry.sol - Financial Institution Registry
**Address:** `0x80cEa2106e64B23A15B13ae785c09d478D012879`

Registry for authorized banks with:
- Multi-Signature Approval for Registration
- SWIFT/BIC Code Validation
- ISO 3166-1 Country Codes
- Compliance Level Tracking (TIER1, TIER2, TIER3)
- Bank Activation/Deactivation
- Full Audit Trail

---

### 3. LockBox.sol - Secure USD Custody
**Address:** `0x832a9Bb3AEE299b3d08C66EB8Ed54433E7D0B947`

Time-locked custody contract with:
- Time-Locked USD Deposits
- Multi-Signature Release Authorization
- Emergency Withdrawal with Delay
- Lock Status Tracking
- Reentrancy Protection
- Pausable Operations

---

### 4. PriceOracle.sol - USD/USDT Price Feed
**Address:** `0x5395b963fd21e239D7Ea9dc932b24b2930E0c716`

Chainlink-compatible price oracle with:
- AggregatorV3Interface Compatibility
- Multi-Source Price Aggregation
- Price Deviation Protection
- Stale Price Detection
- Manual Price Override (Emergency)
- Price Bounds Validation

---

## 🔐 Security Features

### Access Control
- Role-Based Access Control (RBAC)
- Multi-Signature Requirements
- Time-Locked Operations

### Safety Mechanisms
- Reentrancy Guards
- Pausable Operations
- Emergency Controls with Delays
- Price Deviation Limits

### Compliance
- Whitelist/Blacklist Support
- Audit Trail for All Operations
- ISO 20022 Compatible References

---

## 📊 Contract Verification

### Verify on LemonChain Explorer

1. Navigate to LemonChain Explorer
2. Enter contract address
3. Go to "Contract" → "Verify & Publish"
4. Select:
   - Compiler: `solc 0.8.20`
   - EVM Version: `paris`
   - Optimization: `Yes (200 runs)`
   - License: `MIT`
5. Paste source code
6. Submit verification

### Verification Status

| Contract | Address | Verified |
|----------|---------|----------|
| LUSD | `0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99` | ✅ |
| BankRegistry | `0x80cEa2106e64B23A15B13ae785c09d478D012879` | ✅ |
| LockBox | `0x832a9Bb3AEE299b3d08C66EB8Ed54433E7D0B947` | ✅ |
| PriceOracle | `0x5395b963fd21e239D7Ea9dc932b24b2930E0c716` | ✅ |

---

## 🚀 Deployment

### Prerequisites

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### Compile

```bash
npx hardhat compile
```

### Deploy

```bash
npx hardhat run scripts/deploy-v2.js --network lemonchain
```

### Verify

```bash
npx hardhat verify --network lemonchain <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## 📝 License

MIT License - See [LICENSE](./LICENSE) for details.

---

## 🏢 Issuer

**Digital Commercial Bank Ltd**
- Website: https://digitalcommercialbank.com
- Security Contact: security@digitalcommercialbank.com
- Chain: LemonChain (ID: 1006)

---

## 📚 Documentation

- [LUSD Token Specification](./docs/LUSD.md)
- [BankRegistry Guide](./docs/BankRegistry.md)
- [LockBox Operations](./docs/LockBox.md)
- [PriceOracle Integration](./docs/PriceOracle.md)

---

## ⚠️ Disclaimer

These contracts are provided "as is" without warranty of any kind. Use at your own risk. Always conduct your own security audit before using in production.

---

*© 2026 Digital Commercial Bank Ltd. All rights reserved.*
