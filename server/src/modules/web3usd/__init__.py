"""
Web3 USD Module
Python-based USD tokenization and conversion module
"""

from .web3usd.config import *
from .web3usd.service import *
from .web3usd.routes import *
from .web3usd_converter import *

__version__ = "1.0.0"
__description__ = "Web3.py based USD tokenization and conversion module"

print("[Web3USD] 📦 Web3 USD Module loaded (with converter)")