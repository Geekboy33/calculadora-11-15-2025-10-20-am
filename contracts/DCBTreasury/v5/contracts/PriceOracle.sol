// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * ╔═══════════════════════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                                   ║
 * ║    ██████╗ ██████╗ ██╗ ██████╗███████╗     ██████╗ ██████╗  █████╗  ██████╗██╗     ███████╗       ║
 * ║    ██╔══██╗██╔══██╗██║██╔════╝██╔════╝    ██╔═══██╗██╔══██╗██╔══██╗██╔════╝██║     ██╔════╝       ║
 * ║    ██████╔╝██████╔╝██║██║     █████╗      ██║   ██║██████╔╝███████║██║     ██║     █████╗         ║
 * ║    ██╔═══╝ ██╔══██╗██║██║     ██╔══╝      ██║   ██║██╔══██╗██╔══██║██║     ██║     ██╔══╝         ║
 * ║    ██║     ██║  ██║██║╚██████╗███████╗    ╚██████╔╝██║  ██║██║  ██║╚██████╗███████╗███████╗       ║
 * ║    ╚═╝     ╚═╝  ╚═╝╚═╝ ╚═════╝╚══════╝     ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝╚══════╝╚══════╝       ║
 * ║                                                                                                   ║
 * ║─────────────────────────────────────────────────────────────────────────────────────────────────  ║
 * ║                                                                                                   ║
 * ║                          ┌─────────────────────────────────────┐                                  ║
 * ║                          │     DIGITAL COMMERCIAL BANK         │                                  ║
 * ║                          │        TREASURY SYSTEM              │                                  ║
 * ║                          │     ══════════════════════          │                                  ║
 * ║                          │      Stablecoin Price Feeds         │                                  ║
 * ║                          │      Chainlink Compatible           │                                  ║
 * ║                          └─────────────────────────────────────┘                                  ║
 * ║                                                                                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║  Contract: PriceOracle                        Network: LemonChain (1006)                          ║
 * ║  Version: 5.0.0                               License: MIT                                        ║
 * ╠═══════════════════════════════════════════════════════════════════════════════════════════════════╣
 * ║                                                                                                   ║
 * ║  SUPPORTED TOKENS                             PRICE FORMAT                                        ║
 * ║  ────────────────                             ────────────                                        ║
 * ║  • USD  (Tokenized USD)     $1.00            8 decimals (Chainlink)                              ║
 * ║  • VUSD (Virtual USD)       $1.00            Example: $1.00 = 100000000                          ║
 * ║  • USDT (Tether USD)        $1.00                                                                ║
 * ║  • USDC (USD Coin)          $1.00                                                                ║
 * ║                                                                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════════════════════════╝
 *
 * @title PriceOracle - Stablecoin Price Feed
 * @author Digital Commercial Bank Ltd
 * @notice Provides price feeds for USD, VUSD, USDT, USDC stablecoins
 * @dev Chainlink-compatible interface with 8 decimal precision
 * @custom:security-contact rwa@digcommbank.com
 * @custom:version 5.0.0
 */

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PriceOracle is AccessControl, Pausable {

    // ========================================================================================================
    // CONSTANTS
    // ========================================================================================================

    string public constant VERSION = "5.0.0";
    uint8 public constant DECIMALS = 8;
    int256 public constant ONE_USD = 100000000;
    uint256 public constant CHAIN_ID = 1006;
    
    address public constant VUSD_CONTRACT = 0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b;

    // ========================================================================================================
    // ROLES
    // ========================================================================================================

    bytes32 public constant PRICE_UPDATER_ROLE = keccak256("PRICE_UPDATER_ROLE");

    // ========================================================================================================
    // STRUCTS
    // ========================================================================================================

    struct PriceData {
        int256 price;
        uint256 updatedAt;
        uint80 roundId;
        uint80 answeredInRound;
        string description;
        bool isActive;
    }

    struct TokenInfo {
        string symbol;
        string name;
        address tokenAddress;
        uint8 decimals;
        bool isStablecoin;
        int256 pegPrice;
    }

    // ========================================================================================================
    // STATE VARIABLES
    // ========================================================================================================

    uint80 public currentRoundId;
    uint256 public deviationThreshold = 100;
    uint256 public stalenessThreshold = 1 hours;

    // ========================================================================================================
    // MAPPINGS
    // ========================================================================================================

    mapping(string => PriceData) public prices;
    mapping(string => TokenInfo) public tokens;
    mapping(string => mapping(uint80 => PriceData)) public priceHistory;
    string[] public supportedTokens;

    // ========================================================================================================
    // EVENTS
    // ========================================================================================================

    event PriceUpdated(string indexed symbol, int256 price, uint80 roundId, uint256 timestamp);
    event TokenAdded(string indexed symbol, string name, address tokenAddress, int256 pegPrice);
    event PriceDeviation(string indexed symbol, int256 currentPrice, int256 pegPrice, uint256 deviationBps);
    event DeviationThresholdChanged(uint256 oldThreshold, uint256 newThreshold);
    event StalenessThresholdChanged(uint256 oldThreshold, uint256 newThreshold);

    // ========================================================================================================
    // ERRORS
    // ========================================================================================================

    error TokenNotSupported();
    error InvalidPrice();
    error PriceStale();
    error ExcessiveDeviation();

    // ========================================================================================================
    // CONSTRUCTOR
    // ========================================================================================================

    constructor(address _admin) {
        require(_admin != address(0), "Invalid admin address");
        require(block.chainid == CHAIN_ID, "Wrong chain");
        
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PRICE_UPDATER_ROLE, _admin);
        
        currentRoundId = 1;
        _initializeStablecoins();
    }

    // ========================================================================================================
    // PRICE FEED FUNCTIONS (Chainlink Compatible)
    // ========================================================================================================

    function latestRoundData(string calldata symbol) external view whenNotPaused returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
        PriceData storage data = prices[symbol];
        if (!data.isActive) revert TokenNotSupported();
        if (block.timestamp - data.updatedAt > stalenessThreshold) revert PriceStale();
        
        return (data.roundId, data.price, data.updatedAt, data.updatedAt, data.answeredInRound);
    }

    function getUSDPrice() external view whenNotPaused returns (int256) {
        PriceData storage data = prices["USD"];
        if (block.timestamp - data.updatedAt > stalenessThreshold) revert PriceStale();
        return data.price;
    }

    function getVUSDPrice() external view whenNotPaused returns (int256) {
        PriceData storage data = prices["VUSD"];
        if (block.timestamp - data.updatedAt > stalenessThreshold) revert PriceStale();
        return data.price;
    }

    function getPrice(string calldata symbol) external view whenNotPaused returns (int256) {
        PriceData storage data = prices[symbol];
        if (!data.isActive) revert TokenNotSupported();
        if (block.timestamp - data.updatedAt > stalenessThreshold) revert PriceStale();
        return data.price;
    }

    function getPriceData(string calldata symbol) external view returns (PriceData memory) {
        return prices[symbol];
    }

    function getRoundData(string calldata symbol, uint80 _roundId) external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound) {
        PriceData storage data = priceHistory[symbol][_roundId];
        return (_roundId, data.price, data.updatedAt, data.updatedAt, data.answeredInRound);
    }

    function decimals() external pure returns (uint8) {
        return DECIMALS;
    }

    function description(string calldata symbol) external view returns (string memory) {
        return prices[symbol].description;
    }

    // ========================================================================================================
    // PRICE UPDATE FUNCTIONS
    // ========================================================================================================

    function updatePrice(string calldata symbol, int256 price) external onlyRole(PRICE_UPDATER_ROLE) whenNotPaused {
        if (price <= 0) revert InvalidPrice();
        
        PriceData storage data = prices[symbol];
        if (!data.isActive) revert TokenNotSupported();
        
        TokenInfo storage token = tokens[symbol];
        if (token.isStablecoin) {
            uint256 deviation = _calculateDeviation(price, token.pegPrice);
            if (deviation > deviationThreshold) {
                emit PriceDeviation(symbol, price, token.pegPrice, deviation);
                if (deviation > deviationThreshold * 5) revert ExcessiveDeviation();
            }
        }
        
        currentRoundId++;
        
        data.price = price;
        data.updatedAt = block.timestamp;
        data.roundId = currentRoundId;
        data.answeredInRound = currentRoundId;
        
        priceHistory[symbol][currentRoundId] = data;
        
        emit PriceUpdated(symbol, price, currentRoundId, block.timestamp);
    }

    function batchUpdatePrices(string[] calldata symbols, int256[] calldata pricesArray) external onlyRole(PRICE_UPDATER_ROLE) whenNotPaused {
        require(symbols.length == pricesArray.length, "Length mismatch");
        require(symbols.length <= 10, "Too many updates");
        
        for (uint256 i = 0; i < symbols.length; i++) {
            if (pricesArray[i] <= 0) continue;
            
            PriceData storage data = prices[symbols[i]];
            if (!data.isActive) continue;
            
            currentRoundId++;
            
            data.price = pricesArray[i];
            data.updatedAt = block.timestamp;
            data.roundId = currentRoundId;
            data.answeredInRound = currentRoundId;
            
            priceHistory[symbols[i]][currentRoundId] = data;
            
            emit PriceUpdated(symbols[i], pricesArray[i], currentRoundId, block.timestamp);
        }
    }

    // ========================================================================================================
    // TOKEN MANAGEMENT
    // ========================================================================================================

    function addToken(string calldata symbol, string calldata name, address tokenAddress, uint8 tokenDecimals, bool isStablecoin, int256 pegPrice) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokens[symbol] = TokenInfo({
            symbol: symbol,
            name: name,
            tokenAddress: tokenAddress,
            decimals: tokenDecimals,
            isStablecoin: isStablecoin,
            pegPrice: pegPrice
        });
        
        prices[symbol] = PriceData({
            price: pegPrice,
            updatedAt: block.timestamp,
            roundId: currentRoundId,
            answeredInRound: currentRoundId,
            description: string(abi.encodePacked(symbol, " / USD")),
            isActive: true
        });
        
        supportedTokens.push(symbol);
        
        emit TokenAdded(symbol, name, tokenAddress, pegPrice);
    }

    function setTokenActive(string calldata symbol, bool isActive) external onlyRole(DEFAULT_ADMIN_ROLE) {
        prices[symbol].isActive = isActive;
    }

    // ========================================================================================================
    // VIEW FUNCTIONS
    // ========================================================================================================

    function getSupportedTokens() external view returns (string[] memory) {
        return supportedTokens;
    }

    function getTokenInfo(string calldata symbol) external view returns (TokenInfo memory) {
        return tokens[symbol];
    }

    function isTokenSupported(string calldata symbol) external view returns (bool) {
        return prices[symbol].isActive;
    }

    function isPriceStale(string calldata symbol) external view returns (bool) {
        return block.timestamp - prices[symbol].updatedAt > stalenessThreshold;
    }

    function getDeviationFromPeg(string calldata symbol) external view returns (uint256) {
        TokenInfo storage token = tokens[symbol];
        if (!token.isStablecoin) return 0;
        return _calculateDeviation(prices[symbol].price, token.pegPrice);
    }

    function getAllPrices() external view returns (string[] memory symbols, int256[] memory pricesArray, uint256[] memory timestamps) {
        uint256 len = supportedTokens.length;
        symbols = new string[](len);
        pricesArray = new int256[](len);
        timestamps = new uint256[](len);
        
        for (uint256 i = 0; i < len; i++) {
            symbols[i] = supportedTokens[i];
            pricesArray[i] = prices[supportedTokens[i]].price;
            timestamps[i] = prices[supportedTokens[i]].updatedAt;
        }
    }

    // ========================================================================================================
    // ADMIN FUNCTIONS
    // ========================================================================================================

    function setDeviationThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold >= 10 && _threshold <= 1000, "Invalid threshold");
        uint256 oldThreshold = deviationThreshold;
        deviationThreshold = _threshold;
        emit DeviationThresholdChanged(oldThreshold, _threshold);
    }

    function setStalenessThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_threshold >= 5 minutes && _threshold <= 24 hours, "Invalid threshold");
        uint256 oldThreshold = stalenessThreshold;
        stalenessThreshold = _threshold;
        emit StalenessThresholdChanged(oldThreshold, _threshold);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ========================================================================================================
    // INTERNAL FUNCTIONS
    // ========================================================================================================

    function _calculateDeviation(int256 current, int256 peg) internal pure returns (uint256) {
        if (peg == 0) return 0;
        int256 diff = current > peg ? current - peg : peg - current;
        return uint256(diff * 10000 / peg);
    }

    function _initializeStablecoins() internal {
        // USD Tokenized
        tokens["USD"] = TokenInfo({
            symbol: "USD",
            name: "USD Tokenized",
            tokenAddress: address(0),
            decimals: 6,
            isStablecoin: true,
            pegPrice: ONE_USD
        });
        
        prices["USD"] = PriceData({
            price: ONE_USD,
            updatedAt: block.timestamp,
            roundId: currentRoundId,
            answeredInRound: currentRoundId,
            description: "USD / USD",
            isActive: true
        });
        
        supportedTokens.push("USD");
        
        // VUSD - Virtual USD
        tokens["VUSD"] = TokenInfo({
            symbol: "VUSD",
            name: "Virtual USD",
            tokenAddress: VUSD_CONTRACT,
            decimals: 6,
            isStablecoin: true,
            pegPrice: ONE_USD
        });
        
        prices["VUSD"] = PriceData({
            price: ONE_USD,
            updatedAt: block.timestamp,
            roundId: currentRoundId,
            answeredInRound: currentRoundId,
            description: "VUSD / USD",
            isActive: true
        });
        
        supportedTokens.push("VUSD");
        
        // USDT
        tokens["USDT"] = TokenInfo({
            symbol: "USDT",
            name: "Tether USD",
            tokenAddress: address(0),
            decimals: 6,
            isStablecoin: true,
            pegPrice: ONE_USD
        });
        
        prices["USDT"] = PriceData({
            price: ONE_USD,
            updatedAt: block.timestamp,
            roundId: currentRoundId,
            answeredInRound: currentRoundId,
            description: "USDT / USD",
            isActive: true
        });
        
        supportedTokens.push("USDT");
        
        // USDC
        tokens["USDC"] = TokenInfo({
            symbol: "USDC",
            name: "USD Coin",
            tokenAddress: address(0),
            decimals: 6,
            isStablecoin: true,
            pegPrice: ONE_USD
        });
        
        prices["USDC"] = PriceData({
            price: ONE_USD,
            updatedAt: block.timestamp,
            roundId: currentRoundId,
            answeredInRound: currentRoundId,
            description: "USDC / USD",
            isActive: true
        });
        
        supportedTokens.push("USDC");
        
        emit TokenAdded("USD", "USD Tokenized", address(0), ONE_USD);
        emit TokenAdded("VUSD", "Virtual USD", VUSD_CONTRACT, ONE_USD);
        emit TokenAdded("USDT", "Tether USD", address(0), ONE_USD);
        emit TokenAdded("USDC", "USD Coin", address(0), ONE_USD);
    }
}
