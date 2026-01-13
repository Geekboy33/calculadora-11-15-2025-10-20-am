#!/usr/bin/env python3
"""
Standalone USDT Converter
Based on the original usdt_converter.py but integrated with Web3USD module
"""

import json
import os
import sys
import requests
from datetime import datetime

# Add the server modules to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

try:
    from modules.web3usd.web3usd_converter import get_web3_converter, FundData
except ImportError as e:
    print(f"❌ Cannot import Web3USD module: {e}")
    print("   Make sure the server is properly configured.")
    sys.exit(1)

def load_environment():
    """Load environment variables from .env file"""
    env_file = os.path.join(os.path.dirname(__file__), '.env')

    if os.path.exists(env_file):
        from dotenv import load_dotenv
        load_dotenv(env_file)
        print("✅ Environment variables loaded from .env")
    else:
        print("⚠️  No .env file found. Make sure to configure:")
        print("   - WEB3_INFURA_PROJECT_ID")
        print("   - WEB3_CONVERTER_PRIVATE_KEY")
        print("   Continuing anyway...")

def conectar_a_ethereum_via_api():
    """Connect to Ethereum via API"""
    print("\n" + "="*50)
    print("🚀 CHECKING ETHEREUM CONNECTION VIA API...")

    try:
        response = requests.get("http://localhost:3000/api/web3usd/converter/health", timeout=10)

        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ API connection successful")
                print(f"📍 Converter address: {data.get('eth_address', 'N/A')}")
                print(".2f"                print(".2f"                print(".2f"                return True
            else:
                print(f"❌ API reports failure: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ API health check failed: {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server")
        print("   Make sure the backend is running on http://localhost:3000")
        return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

def obtener_tasa_usdt_via_api():
    """Get USDT/USD rate via API"""
    print("\n" + "="*50)
    print("🔍 GETTING USDT/USD RATE VIA API...")

    try:
        response = requests.get("http://localhost:3000/api/web3usd/converter/usdt-price", timeout=10)

        if response.status_code == 200:
            data = response.json()
            tasa = data.get('usdt_usd_price', 1.0)
            print(".2f"            return tasa
        else:
            print(f"⚠️ API price check failed, using fallback: {response.status_code}")
            return 1.0

    except Exception as e:
        print(f"⚠️ Price API error, using fallback: {e}")
        return 1.0

def convertir_usd_a_usdt_via_api(monto_usd, direccion_destino):
    """Convert USD to USDT via API"""
    print(".2f"
    # Test conversion first
    try:
        test_response = requests.post(
            "http://localhost:3000/api/web3usd/converter/test-conversion",
            json={
                "usd_amount": monto_usd,
                "to_address": direccion_destino
            },
            timeout=10
        )

        if test_response.status_code == 200:
            test_data = test_response.json()
            usdt_amount = test_data.get('usdt_amount', 0)
            usdt_units = test_data.get('usdt_units', 0)
            print(".6f"            print(f"🔍 Units: {usdt_units}")

            # Ask for confirmation
            print("
¿Proceder con la conversión real? (S/n): "            confirm = input().lower().strip()
            if confirm == 'n':
                print("❌ Conversión cancelada por usuario")
                return None

        else:
            print(f"❌ Test conversion failed: {test_response.status_code}")
            return None

    except Exception as e:
        print(f"❌ Test conversion error: {e}")
        return None

    # Perform real conversion using JSON format
    fund_data = {
        "request_id": f"standalone-{int(datetime.utcnow().timestamp())}",
        "timestamp": datetime.utcnow().isoformat() + 'Z',
        "cuentas_bancarias": [
            {
                "id": 1,
                "nombre": f"Standalone Conversion - {datetime.utcnow().strftime('%H:%M:%S')}",
                "monto_usd": monto_usd,
                "direccion_usdt": direccion_destino
            }
        ]
    }

    try:
        response = requests.post(
            "http://localhost:3000/api/web3usd/converter/convert",
            json=fund_data,
            headers={'Content-Type': 'application/json'},
            timeout=120  # 2 minutes timeout
        )

        if response.status_code == 200:
            data = response.json()

            if data.get('processed', 0) > 0:
                result = data['results'][0]
                if result['success']:
                    print("
✅ ¡CONVERSIÓN COMPLETADA!"                    print(f"📝 TX Hash: {result['tx_hash']}")
                    print(f"🔗 Etherscan: {result['explorer_url']}")
                    print(".6f"                    return {
                        'tx_hash': result['tx_hash'],
                        'explorer_url': result['explorer_url'],
                        'usdt_amount': result['usdt_amount'],
                        'block_number': result['block_number']
                    }
                else:
                    print(f"❌ Conversión fallida: {result.get('error', 'Unknown error')}")
                    return None
            else:
                print("❌ No se procesó ninguna conversión")
                return None

        else:
            print(f"❌ API conversion failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return None

    except requests.exceptions.Timeout:
        print("❌ Timeout: La transacción puede haber fallado o estar pendiente")
        print("   Verifica en Etherscan después de unos minutos")
        return None
    except Exception as e:
        print(f"❌ Conversion error: {e}")
        return None

def main():
    """Main function"""
    print("💱 CONVERTIDOR USD A USDT - MODO STANDALONE")
    print("="*60)

    # Load environment
    load_environment()

    # Check API connection
    if not conectar_a_ethereum_via_api():
        print("\n❌ No se puede conectar con la API. Verifica que:")
        print("   1. El backend esté corriendo (npm run dev)")
        print("   2. Las variables de entorno estén configuradas")
        print("   3. La conexión a Infura esté funcionando")
        return

    # Get USD amount
    try:
        monto_usd = float(input("\n💵 Ingresa el monto en USD a convertir: "))
        if monto_usd <= 0:
            print("❌ El monto debe ser mayor a 0")
            return
        if monto_usd > 1000:  # Safety limit
            confirm = input(".2f"            if confirm.lower() != 'si':
                print("❌ Conversión cancelada")
                return
    except ValueError:
        print("❌ Monto inválido")
        return

    # Get destination address
    direccion = input("\n📍 Dirección USDT de destino (0x...): ").strip()
    if not direccion.startswith('0x') or len(direccion) != 42:
        print("❌ Dirección inválida. Debe empezar con 0x y tener 42 caracteres")
        return

    # Confirm
    print("
🔍 RESUMEN:"    print(".2f"    print(f"📍 Destino: {direccion}")
    print(f"💰 Saldo requerido: Verificado automáticamente")

    confirm = input("\n¿Confirmar conversión? (si/no): ").lower().strip()
    if confirm != 'si':
        print("❌ Conversión cancelada")
        return

    # Execute conversion
    resultado = convertir_usd_a_usdt_via_api(monto_usd, direccion)

    if resultado:
        print("
🎉 ¡CONVERSIÓN EXITOSA!"        print("="*40)
        print(f"Hash: {resultado['tx_hash']}")
        print(f"Explorer: {resultado['explorer_url']}")
        print(".6f"        print("="*40)
    else:
        print("\n❌ La conversión falló")

if __name__ == "__main__":
    main()