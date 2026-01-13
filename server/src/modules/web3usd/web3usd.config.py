"""
Web3 USD Module Configuration
Handles all Web3.py based USD tokenization operations
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================================================
# NETWORK CONFIGURATION
# ============================================================================
WEB3_NETWORK_CONFIG = {
    'chain_id': int(os.getenv('WEB3_CHAIN_ID', '1')),
    'name': os.getenv('WEB3_NETWORK_NAME', 'Ethereum Mainnet'),
    'rpc_url': os.getenv('WEB3_RPC_URL', 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'),
    'ws_url': os.getenv('WEB3_WS_URL', 'wss://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'),
    'confirmations': int(os.getenv('WEB3_CONFIRMATIONS', '2')),
    'timeout': int(os.getenv('WEB3_TIMEOUT', '30')),
    'max_retries': int(os.getenv('WEB3_MAX_RETRIES', '3')),
    'retry_delay': int(os.getenv('WEB3_RETRY_DELAY', '2'))
}

# ============================================================================
# CONTRACT ADDRESSES
# ============================================================================
WEB3_CONTRACT_ADDRESSES = {
    'usd_token': os.getenv('WEB3_USD_TOKEN', '0x3db99FACe6BB270E86BCA3355655dB747867f67b'),
    'bridge_minter': os.getenv('WEB3_BRIDGE_MINTER', '0x5737342B02AF40815BD7881260F07777C0b1063f'),
    'registry': os.getenv('WEB3_REGISTRY', '0x346bBC9976AE540896125B01e14E8bc7Ef1EDB32'),
    'chainlink_feed': os.getenv('WEB3_CHAINLINK_FEED', '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419')
}

# ============================================================================
# WALLET CONFIGURATION
# ============================================================================
WEB3_WALLET_CONFIG = {
    'daes_signer_private_key': os.getenv('WEB3_DAES_SIGNER_PRIVATE_KEY'),
    'operator_private_key': os.getenv('WEB3_OPERATOR_PRIVATE_KEY'),
    'operator_address': os.getenv('WEB3_OPERATOR_ADDRESS'),
    'daes_signer_address': os.getenv('WEB3_DAES_SIGNER_ADDRESS')
}

# ============================================================================
# PRICE CONFIGURATION
# ============================================================================
WEB3_PRICE_CONFIG = {
    'decimals': int(os.getenv('WEB3_PRICE_DECIMALS', '8')),
    'default_price': float(os.getenv('WEB3_DEFAULT_PRICE', '2500.00')),
    'stale_threshold': int(os.getenv('WEB3_STALE_THRESHOLD', '3600')),  # 1 hour
    'cache_duration': int(os.getenv('WEB3_CACHE_DURATION', '300'))  # 5 minutes
}

# ============================================================================
# GAS CONFIGURATION
# ============================================================================
WEB3_GAS_CONFIG = {
    'gas_limit_multiplier': float(os.getenv('WEB3_GAS_MULTIPLIER', '1.2')),
    'max_gas_price': int(os.getenv('WEB3_MAX_GAS_PRICE', '500000000000')),  # 500 gwei
    'gas_price_buffer': float(os.getenv('WEB3_GAS_BUFFER', '1.1')),
    'priority_fee': int(os.getenv('WEB3_PRIORITY_FEE', '2000000000'))  # 2 gwei
}

# ============================================================================
# TOKEN CONFIGURATION
# ============================================================================
WEB3_TOKEN_CONFIG = {
    'decimals': int(os.getenv('WEB3_TOKEN_DECIMALS', '6')),
    'symbol': os.getenv('WEB3_TOKEN_SYMBOL', 'USD'),
    'name': os.getenv('WEB3_TOKEN_NAME', 'DAES USD'),
    'min_mint_amount': float(os.getenv('WEB3_MIN_MINT', '1.0')),
    'max_mint_amount': float(os.getenv('WEB3_MAX_MINT', '1000000.0'))
}

# ============================================================================
# SECURITY CONFIGURATION
# ============================================================================
WEB3_SECURITY_CONFIG = {
    'eip712_domain': {
        'name': 'DAES USD BridgeMinter',
        'version': '2',
        'chainId': WEB3_NETWORK_CONFIG['chain_id'],
        'verifyingContract': WEB3_CONTRACT_ADDRESSES['bridge_minter']
    },
    'nonce_cache_duration': int(os.getenv('WEB3_NONCE_CACHE', '60')),  # 1 minute
    'signature_timeout': int(os.getenv('WEB3_SIG_TIMEOUT', '300'))  # 5 minutes
}

# ============================================================================
# CONVERTER CONFIGURATION (for USD to USDT conversion)
# ============================================================================
WEB3_CONVERTER_CONFIG = {
    'infura_project_id': os.getenv('WEB3_INFURA_PROJECT_ID'),
    'converter_private_key': os.getenv('WEB3_CONVERTER_PRIVATE_KEY'),
    'max_slippage_percent': float(os.getenv('WEB3_MAX_SLIPPAGE', '1.0')),
    'gas_multiplier': float(os.getenv('WEB3_CONVERTER_GAS_MULTIPLIER', '1.2')),
    'confirmation_timeout': int(os.getenv('WEB3_CONVERTER_TIMEOUT', '120')),
    'max_fee_per_gas_gwei': int(os.getenv('WEB3_MAX_FEE_GWEI', '50')),
    'priority_fee_gwei': int(os.getenv('WEB3_PRIORITY_FEE_GWEI', '2'))
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================
def validate_config():
    """Validate all required configuration parameters"""
    errors = []

    # Check required wallet keys
    if not WEB3_WALLET_CONFIG['daes_signer_private_key']:
        errors.append("WEB3_DAES_SIGNER_PRIVATE_KEY is required")
    if not WEB3_WALLET_CONFIG['operator_private_key']:
        errors.append("WEB3_OPERATOR_PRIVATE_KEY is required")

    # Check contract addresses
    for name, address in WEB3_CONTRACT_ADDRESSES.items():
        if not address or address == '0x':
            errors.append(f"WEB3_{name.upper()} contract address is required")

    # Check RPC URL
    if not WEB3_NETWORK_CONFIG['rpc_url'] or 'YOUR_KEY' in WEB3_NETWORK_CONFIG['rpc_url']:
        errors.append("WEB3_RPC_URL is required (replace YOUR_KEY with actual API key)")

    if errors:
        raise ValueError(f"Web3 USD Configuration Errors: {', '.join(errors)}")

    return True

def get_config_summary():
    """Get a summary of current configuration for health checks"""
    return {
        'network': WEB3_NETWORK_CONFIG['name'],
        'chain_id': WEB3_NETWORK_CONFIG['chain_id'],
        'contracts': {
            'usd_token': WEB3_CONTRACT_ADDRESSES['usd_token'],
            'bridge_minter': WEB3_CONTRACT_ADDRESSES['bridge_minter'],
            'registry': WEB3_CONTRACT_ADDRESSES['registry'],
            'chainlink_feed': WEB3_CONTRACT_ADDRESSES['chainlink_feed']
        },
        'price_config': WEB3_PRICE_CONFIG,
        'token_config': WEB3_TOKEN_CONFIG,
        'security_config': WEB3_SECURITY_CONFIG,
        'wallets': {
            'operator': WEB3_WALLET_CONFIG['operator_address'],
            'daes_signer': WEB3_WALLET_CONFIG['daes_signer_address']
        }
    }

def get_masked_api_key():
    """Get masked API key for logging"""
    rpc_url = WEB3_NETWORK_CONFIG['rpc_url']
    if 'v2/' in rpc_url:
        parts = rpc_url.split('v2/')
        if len(parts) > 1:
            return f"{parts[0]}v2/***"
    return "WEB3_RPC_URL not configured"

# ============================================================================
# INITIALIZATION
# ============================================================================
# Validate configuration on import
try:
    validate_config()
    print("[Web3USD Config] ✅ Configuration validated successfully")
    print(f"[Web3USD Config] Network: {WEB3_NETWORK_CONFIG['name']} (Chain ID: {WEB3_NETWORK_CONFIG['chain_id']})")
    print(f"[Web3USD Config] USD Token: {WEB3_CONTRACT_ADDRESSES['usd_token']}")
    print(f"[Web3USD Config] Bridge Minter: {WEB3_CONTRACT_ADDRESSES['bridge_minter']}")
except ValueError as e:
    print(f"[Web3USD Config] ❌ Configuration Error: {e}")
    raise