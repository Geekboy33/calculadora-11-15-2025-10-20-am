# DAES ETH USD Contracts

Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)


Smart contracts for DAES USD tokenization on Ethereum Mainnet.

## Contracts

| Contract | Description |
|----------|-------------|
| `USDToken.sol` | ERC-20 token (symbol: USD, decimals: 6) |
| `SettlementRegistry.sol` | On-chain status tracking (NONE→HOLD→MINTED→DELIVERED/FAILED) |
| `BridgeMinter.sol` | EIP-712 authorized minting with ISO20022 anchoring |

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp env.example.txt .env

# Edit .env with your values
```

## Configuration (.env)

```env
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<KEY>
DEPLOYER_PRIVATE_KEY=0x...
ADMIN_ADDRESS=0x...
DAES_SIGNER_ADDRESS=0x...
```

## Compile

```bash
npm run compile
```

## Deploy

### Sepolia (testnet)
```bash
npm run deploy:sepolia
```

### Mainnet (REAL ETH!)
```bash
npm run deploy:mainnet
```

## After Deployment

The deploy script will output:

```
ETH_USD_TOKEN=0x...
ETH_REGISTRY=0x...
ETH_BRIDGE_MINTER=0x...
```

Add these to your DAES backend `.env`.

## Roles

| Contract | Role | Assigned To |
|----------|------|-------------|
| USDToken | MINTER_ROLE | BridgeMinter |
| SettlementRegistry | OPERATOR_ROLE | BridgeMinter |
| BridgeMinter | DAES_SIGNER_ROLE | DAES_SIGNER_ADDRESS |
| BridgeMinter | OPERATOR_ROLE | Deployer |

## EIP-712 Domain

```javascript
{
  name: "DAES USD BridgeMinter",
  version: "1",
  chainId: 1, // Mainnet
  verifyingContract: BRIDGE_MINTER_ADDRESS
}
```

## MintAuthorization Struct

```solidity
struct MintAuthorization {
    bytes32 holdId;
    uint256 amount;
    address beneficiary;
    bytes32 iso20022Hash;
    bytes3 iso4217;      // "USD" = 0x555344
    uint256 deadline;
    uint256 nonce;
}
```

## Security

- Never commit `.env` to git
- DAES_SIGNER_PRIVATE_KEY must be kept secure
- Only authorized signers can trigger mints
- holdId cannot be reused (replay protection)
















