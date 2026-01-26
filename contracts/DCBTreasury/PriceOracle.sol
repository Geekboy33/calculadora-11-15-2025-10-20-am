// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title PriceOracle - DCB Treasury Certification Platform
 * @notice Chainlink-compatible price oracle for USD/USDT rate
 * @dev Digital Commercial Bank Ltd - Lemon Chain
 * @author DCB Treasury Team
 * 
 * This contract implements:
 * - Chainlink AggregatorV3Interface compatibility
 * - Multi-source price aggregation
 * - Price deviation protection
 * - Manual price override capability
 */

contract PriceOracle {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public admin;
    
    // Oracle metadata
    string public description = "USD / USDT";
    uint8 public constant decimals = 8;
    uint256 public constant version = 1;
    
    // Price data
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }
    
    mapping(uint80 => RoundData) public rounds;
    uint80 public latestRoundId;
    
    // Price sources (for aggregation)
    address[] public priceSources;
    mapping(address => bool) public isPriceSource;
    mapping(address => int256) public sourceLatestPrice;
    mapping(address => uint256) public sourceLastUpdate;
    
    // Configuration
    uint256 public maxPriceDeviation = 100; // 1% in basis points
    uint256 public minSources = 1;
    uint256 public updateInterval = 3600; // 1 hour
    int256 public manualPrice; // For emergency override
    bool public useManualPrice;
    
    // Price bounds (sanity checks)
    int256 public minPrice = 99000000;  // $0.99 with 8 decimals
    int256 public maxPrice = 101000000; // $1.01 with 8 decimals
    
    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────
    
    event AnswerUpdated(
        int256 indexed current,
        uint256 indexed roundId,
        uint256 updatedAt
    );
    
    event NewRound(
        uint256 indexed roundId,
        address indexed startedBy,
        uint256 startedAt
    );
    
    event PriceSourceAdded(address indexed source);
    event PriceSourceRemoved(address indexed source);
    event SourcePriceUpdated(address indexed source, int256 price, uint256 timestamp);
    event ManualPriceSet(int256 price, bool enabled);
    event ConfigUpdated(string param, uint256 value);
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "PriceOracle: caller is not admin");
        _;
    }
    
    modifier onlyPriceSource() {
        require(isPriceSource[msg.sender] || msg.sender == admin, "PriceOracle: not a price source");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor() {
        admin = msg.sender;
        
        // Initialize with 1:1 price (USD = USDT)
        latestRoundId = 1;
        rounds[1] = RoundData({
            roundId: 1,
            answer: 100000000, // $1.00 with 8 decimals
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
        
        // Admin is default price source
        priceSources.push(msg.sender);
        isPriceSource[msg.sender] = true;
        
        emit AdminTransferred(address(0), msg.sender);
        emit PriceSourceAdded(msg.sender);
        emit AnswerUpdated(100000000, 1, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CHAINLINK AGGREGATOR V3 INTERFACE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get data from a specific round
     * @param _roundId Round ID to query
     * @return roundId The round ID
     * @return answer The price answer
     * @return startedAt Timestamp when round started
     * @return updatedAt Timestamp when round was updated
     * @return answeredInRound The round in which answer was computed
     */
    function getRoundData(uint80 _roundId) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        RoundData memory data = rounds[_roundId];
        return (
            data.roundId,
            data.answer,
            data.startedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }
    
    /**
     * @notice Get data from the latest round
     * @return roundId The round ID
     * @return answer The price answer
     * @return startedAt Timestamp when round started
     * @return updatedAt Timestamp when round was updated
     * @return answeredInRound The round in which answer was computed
     */
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        // Return manual price if enabled
        if (useManualPrice && manualPrice > 0) {
            return (
                latestRoundId,
                manualPrice,
                rounds[latestRoundId].startedAt,
                block.timestamp,
                latestRoundId
            );
        }
        
        RoundData memory data = rounds[latestRoundId];
        return (
            data.roundId,
            data.answer,
            data.startedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }
    
    /**
     * @notice Get the latest answer
     * @return The latest price
     */
    function latestAnswer() external view returns (int256) {
        if (useManualPrice && manualPrice > 0) {
            return manualPrice;
        }
        return rounds[latestRoundId].answer;
    }
    
    /**
     * @notice Get the latest timestamp
     * @return The latest update timestamp
     */
    function latestTimestamp() external view returns (uint256) {
        if (useManualPrice) {
            return block.timestamp;
        }
        return rounds[latestRoundId].updatedAt;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PRICE UPDATE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Submit a price from a price source
     * @param _price The price to submit (8 decimals)
     */
    function submitPrice(int256 _price) external onlyPriceSource {
        require(_price >= minPrice && _price <= maxPrice, "PriceOracle: price out of bounds");
        
        sourceLatestPrice[msg.sender] = _price;
        sourceLastUpdate[msg.sender] = block.timestamp;
        
        emit SourcePriceUpdated(msg.sender, _price, block.timestamp);
        
        // Try to update aggregated price
        _updateAggregatedPrice();
    }
    
    /**
     * @notice Force update the aggregated price (admin only)
     */
    function forceUpdate() external onlyAdmin {
        _updateAggregatedPrice();
    }
    
    /**
     * @notice Update price directly (admin only, bypasses aggregation)
     * @param _price New price (8 decimals)
     */
    function updatePriceDirect(int256 _price) external onlyAdmin {
        require(_price >= minPrice && _price <= maxPrice, "PriceOracle: price out of bounds");
        
        latestRoundId++;
        rounds[latestRoundId] = RoundData({
            roundId: latestRoundId,
            answer: _price,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: latestRoundId
        });
        
        emit NewRound(latestRoundId, msg.sender, block.timestamp);
        emit AnswerUpdated(_price, latestRoundId, block.timestamp);
    }
    
    function _updateAggregatedPrice() internal {
        // Check if we have enough recent sources
        uint256 validSources = 0;
        int256 totalPrice = 0;
        
        for (uint256 i = 0; i < priceSources.length; i++) {
            address source = priceSources[i];
            if (sourceLatestPrice[source] > 0 && 
                (block.timestamp - sourceLastUpdate[source]) <= updateInterval) {
                validSources++;
                totalPrice += sourceLatestPrice[source];
            }
        }
        
        if (validSources >= minSources) {
            int256 avgPrice = totalPrice / int256(validSources);
            
            // Check deviation from current price
            int256 currentPrice = rounds[latestRoundId].answer;
            int256 deviation = ((avgPrice - currentPrice) * 10000) / currentPrice;
            if (deviation < 0) deviation = -deviation;
            
            // Only update if within deviation or if forced
            if (uint256(deviation) <= maxPriceDeviation || currentPrice == 0) {
                // Validate bounds
                if (avgPrice >= minPrice && avgPrice <= maxPrice) {
                    latestRoundId++;
                    rounds[latestRoundId] = RoundData({
                        roundId: latestRoundId,
                        answer: avgPrice,
                        startedAt: block.timestamp,
                        updatedAt: block.timestamp,
                        answeredInRound: latestRoundId
                    });
                    
                    emit NewRound(latestRoundId, address(this), block.timestamp);
                    emit AnswerUpdated(avgPrice, latestRoundId, block.timestamp);
                }
            }
        }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // MANUAL PRICE OVERRIDE
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set manual price override (emergency use)
     * @param _price Manual price (8 decimals)
     * @param _enabled Whether to use manual price
     */
    function setManualPrice(int256 _price, bool _enabled) external onlyAdmin {
        require(_price >= minPrice && _price <= maxPrice, "PriceOracle: price out of bounds");
        
        manualPrice = _price;
        useManualPrice = _enabled;
        
        emit ManualPriceSet(_price, _enabled);
    }
    
    /**
     * @notice Disable manual price override
     */
    function disableManualPrice() external onlyAdmin {
        useManualPrice = false;
        emit ManualPriceSet(manualPrice, false);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // PRICE SOURCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Add a price source
     * @param _source Address of the price source
     */
    function addPriceSource(address _source) external onlyAdmin {
        require(_source != address(0), "PriceOracle: invalid address");
        require(!isPriceSource[_source], "PriceOracle: already a source");
        
        priceSources.push(_source);
        isPriceSource[_source] = true;
        
        emit PriceSourceAdded(_source);
    }
    
    /**
     * @notice Remove a price source
     * @param _source Address of the price source
     */
    function removePriceSource(address _source) external onlyAdmin {
        require(isPriceSource[_source], "PriceOracle: not a source");
        require(priceSources.length > minSources, "PriceOracle: cannot remove, below minimum");
        
        isPriceSource[_source] = false;
        
        // Remove from array
        for (uint256 i = 0; i < priceSources.length; i++) {
            if (priceSources[i] == _source) {
                priceSources[i] = priceSources[priceSources.length - 1];
                priceSources.pop();
                break;
            }
        }
        
        emit PriceSourceRemoved(_source);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set maximum price deviation
     * @param _deviation Deviation in basis points (100 = 1%)
     */
    function setMaxPriceDeviation(uint256 _deviation) external onlyAdmin {
        require(_deviation > 0 && _deviation <= 1000, "PriceOracle: invalid deviation");
        maxPriceDeviation = _deviation;
        emit ConfigUpdated("maxPriceDeviation", _deviation);
    }
    
    /**
     * @notice Set minimum sources required
     * @param _minSources Minimum number of sources
     */
    function setMinSources(uint256 _minSources) external onlyAdmin {
        require(_minSources > 0 && _minSources <= priceSources.length, "PriceOracle: invalid min sources");
        minSources = _minSources;
        emit ConfigUpdated("minSources", _minSources);
    }
    
    /**
     * @notice Set update interval
     * @param _interval Interval in seconds
     */
    function setUpdateInterval(uint256 _interval) external onlyAdmin {
        require(_interval >= 60, "PriceOracle: interval too short");
        updateInterval = _interval;
        emit ConfigUpdated("updateInterval", _interval);
    }
    
    /**
     * @notice Set price bounds
     * @param _minPrice Minimum valid price
     * @param _maxPrice Maximum valid price
     */
    function setPriceBounds(int256 _minPrice, int256 _maxPrice) external onlyAdmin {
        require(_minPrice > 0 && _maxPrice > _minPrice, "PriceOracle: invalid bounds");
        minPrice = _minPrice;
        maxPrice = _maxPrice;
    }
    
    /**
     * @notice Set description
     * @param _description New description
     */
    function setDescription(string memory _description) external onlyAdmin {
        description = _description;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get all price sources
     * @return Array of source addresses
     */
    function getAllPriceSources() external view returns (address[] memory) {
        return priceSources;
    }
    
    /**
     * @notice Get source count
     * @return Number of price sources
     */
    function getSourceCount() external view returns (uint256) {
        return priceSources.length;
    }
    
    /**
     * @notice Get source data
     * @param _source Source address
     * @return price Latest price from source
     * @return lastUpdate Last update timestamp
     * @return isActive Whether source is active
     */
    function getSourceData(address _source) external view returns (
        int256 price,
        uint256 lastUpdate,
        bool isActive
    ) {
        return (
            sourceLatestPrice[_source],
            sourceLastUpdate[_source],
            isPriceSource[_source]
        );
    }
    
    /**
     * @notice Check if price is stale
     * @return True if last update is older than interval
     */
    function isPriceStale() external view returns (bool) {
        return (block.timestamp - rounds[latestRoundId].updatedAt) > updateInterval;
    }
    
    /**
     * @notice Get oracle configuration
     * @return _maxDeviation Max price deviation
     * @return _minSources Minimum sources
     * @return _updateInterval Update interval
     * @return _minPrice Minimum price
     * @return _maxPrice Maximum price
     */
    function getConfig() external view returns (
        uint256 _maxDeviation,
        uint256 _minSources,
        uint256 _updateInterval,
        int256 _minPrice,
        int256 _maxPrice
    ) {
        return (maxPriceDeviation, minSources, updateInterval, minPrice, maxPrice);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transfer admin role
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "PriceOracle: new admin is zero address");
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }
}
