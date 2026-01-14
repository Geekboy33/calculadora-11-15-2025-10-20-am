// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}





pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}





pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}





pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}





pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}





pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}





pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}




pragma solidity ^0.8.0;

/**
 * Tu Propio Token ERC-20 Fungible
 * Puedes MINTEAR INFINITO porque ERES el owner
 * 
 * Funciona como USDT pero sin restricciones de Tether Limited
 * Perfecto para testing y desarrollo
 */

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract MyUSDT is IERC20 {
    // ============================================================
    // PROPIEDADES DEL TOKEN
    // ============================================================
    
    string public name = "My Test USDT";
    string public symbol = "MUSDT";
    uint8 public decimals = 6;  // Igual a USDT real
    uint256 public totalSupply = 0;
    
    address public owner;
    
    // ============================================================
    // MAPEOS
    // ============================================================
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ============================================================
    // EVENTOS
    // ============================================================
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    // ============================================================
    // MODIFIERS
    // ============================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // ============================================================
    // CONSTRUCTOR
    // ============================================================
    
    constructor() {
        owner = msg.sender;
        // Iniciar con 1 millón de tokens (opcional)
        // mint(msg.sender, 1000000 * 10**6);
    }
    
    // ============================================================
    // FUNCIONES PRINCIPALES
    // ============================================================
    
    /**
     * ✅ PUEDES MINTEAR INFINITO
     * Esta es la función que NO puedes usar en USDT real
     * Pero SÍ puedes aquí porque ERES el owner
     */
    function mint(address to, uint256 amount) public onlyOwner returns (bool) {
        require(to != address(0), "Cannot mint to zero address");
        require(amount > 0, "Amount must be greater than 0");
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
        
        return true;
    }
    
    /**
     * Quemar tokens (reducir supply)
     */
    function burn(uint256 amount) public returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
        
        return true;
    }
    
    /**
     * Transferir tokens (IGUAL QUE USDT REAL)
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
        
        return true;
    }
    
    /**
     * Transferir en nombre de otro (después de approve)
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(from != address(0), "Cannot transfer from zero address");
        require(to != address(0), "Cannot transfer to zero address");
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        
        return true;
    }
    
    /**
     * Aprobar a otro para gastar tokens
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        
        return true;
    }
    
    /**
     * Aumentar allowance
     */
    function increaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        
        allowance[msg.sender][spender] += amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Disminuir allowance
     */
    function decreaseAllowance(address spender, uint256 amount) public returns (bool) {
        require(spender != address(0), "Cannot approve zero address");
        require(allowance[msg.sender][spender] >= amount, "Decreased allowance below zero");
        
        allowance[msg.sender][spender] -= amount;
        emit Approval(msg.sender, spender, allowance[msg.sender][spender]);
        
        return true;
    }
    
    /**
     * Ver balance de una dirección
     */
    function balanceOfAddress(address account) public view returns (uint256) {
        return balanceOf[account];
    }
    
    /**
     * Ver total supply
     */
    function getTotalSupply() public view returns (uint256) {
        return totalSupply;
    }
    
    /**
     * Cambiar owner (transferir ownership)
     */
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Cannot transfer to zero address");
        
        address previousOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(previousOwner, newOwner);
    }
    
    /**
     * Función de fallback
     */
    receive() external payable {
        revert("This contract does not accept ETH");
    }
}







