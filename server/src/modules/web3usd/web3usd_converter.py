"""
Web3 USD Converter Service
Converts USD to USDT using direct Web3.py operations
Based on the provided USDT converter code
"""

import json
import os
import time
import requests
from typing import Dict, Any, List, Optional, Tuple
from decimal import Decimal, ROUND_DOWN

try:
    from web3 import Web3
    from web3.middleware import geth_poa_middleware
    from eth_account import Account
    import requests
except ImportError as e:
    print(f"[Web3USD Converter] ❌ Missing dependencies: {e}")
    print("[Web3USD Converter] Please install: pip install web3 requests")
    raise

from .web3usd.config import WEB3_NETWORK_CONFIG, WEB3_CONVERTER_CONFIG

# ============================================================================
# USDT CONTRACT CONFIGURATION
# ============================================================================
USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"  # USDT ERC20 OFICIAL

USDT_ABI = [
    {
        "constant": True,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": False,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": False,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": False,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": False,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": False,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": False,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": False,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": False,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": False,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": False,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            },
            {
                "name": "_extraData",
                "type": "bytes"
            }
        ],
        "name": "approveAndCall",
        "outputs": [
            {
                "name": "success",
                "type": "bool"
            }
        ],
        "payable": False,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            },
            {
                "name": "_spender",
                "type": "address"
            }
        ],
        "name": "allowance",
        "outputs": [
            {
                "name": "remaining",
                "type": "uint256"
            },
            {
                "name": "spent",
                "type": "uint256"
            }
        ],
        "payable": False,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "name": "_from",
                "type": "address"
            },
            {
                "indexed": True,
                "name": "_to",
                "type": "address"
            },
            {
                "indexed": False,
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "name": "_owner",
                "type": "address"
            },
            {
                "indexed": True,
                "name": "_spender",
                "type": "address"
            },
            {
                "indexed": False,
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    }
]

# ============================================================================
# CONVERTER CONFIGURATION
# ============================================================================

# ============================================================================
# FUND STRUCTURE (JSON FORMAT)
# ============================================================================
class FundAccount:
    """Represents a bank account with USD funds to convert"""

    def __init__(self, account_id: int, name: str, usd_amount: float, usdt_address: str):
        self.id = account_id
        self.name = name
        self.usd_amount = usd_amount
        self.usdt_address = usdt_address

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'usd_amount': self.usd_amount,
            'usdt_address': self.usdt_address
        }

class FundData:
    """Container for fund conversion data"""

    def __init__(self, request_id: str, timestamp: str, accounts: List[FundAccount]):
        self.request_id = request_id
        self.timestamp = timestamp
        self.accounts = accounts

    @classmethod
    def from_json(cls, json_data: Dict[str, Any]) -> 'FundData':
        accounts = [
            FundAccount(
                account_id=acc['id'],
                name=acc['nombre'],
                usd_amount=acc['monto_usd'],
                usdt_address=acc['direccion_usdt']
            )
            for acc in json_data['cuentas_bancarias']
        ]
        return cls(
            request_id=json_data['request_id'],
            timestamp=json_data['timestamp'],
            accounts=accounts
        )

# ============================================================================
# WEB3 CONVERTER SERVICE
# ============================================================================
class Web3USDConverter:
    """USD to USDT converter using direct Web3 operations"""

    def __init__(self):
        self.w3 = None
        self.usdt_contract = None
        self.eth_address = None
        self._initialize_connection()

    def _initialize_connection(self):
        """Initialize Web3 connection and contracts"""
        try:
            # Build Infura URL
            infura_url = f"https://mainnet.infura.io/v3/{WEB3_CONVERTER_CONFIG['infura_project_id']}"

            # Connect to Ethereum
            self.w3 = Web3(Web3.HTTPProvider(infura_url))
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)

            if not self.w3.is_connected():
                raise Exception("Failed to connect to Infura")

            if self.w3.eth.chain_id != 1:
                raise Exception(f"Wrong network: {self.w3.eth.chain_id}, expected 1 (mainnet)")

            # Initialize account
            if not WEB3_CONVERTER_CONFIG['converter_private_key']:
                raise Exception("WEB3_CONVERTER_PRIVATE_KEY not configured")

            account = Account.from_key(WEB3_CONVERTER_CONFIG['converter_private_key'])
            self.eth_address = account.address

            # Initialize USDT contract
            self.usdt_contract = self.w3.eth.contract(
                address=self.w3.to_checksum_address(USDT_CONTRACT_ADDRESS),
                abi=USDT_ABI
            )

            print(f"[Web3USD Converter] ✅ Connected to Ethereum via Infura")
            print(f"[Web3USD Converter] 📍 Account: {self.eth_address}")

        except Exception as e:
            print(f"[Web3USD Converter] ❌ Initialization failed: {e}")
            raise

    def get_usdt_balance(self, address: str) -> float:
        """Get USDT balance for an address"""
        try:
            checksum_address = self.w3.to_checksum_address(address)
            balance_raw = self.usdt_contract.functions.balanceOf(checksum_address).call()
            decimals = self.usdt_contract.functions.decimals().call()
            return float(balance_raw) / (10 ** decimals)
        except Exception as e:
            print(f"[Web3USD Converter] Error getting USDT balance: {e}")
            return 0.0

    def get_usdt_price(self) -> float:
        """Get USDT/USD price from multiple sources"""
        print("[Web3USD Converter] 🔍 Getting USDT/USD price...")

        sources = [
            "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd",
            "https://api.binance.com/api/v3/ticker/price?symbol=USDTUSDT",
            "https://api.kraken.com/0/public/Ticker?pair=USDTUSD"
        ]

        for url in sources:
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()

                    if "coingecko" in url:
                        price = data['tether']['usd']
                    elif "binance" in url:
                        price = float(data['price'])
                    elif "kraken" in url:
                        price = float(data['result']['USDTUSD']['c'][0])
                    else:
                        continue

                    print(f"[Web3USD Converter] ✅ Price from {url.split('/')[2]}: ${price}")
                    return price

            except Exception as e:
                print(f"[Web3USD Converter] ⚠️ Source {url.split('/')[2]} failed: {e}")

        print("[Web3USD Converter] ⚠️ Using fallback price: $1.00")
        return 1.00

    def convert_usd_to_usdt(self, usd_amount: float) -> Tuple[int, float]:
        """Convert USD amount to USDT with price checking"""
        # Get current price
        price = self.get_usdt_price()

        # Check slippage
        slippage = abs(price - 1.0)
        if slippage > (WEB3_CONVERTER_CONFIG['max_slippage_percent'] / 100):
            raise Exception(f"Price slippage too high: {slippage*100:.2f}% (max: {WEB3_CONVERTER_CONFIG['max_slippage_percent']}%)")

        # Convert to USDT
        usdt_amount = usd_amount / price
        usdt_units = int(usdt_amount * (10 ** 6))  # 6 decimals for USDT

        print(f"[Web3USD Converter] 🔄 ${usd_amount:.2f} USD → {usdt_amount:.6f} USDT ({usdt_units} units)")

        return usdt_units, usdt_amount

    def send_usdt(self, to_address: str, amount_units: int) -> Dict[str, Any]:
        """Send USDT tokens to destination address"""
        try:
            # Validate address
            to_checksum = self.w3.to_checksum_address(to_address)

            # Check balance before sending
            current_balance = self.get_usdt_balance(self.eth_address)
            required_balance = amount_units / (10 ** 6)

            if current_balance < required_balance:
                raise Exception(f"Insufficient USDT balance. Have: {current_balance:.6f}, Need: {required_balance:.6f}")

            # Get nonce
            nonce = self.w3.eth.get_transaction_count(self.eth_address, 'pending')

            # Build transaction
            tx = self.usdt_contract.functions.transfer(to_checksum, amount_units).build_transaction({
                'chainId': 1,
                'gas': int(100000 * WEB3_CONVERTER_CONFIG['gas_multiplier']),
                'maxFeePerGas': self.w3.to_wei(str(WEB3_CONVERTER_CONFIG['max_fee_per_gas_gwei']), 'gwei'),
                'maxPriorityFeePerGas': self.w3.to_wei(str(WEB3_CONVERTER_CONFIG['priority_fee_gwei']), 'gwei'),
                'nonce': nonce,
                'from': self.eth_address
            })

            # Sign transaction
            account = Account.from_key(WEB3_CONVERTER_CONFIG['converter_private_key'])
            signed_tx = account.sign_transaction(tx)

            # Send transaction
            print(f"[Web3USD Converter] 🚀 Sending {amount_units} USDT units to {to_address}...")
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            # Wait for confirmation
            print("[Web3USD Converter] ⏳ Waiting for confirmation...")
            receipt = self.w3.eth.wait_for_transaction_receipt(
                tx_hash,
                timeout=WEB3_CONVERTER_CONFIG['confirmation_timeout']
            )

            if receipt.status != 1:
                raise Exception("Transaction failed on blockchain")

            result = {
                'success': True,
                'tx_hash': tx_hash.hex(),
                'block_number': receipt.blockNumber,
                'gas_used': receipt.gasUsed,
                'explorer_url': f"https://etherscan.io/tx/{tx_hash.hex()}",
                'from_address': self.eth_address,
                'to_address': to_address,
                'amount_units': amount_units,
                'amount_usdt': amount_units / (10 ** 6)
            }

            print(f"[Web3USD Converter] ✅ Transaction confirmed: {tx_hash.hex()}")

            return result

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'to_address': to_address,
                'amount_units': amount_units
            }

    def process_fund_account(self, account: FundAccount) -> Dict[str, Any]:
        """Process a single fund account conversion"""
        try:
            print(f"[Web3USD Converter] 🔄 Processing: {account.name} - ${account.usd_amount:.2f} USD")

            # Convert USD to USDT
            usdt_units, usdt_amount = self.convert_usd_to_usdt(account.usd_amount)

            # Send USDT
            result = self.send_usdt(account.usdt_address, usdt_units)

            if result['success']:
                return {
                    'account_id': account.id,
                    'account_name': account.name,
                    'success': True,
                    'usd_amount': account.usd_amount,
                    'usdt_amount': usdt_amount,
                    'usdt_units': usdt_units,
                    'tx_hash': result['tx_hash'],
                    'explorer_url': result['explorer_url'],
                    'block_number': result['block_number'],
                    'gas_used': result['gas_used']
                }
            else:
                return {
                    'account_id': account.id,
                    'account_name': account.name,
                    'success': False,
                    'usd_amount': account.usd_amount,
                    'error': result['error']
                }

        except Exception as e:
            return {
                'account_id': account.id,
                'account_name': account.name,
                'success': False,
                'usd_amount': account.usd_amount,
                'error': str(e)
            }

    def process_fund_data(self, fund_data: FundData) -> Dict[str, Any]:
        """Process all accounts in fund data"""
        results = []
        total_processed = 0
        total_failed = 0

        for account in fund_data.accounts:
            result = self.process_fund_account(account)
            results.append(result)

            if result['success']:
                total_processed += 1
            else:
                total_failed += 1

        return {
            'request_id': fund_data.request_id,
            'timestamp': fund_data.timestamp,
            'total_accounts': len(fund_data.accounts),
            'processed': total_processed,
            'failed': total_failed,
            'results': results,
            'summary': {
                'total_usd_processed': sum(r['usd_amount'] for r in results if r['success']),
                'total_usdt_sent': sum(r['usdt_amount'] for r in results if r['success']),
                'successful_txs': total_processed,
                'failed_txs': total_failed
            }
        }

    def get_converter_status(self) -> Dict[str, Any]:
        """Get converter status and balances"""
        try:
            eth_balance = self.w3.eth.get_balance(self.eth_address)
            eth_balance_eth = self.w3.from_wei(eth_balance, 'ether')

            usdt_balance = self.get_usdt_balance(self.eth_address)
            usdt_price = self.get_usdt_price()

            return {
                'success': True,
                'eth_address': self.eth_address,
                'eth_balance': float(eth_balance_eth),
                'usdt_balance': usdt_balance,
                'usdt_price': usdt_price,
                'portfolio_value_usd': usdt_balance * usdt_price,
                'connected': self.w3.is_connected(),
                'network': 'Ethereum Mainnet',
                'chain_id': self.w3.eth.chain_id,
                'block_number': self.w3.eth.block_number
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'connected': False
            }

# ============================================================================
# SINGLETON INSTANCE
# ============================================================================
_converter_instance = None

def get_web3_converter() -> Web3USDConverter:
    """Get singleton instance of Web3 USD Converter"""
    global _converter_instance
    if _converter_instance is None:
        try:
            _converter_instance = Web3USDConverter()
        except Exception as e:
            print(f"[Web3USD Converter] Failed to initialize: {e}")
            raise
    return _converter_instance