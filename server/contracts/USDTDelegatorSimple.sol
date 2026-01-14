// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Delegador - Versión Simplificada
 * Registra emisiones de USDT como eventos en blockchain
 */

contract USDTDelegatorSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public owner;
    
    uint256 public totalIssued;
    mapping(address => uint256) public issuedTo;
    
    event USDTIssued(address indexed to, uint256 amount, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Emitir USDT (registra evento en blockchain)
     * No requiere balance USDT previo
     */
    function emitIssue(address _to, uint256 _amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(_to != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be > 0");

        totalIssued += _amount;
        issuedTo[_to] += _amount;
        
        emit USDTIssued(_to, _amount, block.timestamp);
        
        return true;
    }

    /**
     * Ver total emitido
     */
    function getTotalIssued() external view returns (uint256) {
        return totalIssued;
    }

    /**
     * Ver cantidad emitida a una dirección
     */
    function getIssuedAmount(address _to) external view returns (uint256) {
        return issuedTo[_to];
    }

    /**
     * Transferir ownership
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid owner");
        owner = _newOwner;
    }

    receive() external payable {}
}





