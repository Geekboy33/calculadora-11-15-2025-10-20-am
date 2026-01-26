// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                                              ║
 * ║    ██████╗ ██████╗ ██╗ ██████╗███████╗     ██████╗ ██████╗  █████╗  ██████╗██╗     ███████╗                                  ║
 * ║    ██╔══██╗██╔══██╗██║██╔════╝██╔════╝    ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝                                  ║
 * ║    ██████╔╝██████╔╝██║██║     █████╗      ██║   ██║██████╔╝███████║██║     ██║     █████╗                                    ║
 * ║    ██╔═══╝ ██╔══██╗██║██║     ██╔══╝      ██║   ██║██╔══██╗██╔══██║██║     ██║     ██╔══╝                                    ║
 * ║    ██║     ██║  ██║██║╚██████╗███████╗    ╚██████╔╝██║  ██║██║  ██║╚██████╗███████╗███████╗                                  ║
 * ║    ╚═╝     ╚═╝  ╚═╝╚═╝ ╚═════╝╚══════╝     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝                                  ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  💰 PRICE ORACLE - STABLECOIN PRICE FEEDS                                                                                    ║
 * ║                                                                                                                              ║
 * ║  📋 Contract: PriceOracle                                                                                                    ║
 * ║  🌐 Network: LemonChain Mainnet (Chain ID: 8866)                                                                             ║
 * ║  🔓 License: MIT (Open Source & Public)                                                                                      ║
 * ║                                                                                                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                                              ║
 * ║  💡 SUPPORTED TOKENS:                                                                                                        ║
 * ║  ├─ 💵 USD  - Tokenized USD (DCB Treasury)     = $1.00                                                                       ║
 * ║  ├─ 💎 LUSD - Lemon USD (LemonChain Native)    = $1.00                                                                       ║
 * ║  ├─ 🔷 USDT - Tether USD                       = $1.00                                                                       ║
 * ║  └─ 🔶 USDC - USD Coin                         = $1.00                                                                       ║
 * ║                                                                                                                              ║
 * ║  📊 PRICE FORMAT: 8 decimals (Chainlink compatible)                                                                          ║
 * ║  Example: $1.00 = 100000000 (1e8)                                                                                            ║
 * ║                                                                                                                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title PriceOracle - Stablecoin Price Feed
 * @author Digital Commercial Bank Ltd
 * @notice Provides price feeds for USD, LUSD, USDT, USDC stablecoins
 * @dev Chainlink-compatible interface with 8 decimal precision
 * @custom:security-contact security@digitalcommercialbank.com
 * @custom:version 4.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PriceOracle is AccessControl, Pausable {

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTANTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Contract version
    string public constant VERSION = "4.0.0";
    
    /// @notice Price decimals (Chainlink standard)
    uint8 public constant DECIMALS = 8;
    
    /// @notice $1.00 USD in oracle format
    int256 public constant ONE_USD = 100000000; // 1e8
    
    /// @notice LemonChain ID
    uint256 public constant CHAIN_ID = 1006;

    // ══════════════════════════════════════════════════════════════════════════════
    // ROLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Role for price updaters
    bytes32 public constant PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE");

    // ══════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Price data structure (Chainlink AggregatorV3 compatible)
    struct PriceData {
        int256 price;           // Price with 8 decimals
        uint256 updatedAt;      // Last update timestamp
        uint80 roundId;         // Round ID
        uint80 answeredInRound; // Answered in round
        string description;     // Token description
        bool isActive;          // Active status
    }

    /// @notice Token info
    struct TokenInfo {
        string symbol;
        string name;
        address tokenAddress;
        uint8 decimals;
        bool isStablecoin;
        int256 pegPrice;        // Target peg price (1e8 for $1)
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Current round ID
    uint80 public currentRoundId;
    
    /// @notice Price deviation threshold (basis points, 100 = 1%)
    uint256 public deviationThreshold = 100; // 1% max deviation
    
    /// @notice Price staleness threshold (default 1 hour)
    uint256 public stalenessThreshold = 1 hours;

    // ══════════════════════════════════════════════════════════════════════════════
    // EVENTS - PARAMETER CHANGES
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when deviation threshold changes
    event DeviationThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    
    /// @notice Emitted when staleness threshold changes
    event StalenessThresholdChanged(uint256 oldThreshold, uint256 newThreshold);

    // ══════════════════════════════════════════════════════════════════════════════
    // MAPPINGS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Price data by token symbol
    mapping(string => PriceData) public prices;
    
    /// @notice Token info by symbol
    mapping(string => TokenInfo) public tokens;
    
    /// @notice Price history by symbol and round
    mapping(string => mapping(uint80 => PriceData)) public priceHistory;
    
    /// @notice Supported token symbols
    string[] public supportedTokens;

    // ══════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════════════════════════════════════════

    /// @notice Emitted when price is updated
    event PriceUpdated(
        string indexed symbol,
        int256 price,
        uint80 roundId,
        uint256 timestamp
    );

    /// @notice Emitted when token is added
    event TokenAdded(
        string indexed symbol,
        string name,
        address tokenAddress,
        int256 pegPrice
    );

    /// @notice Emitted when price deviates from peg
    event PriceDeviation(
        string indexed symbol,
        int256 currentPrice,
        int256 pegPrice,
        uint256 deviationBps
    );

    // ══════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ══════════════════════════════════════════════════════════════════════════════

    error TokenNotSupported();
    error InvalidPrice();
    error PriceStale();
    error ExcessiveDeviation();

    // ══════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ══════════════════════════════════════════════════════════════════════════════

    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin address");
        require(block.chainid == CHAIN_ID, "Wrong chain");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PRICE_UPDATER_ROLE, _admin);
        
        currentRoundId = 1;
        
        // Initialize stablecoins with $1.00 price
        _initializeStablecoins();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // PRICE FEED FUNCTIONS (Chainlink Compatible)
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets the latest price for a token (Chainlink compatible)
     * @param symbol Token symbol (USD, LUSD, USDT, USDC)
     * @return roundId Current round ID
     * @return answer Price with 8 decimals
     * @return startedAt Round start timestamp
     * @return updatedAt Last update timestamp
     * @return answeredInRound Answered in round
     */
    function latestRoundData(string calldata symbol) external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    ) {
        PriceData storage data = prices[symbol];
        if (!data.isActive) revert TokenNotSupported();
        
        return (
            data.roundId,
            data.price,
            data.updatedAt,
            data.updatedAt,
            data.answeredInRound
        );
    }

    /**
     * @notice Gets the latest price (simplified) with staleness check
     * @param symbol Token symbol
     * @return price Price with 8 decimals
     */
    function getPrice(string calldata symbol) external view returns (int256 price) {
        PriceData storage data = prices[symbol];
        if (!data.isActive) revert TokenNotSupported();
        if (block.timestamp - data.updatedAt > stalenessThreshold) revert PriceStale();
        return data.price;
    }
    
    /**
     * @notice Gets the latest price WITHOUT staleness check (for view-only purposes)
     * @param symbol Token symbol
     * @return price Price with 8 decimals
     */
    function getPriceUnchecked(string calldata symbol) external view returns (int256 price) {
        PriceData storage data = prices[symbol];
        if (!data.isActive) revert TokenNotSupported();
        return data.price;
    }

    /**
     * @notice Gets USD price (always $1.00)
     */
    function getUSDPrice() external pure returns (int256) {
        return ONE_USD;
    }

    /**
     * @notice Gets LUSD price (always $1.00, backed by USD)
     */
    function getLUSDPrice() external view returns (int256) {
        return prices["LUSD"].price;
    }

    /**
     * @notice Gets USDT price
     */
    function getUSDTPrice() external view returns (int256) {
        return prices["USDT"].price;
    }

    /**
     * @notice Gets USDC price
     */
    function getUSDCPrice() external view returns (int256) {
        return prices["USDC"].price;
    }

    /**
     * @notice Gets price decimals
     */
    function decimals() external pure returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Gets price description
     */
    function description(string calldata symbol) external view returns (string memory) {
        return prices[symbol].description;
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // PRICE UPDATE FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Updates price for a token
     * @param symbol Token symbol
     * @param newPrice New price (8 decimals)
     */
    function updatePrice(string calldata symbol, int256 newPrice) 
        external 
        onlyRole(PRICE_UPDATER_ROLE) 
        whenNotPaused 
    {
        if (newPrice <= 0) revert InvalidPrice();
        
        PriceData storage data = prices[symbol];
        if (!data.isActive) revert TokenNotSupported();
        
        // Check deviation for stablecoins
        TokenInfo storage token = tokens[symbol];
        if (token.isStablecoin) {
            uint256 deviation = _calculateDeviation(newPrice, token.pegPrice);
            if (deviation > deviationThreshold) {
                emit PriceDeviation(symbol, newPrice, token.pegPrice, deviation);
                // For stablecoins, we enforce the peg
                newPrice = token.pegPrice;
            }
        }
        
        currentRoundId++;
        
        data.price = newPrice;
        data.updatedAt = block.timestamp;
        data.roundId = currentRoundId;
        data.answeredInRound = currentRoundId;
        
        // Store in history
        priceHistory[symbol][currentRoundId] = data;
        
        emit PriceUpdated(symbol, newPrice, currentRoundId, block.timestamp);
    }

    /**
     * @notice Batch update prices
     * @param symbols Array of token symbols
     * @param newPrices Array of new prices
     */
    function batchUpdatePrices(
        string[] calldata symbols,
        int256[] calldata newPrices
    ) external onlyRole(PRICE_UPDATER_ROLE) whenNotPaused {
        require(symbols.length == newPrices.length, "Length mismatch");
        
        for (uint256 i = 0; i < symbols.length; i++) {
            if (newPrices[i] <= 0) continue;
            
            PriceData storage data = prices[symbols[i]];
            if (!data.isActive) continue;
            
            currentRoundId++;
            
            data.price = newPrices[i];
            data.updatedAt = block.timestamp;
            data.roundId = currentRoundId;
            data.answeredInRound = currentRoundId;
            
            emit PriceUpdated(symbols[i], newPrices[i], currentRoundId, block.timestamp);
        }
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Gets all supported tokens
     */
    function getSupportedTokens() external view returns (string[] memory) {
        return supportedTokens;
    }

    /**
     * @notice Gets token info
     */
    function getTokenInfo(string calldata symbol) external view returns (TokenInfo memory) {
        return tokens[symbol];
    }

    /**
     * @notice Gets price data
     */
    function getPriceData(string calldata symbol) external view returns (PriceData memory) {
        return prices[symbol];
    }

    /**
     * @notice Gets historical price
     */
    function getHistoricalPrice(string calldata symbol, uint80 roundId) 
        external 
        view 
        returns (PriceData memory) 
    {
        return priceHistory[symbol][roundId];
    }

    /**
     * @notice Checks if price is fresh (updated within last hour)
     */
    function isPriceFresh(string calldata symbol) external view returns (bool) {
        return block.timestamp - prices[symbol].updatedAt < 1 hours;
    }

    /**
     * @notice Gets all stablecoin prices
     */
    function getAllStablecoinPrices() external view returns (
        int256 usdPrice,
        int256 lusdPrice,
        int256 usdtPrice,
        int256 usdcPrice,
        uint256 lastUpdated
    ) {
        return (
            prices["USD"].price,
            prices["LUSD"].price,
            prices["USDT"].price,
            prices["USDC"].price,
            block.timestamp
        );
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Adds a new token
     */
    function addToken(
        string calldata symbol,
        string calldata name,
        address tokenAddress,
        uint8 tokenDecimals,
        bool isStablecoin,
        int256 initialPrice
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokens[symbol] = TokenInfo({
            symbol: symbol,
            name: name,
            tokenAddress: tokenAddress,
            decimals: tokenDecimals,
            isStablecoin: isStablecoin,
            pegPrice: isStablecoin ? ONE_USD : initialPrice
        });
        
        prices[symbol] = PriceData({
            price: initialPrice,
            updatedAt: block.timestamp,
            roundId: currentRoundId,
            answeredInRound: currentRoundId,
            description: string(abi.encodePacked(symbol, " / USD")),
            isActive: true
        });
        
        supportedTokens.push(symbol);
        
        emit TokenAdded(symbol, name, tokenAddress, initialPrice);
    }

    /**
     * @notice Sets deviation threshold
     */
    function setDeviationThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold > 0 && _threshold <= 1000, "Invalid threshold"); // Max 10%
        uint256 oldThreshold = deviationThreshold;
        deviationThreshold = _threshold;
        emit DeviationThresholdChanged(oldThreshold, _threshold);
    }
    
    /**
     * @notice Sets staleness threshold
     */
    function setStalenessThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold >= 5 minutes && _threshold <= 24 hours, "Invalid threshold");
        uint256 oldThreshold = stalenessThreshold;
        stalenessThreshold = _threshold;
        emit StalenessThresholdChanged(oldThreshold, _threshold);
    }
    
    /**
     * @notice Emergency withdraw tokens sent by mistake
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "Invalid token");
        IERC20(token).transfer(msg.sender, amount);
    }

    /**
     * @notice Pauses oracle
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @notice Unpauses oracle
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ══════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ══════════════════════════════════════════════════════════════════════════════

    /**
     * @notice Initializes stablecoins with $1.00 price
     */
    function _initializeStablecoins() internal {
        // USD - Tokenized USD (DCB Treasury)
        tokens["USD"] = TokenInfo({
            symbol: "USD",
            name: "Tokenized USD",
            tokenAddress: address(0), // Will be set after deployment
            decimals: 6,
            isStablecoin: true,
            pegPrice: ONE_USD
        });
        
        prices["USD"] = PriceData({
            price: ONE_USD,
            updatedAt: block.timestamp,
            roundId: 1,
            answeredInRound: 1,
            description: "USD / USD",
            isActive: true
        });
        supportedTokens.push("USD");
        
        // LUSD - Lemon USD (Native LemonChain)
        tokens["LUSD"] = TokenInfo({
            symbol: "LUSD",
            name: "Lemon USD",
            tokenAddress: 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99,
            decimals: 6,
            isStablecoin: true,
            pegPrice: ONE_USD
        });
        
        prices["LUSD"] = PriceData({
            price: ONE_USD,
            updatedAt: block.timestamp,
            roundId: 1,
            answeredInRound: 1,
            description: "LUSD / USD",
            isActive: true
        });
        supportedTokens.push("LUSD");
        
        // USDT - Tether USD
        tokens["USDT"] = TokenInfo({
            symbol: "USDT",
            name: "Tether USD",
            tokenAddress: address(0), // Bridge address if available
            decimals: 6,
            isStablecoin: true,
            pegPrice: ONE_USD
        });
        
        prices["USDT"] = PriceData({
            price: ONE_USD,
            updatedAt: block.timestamp,
            roundId: 1,
            answeredInRound: 1,
            description: "USDT / USD",
            isActive: true
        });
        supportedTokens.push("USDT");
        
        // USDC - USD Coin
        tokens["USDC"] = TokenInfo({
            symbol: "USDC",
            name: "USD Coin",
            tokenAddress: address(0), // Bridge address if available
            decimals: 6,
            isStablecoin: true,
            pegPrice: ONE_USD
        });
        
        prices["USDC"] = PriceData({
            price: ONE_USD,
            updatedAt: block.timestamp,
            roundId: 1,
            answeredInRound: 1,
            description: "USDC / USD",
            isActive: true
        });
        supportedTokens.push("USDC");
        
        emit TokenAdded("USD", "Tokenized USD", address(0), ONE_USD);
        emit TokenAdded("LUSD", "Lemon USD", 0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99, ONE_USD);
        emit TokenAdded("USDT", "Tether USD", address(0), ONE_USD);
        emit TokenAdded("USDC", "USD Coin", address(0), ONE_USD);
    }

    /**
     * @notice Calculates price deviation in basis points
     */
    function _calculateDeviation(int256 currentPrice, int256 pegPrice) internal pure returns (uint256) {
        if (currentPrice == pegPrice) return 0;
        
        int256 diff = currentPrice > pegPrice ? currentPrice - pegPrice : pegPrice - currentPrice;
        return uint256((diff * 10000) / pegPrice);
    }
}
