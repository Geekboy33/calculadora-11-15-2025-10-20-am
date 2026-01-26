// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║     ██████╗ ██████╗ ██╗ ██████╗███████╗     ██████╗ ██████╗  █████╗  ██████╗██╗     ███████╗     ║
 * ║     ██╔══██╗██╔══██╗██║██╔════╝██╔════╝    ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝     ║
 * ║     ██████╔╝██████╔╝██║██║     █████╗      ██║   ██║██████╔╝███████║██║     ██║     █████╗       ║
 * ║     ██╔═══╝ ██╔══██╗██║██║     ██╔══╝      ██║   ██║██╔══██╗██╔══██║██║     ██║     ██╔══╝       ║
 * ║     ██║     ██║  ██║██║╚██████╗███████╗    ╚██████╔╝██║  ██║██║  ██║╚██████╗███████╗███████╗     ║
 * ║     ╚═╝     ╚═╝  ╚═╝╚═╝ ╚═════╝╚══════╝     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝     ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  PriceOracle v3.0 - DCB Treasury Price Feed System                                               ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  🔗 LUSD Contract: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99                                    ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 1005)                                                 ║
 * ║  💰 LUSD Price: $1.00 USD (Pegged Stablecoin)                                                    ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  FEATURES:                                                                                       ║
 * ║  ├─ 📊 Multi-token Price Support                                                                 ║
 * ║  ├─ 🔄 Chainlink-compatible Interface                                                            ║
 * ║  ├─ ⏱️  Heartbeat Monitoring & Staleness Detection                                                ║
 * ║  ├─ 📈 Historical Price Tracking                                                                 ║
 * ║  ├─ 🛡️  Multi-updater Security                                                                   ║
 * ║  ├─ ⚠️  Price Deviation Alerts                                                                    ║
 * ║  ├─ 🔐 Emergency Mode Protection                                                                 ║
 * ║  └─ 📝 Comprehensive Audit Trail                                                                 ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 * 
 * @title PriceOracle - DCB Treasury Price Feed v3.0
 * @author DCB Treasury Team
 * @notice Professional price oracle for LUSD and other tokens
 * @dev Chainlink-compatible interface with multi-token support
 * @custom:security-contact security@dcbtreasury.com
 * @custom:version 3.0.0
 */

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      CHAINLINK AGGREGATOR INTERFACE                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

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

contract PriceOracle is AggregatorV3Interface {
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              CONSTANTS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract version
    string public constant VERSION = "3.0.0";
    
    /// @notice Official LUSD contract address
    address public constant LUSD_CONTRACT = 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99;
    
    /// @notice Fixed LUSD price ($1.00 with 8 decimals)
    int256 public constant LUSD_FIXED_PRICE = 1_00000000;
    
    /// @notice Price decimals (Chainlink standard)
    uint8 public constant PRICE_DECIMALS = 8;
    
    /// @notice Maximum price deviation threshold (1% = 100 basis points)
    uint256 public constant MAX_DEVIATION_BPS = 100;
    
    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               STRUCTS                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Price data structure
    struct PriceData {
        int256 price;
        uint256 timestamp;
        uint80 roundId;
        bool isValid;
        address updater;
    }
    
    /// @notice Token configuration
    struct TokenConfig {
        string symbol;
        string name;
        uint8 tokenDecimals;
        int256 fixedPrice;      // 0 = use dynamic price
        bool isStablecoin;
        bool isActive;
        uint256 heartbeat;
        uint256 deviationThreshold;
        address externalFeed;   // Optional external Chainlink feed
    }
    
    /// @notice Price history entry
    struct PriceHistory {
        int256 price;
        uint256 timestamp;
        uint80 roundId;
        address updater;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                            STATE VARIABLES                                ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Contract admin
    address public admin;
    
    /// @notice Pending admin for 2-step transfer
    address public pendingAdmin;
    
    /// @notice Contract paused state
    bool public paused;
    
    /// @notice Emergency mode
    bool public emergencyMode;
    
    /// @notice Current round ID
    uint80 public currentRoundId;
    
    /// @notice Total price updates
    uint256 public totalUpdates;
    
    /// @notice Deployment timestamp
    uint256 public immutable deployedAt;
    
    /// @notice Default heartbeat (24 hours)
    uint256 public defaultHeartbeat;
    
    /// @notice Maximum history entries per token
    uint256 public maxHistoryLength;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              MAPPINGS                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Price updaters
    mapping(address => bool) public updaters;
    
    /// @notice Token configurations
    mapping(address => TokenConfig) public tokenConfigs;
    
    /// @notice Current prices by token
    mapping(address => PriceData) public prices;
    
    /// @notice Price history by token
    mapping(address => PriceHistory[]) public priceHistory;
    
    /// @notice Registered tokens list
    address[] public registeredTokens;
    
    /// @notice Token registered flag
    mapping(address => bool) public isTokenRegistered;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               EVENTS                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Price updated event
    event PriceUpdated(
        address indexed token,
        int256 oldPrice,
        int256 newPrice,
        uint80 roundId,
        address indexed updater,
        uint256 timestamp
    );
    
    /// @notice Token registered event
    event TokenRegistered(
        address indexed token,
        string symbol,
        bool isStablecoin,
        int256 fixedPrice,
        address indexed registeredBy
    );
    
    /// @notice Token configuration updated
    event TokenConfigUpdated(
        address indexed token,
        uint256 heartbeat,
        uint256 deviationThreshold,
        address indexed updatedBy
    );
    
    /// @notice Price deviation alert
    event PriceDeviationAlert(
        address indexed token,
        int256 expectedPrice,
        int256 actualPrice,
        uint256 deviationBps,
        uint256 timestamp
    );
    
    /// @notice Updater events
    event UpdaterAdded(address indexed updater, address indexed addedBy);
    event UpdaterRemoved(address indexed updater, address indexed removedBy);
    
    /// @notice Admin events
    event AdminTransferInitiated(address indexed currentAdmin, address indexed pendingAdmin);
    event AdminTransferCompleted(address indexed previousAdmin, address indexed newAdmin);
    
    /// @notice State events
    event Paused(address indexed pausedBy, uint256 timestamp);
    event Unpaused(address indexed unpausedBy, uint256 timestamp);
    event EmergencyModeActivated(address indexed activatedBy, uint256 timestamp);
    event EmergencyModeDeactivated(address indexed deactivatedBy, uint256 timestamp);
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                               ERRORS                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    error Unauthorized();
    error ZeroAddress();
    error InvalidPrice();
    error TokenNotRegistered();
    error TokenAlreadyRegistered();
    error ContractPaused();
    error EmergencyModeActive();
    error StalePrice();
    error PriceDeviationTooHigh();
    error InvalidHeartbeat();
    error NoPendingAdmin();
    error NotPendingAdmin();
    error AlreadyUpdater();
    error NotUpdater();
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              MODIFIERS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }
    
    modifier onlyUpdater() {
        if (!updaters[msg.sender] && msg.sender != admin) revert Unauthorized();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }
    
    modifier notEmergency() {
        if (emergencyMode) revert EmergencyModeActive();
        _;
    }
    
    modifier tokenExists(address token) {
        if (!isTokenRegistered[token]) revert TokenNotRegistered();
        _;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                             CONSTRUCTOR                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Deploys the PriceOracle contract
     * @dev Automatically registers LUSD with fixed $1.00 price
     */
    constructor() {
        admin = msg.sender;
        updaters[msg.sender] = true;
        deployedAt = block.timestamp;
        defaultHeartbeat = 86400; // 24 hours
        maxHistoryLength = 100;
        currentRoundId = 1;
        
        // Auto-register LUSD with fixed $1.00 price
        _registerToken(
            LUSD_CONTRACT,
            "LUSD",
            "Lemon USD",
            6,
            LUSD_FIXED_PRICE,
            true,
            86400,
            0,
            address(0)
        );
        
        // Set initial LUSD price
        prices[LUSD_CONTRACT] = PriceData({
            price: LUSD_FIXED_PRICE,
            timestamp: block.timestamp,
            roundId: currentRoundId,
            isValid: true,
            updater: msg.sender
        });
        
        emit AdminTransferCompleted(address(0), msg.sender);
        emit UpdaterAdded(msg.sender, address(0));
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                    CHAINLINK AGGREGATOR INTERFACE                         ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Returns price decimals
     * @return Number of decimals (8)
     */
    function decimals() external pure override returns (uint8) {
        return PRICE_DECIMALS;
    }
    
    /**
     * @notice Returns oracle description
     * @return Description string
     */
    function description() external pure override returns (string memory) {
        return "DCB Treasury Price Oracle v3.0 - LUSD/USD";
    }
    
    /**
     * @notice Returns oracle version
     * @return Version number
     */
    function version() external pure override returns (uint256) {
        return 3;
    }
    
    /**
     * @notice Gets round data for LUSD
     * @param _roundId Round ID to query
     * @return roundId The round ID
     * @return answer The price
     * @return startedAt Round start timestamp
     * @return updatedAt Last update timestamp
     * @return answeredInRound Round when answer was computed
     */
    function getRoundData(uint80 _roundId) 
        external 
        view 
        override 
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) 
    {
        // For stablecoin, always return fixed price
        PriceData memory data = prices[LUSD_CONTRACT];
        return (
            _roundId,
            LUSD_FIXED_PRICE,
            data.timestamp,
            data.timestamp,
            _roundId
        );
    }
    
    /**
     * @notice Gets latest round data for LUSD
     * @return roundId Current round ID
     * @return answer Current price ($1.00)
     * @return startedAt Round start timestamp
     * @return updatedAt Last update timestamp
     * @return answeredInRound Round when answer was computed
     */
    function latestRoundData() 
        external 
        view 
        override 
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) 
    {
        PriceData memory data = prices[LUSD_CONTRACT];
        return (
            currentRoundId,
            LUSD_FIXED_PRICE,
            data.timestamp,
            block.timestamp, // Always fresh for stablecoin
            currentRoundId
        );
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         PRICE QUERY FUNCTIONS                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Gets the price of LUSD
     * @return price Current price ($1.00 with 8 decimals)
     * @return timestamp Last update timestamp
     * @return isStale Whether price is stale
     */
    function getLUSDPrice() 
        external 
        view 
        returns (int256 price, uint256 timestamp, bool isStale) 
    {
        return (LUSD_FIXED_PRICE, block.timestamp, false);
    }
    
    /**
     * @notice Gets price for any registered token
     * @param token Token address
     * @return price Current price
     * @return timestamp Last update timestamp
     * @return isStale Whether price is stale
     */
    function getTokenPrice(address token) 
        external 
        view 
        tokenExists(token)
        returns (int256 price, uint256 timestamp, bool isStale) 
    {
        TokenConfig memory config = tokenConfigs[token];
        PriceData memory data = prices[token];
        
        // Stablecoins always return fixed price
        if (config.isStablecoin && config.fixedPrice > 0) {
            return (config.fixedPrice, block.timestamp, false);
        }
        
        // Check staleness for dynamic prices
        isStale = (block.timestamp - data.timestamp) > config.heartbeat;
        return (data.price, data.timestamp, isStale);
    }
    
    /**
     * @notice Gets latest price (simplified)
     * @param token Token address
     * @return Current price
     */
    function latestPrice(address token) external view returns (int256) {
        if (!isTokenRegistered[token]) {
            if (token == LUSD_CONTRACT) return LUSD_FIXED_PRICE;
            revert TokenNotRegistered();
        }
        
        TokenConfig memory config = tokenConfigs[token];
        if (config.isStablecoin && config.fixedPrice > 0) {
            return config.fixedPrice;
        }
        
        return prices[token].price;
    }
    
    /**
     * @notice Gets price formatted as USD string
     * @param token Token address
     * @return Formatted price string
     */
    function getPriceFormatted(address token) external view returns (string memory) {
        if (token == LUSD_CONTRACT || (isTokenRegistered[token] && tokenConfigs[token].isStablecoin)) {
            return "$1.00 USD";
        }
        return "Price varies";
    }
    
    /**
     * @notice Checks if price is fresh
     * @param token Token address
     * @return True if price is not stale
     */
    function isPriceFresh(address token) external view tokenExists(token) returns (bool) {
        TokenConfig memory config = tokenConfigs[token];
        
        // Stablecoins are always fresh
        if (config.isStablecoin) return true;
        
        PriceData memory data = prices[token];
        return (block.timestamp - data.timestamp) <= config.heartbeat;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         PRICE UPDATE FUNCTIONS                            ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Updates price for a token
     * @param token Token address
     * @param newPrice New price (8 decimals)
     */
    function updatePrice(address token, int256 newPrice) 
        external 
        onlyUpdater 
        whenNotPaused 
        notEmergency 
        tokenExists(token) 
    {
        if (newPrice <= 0) revert InvalidPrice();
        
        TokenConfig memory config = tokenConfigs[token];
        PriceData storage data = prices[token];
        
        // Skip update for fixed-price stablecoins
        if (config.isStablecoin && config.fixedPrice > 0) {
            return;
        }
        
        // Check deviation if threshold is set
        if (config.deviationThreshold > 0 && data.price > 0) {
            uint256 deviation = _calculateDeviation(data.price, newPrice);
            if (deviation > config.deviationThreshold) {
                emit PriceDeviationAlert(token, data.price, newPrice, deviation, block.timestamp);
                if (deviation > MAX_DEVIATION_BPS * 10) {
                    revert PriceDeviationTooHigh();
                }
            }
        }
        
        int256 oldPrice = data.price;
        currentRoundId++;
        
        // Update price
        data.price = newPrice;
        data.timestamp = block.timestamp;
        data.roundId = currentRoundId;
        data.isValid = true;
        data.updater = msg.sender;
        
        // Add to history
        _addToHistory(token, newPrice, currentRoundId, msg.sender);
        
        totalUpdates++;
        
        emit PriceUpdated(token, oldPrice, newPrice, currentRoundId, msg.sender, block.timestamp);
    }
    
    /**
     * @notice Batch update prices
     * @param tokens Token addresses
     * @param newPrices New prices
     */
    function updatePricesBatch(address[] calldata tokens, int256[] calldata newPrices) 
        external 
        onlyUpdater 
        whenNotPaused 
        notEmergency 
    {
        require(tokens.length == newPrices.length, "Length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (isTokenRegistered[tokens[i]] && newPrices[i] > 0) {
                TokenConfig memory config = tokenConfigs[tokens[i]];
                
                // Skip stablecoins with fixed prices
                if (config.isStablecoin && config.fixedPrice > 0) continue;
                
                PriceData storage data = prices[tokens[i]];
                int256 oldPrice = data.price;
                currentRoundId++;
                
                data.price = newPrices[i];
                data.timestamp = block.timestamp;
                data.roundId = currentRoundId;
                data.isValid = true;
                data.updater = msg.sender;
                
                _addToHistory(tokens[i], newPrices[i], currentRoundId, msg.sender);
                totalUpdates++;
                
                emit PriceUpdated(tokens[i], oldPrice, newPrices[i], currentRoundId, msg.sender, block.timestamp);
            }
        }
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                       TOKEN REGISTRATION                                  ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Registers a new token
     * @param token Token address
     * @param tokenSymbol Token symbol
     * @param tokenName Token name
     * @param tokenDecimals Token decimals
     * @param fixedPrice Fixed price (0 for dynamic)
     * @param isStablecoin Whether token is a stablecoin
     * @param heartbeat Price heartbeat in seconds
     * @param deviationThreshold Max deviation in basis points
     * @param externalFeed Optional external Chainlink feed
     */
    function registerToken(
        address token,
        string calldata tokenSymbol,
        string calldata tokenName,
        uint8 tokenDecimals,
        int256 fixedPrice,
        bool isStablecoin,
        uint256 heartbeat,
        uint256 deviationThreshold,
        address externalFeed
    ) external onlyAdmin {
        if (token == address(0)) revert ZeroAddress();
        if (isTokenRegistered[token]) revert TokenAlreadyRegistered();
        
        _registerToken(
            token,
            tokenSymbol,
            tokenName,
            tokenDecimals,
            fixedPrice,
            isStablecoin,
            heartbeat > 0 ? heartbeat : defaultHeartbeat,
            deviationThreshold,
            externalFeed
        );
        
        // Set initial price
        int256 initialPrice = fixedPrice > 0 ? fixedPrice : LUSD_FIXED_PRICE;
        prices[token] = PriceData({
            price: initialPrice,
            timestamp: block.timestamp,
            roundId: currentRoundId,
            isValid: true,
            updater: msg.sender
        });
        
        emit TokenRegistered(token, tokenSymbol, isStablecoin, fixedPrice, msg.sender);
    }
    
    /**
     * @notice Updates token configuration
     * @param token Token address
     * @param heartbeat New heartbeat
     * @param deviationThreshold New deviation threshold
     */
    function updateTokenConfig(
        address token,
        uint256 heartbeat,
        uint256 deviationThreshold
    ) external onlyAdmin tokenExists(token) {
        if (heartbeat == 0) revert InvalidHeartbeat();
        
        tokenConfigs[token].heartbeat = heartbeat;
        tokenConfigs[token].deviationThreshold = deviationThreshold;
        
        emit TokenConfigUpdated(token, heartbeat, deviationThreshold, msg.sender);
    }
    
    /**
     * @notice Deactivates a token
     * @param token Token address
     */
    function deactivateToken(address token) external onlyAdmin tokenExists(token) {
        // Cannot deactivate LUSD
        require(token != LUSD_CONTRACT, "Cannot deactivate LUSD");
        tokenConfigs[token].isActive = false;
    }
    
    /**
     * @notice Reactivates a token
     * @param token Token address
     */
    function reactivateToken(address token) external onlyAdmin tokenExists(token) {
        tokenConfigs[token].isActive = true;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                         ADMIN FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Initiates admin transfer
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        pendingAdmin = newAdmin;
        emit AdminTransferInitiated(admin, newAdmin);
    }
    
    /**
     * @notice Accepts admin transfer
     */
    function acceptAdmin() external {
        if (pendingAdmin == address(0)) revert NoPendingAdmin();
        if (msg.sender != pendingAdmin) revert NotPendingAdmin();
        
        address previousAdmin = admin;
        admin = pendingAdmin;
        pendingAdmin = address(0);
        
        emit AdminTransferCompleted(previousAdmin, admin);
    }
    
    /**
     * @notice Adds a price updater
     * @param updater Updater address
     */
    function addUpdater(address updater) external onlyAdmin {
        if (updater == address(0)) revert ZeroAddress();
        if (updaters[updater]) revert AlreadyUpdater();
        
        updaters[updater] = true;
        emit UpdaterAdded(updater, msg.sender);
    }
    
    /**
     * @notice Removes a price updater
     * @param updater Updater address
     */
    function removeUpdater(address updater) external onlyAdmin {
        if (!updaters[updater]) revert NotUpdater();
        
        updaters[updater] = false;
        emit UpdaterRemoved(updater, msg.sender);
    }
    
    /**
     * @notice Sets default heartbeat
     * @param heartbeat New default heartbeat
     */
    function setDefaultHeartbeat(uint256 heartbeat) external onlyAdmin {
        if (heartbeat == 0) revert InvalidHeartbeat();
        defaultHeartbeat = heartbeat;
    }
    
    /**
     * @notice Pauses the contract
     */
    function pause() external onlyAdmin {
        paused = true;
        emit Paused(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyAdmin {
        paused = false;
        emit Unpaused(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Activates emergency mode
     */
    function activateEmergencyMode() external onlyAdmin {
        emergencyMode = true;
        paused = true;
        emit EmergencyModeActivated(msg.sender, block.timestamp);
    }
    
    /**
     * @notice Deactivates emergency mode
     */
    function deactivateEmergencyMode() external onlyAdmin {
        emergencyMode = false;
        emit EmergencyModeDeactivated(msg.sender, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                          VIEW FUNCTIONS                                   ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Gets all registered tokens
     * @return Array of token addresses
     */
    function getRegisteredTokens() external view returns (address[] memory) {
        return registeredTokens;
    }
    
    /**
     * @notice Gets token count
     * @return Number of registered tokens
     */
    function getTokenCount() external view returns (uint256) {
        return registeredTokens.length;
    }
    
    /**
     * @notice Gets price history for a token
     * @param token Token address
     * @param count Number of entries to return
     * @return Array of price history entries
     */
    function getPriceHistory(address token, uint256 count) 
        external 
        view 
        tokenExists(token) 
        returns (PriceHistory[] memory) 
    {
        PriceHistory[] storage history = priceHistory[token];
        uint256 length = history.length;
        
        if (count > length) count = length;
        
        PriceHistory[] memory result = new PriceHistory[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = history[length - count + i];
        }
        
        return result;
    }
    
    /**
     * @notice Gets oracle statistics
     * @return _totalUpdates Total price updates
     * @return _tokenCount Number of registered tokens
     * @return _currentRoundId Current round ID
     * @return _deployedAt Deployment timestamp
     */
    function getStatistics() external view returns (
        uint256 _totalUpdates,
        uint256 _tokenCount,
        uint80 _currentRoundId,
        uint256 _deployedAt
    ) {
        return (totalUpdates, registeredTokens.length, currentRoundId, deployedAt);
    }
    
    /**
     * @notice Checks if address is an updater
     * @param account Address to check
     * @return True if updater
     */
    function isUpdater(address account) external view returns (bool) {
        return updaters[account];
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        INTERNAL FUNCTIONS                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Internal token registration
     */
    function _registerToken(
        address token,
        string memory tokenSymbol,
        string memory tokenName,
        uint8 tokenDecimals,
        int256 fixedPrice,
        bool isStablecoin,
        uint256 heartbeat,
        uint256 deviationThreshold,
        address externalFeed
    ) internal {
        tokenConfigs[token] = TokenConfig({
            symbol: tokenSymbol,
            name: tokenName,
            tokenDecimals: tokenDecimals,
            fixedPrice: fixedPrice,
            isStablecoin: isStablecoin,
            isActive: true,
            heartbeat: heartbeat,
            deviationThreshold: deviationThreshold,
            externalFeed: externalFeed
        });
        
        registeredTokens.push(token);
        isTokenRegistered[token] = true;
    }
    
    /**
     * @notice Adds price to history
     */
    function _addToHistory(
        address token,
        int256 price,
        uint80 roundId,
        address updater
    ) internal {
        PriceHistory[] storage history = priceHistory[token];
        
        // Limit history size
        if (history.length >= maxHistoryLength) {
            // Remove oldest entry by shifting
            for (uint256 i = 0; i < history.length - 1; i++) {
                history[i] = history[i + 1];
            }
            history.pop();
        }
        
        history.push(PriceHistory({
            price: price,
            timestamp: block.timestamp,
            roundId: roundId,
            updater: updater
        }));
    }
    
    /**
     * @notice Calculates price deviation in basis points
     */
    function _calculateDeviation(int256 oldPrice, int256 newPrice) internal pure returns (uint256) {
        if (oldPrice == 0) return 0;
        
        int256 diff = newPrice > oldPrice ? newPrice - oldPrice : oldPrice - newPrice;
        return uint256(diff * int256(BPS_DENOMINATOR) / oldPrice);
    }
}
