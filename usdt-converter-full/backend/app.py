"""
USD to USDT Converter - Professional Crypto Conversion Module
Converts USD from JSON file to USDT (ERC20) on Ethereum Mainnet
"""

import os
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ============================================================================
# CONFIGURATION
# ============================================================================
INFURA_URL = f"https://mainnet.infura.io/v3/{os.getenv('INFURA_PROJECT_ID')}"
ETH_PRIVATE_KEY = os.getenv('ETH_PRIVATE_KEY')

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(INFURA_URL))

# Derive address from private key
account = w3.eth.account.from_key(ETH_PRIVATE_KEY)
ETH_ADDRESS = account.address

# USDT Contract Address (Official Tether on Ethereum Mainnet)
USDT_CONTRACT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

# ============================================================================
# USDT ERC20 ABI (Complete and Verified from Etherscan)
# ============================================================================
USDT_ABI = json.loads('''
[
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
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
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [
            {
                "name": "",
                "type": "uint8"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
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
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [
            {
                "name": "",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
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
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": true,
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
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": false,
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
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
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
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "_from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "_to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "_owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "_spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    }
]
''')

# Create USDT Contract instance
usdt_contract = w3.eth.contract(
    address=w3.to_checksum_address(USDT_CONTRACT_ADDRESS),
    abi=USDT_ABI
)

# Flask App
app = Flask(__name__)
CORS(app)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_usdt_rate():
    """Get current USD/USDT exchange rate from CoinGecko"""
    try:
        api_url = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd'
        response = requests.get(api_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            rate = data['tether']['usd']
            return {
                "success": True,
                "rate": rate,
                "source": "CoinGecko",
                "pair": "USDT/USD"
            }
    except Exception as e:
        pass
    
    # Fallback to Binance
    try:
        api_url = 'https://api.binance.com/api/v3/ticker/price?symbol=USDTUSDC'
        response = requests.get(api_url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            rate = float(data['price'])
            return {
                "success": True,
                "rate": rate,
                "source": "Binance",
                "pair": "USDT/USDC"
            }
    except Exception as e:
        pass
    
    # Default 1:1
    return {
        "success": True,
        "rate": 1.0,
        "source": "Default",
        "pair": "USDT/USD"
    }

def convert_usd_to_usdt(usd_amount):
    """Convert USD amount to USDT using current rate"""
    rate_info = get_usdt_rate()
    rate = rate_info['rate']
    usdt_amount = usd_amount / rate  # 1 USDT = ~1 USD
    return {
        "usd_amount": usd_amount,
        "usdt_amount": usdt_amount,
        "rate": rate,
        "source": rate_info['source']
    }

def load_fondos_json():
    """Load accounts from fondos.json file"""
    try:
        json_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'fondos.json')
        with open(json_path, 'r') as file:
            data = json.load(file)
            return {"success": True, "data": data}
    except FileNotFoundError:
        return {"success": False, "error": "fondos.json not found"}
    except json.JSONDecodeError as e:
        return {"success": False, "error": f"Invalid JSON: {str(e)}"}

def save_fondos_json(data):
    """Save accounts to fondos.json file"""
    try:
        json_path = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'fondos.json')
        with open(json_path, 'w') as file:
            json.dump(data, file, indent=2)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        "success": True,
        "service": "USD to USDT Converter",
        "version": "2.0.0",
        "network": "Ethereum Mainnet",
        "operator": ETH_ADDRESS
    })

@app.route('/api/ethusd/health', methods=['GET'])
def health():
    """Check connection to Ethereum"""
    try:
        block = w3.eth.block_number
        chain_id = w3.eth.chain_id
        return jsonify({
            "success": True,
            "connected": True,
            "blockNumber": block,
            "chainId": chain_id,
            "network": "Ethereum Mainnet" if chain_id == 1 else f"Chain {chain_id}"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "connected": False,
            "error": str(e)
        }), 500

@app.route('/api/ethusd/usdt-balance', methods=['GET'])
def usdt_balance():
    """Get USDT and ETH balance of operator wallet"""
    try:
        usdt_bal = usdt_contract.functions.balanceOf(ETH_ADDRESS).call() / 10**6
        eth_bal = w3.from_wei(w3.eth.get_balance(ETH_ADDRESS), 'ether')
        
        return jsonify({
            "success": True,
            "usdt": {"balance": float(usdt_bal)},
            "eth": {"balance": float(eth_bal)},
            "address": ETH_ADDRESS
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/ethusd/rate', methods=['GET'])
def get_rate():
    """Get current USDT/USD exchange rate"""
    rate_info = get_usdt_rate()
    return jsonify(rate_info)

@app.route('/api/ethusd/convert', methods=['POST'])
def convert_endpoint():
    """Convert USD to USDT (calculation only, no transfer)"""
    data = request.json
    usd_amount = float(data.get('amount', 0))
    
    if usd_amount <= 0:
        return jsonify({
            "success": False,
            "error": "Invalid amount"
        }), 400
    
    conversion = convert_usd_to_usdt(usd_amount)
    return jsonify({
        "success": True,
        **conversion
    })

@app.route('/api/ethusd/fondos', methods=['GET'])
def get_fondos():
    """Get all accounts from fondos.json"""
    result = load_fondos_json()
    if result['success']:
        return jsonify(result)
    return jsonify(result), 404

@app.route('/api/ethusd/fondos', methods=['POST'])
def update_fondos():
    """Update fondos.json with new account data"""
    data = request.json
    result = save_fondos_json(data)
    if result['success']:
        return jsonify({"success": True, "message": "Fondos updated"})
    return jsonify(result), 500

@app.route('/api/ethusd/send-usdt', methods=['POST'])
def send_usdt():
    """
    Convert USD to USDT and send to destination address
    
    Expected JSON body:
    {
        "amount": 100.00,           # Amount in USD to convert
        "toAddress": "0x...",       # Destination Ethereum address
        "fromAccountId": 1,         # Optional: Account ID from fondos.json
        "fromAccountName": "..."    # Optional: Account name for logging
    }
    """
    data = request.json
    
    # Validation
    if not data.get('amount') or not data.get('toAddress'):
        return jsonify({
            "success": False,
            "error": "MISSING_PARAMS",
            "message": "Se requieren 'amount' y 'toAddress'"
        }), 400
    
    usd_amount = float(data['amount'])
    to_address = data['toAddress']
    from_account_id = data.get('fromAccountId')
    from_account_name = data.get('fromAccountName', 'Unknown')
    
    # Validate address
    if not to_address.startswith('0x') or len(to_address) != 42:
        return jsonify({
            "success": False,
            "error": "INVALID_ADDRESS",
            "message": "La direccion debe ser de 42 caracteres y comenzar con 0x"
        }), 400
    
    # Convert USD to USDT
    conversion = convert_usd_to_usdt(usd_amount)
    usdt_amount = conversion['usdt_amount']
    
    # Check operator USDT balance
    usdt_balance_raw = usdt_contract.functions.balanceOf(ETH_ADDRESS).call()
    usdt_balance = usdt_balance_raw / 10**6
    
    if usdt_balance < usdt_amount:
        return jsonify({
            "success": False,
            "error": "INSUFFICIENT_USDT_BALANCE",
            "message": "Balance USDT insuficiente en wallet operadora",
            "details": {
                "required": usdt_amount,
                "available": usdt_balance,
                "usd_requested": usd_amount,
                "rate": conversion['rate']
            }
        }), 400
    
    # Check ETH balance for gas
    eth_balance = w3.eth.get_balance(ETH_ADDRESS)
    estimated_gas = 100000
    gas_price = w3.eth.gas_price
    estimated_cost = estimated_gas * gas_price
    
    if eth_balance < estimated_cost:
        return jsonify({
            "success": False,
            "error": "INSUFFICIENT_ETH_FOR_GAS",
            "message": "Balance ETH insuficiente para gas",
            "details": {
                "eth_balance": float(w3.from_wei(eth_balance, 'ether')),
                "estimated_gas_cost": float(w3.from_wei(estimated_cost, 'ether'))
            }
        }), 400
    
    # Build transaction
    try:
        nonce = w3.eth.get_transaction_count(ETH_ADDRESS, 'pending')
        usdt_amount_int = int(usdt_amount * 10**6)  # USDT has 6 decimals
        
        tx = usdt_contract.functions.transfer(
            w3.to_checksum_address(to_address),
            usdt_amount_int
        ).build_transaction({
            'chainId': 1,  # Ethereum Mainnet
            'gas': estimated_gas,
            'gasPrice': gas_price,
            'nonce': nonce,
            'from': ETH_ADDRESS
        })
        
        # Sign transaction
        signed_tx = account.sign_transaction(tx)
        
        # Send transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # Wait for receipt (with timeout)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            return jsonify({
                "success": False,
                "error": "USDT_TRANSFER_FAILED",
                "message": "Transaccion fallida en la blockchain",
                "txHash": tx_hash.hex()
            }), 500
        
        # Success - update fondos.json if account was specified
        if from_account_id:
            fondos_result = load_fondos_json()
            if fondos_result['success']:
                fondos_data = fondos_result['data']
                for cuenta in fondos_data.get('cuentas_bancarias', []):
                    if cuenta.get('id') == from_account_id:
                        cuenta['monto_usd'] = max(0, cuenta.get('monto_usd', 0) - usd_amount)
                        cuenta['last_conversion'] = {
                            "usd_amount": usd_amount,
                            "usdt_amount": usdt_amount,
                            "tx_hash": tx_hash.hex(),
                            "to_address": to_address
                        }
                        break
                save_fondos_json(fondos_data)
        
        return jsonify({
            "success": True,
            "txHash": tx_hash.hex(),
            "explorerUrl": f"https://etherscan.io/tx/{tx_hash.hex()}",
            "status": "COMPLETED",
            "conversion": {
                "usd_input": usd_amount,
                "usdt_output": usdt_amount,
                "rate": conversion['rate'],
                "rate_source": conversion['source']
            },
            "from_account": from_account_name,
            "to_address": to_address,
            "gas_used": receipt['gasUsed'],
            "block_number": receipt['blockNumber']
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": "TRANSACTION_ERROR",
            "message": "Error al enviar USDT",
            "details": str(e)
        }), 500

@app.route('/api/ethusd/convert-from-json', methods=['POST'])
def convert_from_json():
    """
    Process all accounts from fondos.json and convert their USD to USDT
    
    Expected JSON body:
    {
        "process_all": true,        # Process all accounts
        "account_ids": [1, 2],      # Or specific account IDs
        "dry_run": false            # If true, only calculate without sending
    }
    """
    data = request.json
    process_all = data.get('process_all', False)
    account_ids = data.get('account_ids', [])
    dry_run = data.get('dry_run', True)
    
    # Load fondos.json
    fondos_result = load_fondos_json()
    if not fondos_result['success']:
        return jsonify(fondos_result), 404
    
    fondos_data = fondos_result['data']
    cuentas = fondos_data.get('cuentas_bancarias', [])
    
    results = []
    total_usd = 0
    total_usdt = 0
    
    for cuenta in cuentas:
        account_id = cuenta.get('id')
        
        # Filter by account_ids if specified
        if not process_all and account_ids and account_id not in account_ids:
            continue
        
        monto_usd = cuenta.get('monto_usd', 0)
        direccion_usdt = cuenta.get('direccion_usdt')
        nombre = cuenta.get('nombre', f'Cuenta {account_id}')
        
        if monto_usd <= 0:
            results.append({
                "account_id": account_id,
                "account_name": nombre,
                "status": "SKIPPED",
                "reason": "No USD balance"
            })
            continue
        
        if not direccion_usdt:
            results.append({
                "account_id": account_id,
                "account_name": nombre,
                "status": "SKIPPED",
                "reason": "No destination address"
            })
            continue
        
        # Convert USD to USDT
        conversion = convert_usd_to_usdt(monto_usd)
        usdt_amount = conversion['usdt_amount']
        
        total_usd += monto_usd
        total_usdt += usdt_amount
        
        result = {
            "account_id": account_id,
            "account_name": nombre,
            "usd_amount": monto_usd,
            "usdt_amount": usdt_amount,
            "destination": direccion_usdt,
            "rate": conversion['rate']
        }
        
        if dry_run:
            result["status"] = "DRY_RUN"
            result["message"] = "Conversion calculated but not executed"
        else:
            # Actually send USDT
            send_result = send_usdt_internal(
                usdt_amount=usdt_amount,
                to_address=direccion_usdt,
                from_account_id=account_id,
                from_account_name=nombre
            )
            result.update(send_result)
        
        results.append(result)
    
    return jsonify({
        "success": True,
        "dry_run": dry_run,
        "summary": {
            "accounts_processed": len(results),
            "total_usd": total_usd,
            "total_usdt": total_usdt
        },
        "results": results
    })

def send_usdt_internal(usdt_amount, to_address, from_account_id=None, from_account_name=None):
    """Internal function to send USDT"""
    try:
        # Check balance
        usdt_balance_raw = usdt_contract.functions.balanceOf(ETH_ADDRESS).call()
        usdt_balance = usdt_balance_raw / 10**6
        
        if usdt_balance < usdt_amount:
            return {
                "status": "FAILED",
                "error": "INSUFFICIENT_BALANCE",
                "message": f"Need {usdt_amount} USDT, have {usdt_balance}"
            }
        
        # Build and send transaction
        nonce = w3.eth.get_transaction_count(ETH_ADDRESS, 'pending')
        usdt_amount_int = int(usdt_amount * 10**6)
        gas_price = w3.eth.gas_price
        
        tx = usdt_contract.functions.transfer(
            w3.to_checksum_address(to_address),
            usdt_amount_int
        ).build_transaction({
            'chainId': 1,
            'gas': 100000,
            'gasPrice': gas_price,
            'nonce': nonce,
            'from': ETH_ADDRESS
        })
        
        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if receipt['status'] != 1:
            return {
                "status": "FAILED",
                "error": "TX_REVERTED",
                "txHash": tx_hash.hex()
            }
        
        return {
            "status": "COMPLETED",
            "txHash": tx_hash.hex(),
            "explorerUrl": f"https://etherscan.io/tx/{tx_hash.hex()}",
            "gas_used": receipt['gasUsed']
        }
        
    except Exception as e:
        return {
            "status": "FAILED",
            "error": "EXCEPTION",
            "message": str(e)
        }

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    # Verify Ethereum connection
    if not w3.is_connected():
        raise ConnectionError("Could not connect to Ethereum network")
    
    print(f"[OK] Connected to Ethereum Mainnet (Chain ID: {w3.eth.chain_id})")
    print(f"[WALLET] Operator: {ETH_ADDRESS}")
    
    # Check balances
    usdt_bal = usdt_contract.functions.balanceOf(ETH_ADDRESS).call() / 10**6
    eth_bal = float(w3.from_wei(w3.eth.get_balance(ETH_ADDRESS), 'ether'))
    print(f"[BALANCE] USDT: {usdt_bal:.2f} | ETH: {eth_bal:.4f}")
    
    print(f"[SERVER] Starting on http://localhost:3000")
    app.run(host='0.0.0.0', port=3000, debug=True)
