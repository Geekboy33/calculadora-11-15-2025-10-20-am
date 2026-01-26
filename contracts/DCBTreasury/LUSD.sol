// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title LUSD - Lemon USD Stablecoin
 * @notice Collateral-backed stablecoin for DCB Treasury Platform
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 * @author DCB Treasury Team
 * 
 * This contract implements:
 * - Role-based minting and burning
 * - Oracle price feed integration
 * - Collateral ratio tracking
 * - Compliance controls
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ORACLE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface IOracle {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function decimals() external view returns (uint8);
}

contract LUSD {
    // ─────────────────────────────────────────────────────────────────────────────
    // TOKEN METADATA
    // ─────────────────────────────────────────────────────────────────────────────
    string public name = "Lemon USD";
    string public symbol = "LUSD";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ERC-20 STATE
    // ─────────────────────────────────────────────────────────────────────────────
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ACCESS CONTROL
    // ─────────────────────────────────────────────────────────────────────────────
    address public admin;
    
    // Role definitions
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    mapping(bytes32 => mapping(address => bool)) private _roles;
    mapping(address => bool) public whitelist;
    bool public whitelistEnabled;
    bool public paused;
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ORACLE CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────────────
    IOracle public priceOracle;
    uint256 public oracleHeartbeat = 86400; // 24 hours
    bool public oracleEnabled;
    int256 public fallbackPrice = 100000000; // $1.00 with 8 decimals
    
    // ─────────────────────────────────────────────────────────────────────────────
    // COLLATERAL TRACKING
    // ─────────────────────────────────────────────────────────────────────────────
    uint256 public totalCollateral;
    uint256 public minCollateralRatio = 10000; // 100% (basis points)
    
    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event WhitelistUpdated(address indexed account, bool status);
    event WhitelistToggled(bool enabled);
    event Paused(address account);
    event Unpaused(address account);
    event OracleUpdated(address indexed oracle);
    event CollateralUpdated(uint256 newTotal);
    event Minted(address indexed to, uint256 amount, string mintReference);
    event Burned(address indexed from, uint256 amount, string burnReference);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "LUSD: caller is not admin");
        _;
    }
    
    modifier onlyRole(bytes32 role) {
        require(hasRole(role, msg.sender) || msg.sender == admin, "LUSD: missing role");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "LUSD: paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    constructor(address _admin) {
        require(_admin != address(0), "LUSD: admin is zero address");
        
        admin = _admin;
        
        // Grant all roles to admin
        _roles[MINTER_ROLE][_admin] = true;
        _roles[BURNER_ROLE][_admin] = true;
        _roles[PAUSER_ROLE][_admin] = true;
        _roles[OPERATOR_ROLE][_admin] = true;
        
        whitelist[_admin] = true;
        whitelistEnabled = false;
        paused = false;
        oracleEnabled = false;
        
        emit AdminTransferred(address(0), _admin);
        emit RoleGranted(MINTER_ROLE, _admin, address(0));
        emit RoleGranted(BURNER_ROLE, _admin, address(0));
        emit RoleGranted(PAUSER_ROLE, _admin, address(0));
        emit RoleGranted(OPERATOR_ROLE, _admin, address(0));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ERC-20 FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    function transfer(address to, uint256 value) public whenNotPaused returns (bool) {
        require(to != address(0), "LUSD: transfer to zero address");
        require(balanceOf[msg.sender] >= value, "LUSD: insufficient balance");
        
        if (whitelistEnabled) {
            require(whitelist[msg.sender], "LUSD: sender not whitelisted");
            require(whitelist[to], "LUSD: recipient not whitelisted");
        }
        
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        require(spender != address(0), "LUSD: approve to zero address");
        
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public whenNotPaused returns (bool) {
        require(from != address(0), "LUSD: transfer from zero address");
        require(to != address(0), "LUSD: transfer to zero address");
        require(balanceOf[from] >= value, "LUSD: insufficient balance");
        require(allowance[from][msg.sender] >= value, "LUSD: insufficient allowance");
        
        if (whitelistEnabled) {
            require(whitelist[from], "LUSD: sender not whitelisted");
            require(whitelist[to], "LUSD: recipient not whitelisted");
        }
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        
        emit Transfer(from, to, value);
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MINTING & BURNING
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Mint new LUSD tokens
     * @param to Recipient address
     * @param amount Amount to mint
     * @param mintReference External reference for audit
     */
    function mint(
        address to, 
        uint256 amount, 
        string memory mintReference
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "LUSD: mint to zero address");
        require(amount > 0, "LUSD: amount must be positive");
        
        if (whitelistEnabled) {
            require(whitelist[to], "LUSD: recipient not whitelisted");
        }
        
        // Check collateral ratio if collateral tracking is enabled
        if (totalCollateral > 0) {
            uint256 newSupply = totalSupply + amount;
            uint256 requiredCollateral = (newSupply * minCollateralRatio) / 10000;
            require(totalCollateral >= requiredCollateral, "LUSD: insufficient collateral");
        }
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Transfer(address(0), to, amount);
        emit Minted(to, amount, mintReference);
    }
    
    /**
     * @notice Mint without reference (simplified)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "LUSD: mint to zero address");
        require(amount > 0, "LUSD: amount must be positive");
        
        if (whitelistEnabled) {
            require(whitelist[to], "LUSD: recipient not whitelisted");
        }
        
        if (totalCollateral > 0) {
            uint256 newSupply = totalSupply + amount;
            uint256 requiredCollateral = (newSupply * minCollateralRatio) / 10000;
            require(totalCollateral >= requiredCollateral, "LUSD: insufficient collateral");
        }
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Transfer(address(0), to, amount);
        emit Minted(to, amount, "");
    }
    
    /**
     * @notice Burn LUSD tokens
     * @param from Address to burn from
     * @param amount Amount to burn
     * @param burnReference External reference for audit
     */
    function burn(
        address from, 
        uint256 amount, 
        string memory burnReference
    ) external onlyRole(BURNER_ROLE) {
        require(balanceOf[from] >= amount, "LUSD: burn exceeds balance");
        require(amount > 0, "LUSD: amount must be positive");
        
        totalSupply -= amount;
        balanceOf[from] -= amount;
        
        emit Transfer(from, address(0), amount);
        emit Burned(from, amount, burnReference);
    }
    
    /**
     * @notice Burn without reference (simplified)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        require(balanceOf[from] >= amount, "LUSD: burn exceeds balance");
        require(amount > 0, "LUSD: amount must be positive");
        
        totalSupply -= amount;
        balanceOf[from] -= amount;
        
        emit Transfer(from, address(0), amount);
        emit Burned(from, amount, "");
    }
    
    /**
     * @notice Burn own tokens
     * @param amount Amount to burn
     */
    function burnSelf(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "LUSD: burn exceeds balance");
        require(amount > 0, "LUSD: amount must be positive");
        
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
        emit Burned(msg.sender, amount, "self-burn");
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ORACLE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set the price oracle
     * @param _oracle Oracle address
     */
    function setOracle(address _oracle) external onlyAdmin {
        priceOracle = IOracle(_oracle);
        oracleEnabled = _oracle != address(0);
        emit OracleUpdated(_oracle);
    }
    
    /**
     * @notice Set oracle heartbeat
     * @param _heartbeat Max age in seconds
     */
    function setOracleHeartbeat(uint256 _heartbeat) external onlyAdmin {
        require(_heartbeat > 0, "LUSD: heartbeat must be positive");
        oracleHeartbeat = _heartbeat;
    }
    
    /**
     * @notice Set fallback price
     * @param _price Price with 8 decimals
     */
    function setFallbackPrice(int256 _price) external onlyAdmin {
        require(_price > 0, "LUSD: price must be positive");
        fallbackPrice = _price;
    }
    
    /**
     * @notice Get current price from oracle
     * @return price Current price
     * @return updatedAt Last update timestamp
     * @return isStale Whether price is stale
     */
    function getPrice() public view returns (int256 price, uint256 updatedAt, bool isStale) {
        if (!oracleEnabled || address(priceOracle) == address(0)) {
            return (fallbackPrice, block.timestamp, false);
        }
        
        try priceOracle.latestRoundData() returns (
            uint80,
            int256 answer,
            uint256,
            uint256 _updatedAt,
            uint80
        ) {
            isStale = (block.timestamp - _updatedAt) > oracleHeartbeat;
            return (answer, _updatedAt, isStale);
        } catch {
            return (fallbackPrice, block.timestamp, false);
        }
    }
    
    /**
     * @notice Get latest price (simplified)
     * @return Current price
     */
    function latestPrice() external view returns (int256) {
        (int256 price, , ) = getPrice();
        return price;
    }
    
    /**
     * @notice Convert LUSD to USDT equivalent
     * @param lusdAmount Amount in LUSD
     * @return usdtAmount Equivalent USDT
     */
    function convertToUSDT(uint256 lusdAmount) external view returns (uint256 usdtAmount) {
        (int256 price, , ) = getPrice();
        return (lusdAmount * uint256(price)) / 100000000;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // COLLATERAL MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Update total collateral (for tracking)
     * @param _amount New collateral amount
     */
    function updateCollateral(uint256 _amount) external onlyRole(OPERATOR_ROLE) {
        totalCollateral = _amount;
        emit CollateralUpdated(_amount);
    }
    
    /**
     * @notice Set minimum collateral ratio
     * @param _ratio Ratio in basis points (10000 = 100%)
     */
    function setMinCollateralRatio(uint256 _ratio) external onlyAdmin {
        require(_ratio >= 10000, "LUSD: ratio must be at least 100%");
        minCollateralRatio = _ratio;
    }
    
    /**
     * @notice Get current collateral ratio
     * @return Ratio in basis points
     */
    function getCollateralRatio() external view returns (uint256) {
        if (totalSupply == 0) return type(uint256).max;
        return (totalCollateral * 10000) / totalSupply;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ROLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if account has role
     * @param role Role identifier
     * @param account Address to check
     * @return True if has role
     */
    function hasRole(bytes32 role, address account) public view returns (bool) {
        return _roles[role][account];
    }
    
    /**
     * @notice Grant role to account
     * @param role Role identifier
     * @param account Address to grant to
     */
    function grantRole(bytes32 role, address account) external onlyAdmin {
        require(account != address(0), "LUSD: account is zero address");
        require(!_roles[role][account], "LUSD: role already granted");
        
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }
    
    /**
     * @notice Revoke role from account
     * @param role Role identifier
     * @param account Address to revoke from
     */
    function revokeRole(bytes32 role, address account) external onlyAdmin {
        require(_roles[role][account], "LUSD: role not granted");
        
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // WHITELIST MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Update whitelist status
     * @param account Address to update
     * @param status New status
     */
    function setWhitelist(address account, bool status) external onlyAdmin {
        require(account != address(0), "LUSD: account is zero address");
        whitelist[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    /**
     * @notice Batch update whitelist
     * @param accounts Addresses to update
     * @param status New status for all
     */
    function setWhitelistBatch(address[] calldata accounts, bool status) external onlyAdmin {
        for (uint256 i = 0; i < accounts.length; i++) {
            if (accounts[i] != address(0)) {
                whitelist[accounts[i]] = status;
                emit WhitelistUpdated(accounts[i], status);
            }
        }
    }
    
    /**
     * @notice Toggle whitelist enforcement
     * @param enabled Whether to enforce whitelist
     */
    function toggleWhitelist(bool enabled) external onlyAdmin {
        whitelistEnabled = enabled;
        emit WhitelistToggled(enabled);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PAUSE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Pause token transfers
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        require(!paused, "LUSD: already paused");
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @notice Unpause token transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        require(paused, "LUSD: not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if address is whitelisted
     * @param account Address to check
     * @return True if whitelisted
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelist[account];
    }
    
    /**
     * @notice Get contract info
     */
    function getInfo() external view returns (
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply,
        address _admin,
        bool _paused
    ) {
        return (name, symbol, decimals, totalSupply, admin, paused);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transfer admin role
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "LUSD: new admin is zero address");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }
}
