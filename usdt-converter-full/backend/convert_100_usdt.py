import subprocess
import time
import requests

print('=== CONVERSIÓN DE 100 USDT ===')
print('Destino: 0xD8F87F4a025640fF62B8AaE56968c1581CeAa4ca')
print('')

server = subprocess.Popen(['python', 'app.py'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
time.sleep(4)

try:
    print('1. Verificando estado del sistema...')

    # Verificar estado
    health_response = requests.get('http://localhost:3000/api/ethusd/health', timeout=5)
    health = health_response.json()
    print(f'   [OK] Conectado a Ethereum: {health["connected"]}')
    print(f'   [BLOCK] Block actual: {health["blockNumber"]}')

    # Verificar balance
    balance_response = requests.get('http://localhost:3000/api/ethusd/usdt-balance', timeout=5)
    balance = balance_response.json()
    print(f'   [USDT] USDT disponible: {balance["usdt"]["balance"]:.2f}')
    print(f'   [ETH] ETH disponible: {balance["eth"]["balance"]:.4f}')
    print(f'   [WALLET] Wallet: {balance["address"]}')

    print('')
    print('2. Calculando conversion USD->USDT...')

    # Calcular cuánto USD necesitamos para 100 USDT
    rate_response = requests.get('http://localhost:3000/api/ethusd/rate', timeout=5)
    rate_data = rate_response.json()
    tasa_usd_por_usdt = rate_data['rate']

    usd_necesario = 100 / tasa_usd_por_usdt  # USD necesarios para obtener 100 USDT

    print(f'   [RATE] Tasa actual: {tasa_usd_por_usdt:.6f} USD/USDT')
    print(f'   [TARGET] USDT solicitados: 100.0')
    print(f'   [USD] USD necesarios: {usd_necesario:.2f}')

    print('')
    print('3. Buscando cuenta con fondos suficientes...')

    # Verificar cuentas disponibles
    fondos_response = requests.get('http://localhost:3000/api/ethusd/fondos', timeout=5)
    fondos = fondos_response.json()

    cuenta_elegida = None
    for cuenta in fondos['data']['cuentas_bancarias']:
        if cuenta['monto_usd'] >= usd_necesario:
            cuenta_elegida = cuenta
            break

    if cuenta_elegida:
        print(f'   [ACCOUNT] Cuenta encontrada: {cuenta_elegida["nombre"]} (${cuenta_elegida["monto_usd"]:.0f} USD)')
        print('')
        print('4. Ejecutando conversion...')

        # Preparar datos para conversión
        conversion_data = {
            'amount': usd_necesario,  # USD necesarios para 100 USDT
            'toAddress': '0xD8F87F4a025640fF62B8AaE56968c1581CeAa4ca',  # Destino especificado por usuario
            'fromAccountId': cuenta_elegida['id'],
            'fromAccountName': cuenta_elegida['nombre']
        }

        # Hacer la conversión
        response = requests.post(
            'http://localhost:3000/api/ethusd/send-usdt',
            json=conversion_data,
            timeout=15
        )

        result = response.json()
        print('')
        print('=== RESULTADO DE CONVERSION ===')
        print(f'Success: {result.get("success", False)}')

        if result.get('success', False):
            print(f'[SUCCESS] Conversion exitosa!')
            print(f'[TX] TX Hash: {result.get("txHash", "N/A")}')
            print(f'[EXPLORER] Explorer: {result.get("explorerUrl", "N/A")}')
            print(f'[CONVERSION] Conversion: {result.get("conversion", {})}')
        else:
            print(f'[ERROR] Error: {result.get("error", "Unknown")}')
            if 'details' in result:
                details = result['details']
                print(f'   Requerido: {details.get("required", "N/A"):.2f} USDT')
                print(f'   Disponible: {details.get("available", "N/A"):.2f} USDT')
                print(f'   Tasa: {details.get("rate", "N/A"):.6f}')

    else:
        print('   [NO_ACCOUNT] No hay cuenta con fondos suficientes')
        print(f'   Se necesitan: ${usd_necesario:.2f} USD')
        cuentas_disponibles = [f'{c["nombre"]}: ${c["monto_usd"]:.0f}' for c in fondos['data']['cuentas_bancarias']]
        print(f'   Cuentas disponibles: {", ".join(cuentas_disponibles)}')

except Exception as e:
    print(f'[EXCEPTION] Error: {e}')
finally:
    server.terminate()
    server.wait()
    print('')
    print('=== FIN DE PRUEBA ===')
