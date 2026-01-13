// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Proxy Bridge - Clone Intermediario
 * Actúa como proxy para ejecutar órdenes bridge contra el contrato real de USDT
 * y reenvia transacciones al contrato original
 */

interface IUSDT {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function decimals() external view returns (uint8);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

contract USDTProxyBridge {
    // Dirección del contrato USDT real en Mainnet
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    IUSDT public usdtContract;

    // Owner del proxy
    address public owner;
    
    // Eventos para auditoría
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount, string bridgeType);
    event ProxyApproval(address indexed owner, address indexed spender, uint256 amount);
    event DirectTransfer(address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo el owner puede ejecutar esta accion");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdtContract = IUSDT(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Bridge Transfer - Transferencia proxy que reenvia al contrato real
     * El proxy ejecuta la transferencia contra el contrato real de USDT
     */
    function bridgeTransfer(address _to, uint256 _amount) external returns (bool) {
        require(_to != address(0), "Dirección inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Transferencia USDT fallida");

        emit BridgeTransfer(msg.sender, _to, _amount, "direct_transfer");
        return true;
    }

    /**
     * MÉTODO 2: Bridge Transfer From - Transferencia desde una dirección
     * Útil para operaciones de custodio
     */
    function bridgeTransferFrom(address _from, address _to, uint256 _amount) external returns (bool) {
        require(_from != address(0), "Dirección origen inválida");
        require(_to != address(0), "Dirección destino inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Ejecutar transferencia en el contrato real de USDT
        bool success = usdtContract.transferFrom(_from, _to, _amount);
        require(success, "Transferencia USDT desde dirección fallida");

        emit BridgeTransfer(_from, _to, _amount, "transfer_from");
        return true;
    }

    /**
     * MÉTODO 3: Bridge Approve - Aprobación de gasto
     * Permite que direcciones gasten USDT del proxy
     */
    function bridgeApprove(address _spender, uint256 _amount) external returns (bool) {
        require(_spender != address(0), "Dirección spender inválida");

        // Ejecutar aprobación en el contrato real de USDT
        bool success = usdtContract.approve(_spender, _amount);
        require(success, "Aprobación USDT fallida");

        emit ProxyApproval(msg.sender, _spender, _amount);
        return true;
    }

    /**
     * MÉTODO 4: Owner Issue - Emisión como Owner del proxy
     * Simula la función issue() del contrato USDT
     * En producción, requeriría ser el owner real del contrato USDT
     */
    function ownerIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Dirección destinatario inválida");
        require(_amount > 0, "Monto debe ser mayor a 0");

        // Transferir USDT real al destinatario
        // Nota: Esto requiere que el proxy tenga saldo de USDT
        bool success = usdtContract.transfer(_to, _amount);
        require(success, "Emisión USDT fallida");

        emit DirectTransfer(_to, _amount);
        return true;
    }

    /**
     * MÉTODO 5: Owner Batch Transfer - Transferencia en lote
     * Útil para operaciones múltiples
     */
    function ownerBatchTransfer(address[] calldata _recipients, uint256[] calldata _amounts) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_recipients.length == _amounts.length, "Arrays deben tener la misma longitud");
        require(_recipients.length > 0, "Debe haber al menos un destinatario");

        uint256 totalAmount = 0;
        for (uint i = 0; i < _amounts.length; i++) {
            require(_amounts[i] > 0, "Los montos deben ser mayores a 0");
            totalAmount += _amounts[i];
        }

        // Verificar que el proxy tenga suficiente saldo
        uint256 balance = usdtContract.balanceOf(address(this));
        require(balance >= totalAmount, "Saldo insuficiente en proxy");

        // Ejecutar transferencias
        for (uint i = 0; i < _recipients.length; i++) {
            require(_recipients[i] != address(0), "Dirección inválida");
            bool success = usdtContract.transfer(_recipients[i], _amounts[i]);
            require(success, "Transferencia fallida");
            emit DirectTransfer(_recipients[i], _amounts[i]);
        }

        return true;
    }

    /**
     * VIEW: Obtener balance del proxy en USDT
     */
    function getBalance() external view returns (uint256) {
        return usdtContract.balanceOf(address(this));
    }

    /**
     * VIEW: Obtener balance de una dirección en USDT
     */
    function getBalanceOf(address _account) external view returns (uint256) {
        return usdtContract.balanceOf(_account);
    }

    /**
     * VIEW: Obtener total supply de USDT
     */
    function getTotalSupply() external view returns (uint256) {
        return usdtContract.totalSupply();
    }

    /**
     * VIEW: Obtener decimales de USDT
     */
    function getDecimals() external view returns (uint8) {
        return usdtContract.decimals();
    }

    /**
     * VIEW: Obtener información del contrato USDT
     */
    function getUSDTInfo() external view returns (string memory name, string memory symbol, uint8 decimals) {
        return (usdtContract.name(), usdtContract.symbol(), usdtContract.decimals());
    }

    /**
     * Owner: Cambiar owner del proxy
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Nuevo owner no puede ser address 0");
        owner = _newOwner;
    }

    /**
     * Owner: Emergencia - Recuperar USDT del proxy
     */
    function emergencyWithdraw(uint256 _amount) external onlyOwner returns (bool) {
        require(_amount > 0, "Monto debe ser mayor a 0");
        bool success = usdtContract.transfer(owner, _amount);
        require(success, "Retiro de emergencia fallido");
        return true;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}




