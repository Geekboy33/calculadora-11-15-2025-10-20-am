#!/usr/bin/env python3
"""
Installation script for Web3 USD Converter dependencies
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🔧 {description}...")
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            capture_output=True,
            text=True,
            cwd=os.path.dirname(__file__)
        )
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Command: {command}")
        print(f"   Error: {e.stderr}")
        return False
    except Exception as e:
        print(f"❌ {description} error: {e}")
        return False

def check_python_version():
    """Check Python version"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 8:
        print(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
        return True
    else:
        print(f"❌ Python {version.major}.{version.minor}.{version.micro} - Requires Python 3.8+")
        return False

def main():
    """Main installation function"""
    print("🚀 WEB3 USD CONVERTER DEPENDENCIES INSTALLER")
    print("="*50)

    # Check Python version
    if not check_python_version():
        sys.exit(1)

    # Check if we're in the right directory
    if not os.path.exists('src/modules/web3usd'):
        print("❌ Not in the correct directory. Run this script from the server/ directory")
        sys.exit(1)

    success_count = 0
    total_commands = 0

    # Install Python dependencies
    commands = [
        ("python -m pip install --upgrade pip", "Upgrading pip"),
        ("pip install requests==2.31.0", "Installing requests"),
        ("pip install python-dotenv==1.0.0", "Installing python-dotenv"),
        ("pip install web3==6.12.0", "Installing web3.py (this may take a while)"),
    ]

    for command, description in commands:
        total_commands += 1
        if run_command(command, description):
            success_count += 1

    # Summary
    print("
📊 INSTALLATION SUMMARY"    print("="*30)
    print(f"Commands executed: {total_commands}")
    print(f"Successful: {success_count}")
    print(f"Failed: {total_commands - success_count}")

    if success_count == total_commands:
        print("
🎉 ALL DEPENDENCIES INSTALLED SUCCESSFULLY!"        print("
📝 NEXT STEPS:"        print("   1. Configure your .env file with:"        print("      - WEB3_INFURA_PROJECT_ID"        print("      - WEB3_CONVERTER_PRIVATE_KEY"        print("   2. Run: python test_converter.py"        print("   3. Start the backend: npm run dev"        print("   4. Test the converter at: http://localhost:3000/api/web3usd/converter/health"    else:
        print("
❌ SOME DEPENDENCIES FAILED TO INSTALL"        print("   Check the errors above and try again"        sys.exit(1)

if __name__ == "__main__":
    main()