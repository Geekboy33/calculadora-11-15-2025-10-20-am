// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IMultiStablecoinOracle
 * @author Digital Commercial Bank Ltd
 * @notice Interface for the Multi-Stablecoin Price Oracle
 */
interface IMultiStablecoinOracle {
    
    /**
     * @notice Gets price for a specific stablecoin
     * @param symbol Token symbol (e.g., "USDT", "USDC", "LUSD")
     * @return price Current price (6 decimals)
     * @return decimals Price decimals
     * @return timestamp Last update timestamp
     */
    function getPrice(string calldata symbol) 
        external 
        view 
        returns (uint256 price, uint8 decimals, uint256 timestamp);
    
    /**
     * @notice Gets weighted average price from all active feeds
     * @return price Average price (6 decimals)
     * @return decimals Price decimals
     */
    function getAveragePrice() external view returns (uint256 price, uint8 decimals);
    
    /**
     * @notice Checks if a stablecoin is healthy (within acceptable deviation from $1)
     * @param symbol Token symbol
     * @return isHealthy True if within acceptable range
     */
    function isStablecoinHealthy(string calldata symbol) external view returns (bool isHealthy);
    
    /**
     * @notice Updates price for a single stablecoin
     * @param symbol Token symbol
     * @param newPrice New price (6 decimals)
     */
    function updatePrice(string calldata symbol, uint256 newPrice) external;
    
    /**
     * @notice Batch updates prices for multiple stablecoins
     * @param symbols Array of symbols
     * @param prices Array of prices
     */
    function batchUpdatePrices(string[] calldata symbols, uint256[] calldata prices) external;
    
    /**
     * @notice Gets all feed symbols
     * @return Array of symbol strings
     */
    function getAllSymbols() external view returns (string[] memory);
    
    /**
     * @notice Gets oracle statistics
     */
    function getStatistics() external view returns (
        uint256 totalFeeds,
        uint256 activeFeeds,
        uint256 totalWeight,
        uint256 averagePrice,
        uint256 healthyCount
    );
}
