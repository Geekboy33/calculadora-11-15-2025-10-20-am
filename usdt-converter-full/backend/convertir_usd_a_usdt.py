import json
import requests
from web3 import Web3

# Configuración de la blockchain Ethereum
eth_rpc_url = 'https://mainnet.infura.io/v3/6b7bd498942d42edab758545c7d30403'
web3 = Web3(Web3.HTTPProvider(eth_rpc_url))
eth_address = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a'  # Tu dirección Ethereum
private_key = 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036'  # Tu clave privada Ethereum

# ABI del contrato USDT ERC20
usdt_abi = json.loads('''
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

# Contrato USDT ERC20
usdt_contract_address = '0xdAC17F958D2ee523a2206206994597C13D831ec7'  # Dirección del contrato USDT ERC20
usdt_contract = web3.eth.contract(address=usdt_contract_address, abi=usdt_abi)

def convertir_y_transferir_usdt(fondos_json):
    # Obtener la tasa de cambio USD a USDT
    api_url = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd'
    response = requests.get(api_url)
    if response.status_code == 200:
        rate_data = response.json()
        usdt_to_usd_rate = rate_data['tether']['usd']
    else:
        raise Exception("Error al obtener la tasa de cambio.")

    # Procesar cada cuenta bancaria
    for cuenta in fondos_json['cuentas_bancarias']:
        monto_usd = cuenta['monto_usd']
        direccion_usdt = cuenta['direccion_usdt']

        # Convertir USD a USDT
        monto_usdt = monto_usd * usdt_to_usd_rate

        # Convertir a la cantidad correcta de decimales (6 decimales para USDT)
        monto_usdt_int = int(monto_usdt * 10**6)

        # Crear la transacción
        nonce = web3.eth.get_transaction_count(eth_address)
        tx = usdt_contract.functions.transfer(direccion_usdt, monto_usdt_int).build_transaction({
            'chainId': 1,
            'gas': 2000000,
            'gasPrice': web3.to_wei('20', 'gwei'),
            'nonce': nonce,
        })

        # Firmar la transacción
        signed_tx = web3.eth.account.sign_transaction(tx, private_key)

        # Enviar la transacción
        tx_hash = web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        print(f"Transacción enviada: {tx_hash.hex()}")
        print(f"Monto transferido a {direccion_usdt}: {monto_usdt} USDT")
    else:
        print("Error al procesar las cuentas bancarias.")

# Leer el archivo JSON con los fondos
with open('../frontend/fondos.json', 'r') as file:
    fondos = json.load(file)

# Llamar a la función para convertir y transferir USDT
convertir_y_transferir_usdt(fondos)
