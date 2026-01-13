#!/usr/bin/env python3
"""
Test script for Web3 USD to USDT Converter
"""

import json
import requests
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000/api/web3usd"

def test_converter_health():
    """Test converter health"""
    print("🔍 Testing converter health...")
    try:
        response = requests.get(f"{BASE_URL}/converter/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ Converter health check passed")
            print(f"   ETH Address: {data.get('eth_address', 'N/A')}")
            print(".2f"            print(".2f"            print(".2f"            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_usdt_price():
    """Test USDT price fetch"""
    print("\n💰 Testing USDT price...")
    try:
        response = requests.get(f"{BASE_URL}/converter/usdt-price")
        if response.status_code == 200:
            data = response.json()
            price = data.get('usdt_usd_price', 0)
            print(".2f"            return price
        else:
            print(f"❌ Price check failed: {response.status_code}")
            return 0
    except Exception as e:
        print(f"❌ Price check error: {e}")
        return 0

def test_conversion_simulation(usd_amount=1.0, test_address="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"):
    """Test conversion without sending transaction"""
    print(".2f"    try:
        response = requests.post(
            f"{BASE_URL}/converter/test-conversion",
            json={
                "usd_amount": usd_amount,
                "to_address": test_address
            }
        )
        if response.status_code == 200:
            data = response.json()
            print(".6f"            print(f"   USDT Units: {data.get('usdt_units', 0)}")
            print(f"   To Address: {data.get('to_address', 'N/A')}")
            print("   ⚠️  This is a TEST - no transaction sent")
            return True
        else:
            print(f"❌ Test conversion failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Test conversion error: {e}")
        return False

def test_full_conversion():
    """Test full conversion with JSON data"""
    print("\n🚀 Testing full conversion with JSON data...")

    # Load test data
    try:
        with open('fondos.example.json', 'r') as f:
            fund_data = json.load(f)
    except FileNotFoundError:
        print("❌ fondos.example.json not found")
        return False
    except Exception as e:
        print(f"❌ Error loading test data: {e}")
        return False

    # Modify timestamp
    fund_data['timestamp'] = datetime.utcnow().isoformat() + 'Z'

    try:
        response = requests.post(
            f"{BASE_URL}/converter/convert",
            json=fund_data,
            headers={'Content-Type': 'application/json'}
        )

        if response.status_code == 200:
            data = response.json()
            print("✅ Full conversion test completed")
            print(f"   Request ID: {data.get('request_id', 'N/A')}")
            print(f"   Total Accounts: {data.get('total_accounts', 0)}")
            print(f"   Processed: {data.get('processed', 0)}")
            print(f"   Failed: {data.get('failed', 0)}")

            # Show results
            for result in data.get('results', []):
                if result['success']:
                    print(".2f"                    print(f"      TX: {result['tx_hash'][:20]}...")
                    print(f"      Explorer: {result['explorer_url'][:50]}...")
                else:
                    print(f"      ❌ Failed: {result['error']}")

            return True
        else:
            print(f"❌ Full conversion failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Full conversion error: {e}")
        return False

def main():
    """Main test function"""
    print("🧪 WEB3 USD TO USDT CONVERTER TEST SUITE")
    print("="*50)

    # Test 1: Health check
    if not test_converter_health():
        print("\n❌ Converter not ready. Check configuration.")
        return

    # Test 2: Price check
    price = test_usdt_price()
    if price == 0:
        print("\n❌ Price service not working.")
        return

    # Test 3: Simulation
    if not test_conversion_simulation():
        print("\n❌ Conversion simulation failed.")
        return

    # Test 4: Full conversion (uncomment to test real transactions)
    print("\n⚠️  FULL CONVERSION TEST DISABLED BY DEFAULT")
    print("   Uncomment the line below to test real USDT transfers:")
    print("   # test_full_conversion()")
    print("   ⚠️  This will send real USDT tokens!")

    # Uncomment this line to test real transfers (be careful!)
    # test_full_conversion()

    print("\n🎉 All tests completed successfully!")
    print("   The Web3 USD to USDT converter is working properly.")

if __name__ == "__main__":
    main()