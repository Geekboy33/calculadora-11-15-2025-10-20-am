// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║     ███╗   ███╗██╗   ██╗██╗  ████████╗██╗      ██████╗ ██████╗  █████╗  ██████╗██╗     ███████╗  ║
 * ║     ████╗ ████║██║   ██║██║  ╚══██╔══╝██║     ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝  ║
 * ║     ██╔████╔██║██║   ██║██║     ██║   ██║     ██║   ██║██████╔╝███████║██║     ██║     █████╗    ║
 * ║     ██║╚██╔╝██║██║   ██║██║     ██║   ██║     ██║   ██║██╔══██╗██╔══██║██║     ██║     ██╔══╝    ║
 * ║     ██║ ╚═╝ ██║╚██████╔╝███████╗██║   ██║     ╚██████╔╝██║  ██║██║  ██║╚██████╗███████╗███████╗  ║
 * ║     ╚═╝     ╚═╝ ╚═════╝ ╚══════╝╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝  ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  🔮 MULTI-STABLECOIN PRICE ORACLE                                                                ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                  ║
 * ║  📊 SUPPORTED STABLECOINS:                                                                       ║
 * ║  ├─ 💵 USDT (Tether USD)                                                                         ║
 * ║  ├─ 💵 USDC (USD Coin)                                                                           ║
 * ║  ├─ 💵 VUSD (Venus USD)                                                                          ║
 * ║  ├─ 💵 LUSD (Lemon USD)                                                                          ║
 * ║  ├─ 💵 DAI (MakerDAO DAI)                                                                        ║
 * ║  ├─ 💵 FRAX (Frax)                                                                               ║
 * ║  └─ 💵 TUSD (TrueUSD)                                                                            ║
 * ║                                                                                                  ║
 * ║  🎯 TARGET PRICE: $1.00 USD                                                                      ║
 * ║                                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title MultiStablecoinOracle
 * @author Digital Commercial Bank Ltd
 * @notice Oracle contract for tracking multiple stablecoin prices
 * @dev Provides weighted average price and individual stablecoin health checks
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract MultiStablecoinOracle is AccessControl, Pausable {
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              CONSTANTS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    string public constant VERSION = "1.0.0";
    
    /// @notice Target price (1 USD = 1,000,000 with 6 decimals)
    uint256 public constant TARGET_PRICE = 1e6;
    
    /// @notice Price decimals
    uint8 public constant PRICE_DECIMALS = 6;
    
    /// @notice Maximum deviation for healthy stablecoin (2% = 200 basis points)
    uint256 public constant MAX_HEALTHY_DEVIATION_BPS = 200;
    
    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    /// @notice Maximum staleness for price (24 hours)
    uint256 public constant MAX_PRICE_STALENESS = 24 hours;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              ROLES                                        ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    bytes32 public constant PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE");
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              STRUCTS                                      ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    struct StablecoinFeed {
        string symbol;              // Token symbol
        string name;                // Full name
        address tokenAddress;       // Token contract address (if on-chain)
        uint256 price;              // Current price (6 decimals)
        uint256 lastUpdate;         // Last update timestamp
        uint256 weight;             // Weight in average (out of 100)
        bool isActive;              // Is feed active
        bool isOnChain;             // Is token on LemonChain
        uint256 totalUpdates;       // Total price updates
        uint256 minPrice24h;        // Minimum price in 24h
        uint256 maxPrice24h;        // Maximum price in 24h
    }
    
    struct PriceUpdate {
        string symbol;
        uint256 oldPrice;
        uint256 newPrice;
        uint256 timestamp;
        address updatedBy;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                           STATE VARIABLES                                 ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /// @notice Mapping of symbol to feed data
    mapping(string => StablecoinFeed) public feeds;
    
    /// @notice Array of all symbols
    string[] public symbols;
    
    /// @notice Price update history
    PriceUpdate[] public priceHistory;
    
    /// @notice Maximum history entries
    uint256 public maxHistoryEntries = 1000;
    
    /// @notice Total weight assigned
    uint256 public totalWeight;
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                              EVENTS                                       ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    event FeedAdded(
        string indexed symbol,
        string name,
        address tokenAddress,
        uint256 weight,
        uint256 timestamp
    );
    
    event FeedUpdated(
        string indexed symbol,
        uint256 weight,
        bool isActive,
        uint256 timestamp
    );
    
    event PriceUpdated(
        string indexed symbol,
        uint256 oldPrice,
        uint256 newPrice,
        address indexed updatedBy,
        uint256 timestamp
    );
    
    event AveragePriceCalculated(
        uint256 averagePrice,
        uint256 activeFeeds,
        uint256 timestamp
    );
    
    event StablecoinHealthAlert(
        string indexed symbol,
        uint256 price,
        uint256 deviationBps,
        bool isHealthy,
        uint256 timestamp
    );
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                            CONSTRUCTOR                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PRICE_UPDATER_ROLE, _admin);
        _grantRole(ORACLE_ADMIN_ROLE, _admin);
        
        // Initialize default stablecoin feeds
        _initializeDefaultFeeds();
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        INITIALIZATION                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    function _initializeDefaultFeeds() internal {
        // USDT - Tether
        _addFeed("USDT", "Tether USD", address(0), 20, false);
        
        // USDC - USD Coin
        _addFeed("USDC", "USD Coin", address(0), 20, false);
        
        // LUSD - Lemon USD (Official on LemonChain)
        _addFeed("LUSD", "Lemon USD", 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99, 25, true);
        
        // VUSD - Venus USD
        _addFeed("VUSD", "Venus USD", address(0), 15, false);
        
        // DAI - MakerDAO
        _addFeed("DAI", "Dai Stablecoin", address(0), 10, false);
        
        // FRAX
        _addFeed("FRAX", "Frax", address(0), 5, false);
        
        // TUSD - TrueUSD
        _addFeed("TUSD", "TrueUSD", address(0), 5, false);
    }
    
    function _addFeed(
        string memory symbol,
        string memory name,
        address tokenAddress,
        uint256 weight,
        bool isOnChain
    ) internal {
        feeds[symbol] = StablecoinFeed({
            symbol: symbol,
            name: name,
            tokenAddress: tokenAddress,
            price: TARGET_PRICE,
            lastUpdate: block.timestamp,
            weight: weight,
            isActive: true,
            isOnChain: isOnChain,
            totalUpdates: 1,
            minPrice24h: TARGET_PRICE,
            maxPrice24h: TARGET_PRICE
        });
        
        symbols.push(symbol);
        totalWeight += weight;
        
        emit FeedAdded(symbol, name, tokenAddress, weight, block.timestamp);
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        PRICE UPDATE FUNCTIONS                             ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Updates price for a single stablecoin
     * @param symbol Token symbol
     * @param newPrice New price (6 decimals)
     */
    function updatePrice(string calldata symbol, uint256 newPrice) 
        external 
        onlyRole(PRICE_UPDATER_ROLE) 
        whenNotPaused 
    {
        require(feeds[symbol].lastUpdate > 0, "Feed does not exist");
        require(newPrice > 0, "Invalid price");
        require(feeds[symbol].isActive, "Feed not active");
        
        StablecoinFeed storage feed = feeds[symbol];
        uint256 oldPrice = feed.price;
        
        // Update price
        feed.price = newPrice;
        feed.lastUpdate = block.timestamp;
        feed.totalUpdates++;
        
        // Update 24h min/max
        if (newPrice < feed.minPrice24h) {
            feed.minPrice24h = newPrice;
        }
        if (newPrice > feed.maxPrice24h) {
            feed.maxPrice24h = newPrice;
        }
        
        // Record history
        if (priceHistory.length < maxHistoryEntries) {
            priceHistory.push(PriceUpdate({
                symbol: symbol,
                oldPrice: oldPrice,
                newPrice: newPrice,
                timestamp: block.timestamp,
                updatedBy: msg.sender
            }));
        }
        
        emit PriceUpdated(symbol, oldPrice, newPrice, msg.sender, block.timestamp);
        
        // Check health and emit alert if needed
        bool isHealthy = _isStablecoinHealthy(symbol);
        if (!isHealthy) {
            uint256 deviation = _calculateDeviation(newPrice);
            emit StablecoinHealthAlert(symbol, newPrice, deviation, false, block.timestamp);
        }
    }
    
    /**
     * @notice Batch updates prices for multiple stablecoins
     * @param _symbols Array of symbols
     * @param _prices Array of prices
     */
    function batchUpdatePrices(string[] calldata _symbols, uint256[] calldata _prices) 
        external 
        onlyRole(PRICE_UPDATER_ROLE) 
        whenNotPaused 
    {
        require(_symbols.length == _prices.length, "Length mismatch");
        require(_symbols.length <= 10, "Too many updates");
        
        for (uint256 i = 0; i < _symbols.length; i++) {
            if (feeds[_symbols[i]].lastUpdate > 0 && feeds[_symbols[i]].isActive && _prices[i] > 0) {
                StablecoinFeed storage feed = feeds[_symbols[i]];
                uint256 oldPrice = feed.price;
                
                feed.price = _prices[i];
                feed.lastUpdate = block.timestamp;
                feed.totalUpdates++;
                
                emit PriceUpdated(_symbols[i], oldPrice, _prices[i], msg.sender, block.timestamp);
            }
        }
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        PRICE QUERY FUNCTIONS                              ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Gets price for a specific stablecoin
     * @param symbol Token symbol
     * @return price Current price
     * @return decimals Price decimals
     * @return timestamp Last update timestamp
     */
    function getPrice(string calldata symbol) 
        external 
        view 
        returns (uint256 price, uint8 decimals, uint256 timestamp) 
    {
        require(feeds[symbol].lastUpdate > 0, "Feed does not exist");
        StablecoinFeed storage feed = feeds[symbol];
        return (feed.price, PRICE_DECIMALS, feed.lastUpdate);
    }
    
    /**
     * @notice Gets weighted average price from all active feeds
     * @return price Average price
     * @return decimals Price decimals
     */
    function getAveragePrice() external view returns (uint256 price, uint8 decimals) {
        uint256 weightedSum = 0;
        uint256 activeWeight = 0;
        
        for (uint256 i = 0; i < symbols.length; i++) {
            StablecoinFeed storage feed = feeds[symbols[i]];
            if (feed.isActive && !_isPriceStale(symbols[i])) {
                weightedSum += feed.price * feed.weight;
                activeWeight += feed.weight;
            }
        }
        
        if (activeWeight == 0) {
            return (TARGET_PRICE, PRICE_DECIMALS);
        }
        
        return (weightedSum / activeWeight, PRICE_DECIMALS);
    }
    
    /**
     * @notice Checks if a stablecoin is healthy (within acceptable deviation)
     * @param symbol Token symbol
     * @return isHealthy True if within acceptable range
     */
    function isStablecoinHealthy(string calldata symbol) external view returns (bool) {
        return _isStablecoinHealthy(symbol);
    }
    
    function _isStablecoinHealthy(string memory symbol) internal view returns (bool) {
        if (feeds[symbol].lastUpdate == 0) return false;
        if (!feeds[symbol].isActive) return false;
        if (_isPriceStale(symbol)) return false;
        
        uint256 deviation = _calculateDeviation(feeds[symbol].price);
        return deviation <= MAX_HEALTHY_DEVIATION_BPS;
    }
    
    function _calculateDeviation(uint256 price) internal pure returns (uint256) {
        if (price >= TARGET_PRICE) {
            return ((price - TARGET_PRICE) * BPS_DENOMINATOR) / TARGET_PRICE;
        } else {
            return ((TARGET_PRICE - price) * BPS_DENOMINATOR) / TARGET_PRICE;
        }
    }
    
    function _isPriceStale(string memory symbol) internal view returns (bool) {
        return block.timestamp - feeds[symbol].lastUpdate > MAX_PRICE_STALENESS;
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        ADMIN FUNCTIONS                                    ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Adds a new stablecoin feed
     */
    function addFeed(
        string calldata symbol,
        string calldata name,
        address tokenAddress,
        uint256 weight,
        bool isOnChain
    ) external onlyRole(ORACLE_ADMIN_ROLE) {
        require(feeds[symbol].lastUpdate == 0, "Feed already exists");
        require(weight > 0 && weight <= 100, "Invalid weight");
        
        _addFeed(symbol, name, tokenAddress, weight, isOnChain);
    }
    
    /**
     * @notice Updates feed configuration
     */
    function updateFeed(
        string calldata symbol,
        uint256 weight,
        bool isActive
    ) external onlyRole(ORACLE_ADMIN_ROLE) {
        require(feeds[symbol].lastUpdate > 0, "Feed does not exist");
        
        StablecoinFeed storage feed = feeds[symbol];
        
        // Update total weight
        totalWeight = totalWeight - feed.weight + weight;
        
        feed.weight = weight;
        feed.isActive = isActive;
        
        emit FeedUpdated(symbol, weight, isActive, block.timestamp);
    }
    
    /**
     * @notice Sets token address for a feed
     */
    function setTokenAddress(string calldata symbol, address tokenAddress) 
        external 
        onlyRole(ORACLE_ADMIN_ROLE) 
    {
        require(feeds[symbol].lastUpdate > 0, "Feed does not exist");
        feeds[symbol].tokenAddress = tokenAddress;
        feeds[symbol].isOnChain = tokenAddress != address(0);
    }
    
    function pause() external onlyRole(ORACLE_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ORACLE_ADMIN_ROLE) {
        _unpause();
    }
    
    // ╔═══════════════════════════════════════════════════════════════════════════╗
    // ║                        VIEW FUNCTIONS                                     ║
    // ╚═══════════════════════════════════════════════════════════════════════════╝
    
    /**
     * @notice Gets all feed symbols
     */
    function getAllSymbols() external view returns (string[] memory) {
        return symbols;
    }
    
    /**
     * @notice Gets feed details
     */
    function getFeed(string calldata symbol) external view returns (StablecoinFeed memory) {
        return feeds[symbol];
    }
    
    /**
     * @notice Gets all active feeds with prices
     */
    function getAllActivePrices() external view returns (
        string[] memory _symbols,
        uint256[] memory _prices,
        uint256[] memory _weights,
        bool[] memory _healthy
    ) {
        uint256 count = 0;
        for (uint256 i = 0; i < symbols.length; i++) {
            if (feeds[symbols[i]].isActive) count++;
        }
        
        _symbols = new string[](count);
        _prices = new uint256[](count);
        _weights = new uint256[](count);
        _healthy = new bool[](count);
        
        uint256 idx = 0;
        for (uint256 i = 0; i < symbols.length; i++) {
            if (feeds[symbols[i]].isActive) {
                _symbols[idx] = symbols[i];
                _prices[idx] = feeds[symbols[i]].price;
                _weights[idx] = feeds[symbols[i]].weight;
                _healthy[idx] = _isStablecoinHealthy(symbols[i]);
                idx++;
            }
        }
    }
    
    /**
     * @notice Gets oracle statistics
     */
    function getStatistics() external view returns (
        uint256 _totalFeeds,
        uint256 _activeFeeds,
        uint256 _totalWeight,
        uint256 _averagePrice,
        uint256 _healthyCount
    ) {
        uint256 activeCount = 0;
        uint256 healthyCount = 0;
        uint256 weightedSum = 0;
        uint256 activeWeight = 0;
        
        for (uint256 i = 0; i < symbols.length; i++) {
            StablecoinFeed storage feed = feeds[symbols[i]];
            if (feed.isActive) {
                activeCount++;
                if (_isStablecoinHealthy(symbols[i])) {
                    healthyCount++;
                }
                if (!_isPriceStale(symbols[i])) {
                    weightedSum += feed.price * feed.weight;
                    activeWeight += feed.weight;
                }
            }
        }
        
        uint256 avgPrice = activeWeight > 0 ? weightedSum / activeWeight : TARGET_PRICE;
        
        return (symbols.length, activeCount, totalWeight, avgPrice, healthyCount);
    }
    
    /**
     * @notice Gets recent price history
     */
    function getRecentHistory(uint256 count) external view returns (PriceUpdate[] memory) {
        uint256 len = priceHistory.length;
        if (count > len) count = len;
        
        PriceUpdate[] memory recent = new PriceUpdate[](count);
        for (uint256 i = 0; i < count; i++) {
            recent[i] = priceHistory[len - count + i];
        }
        return recent;
    }
}
