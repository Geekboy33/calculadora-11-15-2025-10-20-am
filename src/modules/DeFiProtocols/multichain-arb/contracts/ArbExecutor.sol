// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-CHAIN MICRO ARBITRAGE BOT - EXECUTOR CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════
//
// This contract executes atomic arbitrage trades:
// 1. Receives tokens from the bot
// 2. Executes two swaps (tokenIn -> tokenMid -> tokenOut)
// 3. Validates minimum profit
// 4. Returns profit to the owner
// ═══════════════════════════════════════════════════════════════════════════════

// Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

contract ArbExecutor is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────

    ISwapRouter public immutable swapRouter;

    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;

    // ─────────────────────────────────────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────────────────────────────────────

    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );

    event TokensWithdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTION
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Execute a two-leg arbitrage trade
     * @param path1 Encoded path for first swap (tokenIn -> tokenMid)
     * @param path2 Encoded path for second swap (tokenMid -> tokenOut)
     * @param amountIn Amount of tokenIn to swap
     * @param minOut Minimum amount of tokenOut expected
     * @param deadline Transaction deadline timestamp
     * @return amountOut The actual amount of tokenOut received
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");
        require(amountIn > 0, "Amount must be > 0");
        require(minOut > amountIn, "minOut must be > amountIn for profit");

        totalTrades++;

        // Extract tokenIn from path1 (first 20 bytes)
        address tokenIn = _extractToken(path1, 0);

        // Pull tokens from sender
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        // Execute first swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0 // We check final output, not intermediate
            })
        );

        require(midAmount > 0, "First swap returned 0");

        // Extract tokenMid from path2 (first 20 bytes)
        address tokenMid = _extractToken(path2, 0);

        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        // Execute second swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut from path2 (last 20 bytes)
        address tokenOut = _extractToken(path2, path2.length - 20);

        // Calculate profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");

        // Transfer output back to owner
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }

    /**
     * @notice Execute with callback (for flash-style execution)
     * @dev Same as execute but expects tokens to be in contract already
     */
    function executeWithCallback(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner nonReentrant returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Transaction expired");

        totalTrades++;

        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);

        // Check we have enough tokens
        uint256 balance = IERC20(tokenIn).balanceOf(address(this));
        require(balance >= amountIn, "Insufficient token balance");

        // Approve and execute first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);

        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );

        // Extract tokenMid and execute second swap
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );

        require(amountOut >= minOut, "Insufficient output");

        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        // Update statistics
        if (amountOut > amountIn) {
            successfulTrades++;
            totalProfitWei += (amountOut - amountIn);
        }

        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, amountOut > amountIn ? amountOut - amountIn : 0, block.timestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Withdraw tokens from the contract
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }

    /**
     * @notice Withdraw all of a specific token
     * @param token Token address to withdraw
     */
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }

    /**
     * @notice Withdraw native token (ETH/MATIC)
     */
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }

    /**
     * @notice Emergency function to rescue stuck tokens
     * @param token Token address
     * @param to Recipient address
     * @param amount Amount to rescue
     */
    function rescueTokens(address token, address to, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei,
        uint256 _successRate
    ) {
        _totalTrades = totalTrades;
        _successfulTrades = successfulTrades;
        _totalProfitWei = totalProfitWei;
        _successRate = totalTrades > 0 ? (successfulTrades * 100) / totalTrades : 0;
    }

    /**
     * @notice Get token balance in contract
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * @notice Extract token address from encoded path
     * @param path Encoded path bytes
     * @param offset Byte offset to start reading from
     */
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path length");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }

    // Allow receiving native token
    receive() external payable {}
}




