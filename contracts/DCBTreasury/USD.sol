// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title USD Token - DCB Treasury Certification Platform
 * @notice ERC-20 stablecoin with whitelist functionality and oracle price feed
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 * @author DCB Treasury Team
 * 
 * This contract implements a regulated USD stablecoin with:
 * - Whitelist-based transfer restrictions
 * - Minter role management
 * - Oracle integration for USD/USDT price feed
 * - Full ERC-20 compatibility
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CHAINLINK ORACLE INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════

interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USD TOKEN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract USD {
    // ─────────────────────────────────────────────────────────────────────────────
    // TOKEN METADATA
    // ─────────────────────────────────────────────────────────────────────────────
    string public name = "DCB USD";
    string public symbol = "USD";
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
    mapping(address => bool) public minters;
    mapping(address => bool) public whitelist;
    bool public whitelistEnabled;
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ORACLE CONFIGURATION
    // ─────────────────────────────────────────────────────────────────────────────
    AggregatorV3Interface public priceOracle;
    uint256 public oracleHeartbeat = 86400; // 24 hours default
    bool public oracleEnabled;
    
    // Fallback price if oracle is not available (1 USD = 1 USDT, 8 decimals)
    int256 public fallbackPrice = 100000000; // $1.00 with 8 decimals
    
    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event WhitelistUpdated(address indexed account, bool status);
    event WhitelistToggled(bool enabled);
    event OracleUpdated(address indexed oracle);
    event FallbackPriceUpdated(int256 price);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    modifier onlyAdmin() {
        require(msg.sender == admin, "USD: caller is not admin");
        _;
    }
    
    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == admin, "USD: caller is not minter");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    constructor() {
        admin = msg.sender;
        minters[msg.sender] = true;
        whitelist[msg.sender] = true;
        whitelistEnabled = false;
        oracleEnabled = false;
        
        emit AdminTransferred(address(0), msg.sender);
        emit MinterAdded(msg.sender);
        emit WhitelistUpdated(msg.sender, true);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ERC-20 FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transfer tokens to a specified address
     * @param to The address to transfer to
     * @param value The amount to transfer
     * @return success True if transfer succeeds
     */
    function transfer(address to, uint256 value) public returns (bool success) {
        require(to != address(0), "USD: transfer to zero address");
        require(balanceOf[msg.sender] >= value, "USD: insufficient balance");
        
        if (whitelistEnabled) {
            require(whitelist[msg.sender], "USD: sender not whitelisted");
            require(whitelist[to], "USD: recipient not whitelisted");
        }
        
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    /**
     * @notice Approve spender to transfer tokens on behalf of msg.sender
     * @param spender The address authorized to spend
     * @param value The max amount they can spend
     * @return success True if approval succeeds
     */
    function approve(address spender, uint256 value) public returns (bool success) {
        require(spender != address(0), "USD: approve to zero address");
        
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    /**
     * @notice Transfer tokens from one address to another
     * @param from The address to transfer from
     * @param to The address to transfer to
     * @param value The amount to transfer
     * @return success True if transfer succeeds
     */
    function transferFrom(address from, address to, uint256 value) public returns (bool success) {
        require(from != address(0), "USD: transfer from zero address");
        require(to != address(0), "USD: transfer to zero address");
        require(balanceOf[from] >= value, "USD: insufficient balance");
        require(allowance[from][msg.sender] >= value, "USD: insufficient allowance");
        
        if (whitelistEnabled) {
            require(whitelist[from], "USD: sender not whitelisted");
            require(whitelist[to], "USD: recipient not whitelisted");
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
     * @notice Mint new tokens to an address
     * @param to The address to mint to
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) external onlyMinter {
        require(to != address(0), "USD: mint to zero address");
        require(amount > 0, "USD: mint amount must be positive");
        
        if (whitelistEnabled) {
            require(whitelist[to], "USD: recipient not whitelisted");
        }
        
        totalSupply += amount;
        balanceOf[to] += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @notice Burn tokens from msg.sender
     * @param amount The amount to burn
     */
    function burn(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "USD: burn amount exceeds balance");
        require(amount > 0, "USD: burn amount must be positive");
        
        totalSupply -= amount;
        balanceOf[msg.sender] -= amount;
        
        emit Transfer(msg.sender, address(0), amount);
    }
    
    /**
     * @notice Burn tokens from an address (requires allowance)
     * @param from The address to burn from
     * @param amount The amount to burn
     */
    function burnFrom(address from, uint256 amount) external {
        require(balanceOf[from] >= amount, "USD: burn amount exceeds balance");
        require(allowance[from][msg.sender] >= amount, "USD: burn amount exceeds allowance");
        require(amount > 0, "USD: burn amount must be positive");
        
        allowance[from][msg.sender] -= amount;
        totalSupply -= amount;
        balanceOf[from] -= amount;
        
        emit Transfer(from, address(0), amount);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ORACLE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set the price oracle address
     * @param _oracle Address of the Chainlink-compatible price feed
     */
    function setOracle(address _oracle) external onlyAdmin {
        priceOracle = AggregatorV3Interface(_oracle);
        oracleEnabled = _oracle != address(0);
        emit OracleUpdated(_oracle);
    }
    
    /**
     * @notice Set the oracle heartbeat (max age of price data)
     * @param _heartbeat Maximum age in seconds
     */
    function setOracleHeartbeat(uint256 _heartbeat) external onlyAdmin {
        require(_heartbeat > 0, "USD: heartbeat must be positive");
        oracleHeartbeat = _heartbeat;
    }
    
    /**
     * @notice Set fallback price when oracle is unavailable
     * @param _price Price with 8 decimals (e.g., 100000000 = $1.00)
     */
    function setFallbackPrice(int256 _price) external onlyAdmin {
        require(_price > 0, "USD: price must be positive");
        fallbackPrice = _price;
        emit FallbackPriceUpdated(_price);
    }
    
    /**
     * @notice Get the current USD/USDT price from oracle
     * @return price The current price with 8 decimals
     * @return updatedAt Timestamp of the price update
     * @return isStale Whether the price is older than heartbeat
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
     * @notice Get the latest price (simplified)
     * @return The current USD/USDT price with 8 decimals
     */
    function latestPrice() external view returns (int256) {
        (int256 price, , ) = getPrice();
        return price;
    }
    
    /**
     * @notice Get oracle decimals
     * @return Number of decimals in price feed
     */
    function oracleDecimals() external view returns (uint8) {
        if (!oracleEnabled || address(priceOracle) == address(0)) {
            return 8; // Default Chainlink decimals
        }
        try priceOracle.decimals() returns (uint8 dec) {
            return dec;
        } catch {
            return 8;
        }
    }
    
    /**
     * @notice Convert USD amount to USDT equivalent
     * @param usdAmount Amount in USD (6 decimals)
     * @return usdtAmount Equivalent USDT amount (6 decimals)
     */
    function convertToUSDT(uint256 usdAmount) external view returns (uint256 usdtAmount) {
        (int256 price, , ) = getPrice();
        // price has 8 decimals, usdAmount has 6 decimals
        // Result should have 6 decimals
        // usdAmount * price / 10^8
        return (usdAmount * uint256(price)) / 100000000;
    }
    
    /**
     * @notice Convert USDT amount to USD equivalent
     * @param usdtAmount Amount in USDT (6 decimals)
     * @return usdAmount Equivalent USD amount (6 decimals)
     */
    function convertFromUSDT(uint256 usdtAmount) external view returns (uint256 usdAmount) {
        (int256 price, , ) = getPrice();
        // Inverse conversion
        return (usdtAmount * 100000000) / uint256(price);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ACCESS CONTROL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Add a new minter
     * @param minter Address to grant minting rights
     */
    function addMinter(address minter) external onlyAdmin {
        require(minter != address(0), "USD: minter is zero address");
        require(!minters[minter], "USD: already a minter");
        
        minters[minter] = true;
        emit MinterAdded(minter);
    }
    
    /**
     * @notice Remove a minter
     * @param minter Address to revoke minting rights
     */
    function removeMinter(address minter) external onlyAdmin {
        require(minters[minter], "USD: not a minter");
        
        minters[minter] = false;
        emit MinterRemoved(minter);
    }
    
    /**
     * @notice Update whitelist status for an address
     * @param account Address to update
     * @param status New whitelist status
     */
    function setWhitelist(address account, bool status) external onlyAdmin {
        require(account != address(0), "USD: account is zero address");
        
        whitelist[account] = status;
        emit WhitelistUpdated(account, status);
    }
    
    /**
     * @notice Batch update whitelist
     * @param accounts Array of addresses
     * @param status New whitelist status for all
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
     * @param enabled Whether whitelist is enforced
     */
    function toggleWhitelist(bool enabled) external onlyAdmin {
        whitelistEnabled = enabled;
        emit WhitelistToggled(enabled);
    }
    
    /**
     * @notice Transfer admin role to new address
     * @param newAdmin Address of new admin
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "USD: new admin is zero address");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if an address is a minter
     * @param account Address to check
     * @return True if account is a minter
     */
    function isMinter(address account) external view returns (bool) {
        return minters[account];
    }
    
    /**
     * @notice Check if an address is whitelisted
     * @param account Address to check
     * @return True if account is whitelisted
     */
    function isWhitelisted(address account) external view returns (bool) {
        return whitelist[account];
    }
    
    /**
     * @notice Get contract info
     * @return _name Token name
     * @return _symbol Token symbol
     * @return _decimals Token decimals
     * @return _totalSupply Total supply
     * @return _admin Admin address
     */
    function getInfo() external view returns (
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply,
        address _admin
    ) {
        return (name, symbol, decimals, totalSupply, admin);
    }
}
