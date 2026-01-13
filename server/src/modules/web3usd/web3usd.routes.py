"""
Web3 USD Module Routes
FastAPI routes for Web3-based USD tokenization
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import time
from datetime import datetime

from .web3usd.service import get_web3_mint_service, get_web3_health_status
from .web3usd_converter import get_web3_converter, FundAccount, FundData

# Create router
web3usd_router = APIRouter(prefix="/api/web3usd", tags=["web3usd"])

# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================
class MintRequest(BaseModel):
    """Mint USD tokenization request"""
    amount_usd: float = Field(..., gt=0, le=1000000, description="USD amount to tokenize")
    beneficiary: str = Field(..., description="Ethereum address to receive tokens")
    debtor_name: Optional[str] = Field(None, description="Debtor name for ISO receipt")
    debtor_id: Optional[str] = Field(None, description="Debtor ID for ISO receipt")
    idempotency_key: Optional[str] = Field(None, description="Idempotency key for request deduplication")

class MintResponse(BaseModel):
    """Mint operation response"""
    success: bool
    hold_id: Optional[str] = None
    tx_hash: Optional[str] = None
    explorer_url: Optional[str] = None
    amount_usd: Optional[float] = None
    amount_tokens: Optional[int] = None
    beneficiary: Optional[str] = None
    price_snapshot: Optional[Dict[str, Any]] = None
    processing_time_seconds: Optional[float] = None
    block_number: Optional[int] = None
    gas_used: Optional[int] = None
    iso_receipt: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str

class HealthResponse(BaseModel):
    """Health check response"""
    success: bool
    network: Optional[str] = None
    chain_id: Optional[int] = None
    block_number: Optional[int] = None
    contracts: Optional[Dict[str, str]] = None
    accounts: Optional[Dict[str, str]] = None
    balances: Optional[Dict[str, float]] = None
    price_config: Optional[Dict[str, Any]] = None
    token_config: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: str

class FundAccountModel(BaseModel):
    """Fund account model"""
    id: int
    nombre: str
    monto_usd: float
    direccion_usdt: str

class FundDataModel(BaseModel):
    """Fund data model for conversion"""
    request_id: str
    timestamp: str
    cuentas_bancarias: List[FundAccountModel]

class ConverterHealthResponse(BaseModel):
    """Converter health response"""
    success: bool
    eth_address: Optional[str] = None
    eth_balance: Optional[float] = None
    usdt_balance: Optional[float] = None
    usdt_price: Optional[float] = None
    portfolio_value_usd: Optional[float] = None
    connected: Optional[bool] = None
    network: Optional[str] = None
    chain_id: Optional[int] = None
    block_number: Optional[int] = None
    error: Optional[str] = None

class ConversionResult(BaseModel):
    """Single account conversion result"""
    account_id: int
    account_name: str
    success: bool
    usd_amount: float
    usdt_amount: Optional[float] = None
    usdt_units: Optional[int] = None
    tx_hash: Optional[str] = None
    explorer_url: Optional[str] = None
    block_number: Optional[int] = None
    gas_used: Optional[int] = None
    error: Optional[str] = None

class BulkConversionResponse(BaseModel):
    """Bulk conversion response"""
    request_id: str
    timestamp: str
    total_accounts: int
    processed: int
    failed: int
    results: List[ConversionResult]
    summary: Dict[str, Any]

class StatsResponse(BaseModel):
    """Statistics response"""
    total_operations: int
    successful_operations: int
    failed_operations: int
    total_amount_usd: float
    average_processing_time: float
    holds: Dict[str, Any]

# ============================================================================
# ROUTES
# ============================================================================
@web3usd_router.get("/health", response_model=HealthResponse)
async def get_web3_health():
    """Get Web3 USD module health status"""
    try:
        health_data = get_web3_health_status()
        return HealthResponse(**health_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@web3usd_router.post("/mint-request", response_model=MintResponse)
async def mint_usd_tokens(request: MintRequest, background_tasks: BackgroundTasks):
    """Request USD tokenization using Web3.py"""
    start_time = time.time()

    try:
        # Get mint service
        mint_service = get_web3_mint_service()

        # Execute mint
        result = mint_service.execute_mint(
            amount_usd=request.amount_usd,
            beneficiary=request.beneficiary,
            idempotency_key=request.idempotency_key
        )

        # Add processing time
        if result.get('success'):
            result['processing_time_seconds'] = time.time() - start_time

        return MintResponse(**result)

    except Exception as e:
        processing_time = time.time() - start_time
        error_msg = f"Mint request failed: {str(e)}"
        print(f"[Web3USD API] ❌ {error_msg}")

        return MintResponse(
            success=False,
            error=error_msg,
            timestamp=datetime.utcnow().isoformat()
        )

@web3usd_router.get("/holds", response_model=Dict[str, Any])
async def get_holds():
    """Get all holds and their status"""
    try:
        mint_service = get_web3_mint_service()
        return {
            "holds": mint_service.holds,
            "total": len(mint_service.holds),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get holds: {str(e)}")

@web3usd_router.get("/stats", response_model=StatsResponse)
async def get_stats():
    """Get minting statistics"""
    try:
        mint_service = get_web3_mint_service()

        holds = mint_service.holds
        total_ops = len(holds)
        successful = sum(1 for h in holds.values() if h['status'] == 'MINTED')
        failed = sum(1 for h in holds.values() if h['status'] == 'FAILED')
        total_amount = sum(h['amount_usd'] for h in holds.values() if h['status'] == 'MINTED')

        return StatsResponse(
            total_operations=total_ops,
            successful_operations=successful,
            failed_operations=failed,
            total_amount_usd=total_amount,
            average_processing_time=0.0,  # TODO: Calculate from actual data
            holds=holds
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@web3usd_router.get("/price", response_model=Dict[str, Any])
async def get_current_price():
    """Get current ETH/USD price from Chainlink"""
    try:
        mint_service = get_web3_mint_service()
        price_data = mint_service.price_service.get_eth_usd_price()

        return {
            "price": price_data,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get price: {str(e)}")

@web3usd_router.get("/balance/{address}")
async def get_token_balance(address: str):
    """Get USD token balance for an address"""
    try:
        # Validate address
        from web3 import Web3
        if not Web3.is_address(address):
            raise HTTPException(status_code=400, detail="Invalid Ethereum address")

        mint_service = get_web3_mint_service()
        checksum_address = Web3.to_checksum_address(address)

        eth_balance = mint_service.w3_conn.get_balance(checksum_address)
        token_balance = mint_service.w3_conn.get_token_balance(
            mint_service.w3_conn.w3.to_checksum_address(mint_service.w3_conn.get_accounts()['usd_token']),
            checksum_address
        )

        return {
            "address": checksum_address,
            "eth_balance": eth_balance,
            "usd_token_balance": token_balance,
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get balance: {str(e)}")

# ============================================================================
# USD TO USDT CONVERTER ROUTES
# ============================================================================
@web3usd_router.get("/converter/health", response_model=ConverterHealthResponse)
async def get_converter_health():
    """Get USD to USDT converter status"""
    try:
        converter = get_web3_converter()
        status = converter.get_converter_status()
        return ConverterHealthResponse(**status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Converter health check failed: {str(e)}")

@web3usd_router.post("/converter/convert", response_model=BulkConversionResponse)
async def convert_usd_to_usdt(fund_data: FundDataModel):
    """Convert USD to USDT using fund data (JSON format)"""
    try:
        converter = get_web3_converter()

        # Convert to internal format
        accounts = [
            FundAccount(
                account_id=acc.id,
                name=acc.nombre,
                usd_amount=acc.monto_usd,
                usdt_address=acc.direccion_usdt
            )
            for acc in fund_data.cuentas_bancarias
        ]

        internal_fund_data = FundData(
            request_id=fund_data.request_id,
            timestamp=fund_data.timestamp,
            accounts=accounts
        )

        # Process conversion
        result = converter.process_fund_data(internal_fund_data)

        return BulkConversionResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

@web3usd_router.get("/converter/usdt-balance/{address}")
async def get_usdt_balance(address: str):
    """Get USDT balance for an address"""
    try:
        converter = get_web3_converter()
        balance = converter.get_usdt_balance(address)

        return {
            "address": address,
            "usdt_balance": balance,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get USDT balance: {str(e)}")

@web3usd_router.get("/converter/usdt-price")
async def get_usdt_price():
    """Get current USDT/USD price"""
    try:
        converter = get_web3_converter()
        price = converter.get_usdt_price()

        return {
            "usdt_usd_price": price,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get USDT price: {str(e)}")

@web3usd_router.post("/converter/test-conversion")
async def test_usd_conversion(usd_amount: float = 1.0, to_address: str = None):
    """Test USD to USDT conversion with small amount"""
    try:
        if not to_address:
            raise HTTPException(status_code=400, detail="to_address is required for testing")

        converter = get_web3_converter()

        # Validate small test amount
        if usd_amount > 5.0:
            raise HTTPException(status_code=400, detail="Test amount must be <= $5.00")

        # Convert
        usdt_units, usdt_amount_real = converter.convert_usd_to_usdt(usd_amount)

        return {
            "test_mode": True,
            "usd_amount": usd_amount,
            "usdt_amount": usdt_amount_real,
            "usdt_units": usdt_units,
            "to_address": to_address,
            "message": "This is a test conversion. No transaction sent.",
            "timestamp": datetime.utcnow().isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test conversion failed: {str(e)}")

# ============================================================================
# UTILITY ROUTES
# ============================================================================
@web3usd_router.get("/config")
async def get_config():
    """Get current module configuration (masked sensitive data)"""
    from .web3usd.config import get_config_summary, get_masked_api_key

    try:
        config = get_config_summary()
        config['masked_api_key'] = get_masked_api_key()

        return {
            "config": config,
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get config: {str(e)}")

@web3usd_router.post("/test-connection")
async def test_connection():
    """Test Web3 connection and basic functionality"""
    try:
        mint_service = get_web3_mint_service()
        usd_contract = mint_service.w3_conn.w3.eth.contract(
            address=mint_service.w3_conn.w3.to_checksum_address(mint_service.w3_conn.get_accounts()['usd_token']),
            abi=[{"constant": True, "inputs": [], "name": "symbol", "outputs": [{"name": "", "type": "string"}], "type": "function"}]
        )

        symbol = usd_contract.functions.symbol().call()

        return {
            "success": True,
            "usd_token_symbol": symbol,
            "message": "Web3 connection test successful",
            "timestamp": datetime.utcnow().isoformat()
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }