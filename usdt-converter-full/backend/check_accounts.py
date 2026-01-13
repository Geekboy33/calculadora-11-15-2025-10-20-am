import subprocess
import time
import requests

print('=== VERIFICANDO CUENTAS DISPONIBLES ===')
server = subprocess.Popen(['python', 'app.py'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(4)

try:
    # Verificar fondos
    fondos_response = requests.get('http://localhost:3000/api/ethusd/fondos', timeout=5)
    fondos = fondos_response.json()

    print('Cuentas en fondos.json:')
    for cuenta in fondos['data']['cuentas_bancarias']:
        id_cuenta = cuenta['id']
        nombre = cuenta['nombre']
        usd = cuenta['monto_usd']
        destino = cuenta['direccion_usdt']
        print(f'  ID {id_cuenta}: {nombre} - ${usd:.0f} USD')
        print(f'    Destino USDT: {destino}')

    # Verificar balance de wallet
    balance_response = requests.get('http://localhost:3000/api/ethusd/usdt-balance', timeout=5)
    balance = balance_response.json()
    print(f'\nWallet operadora: {balance["address"]}')
    print(f'USDT disponible: {balance["usdt"]["balance"]:.2f}')
    print(f'ETH disponible: {balance["eth"]["balance"]:.4f}')

except Exception as e:
    print('Error:', e)
finally:
    server.terminate()
    server.wait()













