from web3 import Web3

# Configuración de la blockchain Ethereum
eth_rpc_url = 'https://mainnet.infura.io/v3/6b7bd498942d42edab758545c7d30403'
web3 = Web3(Web3.HTTPProvider(eth_rpc_url))

# Hashes de las transacciones
tx_hashes = [
    '0x5a1e48887a1b1c91ff0b190c2ae168e53532e3422efffbb53652e48ed4aaf6fa',
    '0x757135c358a57e387b680cd8a8edd114cb286f0e1a621fa78dc4ec13f6c1633a'
]

print("Verificando estado de transacciones...")

for i, tx_hash in enumerate(tx_hashes, 1):
    try:
        receipt = web3.eth.get_transaction_receipt(tx_hash)
        print(f"\nTransacción {i}: {tx_hash}")
        print(f"  Status: {'SUCCESS' if receipt['status'] == 1 else 'FAILED'}")
        print(f"  Gas Used: {receipt['gasUsed']}")
        print(f"  Block: {receipt['blockNumber']}")
    except Exception as e:
        print(f"\nTransacción {i}: {tx_hash}")
        print(f"  Error: {str(e)}")














