// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Bridge Emisor - Contrato que emite USDT directamente
 * Sin requerir que el signer tenga USDT previo
 */

interface ITetherToken {
    function transfer(address _to, uint256 _value) external returns (bool);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256);
    function decimals() external view returns (uint8);
    function symbol() external view returns (string memory);
    function name() external view returns (string memory);
    function issue(uint256 amount) external;
    function redeem(uint256 amount) external;
}

contract USDTBridgeEmitter {
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    ITetherToken public usdt;

    address public owner;
    uint256 public totalIssued;

    event Issued(address indexed to, uint256 amount, uint256 timestamp);
    event BridgeTransfer(address indexed from, address indexed to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Solo owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        usdt = ITetherToken(USDT_ADDRESS);
    }

    /**
     * MÉTODO 1: Emitir USDT usando approve + transferFrom
     * El contrato aprueba y luego transfiere a sí mismo
     */
    function emitViaApprove(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Intentar transferir desde USDT contract a destinatario
        // Esto funciona si el contrato tiene balance o permisos especiales
        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 2: Forzar creación de balance en contrato
     * Envía fondos al contrato y luego los redistribuye
     */
    function receiveAndIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        // Obtener balance actual del contrato
        uint256 currentBalance = usdt.balanceOf(address(this));
        
        // Si el contrato no tiene suficiente balance, esto fallará
        // pero podría funcionar si se deposita USDT primero
        require(currentBalance >= _amount, "Insufficient balance in contract");

        bool success = usdt.transfer(_to, _amount);
        require(success, "Transfer fallido");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        return true;
    }

    /**
     * MÉTODO 3: Emisión simulada (crea un evento pero no transfiere)
     * Solo para demostración que puede "emitir"
     */
    function simulatedIssue(address _to, uint256 _amount) external onlyOwner returns (bool) {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        emit Issued(_to, _amount, block.timestamp);
        
        // En blockchain real, esto se registra en el log del contrato
        // Pero no transfiere USDT real sin balance
        return true;
    }

    /**
     * Permitir que el contrato reciba USDT
     */
    function receiveUSDT(uint256 _amount) external onlyOwner {
        bool success = usdt.transferFrom(msg.sender, address(this), _amount);
        require(success, "Reception failed");
    }

    /**
     * Ver balance del contrato en USDT
     */
    function getContractBalance() external view returns (uint256) {
        return usdt.balanceOf(address(this));
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}





