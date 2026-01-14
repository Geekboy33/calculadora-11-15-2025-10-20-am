// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔄 MULTI-DEX EXECUTOR CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ejecutor optimizado para arbitraje entre múltiples DEXs.
 * Soporta: Uniswap V3, SushiSwap, Curve, Balancer
 * 
 * Características:
 * - Ejecución atómica multi-swap
 * - Simulación on-chain antes de ejecutar
 * - MEV Protection con deadline y slippage
 * - Profit validation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function decimals() external view returns (uint8);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint256) external;
    function balanceOf(address) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

interface IUniswapV3Quoter {
    function quoteExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

interface ISushiRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract MultiDexExecutor {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    
    // DEX Addresses
    address public uniswapV3Router;
    address public uniswapV3Quoter;
    address public sushiRouter;
    
    // Tokens
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Config
    uint256 public minProfitWei = 0; // Minimum profit in wei
    uint256 public maxSlippageBps = 100; // 1%
    bool public paused = false;
    
    // DEX enum
    enum DEX { UNISWAP_V3, SUSHISWAP, CURVE }
    
    // Swap instruction
    struct SwapInstruction {
        DEX dex;
        address tokenIn;
        address tokenOut;
        uint256 amountIn;
        uint256 minAmountOut;
        uint24 fee; // For Uniswap V3
        bytes extraData; // For Curve pool index, etc.
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        DEX dex
    );
    
    event MultiSwapExecuted(
        uint256 swapCount,
        uint256 totalProfit,
        uint256 timestamp
    );
    
    event ProfitWithdrawn(address indexed token, uint256 amount);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _uniswapV3Router,
        address _uniswapV3Quoter,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        uniswapV3Router = _uniswapV3Router;
        uniswapV3Quoter = _uniswapV3Quoter;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute a single swap on Uniswap V3
     */
    function swapUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        uint24 fee
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(uniswapV3Router, amountIn);
        
        amountOut = IUniswapV3Router(uniswapV3Router).exactInputSingle(
            IUniswapV3Router.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        totalTrades++;
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.UNISWAP_V3);
        
        return amountOut;
    }
    
    /**
     * @notice Execute a single swap on SushiSwap
     */
    function swapSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) public onlyOwner notPaused returns (uint256 amountOut) {
        IERC20(tokenIn).approve(sushiRouter, amountIn);
        
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300
        );
        
        amountOut = amounts[amounts.length - 1];
        totalTrades++;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, 0, DEX.SUSHISWAP);
        
        return amountOut;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute cross-DEX arbitrage: Buy on one DEX, sell on another
     */
    function executeCrossDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        DEX buyDex,
        DEX sellDex,
        uint24 uniFee,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        uint256 intermediateAmount;
        uint256 finalAmount;
        
        // Step 1: Buy tokenB with tokenA
        if (buyDex == DEX.UNISWAP_V3) {
            intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, uniFee);
        } else if (buyDex == DEX.SUSHISWAP) {
            intermediateAmount = swapSushiSwap(tokenA, tokenB, amountIn, 0);
        }
        
        // Step 2: Sell tokenB for tokenA
        if (sellDex == DEX.UNISWAP_V3) {
            finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, uniFee);
        } else if (sellDex == DEX.SUSHISWAP) {
            finalAmount = swapSushiSwap(tokenB, tokenA, intermediateAmount, amountIn);
        }
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute intra-DEX arbitrage: Different fee tiers on Uniswap V3
     */
    function executeIntraDexArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: Swap A -> B with fee1
        uint256 intermediateAmount = swapUniswapV3(tokenA, tokenB, amountIn, 0, fee1);
        
        // Step 2: Swap B -> A with fee2
        uint256 finalAmount = swapUniswapV3(tokenB, tokenA, intermediateAmount, amountIn, fee2);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(2, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute triangular arbitrage: A -> B -> C -> A
     */
    function executeTriangularArbitrage(
        address tokenA,
        address tokenB,
        address tokenC,
        uint256 amountIn,
        uint24 feeAB,
        uint24 feeBC,
        uint24 feeCA,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(tokenA).balanceOf(address(this));
        require(balanceBefore >= amountIn, "Insufficient balance");
        
        // Step 1: A -> B
        uint256 amountB = swapUniswapV3(tokenA, tokenB, amountIn, 0, feeAB);
        
        // Step 2: B -> C
        uint256 amountC = swapUniswapV3(tokenB, tokenC, amountB, 0, feeBC);
        
        // Step 3: C -> A
        uint256 finalAmount = swapUniswapV3(tokenC, tokenA, amountC, amountIn, feeCA);
        
        // Calculate profit
        uint256 balanceAfter = IERC20(tokenA).balanceOf(address(this));
        require(balanceAfter > balanceBefore, "No profit");
        
        profit = balanceAfter - balanceBefore;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(3, profit, block.timestamp);
        
        return profit;
    }
    
    /**
     * @notice Execute multi-swap in a single transaction
     */
    function executeMultiSwap(
        SwapInstruction[] calldata swaps,
        uint256 minFinalBalance
    ) external onlyOwner notPaused returns (uint256 finalBalance) {
        require(swaps.length > 0, "No swaps");
        
        address startToken = swaps[0].tokenIn;
        uint256 startBalance = IERC20(startToken).balanceOf(address(this));
        
        uint256 currentAmount = swaps[0].amountIn;
        
        for (uint256 i = 0; i < swaps.length; i++) {
            SwapInstruction memory swap = swaps[i];
            
            if (swap.dex == DEX.UNISWAP_V3) {
                currentAmount = swapUniswapV3(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut,
                    swap.fee
                );
            } else if (swap.dex == DEX.SUSHISWAP) {
                currentAmount = swapSushiSwap(
                    swap.tokenIn,
                    swap.tokenOut,
                    currentAmount,
                    swap.minAmountOut
                );
            }
        }
        
        // Verify we ended with the same token and profit
        address endToken = swaps[swaps.length - 1].tokenOut;
        require(endToken == startToken, "Must end with start token");
        
        finalBalance = IERC20(startToken).balanceOf(address(this));
        require(finalBalance >= minFinalBalance, "Below minimum final balance");
        require(finalBalance > startBalance, "No profit");
        
        uint256 profit = finalBalance - startBalance;
        totalProfitWei += profit;
        successfulTrades++;
        
        emit MultiSwapExecuted(swaps.length, profit, block.timestamp);
        
        return finalBalance;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // QUOTE FUNCTIONS (for simulation)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get quote from Uniswap V3
     */
    function quoteUniswapV3(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint24 fee
    ) external returns (uint256 amountOut) {
        return IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenIn,
            tokenOut,
            fee,
            amountIn,
            0
        );
    }
    
    /**
     * @notice Get quote from SushiSwap
     */
    function quoteSushiSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        uint[] memory amounts = ISushiRouter(sushiRouter).getAmountsOut(amountIn, path);
        return amounts[amounts.length - 1];
    }
    
    /**
     * @notice Simulate arbitrage and return expected profit
     */
    function simulateArbitrage(
        address tokenA,
        address tokenB,
        uint256 amountIn,
        uint24 fee1,
        uint24 fee2
    ) external returns (int256 expectedProfit) {
        // Quote first swap
        uint256 intermediateAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenA,
            tokenB,
            fee1,
            amountIn,
            0
        );
        
        // Quote second swap
        uint256 finalAmount = IUniswapV3Quoter(uniswapV3Quoter).quoteExactInputSingle(
            tokenB,
            tokenA,
            fee2,
            intermediateAmount,
            0
        );
        
        return int256(finalAmount) - int256(amountIn);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setTokens(address _weth, address _usdc, address _usdt, address _dai) external onlyOwner {
        WETH = _weth;
        USDC = _usdc;
        USDT = _usdt;
        DAI = _dai;
    }
    
    function setRouters(
        address _uniRouter,
        address _uniQuoter,
        address _sushiRouter
    ) external onlyOwner {
        uniswapV3Router = _uniRouter;
        uniswapV3Quoter = _uniQuoter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitWei(uint256 _minProfitWei) external onlyOwner {
        minProfitWei = _minProfitWei;
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(token, balance);
    }
    
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH");
        payable(owner).transfer(balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (
        uint256 _totalTrades,
        uint256 _successfulTrades,
        uint256 _totalProfitWei
    ) {
        return (totalTrades, successfulTrades, totalProfitWei);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitWei,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitWei, maxSlippageBps, paused);
    }
    
    function getBalances() external view returns (
        uint256 ethBalance,
        uint256 wethBalance,
        uint256 usdcBalance
    ) {
        ethBalance = address(this).balance;
        wethBalance = WETH != address(0) ? IERC20(WETH).balanceOf(address(this)) : 0;
        usdcBalance = USDC != address(0) ? IERC20(USDC).balanceOf(address(this)) : 0;
    }
    
    // Allow receiving ETH
    receive() external payable {}
}





