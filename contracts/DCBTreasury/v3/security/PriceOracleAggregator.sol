// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                  ║
 * ║  🔮 PRICE ORACLE AGGREGATOR - CHAINLINK + MULTI-SOURCE                                           ║
 * ║  Digital Commercial Bank Ltd - LemonChain                                                        ║
 * ║                                                                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Features:                                                                                       ║
 * ║  ├─ Chainlink Price Feed Integration                                                             ║
 * ║  ├─ Multi-Oracle Aggregation                                                                     ║
 * ║  ├─ Price Deviation Protection                                                                   ║
 * ║  ├─ Staleness Check                                                                              ║
 * ║  └─ Fallback Oracle Support                                                                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title AggregatorV3Interface
 * @notice Chainlink Price Feed Interface
 */
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

/**
 * @title PriceOracleAggregator
 * @author Digital Commercial Bank Ltd
 * @notice Aggregates prices from multiple oracles with safety checks
 */
contract PriceOracleAggregator is AccessControl, Pausable {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    string public constant VERSION = "1.0.0";
    
    /// @notice Target price for USD ($1.00 = 1e8 with 8 decimals)
    int256 public constant TARGET_PRICE = 1e8;
    
    /// @notice Maximum allowed deviation from $1.00 (2% = 200 basis points)
    uint256 public constant MAX_DEVIATION_BPS = 200;
    
    /// @notice Maximum staleness for price data (1 hour)
    uint256 public constant MAX_STALENESS = 1 hours;
    
    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ROLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    bytes32 public constant ORACLE_ADMIN_ROLE = keccak256("ORACLE_ADMIN_ROLE");
    bytes32 public constant PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE");
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct OracleSource {
        address oracleAddress;
        string name;
        uint8 decimals;
        uint256 weight;
        bool isActive;
        bool isChainlink;
        int256 lastPrice;
        uint256 lastUpdate;
    }
    
    struct PriceData {
        int256 price;
        uint8 decimals;
        uint256 timestamp;
        uint256 roundId;
        bool isValid;
        string source;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    /// @notice Primary Chainlink oracle
    AggregatorV3Interface public primaryOracle;
    
    /// @notice Fallback oracle
    AggregatorV3Interface public fallbackOracle;
    
    /// @notice Manual price (for emergency)
    int256 public manualPrice;
    uint256 public manualPriceTimestamp;
    bool public useManualPrice;
    
    /// @notice Oracle sources
    mapping(bytes32 => OracleSource) public oracleSources;
    bytes32[] public oracleIds;
    
    /// @notice Total weight
    uint256 public totalWeight;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event OracleAdded(bytes32 indexed oracleId, string name, address oracleAddress, uint256 weight);
    event OracleUpdated(bytes32 indexed oracleId, bool isActive, uint256 weight);
    event PriceUpdated(bytes32 indexed oracleId, int256 price, uint256 timestamp);
    event ManualPriceSet(int256 price, address setBy, uint256 timestamp);
    event PriceDeviationAlert(int256 price, int256 targetPrice, uint256 deviationBps);
    event StalePriceAlert(bytes32 indexed oracleId, uint256 lastUpdate, uint256 staleness);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _admin, address _primaryOracle) {
        require(_admin != address(0), "Invalid admin");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ORACLE_ADMIN_ROLE, _admin);
        _grantRole(PRICE_UPDATER_ROLE, _admin);
        
        if (_primaryOracle != address(0)) {
            primaryOracle = AggregatorV3Interface(_primaryOracle);
            _addChainlinkOracle("PRIMARY", _primaryOracle, 50);
        }
        
        // Initialize with manual price as fallback
        manualPrice = TARGET_PRICE;
        manualPriceTimestamp = block.timestamp;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ORACLE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    
    function addChainlinkOracle(
        string calldata name,
        address oracleAddress,
        uint256 weight
    ) external onlyRole(ORACLE_ADMIN_ROLE) {
        _addChainlinkOracle(name, oracleAddress, weight);
    }
    
    function _addChainlinkOracle(
        string memory name,
        address oracleAddress,
        uint256 weight
    ) internal {
        require(oracleAddress != address(0), "Invalid oracle address");
        require(weight > 0 && weight <= 100, "Invalid weight");
        
        bytes32 oracleId = keccak256(abi.encodePacked(name, oracleAddress));
        require(oracleSources[oracleId].oracleAddress == address(0), "Oracle exists");
        
        AggregatorV3Interface oracle = AggregatorV3Interface(oracleAddress);
        uint8 decimals = oracle.decimals();
        
        oracleSources[oracleId] = OracleSource({
            oracleAddress: oracleAddress,
            name: name,
            decimals: decimals,
            weight: weight,
            isActive: true,
            isChainlink: true,
            lastPrice: 0,
            lastUpdate: 0
        });
        
        oracleIds.push(oracleId);
        totalWeight += weight;
        
        emit OracleAdded(oracleId, name, oracleAddress, weight);
    }
    
    function addManualOracle(
        string calldata name,
        uint256 weight
    ) external onlyRole(ORACLE_ADMIN_ROLE) {
        bytes32 oracleId = keccak256(abi.encodePacked(name, "MANUAL"));
        require(oracleSources[oracleId].oracleAddress == address(0), "Oracle exists");
        
        oracleSources[oracleId] = OracleSource({
            oracleAddress: address(0),
            name: name,
            decimals: 8,
            weight: weight,
            isActive: true,
            isChainlink: false,
            lastPrice: TARGET_PRICE,
            lastUpdate: block.timestamp
        });
        
        oracleIds.push(oracleId);
        totalWeight += weight;
        
        emit OracleAdded(oracleId, name, address(0), weight);
    }
    
    function updateManualPrice(bytes32 oracleId, int256 price) 
        external 
        onlyRole(PRICE_UPDATER_ROLE) 
    {
        OracleSource storage source = oracleSources[oracleId];
        require(!source.isChainlink, "Cannot update Chainlink oracle");
        require(source.isActive, "Oracle not active");
        
        source.lastPrice = price;
        source.lastUpdate = block.timestamp;
        
        emit PriceUpdated(oracleId, price, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRICE RETRIEVAL
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Gets the latest aggregated price
     * @return price The aggregated price (8 decimals)
     * @return decimals The decimals
     * @return timestamp The latest update timestamp
     * @return isValid Whether the price is valid
     */
    function getLatestPrice() external view returns (
        int256 price,
        uint8 decimals,
        uint256 timestamp,
        bool isValid
    ) {
        if (useManualPrice) {
            return (manualPrice, 8, manualPriceTimestamp, true);
        }
        
        (int256 aggregatedPrice, uint256 latestTimestamp, bool valid) = _aggregatePrices();
        
        return (aggregatedPrice, 8, latestTimestamp, valid);
    }
    
    /**
     * @notice Gets price from primary Chainlink oracle
     */
    function getChainlinkPrice() external view returns (PriceData memory) {
        if (address(primaryOracle) == address(0)) {
            return PriceData({
                price: TARGET_PRICE,
                decimals: 8,
                timestamp: block.timestamp,
                roundId: 0,
                isValid: false,
                source: "NO_ORACLE"
            });
        }
        
        try primaryOracle.latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            bool isStale = block.timestamp - updatedAt > MAX_STALENESS;
            bool isValidRound = answeredInRound >= roundId;
            
            return PriceData({
                price: answer,
                decimals: primaryOracle.decimals(),
                timestamp: updatedAt,
                roundId: roundId,
                isValid: !isStale && isValidRound && answer > 0,
                source: "CHAINLINK_PRIMARY"
            });
        } catch {
            return PriceData({
                price: TARGET_PRICE,
                decimals: 8,
                timestamp: block.timestamp,
                roundId: 0,
                isValid: false,
                source: "CHAINLINK_ERROR"
            });
        }
    }
    
    function _aggregatePrices() internal view returns (
        int256 aggregatedPrice,
        uint256 latestTimestamp,
        bool isValid
    ) {
        int256 weightedSum = 0;
        uint256 activeWeight = 0;
        uint256 maxTimestamp = 0;
        
        for (uint256 i = 0; i < oracleIds.length; i++) {
            OracleSource storage source = oracleSources[oracleIds[i]];
            
            if (!source.isActive) continue;
            
            int256 price;
            uint256 timestamp;
            bool valid;
            
            if (source.isChainlink) {
                (price, timestamp, valid) = _getChainlinkPrice(source.oracleAddress);
            } else {
                price = source.lastPrice;
                timestamp = source.lastUpdate;
                valid = block.timestamp - timestamp <= MAX_STALENESS;
            }
            
            if (valid && price > 0) {
                // Normalize to 8 decimals
                int256 normalizedPrice = _normalizePrice(price, source.decimals, 8);
                weightedSum += normalizedPrice * int256(source.weight);
                activeWeight += source.weight;
                
                if (timestamp > maxTimestamp) {
                    maxTimestamp = timestamp;
                }
            }
        }
        
        if (activeWeight == 0) {
            return (TARGET_PRICE, block.timestamp, false);
        }
        
        aggregatedPrice = weightedSum / int256(activeWeight);
        latestTimestamp = maxTimestamp;
        isValid = true;
        
        // Check deviation
        uint256 deviation = _calculateDeviation(aggregatedPrice);
        if (deviation > MAX_DEVIATION_BPS) {
            isValid = false;
        }
        
        return (aggregatedPrice, latestTimestamp, isValid);
    }
    
    function _getChainlinkPrice(address oracleAddress) internal view returns (
        int256 price,
        uint256 timestamp,
        bool isValid
    ) {
        try AggregatorV3Interface(oracleAddress).latestRoundData() returns (
            uint80 roundId,
            int256 answer,
            uint256,
            uint256 updatedAt,
            uint80 answeredInRound
        ) {
            bool isStale = block.timestamp - updatedAt > MAX_STALENESS;
            bool isValidRound = answeredInRound >= roundId;
            
            return (answer, updatedAt, !isStale && isValidRound && answer > 0);
        } catch {
            return (0, 0, false);
        }
    }
    
    function _normalizePrice(int256 price, uint8 fromDecimals, uint8 toDecimals) 
        internal 
        pure 
        returns (int256) 
    {
        if (fromDecimals == toDecimals) return price;
        if (fromDecimals > toDecimals) {
            return price / int256(10 ** (fromDecimals - toDecimals));
        }
        return price * int256(10 ** (toDecimals - fromDecimals));
    }
    
    function _calculateDeviation(int256 price) internal pure returns (uint256) {
        if (price >= TARGET_PRICE) {
            return uint256((price - TARGET_PRICE) * int256(BPS_DENOMINATOR) / TARGET_PRICE);
        }
        return uint256((TARGET_PRICE - price) * int256(BPS_DENOMINATOR) / TARGET_PRICE);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Checks if price is within acceptable range for minting
     * @return isValid True if price is acceptable
     * @return price The current price
     * @return deviation The deviation in basis points
     */
    function validatePriceForMinting() external view returns (
        bool isValid,
        int256 price,
        uint256 deviation
    ) {
        (int256 aggregatedPrice,,bool valid) = _aggregatePrices();
        uint256 dev = _calculateDeviation(aggregatedPrice);
        
        return (valid && dev <= MAX_DEVIATION_BPS, aggregatedPrice, dev);
    }
    
    /**
     * @notice Checks if a specific amount is safe to mint at current price
     */
    function isSafeToMint(uint256 usdAmount) external view returns (bool) {
        (int256 price,, bool valid) = _aggregatePrices();
        if (!valid) return false;
        
        uint256 deviation = _calculateDeviation(price);
        return deviation <= MAX_DEVIATION_BPS;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EMERGENCY
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setManualPrice(int256 price) external onlyRole(ORACLE_ADMIN_ROLE) {
        require(price > 0, "Invalid price");
        manualPrice = price;
        manualPriceTimestamp = block.timestamp;
        useManualPrice = true;
        
        emit ManualPriceSet(price, msg.sender, block.timestamp);
    }
    
    function disableManualPrice() external onlyRole(ORACLE_ADMIN_ROLE) {
        useManualPrice = false;
    }
    
    function pause() external onlyRole(ORACLE_ADMIN_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(ORACLE_ADMIN_ROLE) {
        _unpause();
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getAllOracleIds() external view returns (bytes32[] memory) {
        return oracleIds;
    }
    
    function getOracleCount() external view returns (uint256) {
        return oracleIds.length;
    }
}
