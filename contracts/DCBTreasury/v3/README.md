# DCB Treasury Smart Contracts v3.0.0 - GOD LEVEL BLOCKCHAIN

## 🏛️ Digital Commercial Bank Ltd - LemonChain Treasury Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.20-blue)](https://soliditylang.org/)
[![Chain](https://img.shields.io/badge/Chain-LemonChain-green)](https://lemonchain.io/)
[![Status](https://img.shields.io/badge/Status-Production-brightgreen)]()

---

## 🚀 GOD LEVEL FEATURES

### 💎 LUSD Token (Lemon USD Stablecoin)

**Contract Address:** `0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99`

| Feature | Standard | Description |
|---------|----------|-------------|
| ERC-20 | ✅ | Full Standard Token |
| EIP-2612 Permit | ✅ | Gasless Approvals |
| ERC-3156 Flash Loans | ✅ | DeFi Integration |
| ERC-1363 Payable Token | ✅ | Transfer & Call |
| ERC-20 Votes | ✅ | Governance Voting |
| AccessControlEnumerable | ✅ | Role Management |
| Pausable | ✅ | Emergency Stop |
| ReentrancyGuard | ✅ | Security |
| Multicall | ✅ | Batch Operations |
| Oracle Integration | ✅ | Price Feed |
| Collateral Tracking | ✅ | Backing Verification |
| Blacklist/Whitelist | ✅ | Compliance |
| KYC/AML Support | ✅ | Regulatory |
| Snapshot/Checkpoints | ✅ | Historical Data |

### 💰 Price Oracle

**Contract Address:** `0x5395b963fd21e239D7Ea9dc932b24b2930E0c716`

| Feature | Description |
|---------|-------------|
| **Current Price** | **$1.00 USD** (100000000 with 8 decimals) |
| Chainlink Compatible | AggregatorV3Interface |
| Multi-Source | Weighted Aggregation |
| TWAP | Time-Weighted Average Price |
| Price History | Last 100 prices |
| Deviation Protection | Max 1% deviation |
| Stale Detection | Automatic fallback |

### 🏦 Bank Registry

**Contract Address:** `0x80cEa2106e64B23A15B13ae785c09d478D012879`

| Feature | Description |
|---------|-------------|
| Multi-Sig Governance | Proposal & Voting System |
| SWIFT/BIC Validation | ISO 9362 Compliant |
| Country Codes | ISO 3166-1 alpha-2 |
| Compliance Levels | TIER1, TIER2, TIER3, PREMIUM |
| KYC/AML Tracking | Per-Bank Verification |
| Transaction Limits | Configurable Limits |
| Full Audit Trail | All Actions Logged |

### 🔐 LockBox (USD Custody)

**Contract Address:** `0x832a9Bb3AEE299b3d08C66EB8Ed54433E7D0B947`

| Feature | Description |
|---------|-------------|
| Time-Locked Deposits | Configurable Duration |
| Multi-Sig Release | Required Signatures |
| Vesting Support | Cliff & Linear Vesting |
| Lock Types | Standard, Vesting, Escrow, Collateral |
| Emergency Withdrawal | 7-Day Delay |
| Reentrancy Protection | Security Guard |

---

## 📊 TOKEN ECONOMICS

```
╔═══════════════════════════════════════════════════════════════╗
║                     LUSD TOKEN METRICS                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Name:           Lemon USD                                    ║
║  Symbol:         LUSD                                         ║
║  Decimals:       6 (USDT/USDC Compatible)                     ║
║  Max Supply:     1,000,000,000 LUSD                           ║
║  Price:          $1.00 USD (Oracle Backed)                    ║
║  Collateral:     100% USD Backed                              ║
║  Chain:          LemonChain (ID: 1006)                        ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 🔑 ROLES & PERMISSIONS

### LUSD Token Roles

| Role | Hash | Permissions |
|------|------|-------------|
| DEFAULT_ADMIN_ROLE | `0x00` | Full Admin Access |
| MINTER_ROLE | `keccak256("MINTER_ROLE")` | Mint Tokens |
| BURNER_ROLE | `keccak256("BURNER_ROLE")` | Burn Tokens |
| PAUSER_ROLE | `keccak256("PAUSER_ROLE")` | Pause/Unpause |
| OPERATOR_ROLE | `keccak256("OPERATOR_ROLE")` | Update Collateral |
| BLACKLISTER_ROLE | `keccak256("BLACKLISTER_ROLE")` | Manage Blacklist |
| ORACLE_ROLE | `keccak256("ORACLE_ROLE")` | Update Oracle |
| GOVERNANCE_ROLE | `keccak256("GOVERNANCE_ROLE")` | Governance Actions |
| EMERGENCY_ROLE | `keccak256("EMERGENCY_ROLE")` | Emergency Mode |

---

## 🛡️ SECURITY FEATURES

### Protection Mechanisms

```solidity
// Reentrancy Guard
modifier nonReentrant() {
    if (_reentrancyStatus == _ENTERED) revert ReentrancyGuard();
    _reentrancyStatus = _ENTERED;
    _;
    _reentrancyStatus = _NOT_ENTERED;
}

// Compliance Check
modifier compliance(address from, address to) {
    if (blacklisted[from]) revert BlacklistedAddress(from);
    if (blacklisted[to]) revert BlacklistedAddress(to);
    if (frozen[from]) revert FrozenAccount(from);
    if (frozen[to]) revert FrozenAccount(to);
    if (whitelistEnabled) {
        if (!whitelisted[from]) revert NotWhitelisted(from);
        if (!whitelisted[to]) revert NotWhitelisted(to);
    }
    _;
}
```

### Security Audit Checklist

- [x] Reentrancy Protection
- [x] Integer Overflow/Underflow (Solidity 0.8+)
- [x] Access Control (RBAC)
- [x] Pausable Operations
- [x] Emergency Mode
- [x] Timelock for Admin Changes
- [x] Multi-Sig for Critical Operations
- [x] Input Validation
- [x] Event Logging
- [x] Custom Errors (Gas Efficient)

---

## 📈 ORACLE INTEGRATION

### Price Feed

```solidity
// Get current USD price ($1.00 = 100000000)
function latestRoundData() external view returns (
    uint80 roundId,      // Round ID
    int256 answer,       // Price: 100000000 = $1.00
    uint256 startedAt,   // Round start time
    uint256 updatedAt,   // Last update time
    uint80 answeredInRound
);

// Get TWAP (Time-Weighted Average Price)
function getTWAP() external view returns (int256);
```

### Oracle Configuration

| Parameter | Value | Description |
|-----------|-------|-------------|
| Decimals | 8 | Price precision |
| Heartbeat | 86400 | Max age (24 hours) |
| Min Price | 99000000 | $0.99 floor |
| Max Price | 101000000 | $1.01 ceiling |
| Max Deviation | 100 | 1% max change |

---

## 🔄 FLASH LOANS (ERC-3156)

```solidity
// Check max flash loan
function maxFlashLoan(address token) external view returns (uint256);

// Get flash loan fee (0.09%)
function flashFee(address token, uint256 amount) external view returns (uint256);

// Execute flash loan
function flashLoan(
    IERC3156FlashBorrower receiver,
    address token,
    uint256 amount,
    bytes calldata data
) external returns (bool);
```

---

## 🗳️ GOVERNANCE (ERC-20 Votes)

```solidity
// Get voting power
function getVotes(address account) external view returns (uint256);

// Get historical votes
function getPastVotes(address account, uint256 timepoint) external view returns (uint256);

// Delegate votes
function delegate(address delegatee) external;

// Delegate by signature
function delegateBySig(
    address delegatee,
    uint256 nonce,
    uint256 expiry,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;
```

---

## 🚀 DEPLOYMENT

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
npx hardhat run scripts/deploy-v3.js --network lemonchain
```

### Verify

```bash
npx hardhat verify --network lemonchain <ADDRESS> <ARGS>
```

---

## 📋 CONTRACT ADDRESSES

| Contract | Address | Verified |
|----------|---------|----------|
| LUSD v3.0 | `0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99` | ✅ |
| PriceOracle v3.0 | `0x5395b963fd21e239D7Ea9dc932b24b2930E0c716` | ✅ |
| BankRegistry v3.0 | `0x80cEa2106e64B23A15B13ae785c09d478D012879` | ✅ |
| LockBox v3.0 | `0x832a9Bb3AEE299b3d08C66EB8Ed54433E7D0B947` | ✅ |

---

## 📚 STANDARDS IMPLEMENTED

| Standard | Name | Status |
|----------|------|--------|
| ERC-20 | Token Standard | ✅ |
| EIP-2612 | Permit | ✅ |
| ERC-3156 | Flash Loans | ✅ |
| ERC-1363 | Payable Token | ✅ |
| EIP-712 | Typed Signatures | ✅ |
| ERC-165 | Interface Detection | ✅ |

---

## 🏢 ISSUER

**Digital Commercial Bank Ltd**
- Website: https://digitalcommercialbank.com
- Security: security@digitalcommercialbank.com
- Chain: LemonChain (ID: 1006)

---

## 📜 LICENSE

MIT License - Open Source

---

*© 2026 Digital Commercial Bank Ltd. All rights reserved.*
*GOD LEVEL BLOCKCHAIN - v3.0.0*
