// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * 🪙 USDT Minter Contract - VERSIÓN CORRECTA
 * 
 * ✅ Llama a mint() en contrato USDT
 * ✅ Maneja errores correctamente
 * ✅ Incluye conversión de decimales
 * ✅ Solo owner puede mintear
 */

// Interface para USDT que TIENE mint
interface IUSDTWithMint {
    function mint(address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract USDTMinter {
    // USDT Contract Address (Ethereum Mainnet)
    IUSDTWithMint public usdt;
    
    // Owner del contrato
    address public owner;
    
    // Mapping para rastrear depósitos USD
    mapping(address => uint256) public usdDeposits;
    
    // Mapping para rastrear USDT mint
    mapping(address => uint256) public usdtMinted;
    
    // Tasa USD to USDT (1 USD = 0.9989 USDT)
    uint256 public constant RATE_NUMERATOR = 9989;
    uint256 public constant RATE_DENOMINATOR = 10000;
    
    // Eventos
    event USDDeposited(address indexed user, uint256 amount);
    event USDTMinted(address indexed user, address indexed to, uint256 amount);
    event USDTTransferred(address indexed user, address indexed to, uint256 amount);
    event MintError(address indexed to, string reason);
    
    constructor(address _usdtAddress) {
        usdt = IUSDTWithMint(_usdtAddress);
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    /**
     * 💵 Función para depositar USD (en WEI)
     * Se usa como simulación de depósito USD
     */
    function depositUSD(uint256 amountUSD) external payable {
        require(amountUSD > 0, "Amount must be > 0");
        usdDeposits[msg.sender] += amountUSD;
        emit USDDeposited(msg.sender, amountUSD);
    }
    
    /**
     * ✅ CORRECTO: Hacer MINT de USDT
     */
    function mintUSDT(address to, uint256 amountUSD) external onlyOwner returns (bool) {
        require(amountUSD > 0, "Amount must be > 0");
        require(to != address(0), "Invalid recipient");
        
        // Convertir USD a USDT (6 decimales para USDT)
        uint256 amountUSDT = (amountUSD * RATE_NUMERATOR) / RATE_DENOMINATOR;
        amountUSDT = amountUSDT * 10**6;
        
        // ✅ LLAMAR A MINT CORRECTAMENTE con try/catch
        try usdt.mint(to, amountUSDT) returns (bool success) {
            if (success) {
                usdtMinted[to] += amountUSDT;
                emit USDTMinted(msg.sender, to, amountUSDT);
                return true;
            } else {
                emit MintError(to, "Mint returned false");
                return false;
            }
        } catch Error(string memory reason) {
            emit MintError(to, string(abi.encodePacked("Mint failed: ", reason)));
            return false;
        } catch {
            emit MintError(to, "Mint failed: unknown error");
            return false;
        }
    }
    
    /**
     * 💸 Transferir USDT real desde este contrato
     */
    function transferUSDT(address to, uint256 amount) external onlyOwner returns (bool) {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");
        return usdt.transfer(to, amount);
    }
    
    /**
     * 💳 Obtener balance USDT real del contrato
     */
    function getContractUSDTBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }
    
    /**
     * 📊 Obtener cantidad USDT mint para usuario
     */
    function getUSDTMinted(address user) external view returns (uint256) {
        return usdtMinted[user];
    }
    
    /**
     * 💰 Obtener balance USD de usuario
     */
    function getUSDBalance(address user) external view returns (uint256) {
        return usdDeposits[user];
    }
    
    /**
     * 💸 Convertir USD a USDT (sin hacer transfer)
     */
    function convertUSDToUSDT(uint256 amountUSD) external pure returns (uint256) {
        require(amountUSD > 0, "Amount must be > 0");
        uint256 converted = (amountUSD * RATE_NUMERATOR) / RATE_DENOMINATOR;
        return converted * 10**6;
    }
    
    /**
     * 🛡️ Permitir recibir ETH
     */
    receive() external payable {}
}

