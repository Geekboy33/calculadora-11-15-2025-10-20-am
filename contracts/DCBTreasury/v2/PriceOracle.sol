// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                               ║
 * ║   ██████╗ ██████╗ ██╗ ██████╗███████╗     ██████╗ ██████╗  █████╗  ██████╗██║ ║
 * ║   ██╔══██╗██╔══██╗██║██╔════╝██╔════╝    ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║ ║
 * ║   ██████╔╝██████╔╝██║██║     █████╗      ██║   ██║██████╔╝███████║██║     ██║ ║
 * ║   ██╔═══╝ ██╔══██╗██║██║     ██╔══╝      ██║   ██║██╔══██╗██╔══██║██║     ██║ ║
 * ║   ██║     ██║  ██║██║╚██████╗███████╗    ╚██████╔╝██║  ██║██║  ██║╚██████╗███████╗
 * ║   ╚═╝     ╚═╝  ╚═╝╚═╝ ╚═════╝╚══════╝     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝
 * ║                                                                               ║
 * ║   PRICE ORACLE - Digital Commercial Bank Ltd                                  ║
 * ║   USD/USDT Price Feed • Chainlink Compatible • Multi-Source Aggregation       ║
 * ║                                                                               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * @title PriceOracle - USD/USDT Price Feed
 * @author Digital Commercial Bank Ltd - Treasury Division
 * @notice Production-grade Chainlink-compatible price oracle with multi-source
 *         aggregation, deviation protection, and manual override capability.
 * @dev Implements Chainlink AggregatorV3Interface for compatibility.
 * 
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 2.0.0
 * @custom:chain LemonChain (ID: 1006)
 * @custom:audit Pending - Q1 2026
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FEATURES:
 * ═══════════════════════════════════════════════════════════════════════════════
 * • Chainlink AggregatorV3Interface Compatibility
 * • Multi-Source Price Aggregation
 * • Price Deviation Protection
 * • Stale Price Detection
 * • Manual Price Override (Emergency)
 * • Price Bounds Validation
 * • Full Historical Data
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

contract PriceOracle {
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Contract version
    string public constant VERSION = "2.0.0";
    
    /// @notice Oracle description
    string public constant description = "USD / USDT";
    
    /// @notice Price decimals (Chainlink standard)
    uint8 public constant decimals = 8;
    
    /// @notice Interface version
    uint256 public constant version = 1;
    
    /// @notice Issuer name
    string public constant ISSUER = "Digital Commercial Bank Ltd";

    // ═══════════════════════════════════════════════════════════════════════════
    // DATA STRUCTURES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Round data structure
    struct RoundData {
        uint80 roundId;
        int256 answer;
        uint256 startedAt;
        uint256 updatedAt;
        uint80 answeredInRound;
    }
    
    /// @notice Price source data
    struct PriceSource {
        address sourceAddress;
        string name;
        int256 latestPrice;
        uint256 lastUpdate;
        bool isActive;
        uint256 weight;          // Weight for weighted average (basis points)
        uint256 successCount;
        uint256 failCount;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Contract admin
    address public admin;
    
    /// @notice Rounds mapping
    mapping(uint80 => RoundData) private _rounds;
    
    /// @notice Latest round ID
    uint80 public latestRoundId;
    
    /// @notice Price sources mapping
    mapping(address => PriceSource) private _priceSources;
    
    /// @notice Price source addresses
    address[] public priceSourceAddresses;
    
    /// @notice Operators who can submit prices
    mapping(address => bool) public isOperator;
    
    /// @notice Operators list
    address[] public operators;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Maximum price deviation (basis points, 100 = 1%)
    uint256 public maxPriceDeviation = 100;
    
    /// @notice Minimum sources required for aggregation
    uint256 public minSources = 1;
    
    /// @notice Update interval (seconds)
    uint256 public updateInterval = 3600; // 1 hour
    
    /// @notice Minimum valid price
    int256 public minPrice = 99000000;  // $0.99 with 8 decimals
    
    /// @notice Maximum valid price
    int256 public maxPrice = 101000000; // $1.01 with 8 decimals
    
    /// @notice Manual override price
    int256 public manualPrice;
    
    /// @notice Whether manual price is active
    bool public useManualPrice;
    
    /// @notice Whether contract is paused
    bool public paused;

    // ═══════════════════════════════════════════════════════════════════════════
    // STATISTICS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Total price updates
    uint256 public totalUpdates;
    
    /// @notice Last aggregation time
    uint256 public lastAggregationTime;

    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Emitted when answer is updated
    event AnswerUpdated(
        int256 indexed current,
        uint256 indexed roundId,
        uint256 updatedAt
    );
    
    /// @notice Emitted when new round starts
    event NewRound(
        uint256 indexed roundId,
        address indexed startedBy,
        uint256 startedAt
    );
    
    /// @notice Emitted when price source submits
    event PriceSubmitted(
        address indexed source,
        int256 price,
        uint256 timestamp
    );
    
    /// @notice Emitted when price source is added
    event PriceSourceAdded(
        address indexed source,
        string name,
        uint256 weight
    );
    
    /// @notice Emitted when price source is removed
    event PriceSourceRemoved(address indexed source);
    
    /// @notice Emitted when price source status changes
    event PriceSourceStatusChanged(address indexed source, bool isActive);
    
    /// @notice Emitted when operator is added
    event OperatorAdded(address indexed operator);
    
    /// @notice Emitted when operator is removed
    event OperatorRemoved(address indexed operator);
    
    /// @notice Emitted when manual price is set
    event ManualPriceSet(int256 price, bool enabled);
    
    /// @notice Emitted when configuration changes
    event ConfigUpdated(string param, uint256 value);
    
    /// @notice Emitted when admin is transferred
    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);

    // ═══════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════
    
    error ZeroAddress();
    error InvalidPrice();
    error PriceOutOfBounds();
    error PriceDeviationTooHigh();
    error NotOperator();
    error NotAdmin();
    error SourceNotFound();
    error SourceAlreadyExists();
    error InsufficientSources();
    error ContractPaused();
    error InvalidConfiguration();

    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }
    
    modifier onlyOperator() {
        if (!isOperator[msg.sender] && msg.sender != admin) revert NotOperator();
        _;
    }
    
    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initializes the PriceOracle
     * @param _admin Initial admin address
     * @param _initialOperators Initial operators array
     */
    constructor(address _admin, address[] memory _initialOperators) {
        if (_admin == address(0)) revert ZeroAddress();
        
        admin = _admin;
        
        // Add admin as operator
        isOperator[_admin] = true;
        operators.push(_admin);
        emit OperatorAdded(_admin);
        
        // Add initial operators
        for (uint256 i = 0; i < _initialOperators.length; i++) {
            if (_initialOperators[i] != address(0) && !isOperator[_initialOperators[i]]) {
                isOperator[_initialOperators[i]] = true;
                operators.push(_initialOperators[i]);
                emit OperatorAdded(_initialOperators[i]);
            }
        }
        
        // Initialize with 1:1 price
        latestRoundId = 1;
        _rounds[1] = RoundData({
            roundId: 1,
            answer: 100000000, // $1.00 with 8 decimals
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: 1
        });
        
        // Add admin as default price source
        _priceSources[_admin] = PriceSource({
            sourceAddress: _admin,
            name: "Admin",
            latestPrice: 100000000,
            lastUpdate: block.timestamp,
            isActive: true,
            weight: 10000, // 100%
            successCount: 1,
            failCount: 0
        });
        priceSourceAddresses.push(_admin);
        
        emit AdminTransferred(address(0), _admin);
        emit PriceSourceAdded(_admin, "Admin", 10000);
        emit AnswerUpdated(100000000, 1, block.timestamp);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CHAINLINK AGGREGATOR V3 INTERFACE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Gets data from a specific round
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
        RoundData memory data = _rounds[_roundId];
        return (
            data.roundId,
            data.answer,
            data.startedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }
    
    /**
     * @notice Gets data from the latest round
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
                _rounds[latestRoundId].startedAt,
                block.timestamp,
                latestRoundId
            );
        }
        
        RoundData memory data = _rounds[latestRoundId];
        return (
            data.roundId,
            data.answer,
            data.startedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }
    
    /**
     * @notice Gets the latest answer
     * @return The latest price
     */
    function latestAnswer() external view returns (int256) {
        if (useManualPrice && manualPrice > 0) {
            return manualPrice;
        }
        return _rounds[latestRoundId].answer;
    }
    
    /**
     * @notice Gets the latest timestamp
     * @return The latest update timestamp
     */
    function latestTimestamp() external view returns (uint256) {
        if (useManualPrice) {
            return block.timestamp;
        }
        return _rounds[latestRoundId].updatedAt;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRICE UPDATE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Submits a price from an operator
     * @param price The price to submit (8 decimals)
     */
    function submitPrice(int256 price) external onlyOperator whenNotPaused {
        if (price < minPrice || price > maxPrice) revert PriceOutOfBounds();
        
        // Update source data
        PriceSource storage source = _priceSources[msg.sender];
        if (source.sourceAddress == address(0)) {
            // Auto-register operator as source
            _priceSources[msg.sender] = PriceSource({
                sourceAddress: msg.sender,
                name: "Operator",
                latestPrice: price,
                lastUpdate: block.timestamp,
                isActive: true,
                weight: 10000,
                successCount: 1,
                failCount: 0
            });
            priceSourceAddresses.push(msg.sender);
            emit PriceSourceAdded(msg.sender, "Operator", 10000);
        } else {
            source.latestPrice = price;
            source.lastUpdate = block.timestamp;
            source.successCount++;
        }
        
        emit PriceSubmitted(msg.sender, price, block.timestamp);
        
        // Try to update aggregated price
        _updateAggregatedPrice();
    }
    
    /**
     * @notice Updates price directly (admin only)
     * @param price New price (8 decimals)
     */
    function updatePriceDirect(int256 price) external onlyAdmin {
        if (price < minPrice || price > maxPrice) revert PriceOutOfBounds();
        
        _createNewRound(price);
    }
    
    /**
     * @notice Forces aggregation update
     */
    function forceUpdate() external onlyOperator {
        _updateAggregatedPrice();
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MANUAL PRICE OVERRIDE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Sets manual price override (emergency)
     * @param price Manual price (8 decimals)
     * @param enabled Whether to enable manual price
     */
    function setManualPrice(int256 price, bool enabled) external onlyAdmin {
        if (enabled && (price < minPrice || price > maxPrice)) revert PriceOutOfBounds();
        
        manualPrice = price;
        useManualPrice = enabled;
        
        emit ManualPriceSet(price, enabled);
    }
    
    /**
     * @notice Disables manual price override
     */
    function disableManualPrice() external onlyAdmin {
        useManualPrice = false;
        emit ManualPriceSet(manualPrice, false);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PRICE SOURCE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Adds a price source
     * @param source Address of the price source
     * @param name Name of the source
     * @param weight Weight for aggregation (basis points)
     */
    function addPriceSource(
        address source,
        string calldata name,
        uint256 weight
    ) external onlyAdmin {
        if (source == address(0)) revert ZeroAddress();
        if (_priceSources[source].sourceAddress != address(0)) revert SourceAlreadyExists();
        if (weight == 0 || weight > 10000) revert InvalidConfiguration();
        
        _priceSources[source] = PriceSource({
            sourceAddress: source,
            name: name,
            latestPrice: 0,
            lastUpdate: 0,
            isActive: true,
            weight: weight,
            successCount: 0,
            failCount: 0
        });
        priceSourceAddresses.push(source);
        
        emit PriceSourceAdded(source, name, weight);
    }
    
    /**
     * @notice Removes a price source
     * @param source Address of the price source
     */
    function removePriceSource(address source) external onlyAdmin {
        if (_priceSources[source].sourceAddress == address(0)) revert SourceNotFound();
        if (priceSourceAddresses.length <= minSources) revert InsufficientSources();
        
        delete _priceSources[source];
        
        // Remove from array
        for (uint256 i = 0; i < priceSourceAddresses.length; i++) {
            if (priceSourceAddresses[i] == source) {
                priceSourceAddresses[i] = priceSourceAddresses[priceSourceAddresses.length - 1];
                priceSourceAddresses.pop();
                break;
            }
        }
        
        emit PriceSourceRemoved(source);
    }
    
    /**
     * @notice Sets price source active status
     * @param source Address of the price source
     * @param isActive Whether source is active
     */
    function setPriceSourceStatus(address source, bool isActive) external onlyAdmin {
        if (_priceSources[source].sourceAddress == address(0)) revert SourceNotFound();
        
        _priceSources[source].isActive = isActive;
        
        emit PriceSourceStatusChanged(source, isActive);
    }
    
    /**
     * @notice Updates price source weight
     * @param source Address of the price source
     * @param weight New weight (basis points)
     */
    function setPriceSourceWeight(address source, uint256 weight) external onlyAdmin {
        if (_priceSources[source].sourceAddress == address(0)) revert SourceNotFound();
        if (weight == 0 || weight > 10000) revert InvalidConfiguration();
        
        _priceSources[source].weight = weight;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // OPERATOR MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Adds an operator
     * @param operator Address of the operator
     */
    function addOperator(address operator) external onlyAdmin {
        if (operator == address(0)) revert ZeroAddress();
        if (isOperator[operator]) return;
        
        isOperator[operator] = true;
        operators.push(operator);
        
        emit OperatorAdded(operator);
    }
    
    /**
     * @notice Removes an operator
     * @param operator Address of the operator
     */
    function removeOperator(address operator) external onlyAdmin {
        if (!isOperator[operator]) revert NotOperator();
        
        isOperator[operator] = false;
        
        for (uint256 i = 0; i < operators.length; i++) {
            if (operators[i] == operator) {
                operators[i] = operators[operators.length - 1];
                operators.pop();
                break;
            }
        }
        
        emit OperatorRemoved(operator);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Sets maximum price deviation
     * @param deviation Deviation in basis points (100 = 1%)
     */
    function setMaxPriceDeviation(uint256 deviation) external onlyAdmin {
        if (deviation == 0 || deviation > 1000) revert InvalidConfiguration();
        maxPriceDeviation = deviation;
        emit ConfigUpdated("maxPriceDeviation", deviation);
    }
    
    /**
     * @notice Sets minimum sources required
     * @param _minSources Minimum number of sources
     */
    function setMinSources(uint256 _minSources) external onlyAdmin {
        if (_minSources == 0 || _minSources > priceSourceAddresses.length) {
            revert InvalidConfiguration();
        }
        minSources = _minSources;
        emit ConfigUpdated("minSources", _minSources);
    }
    
    /**
     * @notice Sets update interval
     * @param interval Interval in seconds
     */
    function setUpdateInterval(uint256 interval) external onlyAdmin {
        if (interval < 60) revert InvalidConfiguration();
        updateInterval = interval;
        emit ConfigUpdated("updateInterval", interval);
    }
    
    /**
     * @notice Sets price bounds
     * @param _minPrice Minimum valid price
     * @param _maxPrice Maximum valid price
     */
    function setPriceBounds(int256 _minPrice, int256 _maxPrice) external onlyAdmin {
        if (_minPrice <= 0 || _maxPrice <= _minPrice) revert InvalidConfiguration();
        minPrice = _minPrice;
        maxPrice = _maxPrice;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PAUSE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Pauses the contract
     */
    function pause() external onlyAdmin {
        paused = true;
    }
    
    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyAdmin {
        paused = false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Gets all price sources
     * @return Array of source addresses
     */
    function getAllPriceSources() external view returns (address[] memory) {
        return priceSourceAddresses;
    }
    
    /**
     * @notice Gets all operators
     * @return Array of operator addresses
     */
    function getAllOperators() external view returns (address[] memory) {
        return operators;
    }
    
    /**
     * @notice Gets price source data
     * @param source Source address
     */
    function getPriceSource(address source) external view returns (
        string memory name,
        int256 latestPrice,
        uint256 lastUpdate,
        bool isActive,
        uint256 weight,
        uint256 successCount,
        uint256 failCount
    ) {
        PriceSource storage s = _priceSources[source];
        return (
            s.name,
            s.latestPrice,
            s.lastUpdate,
            s.isActive,
            s.weight,
            s.successCount,
            s.failCount
        );
    }
    
    /**
     * @notice Checks if price is stale
     * @return True if last update is older than interval
     */
    function isPriceStale() external view returns (bool) {
        return (block.timestamp - _rounds[latestRoundId].updatedAt) > updateInterval;
    }
    
    /**
     * @notice Gets configuration
     */
    function getConfig() external view returns (
        uint256 _maxPriceDeviation,
        uint256 _minSources,
        uint256 _updateInterval,
        int256 _minPrice,
        int256 _maxPrice,
        bool _useManualPrice,
        int256 _manualPrice
    ) {
        return (
            maxPriceDeviation,
            minSources,
            updateInterval,
            minPrice,
            maxPrice,
            useManualPrice,
            manualPrice
        );
    }
    
    /**
     * @notice Gets statistics
     */
    function getStats() external view returns (
        uint256 _totalUpdates,
        uint256 _lastAggregationTime,
        uint256 _sourcesCount,
        uint256 _operatorsCount,
        uint80 _latestRoundId
    ) {
        return (
            totalUpdates,
            lastAggregationTime,
            priceSourceAddresses.length,
            operators.length,
            latestRoundId
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Transfers admin role
     * @param newAdmin New admin address
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        if (newAdmin == address(0)) revert ZeroAddress();
        
        address previousAdmin = admin;
        admin = newAdmin;
        
        emit AdminTransferred(previousAdmin, newAdmin);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _updateAggregatedPrice() internal {
        uint256 validSources = 0;
        int256 weightedSum = 0;
        uint256 totalWeight = 0;
        
        for (uint256 i = 0; i < priceSourceAddresses.length; i++) {
            PriceSource storage source = _priceSources[priceSourceAddresses[i]];
            
            if (source.isActive && 
                source.latestPrice > 0 && 
                (block.timestamp - source.lastUpdate) <= updateInterval) {
                validSources++;
                weightedSum += source.latestPrice * int256(source.weight);
                totalWeight += source.weight;
            }
        }
        
        if (validSources >= minSources && totalWeight > 0) {
            int256 avgPrice = weightedSum / int256(totalWeight);
            
            // Check deviation from current price
            int256 currentPrice = _rounds[latestRoundId].answer;
            if (currentPrice > 0) {
                int256 deviation = ((avgPrice - currentPrice) * 10000) / currentPrice;
                if (deviation < 0) deviation = -deviation;
                
                // Only update if within deviation
                if (uint256(deviation) > maxPriceDeviation) {
                    return;
                }
            }
            
            // Validate bounds
            if (avgPrice >= minPrice && avgPrice <= maxPrice) {
                _createNewRound(avgPrice);
            }
        }
    }
    
    function _createNewRound(int256 price) internal {
        latestRoundId++;
        
        _rounds[latestRoundId] = RoundData({
            roundId: latestRoundId,
            answer: price,
            startedAt: block.timestamp,
            updatedAt: block.timestamp,
            answeredInRound: latestRoundId
        });
        
        totalUpdates++;
        lastAggregationTime = block.timestamp;
        
        emit NewRound(latestRoundId, msg.sender, block.timestamp);
        emit AnswerUpdated(price, latestRoundId, block.timestamp);
    }
}
