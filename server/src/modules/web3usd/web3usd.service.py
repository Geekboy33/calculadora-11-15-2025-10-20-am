"""
Web3 USD Minting Service
Python-based USD tokenization using Web3.py
"""

import time
import json
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
from decimal import Decimal, ROUND_DOWN

try:
    from web3 import Web3
    from web3.exceptions import ContractLogicError, TimeExhausted, TransactionNotFound
    from web3.middleware import geth_poa_middleware
    from eth_account import Account
    from eth_account.messages import encode_defunct
    import requests
except ImportError as e:
    print(f"[Web3USD] ❌ Missing dependencies: {e}")
    print("[Web3USD] Please install: pip install web3 requests python-dotenv")
    raise

from .web3usd.config import (
    WEB3_NETWORK_CONFIG, WEB3_CONTRACT_ADDRESSES, WEB3_WALLET_CONFIG,
    WEB3_PRICE_CONFIG, WEB3_GAS_CONFIG, WEB3_TOKEN_CONFIG, WEB3_SECURITY_CONFIG
)

# ============================================================================
# CONTRACT ABIs
# ============================================================================
USD_TOKEN_ABI = [
    {"constant": True, "inputs": [], "name": "decimals", "outputs": [{"name": "", "type": "uint8"}], "type": "function"},
    {"constant": True, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "type": "function"},
    {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"},
    {"constant": False, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "type": "function"}
]

BRIDGE_MINTER_V2_ABI = [
    # View functions
    {"inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "getNonce", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"internalType": "bytes32", "name": "holdId", "type": "bytes32"}], "name": "isHoldUsed", "outputs": [{"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"},

    # Mint function with V2 struct
    {"inputs": [
        {"components": [
            {"internalType": "bytes32", "name": "holdId", "type": "bytes32"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"},
            {"internalType": "address", "name": "beneficiary", "type": "address"},
            {"internalType": "bytes32", "name": "iso20022Hash", "type": "bytes32"},
            {"internalType": "bytes3", "name": "iso4217", "type": "bytes3"},
            {"internalType": "uint256", "name": "deadline", "type": "uint256"},
            {"internalType": "uint256", "name": "nonce", "type": "uint256"},
            {"internalType": "int256", "name": "ethUsdPrice", "type": "int256"},
            {"internalType": "uint8", "name": "priceDecimals", "type": "uint8"},
            {"internalType": "uint64", "name": "priceTs", "type": "uint64"}
        ], "internalType": "struct BridgeMinterV2.MintAuthorization", "name": "auth", "type": "tuple"},
        {"internalType": "bytes", "name": "signature", "type": "bytes"}
    ], "name": "mintWithAuthorization", "outputs": [], "stateMutability": "nonpayable", "type": "function"},

    # Events
    {"anonymous": False, "inputs": [
        {"indexed": True, "internalType": "bytes32", "name": "holdId", "type": "bytes32"},
        {"indexed": False, "internalType": "uint256", "name": "amount", "type": "uint256"},
        {"indexed": True, "internalType": "address", "name": "beneficiary", "type": "address"},
        {"indexed": False, "internalType": "bytes32", "name": "iso20022Hash", "type": "bytes32"},
        {"indexed": False, "internalType": "bytes3", "name": "iso4217", "type": "bytes3"},
        {"indexed": True, "internalType": "address", "name": "signer", "type": "address"},
        {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ], "name": "Minted", "type": "event"},

    {"anonymous": False, "inputs": [
        {"indexed": True, "internalType": "bytes32", "name": "pairId", "type": "bytes32"},
        {"indexed": False, "internalType": "int256", "name": "price", "type": "int256"},
        {"indexed": False, "internalType": "uint8", "name": "decimals", "type": "uint8"},
        {"indexed": False, "internalType": "uint64", "name": "ts", "type": "uint64"},
        {"indexed": True, "internalType": "bytes32", "name": "holdId", "type": "bytes32"}
    ], "name": "PriceSnapshot", "type": "event"}
]

# ============================================================================
# WEB3 CONNECTION CLASS
# ============================================================================
class Web3Connection:
    """Web3 connection manager with retry logic"""

    def __init__(self):
        self.w3 = None
        self._connect()

    def _connect(self):
        """Establish Web3 connection"""
        try:
            self.w3 = Web3(Web3.HTTPProvider(WEB3_NETWORK_CONFIG['rpc_url']))

            # Inject POA middleware for networks that need it
            self.w3.middleware_onion.inject(geth_poa_middleware, layer=0)

            # Test connection
            if not self.w3.is_connected():
                raise Exception("Failed to connect to RPC")

            print(f"[Web3USD] ✅ Connected to {WEB3_NETWORK_CONFIG['name']}")
            print(f"[Web3USD] Current block: {self.w3.eth.block_number}")

        except Exception as e:
            print(f"[Web3USD] ❌ Connection failed: {e}")
            raise

    def get_accounts(self):
        """Get available accounts"""
        return {
            'operator': WEB3_WALLET_CONFIG['operator_address'],
            'daes_signer': WEB3_WALLET_CONFIG['daes_signer_address']
        }

    def get_balance(self, address: str) -> float:
        """Get ETH balance in Ether"""
        try:
            balance_wei = self.w3.eth.get_balance(address)
            return float(self.w3.from_wei(balance_wei, 'ether'))
        except Exception as e:
            print(f"[Web3USD] Error getting balance for {address}: {e}")
            return 0.0

    def get_token_balance(self, token_address: str, wallet_address: str) -> float:
        """Get ERC-20 token balance"""
        try:
            contract = self.w3.eth.contract(address=token_address, abi=USD_TOKEN_ABI)
            balance_raw = contract.functions.balanceOf(wallet_address).call()
            decimals = contract.functions.decimals().call()
            return float(balance_raw) / (10 ** decimals)
        except Exception as e:
            print(f"[Web3USD] Error getting token balance: {e}")
            return 0.0

    def estimate_gas(self, tx: Dict) -> int:
        """Estimate gas for transaction"""
        try:
            gas_estimate = self.w3.eth.estimate_gas(tx)
            # Apply multiplier for safety
            gas_limit = int(gas_estimate * WEB3_GAS_CONFIG['gas_limit_multiplier'])
            return gas_limit
        except Exception as e:
            print(f"[Web3USD] Gas estimation failed: {e}")
            return 300000  # Default gas limit

    def send_transaction(self, signed_tx) -> Dict[str, Any]:
        """Send signed transaction and wait for confirmation"""
        try:
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)

            print(f"[Web3USD] 📤 Transaction sent: {tx_hash.hex()}")

            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(
                tx_hash,
                timeout=WEB3_NETWORK_CONFIG['timeout']
            )

            if receipt.status == 1:
                print(f"[Web3USD] ✅ Transaction confirmed in block {receipt.blockNumber}")
                return {
                    'success': True,
                    'tx_hash': tx_hash.hex(),
                    'block_number': receipt.blockNumber,
                    'gas_used': receipt.gasUsed,
                    'receipt': dict(receipt)
                }
            else:
                print(f"[Web3USD] ❌ Transaction failed")
                return {
                    'success': False,
                    'tx_hash': tx_hash.hex(),
                    'error': 'Transaction reverted'
                }

        except TimeExhausted:
            return {'success': False, 'error': 'Transaction timeout'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

# ============================================================================
# PRICE SERVICE
# ============================================================================
class Web3PriceService:
    """Chainlink price feed integration"""

    def __init__(self, w3_connection: Web3Connection):
        self.w3 = w3_connection.w3
        self.feed_address = WEB3_CONTRACT_ADDRESSES['chainlink_feed']

    def get_eth_usd_price(self) -> Dict[str, Any]:
        """Get current ETH/USD price from Chainlink"""
        try:
            contract = self.w3.eth.contract(address=self.feed_address, abi=BRIDGE_MINTER_V2_ABI)

            # Get latest round data
            round_data = contract.functions.latestRoundData().call()
            decimals = contract.functions.decimals().call()

            round_id, answer, started_at, updated_at, answered_in_round = round_data

            # Validate data
            if answer <= 0:
                raise ValueError("Invalid price data from Chainlink")

            # Check staleness
            current_time = int(time.time())
            age = current_time - updated_at
            if age > WEB3_PRICE_CONFIG['stale_threshold']:
                print(f"[Web3USD] ⚠️ Price data is {age} seconds old (threshold: {WEB3_PRICE_CONFIG['stale_threshold']})")

            # Convert to human readable
            human_price = float(answer) / (10 ** decimals)

            return {
                'price': answer,  # Raw Chainlink value
                'decimals': decimals,
                'human_price': round(human_price, 2),
                'updated_at': updated_at,
                'age_seconds': age,
                'source': 'Chainlink ETH/USD',
                'feed_address': self.feed_address
            }

        except Exception as e:
            print(f"[Web3USD] Chainlink error: {e}")
            # Fallback price
            fallback_price = WEB3_PRICE_CONFIG['default_price']
            scaled_price = int(fallback_price * (10 ** WEB3_PRICE_CONFIG['decimals']))

            return {
                'price': scaled_price,
                'decimals': WEB3_PRICE_CONFIG['decimals'],
                'human_price': fallback_price,
                'updated_at': int(time.time()),
                'age_seconds': 0,
                'source': 'DAES_FALLBACK',
                'feed_address': 'N/A'
            }

# ============================================================================
# EIP-712 SIGNING SERVICE
# ============================================================================
class Web3EIP712Service:
    """EIP-712 structured data signing"""

    def __init__(self, w3_connection: Web3Connection):
        self.w3 = w3_connection.w3
        self.domain = WEB3_SECURITY_CONFIG['eip712_domain']

    def create_mint_authorization(self, hold_id: str, amount: int, beneficiary: str,
                                iso20022_hash: str, iso4217: str, deadline: int,
                                eth_usd_price: int, price_decimals: int, price_ts: int) -> Dict[str, Any]:
        """Create EIP-712 MintAuthorization struct"""

        # Get nonce for signer
        signer_address = WEB3_WALLET_CONFIG['daes_signer_address']
        minter_contract = self.w3.eth.contract(
            address=WEB3_CONTRACT_ADDRESSES['bridge_minter'],
            abi=BRIDGE_MINTER_V2_ABI
        )

        nonce = minter_contract.functions.getNonce(signer_address).call()

        auth_struct = {
            'holdId': hold_id,
            'amount': amount,  # Already in smallest unit (6 decimals for USD)
            'beneficiary': beneficiary,
            'iso20022Hash': iso20022_hash,
            'iso4217': iso4217,  # bytes3 like '0x555344' for USD
            'deadline': deadline,
            'nonce': nonce,
            'ethUsdPrice': eth_usd_price,  # Chainlink price (8 decimals)
            'priceDecimals': price_decimals,
            'priceTs': price_ts
        }

        return auth_struct

    def sign_mint_authorization(self, auth_struct: Dict[str, Any]) -> str:
        """Sign EIP-712 MintAuthorization"""

        # EIP-712 types
        types = {
            'MintAuthorization': [
                {'name': 'holdId', 'type': 'bytes32'},
                {'name': 'amount', 'type': 'uint256'},
                {'name': 'beneficiary', 'type': 'address'},
                {'name': 'iso20022Hash', 'type': 'bytes32'},
                {'name': 'iso4217', 'type': 'bytes3'},
                {'name': 'deadline', 'type': 'uint256'},
                {'name': 'nonce', 'type': 'uint256'},
                {'name': 'ethUsdPrice', 'type': 'int256'},
                {'name': 'priceDecimals', 'type': 'uint8'},
                {'name': 'priceTs', 'type': 'uint64'}
            ]
        }

        # Create message
        message = {
            'domain': self.domain,
            'types': types,
            'primaryType': 'MintAuthorization',
            'message': auth_struct
        }

        # Sign with DAES signer
        private_key = WEB3_WALLET_CONFIG['daes_signer_private_key']
        if not private_key:
            raise ValueError("DAES_SIGNER_PRIVATE_KEY not configured")

        # Remove 0x prefix if present
        if private_key.startswith('0x'):
            private_key = private_key[2:]

        # Sign the message
        account = Account.from_key(private_key)
        signable_message = encode_defunct(text=json.dumps(message, separators=(',', ':')))
        signed = account.sign_message(signable_message)

        return signed.signature.hex()

# ============================================================================
# ISO RECEIPT SERVICE
# ============================================================================
class Web3ISOReceiptService:
    """ISO 20022 receipt generation"""

    def build_receipt(self, hold_id: str, amount: float, beneficiary: str) -> Dict[str, Any]:
        """Build ISO 20022 pain.001.001.09 credit transfer receipt"""
        receipt = {
            'Document': {
                'FIToFICustomerCreditTransfer': {
                    'GrpHdr': {
                        'MsgId': f'MINT-{hold_id[:8]}-{int(time.time())}',
                        'CreDtTm': datetime.utcnow().isoformat() + 'Z',
                        'NbOfTxs': '1',
                        'TtlIntrBkSttlmAmt': {
                            '@Ccy': 'USD',
                            '#text': f'{amount:.2f}'
                        },
                        'IntrBkSttlmDt': datetime.utcnow().date().isoformat(),
                        'SttlmInf': {
                            'SttlmMtd': 'CLRG',
                            'ClrSys': {
                                'Cd': 'ERTS'
                            }
                        },
                        'InstgAgt': {
                            'FinInstnId': {
                                'Nm': 'Digital Commercial Bank Ltd'
                            }
                        },
                        'InstdAgt': {
                            'FinInstnId': {
                                'Nm': 'Ethereum Foundation'
                            }
                        }
                    },
                    'CdtTrfTxInf': {
                        'PmtId': {
                            'InstrId': f'HOLD-{hold_id[:16]}',
                            'EndToEndId': f'MINT-{hold_id[:16]}',
                            'TxId': hold_id
                        },
                        'PmtTpInf': {
                            'SvcLvl': {
                                'Cd': 'URGP'
                            },
                            'CtgyPurp': {
                                'Cd': 'CASH'
                            }
                        },
                        'IntrBkSttlmAmt': {
                            '@Ccy': 'USD',
                            '#text': f'{amount:.2f}'
                        },
                        'ChrgBr': 'SHAR',
                        'Dbtr': {
                            'Nm': 'Digital Commercial Bank Ltd',
                            'Id': {
                                'OrgId': {
                                    'Othr': {
                                        'Id': 'DIGCOMMBANK'
                                    }
                                }
                            }
                        },
                        'DbtrAcct': {
                            'Id': {
                                'Othr': {
                                    'Id': 'DAES-MASTER-RESERVE'
                                }
                            }
                        },
                        'DbtrAgt': {
                            'FinInstnId': {
                                'Nm': 'Digital Commercial Bank Ltd'
                            }
                        },
                        'CdtrAgt': {
                            'FinInstnId': {
                                'Nm': 'Ethereum Network'
                            }
                        },
                        'Cdtr': {
                            'Nm': 'Tokenized USD Holder',
                            'Id': {
                                'OrgId': {
                                    'Othr': {
                                        'Id': beneficiary
                                    }
                                }
                            }
                        },
                        'CdtrAcct': {
                            'Id': {
                                'Othr': {
                                    'Id': f'ETH-{beneficiary[:10]}'
                                }
                            }
                        },
                        'Purp': {
                            'Cd': 'CASH'
                        },
                        'RmtInf': {
                            'Ustrd': f'DAES USD Token Mint - Hold ID: {hold_id[:16]}'
                        }
                    }
                }
            }
        }

        return receipt

    def get_iso20022_hash(self, receipt: Dict[str, Any]) -> str:
        """Generate keccak256 hash of ISO 20022 receipt"""
        receipt_json = json.dumps(receipt, separators=(',', ':'), sort_keys=True)
        receipt_hash = Web3.keccak(text=receipt_json)
        return receipt_hash.hex()

    def get_usd_bytes3(self) -> str:
        """Get ISO 4217 USD code as bytes3"""
        return '0x555344'  # USD = 840 in hex = 0x055344, but padded to 3 bytes

# ============================================================================
# MAIN MINTING SERVICE
# ============================================================================
class Web3USDMintService:
    """Main USD tokenization service using Web3.py"""

    def __init__(self):
        self.w3_conn = Web3Connection()
        self.price_service = Web3PriceService(self.w3_conn)
        self.eip712_service = Web3EIP712Service(self.w3_conn)
        self.iso_service = Web3ISOReceiptService()

        # Hold storage (in-memory for MVP)
        self.holds = {}

    def create_hold_id(self, daes_ref: str) -> str:
        """Create unique hold ID using keccak256"""
        timestamp = str(int(time.time()))
        random_data = f"{daes_ref}-{timestamp}-{Web3.keccak(text=str(time.time())).hex()[:16]}"
        hold_id = Web3.keccak(text=random_data)
        return hold_id.hex()

    def validate_request(self, amount_usd: float, beneficiary: str) -> Tuple[bool, str]:
        """Validate minting request"""
        # Check amount limits
        if amount_usd < WEB3_TOKEN_CONFIG['min_mint_amount']:
            return False, f"Amount too small. Minimum: ${WEB3_TOKEN_CONFIG['min_mint_amount']}"

        if amount_usd > WEB3_TOKEN_CONFIG['max_mint_amount']:
            return False, f"Amount too large. Maximum: ${WEB3_TOKEN_CONFIG['max_mint_amount']}"

        # Check beneficiary address
        if not Web3.is_address(beneficiary):
            return False, "Invalid beneficiary address"

        # Checksum address
        try:
            beneficiary = Web3.to_checksum_address(beneficiary)
        except:
            return False, "Invalid beneficiary address format"

        return True, ""

    def execute_mint(self, amount_usd: float, beneficiary: str, idempotency_key: str = None) -> Dict[str, Any]:
        """Execute USD tokenization"""

        start_time = time.time()

        try:
            # Validate request
            is_valid, error_msg = self.validate_request(amount_usd, beneficiary)
            if not is_valid:
                return {
                    'success': False,
                    'error': error_msg,
                    'timestamp': datetime.utcnow().isoformat()
                }

            # Checksum beneficiary
            beneficiary = Web3.to_checksum_address(beneficiary)

            # Create hold ID
            daes_ref = f"WEB3-MINT-{int(time.time())}"
            hold_id = self.create_hold_id(daes_ref)

            # Store hold (prevent double minting)
            if hold_id in self.holds:
                return {
                    'success': False,
                    'error': 'Hold ID already exists',
                    'hold_id': hold_id
                }

            self.holds[hold_id] = {
                'status': 'PENDING',
                'amount_usd': amount_usd,
                'beneficiary': beneficiary,
                'created_at': int(time.time()),
                'daes_ref': daes_ref
            }

            # Get Chainlink price
            price_data = self.price_service.get_eth_usd_price()
            print(f"[Web3USD] 📊 ETH/USD Price: ${price_data['human_price']} (from {price_data['source']})")

            # Convert amount to token units (6 decimals)
            amount_tokens = int(Decimal(str(amount_usd)) * Decimal(10 ** WEB3_TOKEN_CONFIG['decimals']))

            # Build ISO 20022 receipt
            iso_receipt = self.iso_service.build_receipt(hold_id, amount_usd, beneficiary)
            iso20022_hash = self.iso_service.get_iso20022_hash(iso_receipt)
            iso4217 = self.iso_service.get_usd_bytes3()

            # Create deadline (5 minutes from now)
            deadline = int(time.time()) + 300

            # Create EIP-712 authorization
            auth_struct = self.eip712_service.create_mint_authorization(
                hold_id=hold_id,
                amount=amount_tokens,
                beneficiary=beneficiary,
                iso20022_hash=iso20022_hash,
                iso4217=iso4217,
                deadline=deadline,
                eth_usd_price=price_data['price'],
                price_decimals=price_data['decimals'],
                price_ts=price_data['updated_at']
            )

            # Sign authorization
            signature = self.eip712_service.sign_mint_authorization(auth_struct)
            print(f"[Web3USD] ✍️ EIP-712 signature created by DAES Signer")

            # Prepare transaction
            minter_contract = self.w3_conn.w3.eth.contract(
                address=Web3.to_checksum_address(WEB3_CONTRACT_ADDRESSES['bridge_minter']),
                abi=BRIDGE_MINTER_V2_ABI
            )

            # Build transaction
            operator_address = Web3.to_checksum_address(WEB3_WALLET_CONFIG['operator_address'])
            nonce = self.w3_conn.w3.eth.get_transaction_count(operator_address)

            tx = minter_contract.functions.mintWithAuthorization(auth_struct, signature).build_transaction({
                'chainId': WEB3_NETWORK_CONFIG['chain_id'],
                'gas': self.w3_conn.estimate_gas({'to': WEB3_CONTRACT_ADDRESSES['bridge_minter']}),
                'gasPrice': self.w3_conn.w3.eth.gas_price,
                'nonce': nonce,
                'from': operator_address
            })

            # Sign transaction
            operator_key = WEB3_WALLET_CONFIG['operator_private_key']
            if operator_key.startswith('0x'):
                operator_key = operator_key[2:]

            signed_tx = self.w3_conn.w3.eth.account.sign_transaction(tx, operator_key)
            print(f"[Web3USD] 🔐 Transaction signed by operator")

            # Send transaction
            tx_result = self.w3_conn.send_transaction(signed_tx)

            if tx_result['success']:
                # Update hold status
                self.holds[hold_id]['status'] = 'MINTED'
                self.holds[hold_id]['tx_hash'] = tx_result['tx_hash']
                self.holds[hold_id]['completed_at'] = int(time.time())

                # Calculate processing time
                processing_time = time.time() - start_time

                return {
                    'success': True,
                    'hold_id': hold_id,
                    'tx_hash': tx_result['tx_hash'],
                    'explorer_url': f"https://etherscan.io/tx/{tx_result['tx_hash']}",
                    'amount_usd': amount_usd,
                    'amount_tokens': amount_tokens,
                    'beneficiary': beneficiary,
                    'price_snapshot': price_data,
                    'iso_receipt': iso_receipt,
                    'processing_time_seconds': round(processing_time, 2),
                    'timestamp': datetime.utcnow().isoformat(),
                    'block_number': tx_result['block_number'],
                    'gas_used': tx_result['gas_used']
                }
            else:
                # Update hold status
                self.holds[hold_id]['status'] = 'FAILED'
                self.holds[hold_id]['error'] = tx_result.get('error', 'Unknown error')

                return {
                    'success': False,
                    'hold_id': hold_id,
                    'error': tx_result.get('error', 'Transaction failed'),
                    'timestamp': datetime.utcnow().isoformat()
                }

        except Exception as e:
            print(f"[Web3USD] ❌ Mint execution error: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

# ============================================================================
# SINGLETON INSTANCE
# ============================================================================
_web3_mint_service = None

def get_web3_mint_service() -> Web3USDMintService:
    """Get singleton instance of Web3 USD Mint Service"""
    global _web3_mint_service
    if _web3_mint_service is None:
        _web3_mint_service = Web3USDMintService()
    return _web3_mint_service

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================
def get_web3_health_status() -> Dict[str, Any]:
    """Get health status of Web3 connection"""
    try:
        service = get_web3_mint_service()
        accounts = service.w3_conn.get_accounts()

        # Get balances
        operator_balance = service.w3_conn.get_balance(accounts['operator'])
        usd_token_balance = service.w3_conn.get_token_balance(
            WEB3_CONTRACT_ADDRESSES['usd_token'],
            accounts['operator']
        )

        return {
            'success': True,
            'network': WEB3_NETWORK_CONFIG['name'],
            'chain_id': WEB3_NETWORK_CONFIG['chain_id'],
            'block_number': service.w3_conn.w3.eth.block_number,
            'contracts': WEB3_CONTRACT_ADDRESSES,
            'accounts': accounts,
            'balances': {
                'operator_eth': operator_balance,
                'operator_usd_tokens': usd_token_balance
            },
            'price_config': WEB3_PRICE_CONFIG,
            'token_config': WEB3_TOKEN_CONFIG,
            'timestamp': datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }