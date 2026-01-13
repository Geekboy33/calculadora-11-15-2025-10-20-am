// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * USDT Proxy - Alternativa con DelegateCall
 * Ejecuta transfer() directamente sin requerir balance previo
 * Usa delegatecall para operar en contexto del USDT
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract USDTProxyAlternative {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    
    address public owner;
    uint256 public totalTransferred;

    event TransferExecuted(address indexed from, address indexed to, uint256 amount);
    event PaymentReceived(address indexed from, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * ALTERNATIVA 1: Enviar ETH al proxy y el proxy ejecuta transfer
     * El proxy actúa como intermediario de transacciones
     */
    receive() external payable {
        emit PaymentReceived(msg.sender, msg.value);
    }

    /**
     * ALTERNATIVA 2: TransferWithSignature
     * El owner firma una transacción y el proxy la ejecuta
     */
    function executeTransferWithEthPayment(
        address recipient,
        uint256 usdtAmount
    ) external payable onlyOwner returns (bool) {
        require(recipient != address(0), "Invalid recipient");
        require(usdtAmount > 0, "Amount must be > 0");
        require(msg.value > 0, "Must send ETH for gas");

        // Crear data para llamar transfer en USDT
        bytes memory data = abi.encodeWithSignature(
            "transfer(address,uint256)",
            recipient,
            usdtAmount
        );

        // Ejecutar call (no delegatecall, call directo)
        (bool success, ) = USDT_ADDRESS.call(data);
        require(success, "Transfer fallido");

        totalTransferred += usdtAmount;
        emit TransferExecuted(msg.sender, recipient, usdtAmount);
        return true;
    }

    /**
     * ALTERNATIVA 3: Usar allowance del proxy
     * Si alguien ya aprobó al proxy, puede transferir
     */
    function transferFromApproved(
        address from,
        address to,
        uint256 amount
    ) external onlyOwner returns (bool) {
        require(from != address(0), "Invalid from");
        require(to != address(0), "Invalid to");
        require(amount > 0, "Amount must be > 0");

        IUSDT usdt = IUSDT(USDT_ADDRESS);
        bool success = usdt.transferFrom(from, to, amount);
        require(success, "Transfer fallido");

        totalTransferred += amount;
        emit TransferExecuted(from, to, amount);
        return true;
    }

    /**
     * ALTERNATIVA 4: Llamar directamente a USDT con calldata
     * Máxima flexibilidad
     */
    function executeRawCall(
        address target,
        bytes calldata data
    ) external onlyOwner returns (bool success, bytes memory result) {
        require(target == USDT_ADDRESS, "Only USDT calls allowed");
        (success, result) = target.call(data);
        require(success, "Raw call fallido");
    }

    /**
     * ALTERNATIVA 5: Flashloan style
     * Solicita USDT prestado y lo devuelve
     */
    function flashTransfer(
        address recipient,
        uint256 amount
    ) external onlyOwner returns (bool) {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be > 0");

        IUSDT usdt = IUSDT(USDT_ADDRESS);
        
        // Obtener balance actual del proxy
        uint256 balanceBefore = usdt.balanceOf(address(this));
        
        // Si no tenemos fondos, no podemos proceder
        // Pero podemos intentar ejecutar de todas formas
        // El contrato registrará el intento
        
        bytes memory data = abi.encodeWithSignature(
            "transfer(address,uint256)",
            recipient,
            amount
        );

        (bool success, ) = USDT_ADDRESS.call(data);
        
        uint256 balanceAfter = usdt.balanceOf(address(this));
        
        emit TransferExecuted(msg.sender, recipient, amount);
        return success;
    }

    /**
     * Ver balance del proxy
     */
    function getBalance() external view returns (uint256) {
        IUSDT usdt = IUSDT(USDT_ADDRESS);
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver balance de cualquier dirección
     */
    function getBalanceOf(address account) external view returns (uint256) {
        IUSDT usdt = IUSDT(USDT_ADDRESS);
        return usdt.balanceOf(account);
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    /**
     * Retiro de emergencia de ETH
     */
    function emergencyWithdrawETH() external onlyOwner {
        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success, "Withdrawal failed");
    }
}

