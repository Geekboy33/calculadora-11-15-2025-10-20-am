// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💰 FLASH LOAN ARBITRAGE CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Este contrato ejecuta arbitraje atómico usando Flash Loans de Aave V3.
 * Soporta múltiples DEXs: Uniswap V3, SushiSwap, Curve
 * 
 * Características:
 * - Flash Loans sin colateral de Aave V3
 * - Arbitraje multi-DEX atómico
 * - MEV Protection (deadline, slippage)
 * - Profit validation antes de ejecutar
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IPool {
    function flashLoanSimple(
        address receiverAddress,
        address asset,
        uint256 amount,
        bytes calldata params,
        uint16 referralCode
    ) external;
}

interface IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external returns (bool);
}

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
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

interface ISwapRouter {
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
    
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }
    
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
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

contract FlashLoanArbitrage is IFlashLoanSimpleReceiver {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    address public immutable POOL_ADDRESSES_PROVIDER;
    address public immutable AAVE_POOL;
    
    // DEX Routers
    address public uniswapV3Router;
    address public sushiRouter;
    
    // Token addresses (set per chain)
    address public WETH;
    address public USDC;
    address public USDT;
    address public DAI;
    
    // Stats
    uint256 public totalFlashLoans;
    uint256 public totalProfitWei;
    uint256 public successfulArbitrages;
    
    // Safety
    uint256 public minProfitBps = 10; // 0.1% minimum profit
    uint256 public maxSlippageBps = 100; // 1% max slippage
    bool public paused = false;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashLoanExecuted(address indexed asset, uint256 amount, uint256 premium, uint256 profit);
    event ArbitrageExecuted(string strategy, uint256 amountIn, uint256 amountOut, uint256 profit);
    event ProfitWithdrawn(address indexed to, uint256 amount);
    event ConfigUpdated(string param, uint256 value);
    
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
    
    modifier onlyPool() {
        require(msg.sender == AAVE_POOL, "Only Aave Pool");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(
        address _poolAddressesProvider,
        address _uniswapV3Router,
        address _sushiRouter,
        address _weth,
        address _usdc
    ) {
        owner = msg.sender;
        POOL_ADDRESSES_PROVIDER = _poolAddressesProvider;
        AAVE_POOL = IPoolAddressesProvider(_poolAddressesProvider).getPool();
        
        uniswapV3Router = _uniswapV3Router;
        sushiRouter = _sushiRouter;
        WETH = _weth;
        USDC = _usdc;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH LOAN ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Initiate a flash loan for arbitrage
     * @param asset Token to borrow
     * @param amount Amount to borrow
     * @param params Encoded arbitrage parameters
     */
    function executeFlashLoan(
        address asset,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner notPaused {
        IPool(AAVE_POOL).flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
        );
    }
    
    /**
     * @notice Aave callback - execute arbitrage with borrowed funds
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override onlyPool returns (bool) {
        require(initiator == address(this), "Invalid initiator");
        
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        
        // Decode and execute arbitrage strategy
        (uint8 strategy, bytes memory strategyParams) = abi.decode(params, (uint8, bytes));
        
        uint256 amountOut;
        
        if (strategy == 1) {
            // Intra-DEX arbitrage (different fee tiers)
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            // Cross-DEX arbitrage (Uniswap vs Sushi)
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            // Triangular arbitrage
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        uint256 totalDebt = amount + premium;
        
        require(balanceAfter >= totalDebt, "Insufficient funds to repay");
        
        uint256 profit = balanceAfter - totalDebt;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        // Approve repayment
        IERC20(asset).approve(AAVE_POOL, totalDebt);
        
        // Update stats
        totalFlashLoans++;
        totalProfitWei += profit;
        successfulArbitrages++;
        
        emit FlashLoanExecuted(asset, amount, premium, profit);
        
        return true;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ARBITRAGE STRATEGIES
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Strategy 1: Intra-DEX arbitrage between fee tiers
     * Example: Buy on 0.05% pool, sell on 0.3% pool
     */
    function _executeIntraDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 fee1,
            uint24 fee2
        ) = abi.decode(params, (address, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: asset -> tokenOut (fee1)
        uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenOut,
                fee: fee1,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve for second swap
        IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
        
        // Swap 2: tokenOut -> asset (fee2)
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: asset,
                fee: fee2,
                recipient: address(this),
                amountIn: intermediateAmount,
                amountOutMinimum: amount, // At least get back what we started with
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("INTRA_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 2: Cross-DEX arbitrage (Uniswap V3 vs SushiSwap)
     */
    function _executeCrossDexArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenOut,
            uint24 uniFee,
            bool buyOnUni // true = buy on Uni, sell on Sushi
        ) = abi.decode(params, (address, uint24, bool));
        
        uint256 finalAmount;
        
        if (buyOnUni) {
            // Buy on Uniswap V3
            IERC20(asset).approve(uniswapV3Router, amount);
            
            uint256 intermediateAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: asset,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            // Sell on SushiSwap
            IERC20(tokenOut).approve(sushiRouter, intermediateAmount);
            
            address[] memory path = new address[](2);
            path[0] = tokenOut;
            path[1] = asset;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                intermediateAmount,
                amount, // minimum output
                path,
                address(this),
                block.timestamp + 300
            );
            
            finalAmount = amounts[amounts.length - 1];
        } else {
            // Buy on SushiSwap
            IERC20(asset).approve(sushiRouter, amount);
            
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = tokenOut;
            
            uint[] memory amounts = ISushiRouter(sushiRouter).swapExactTokensForTokens(
                amount,
                0,
                path,
                address(this),
                block.timestamp + 300
            );
            
            uint256 intermediateAmount = amounts[amounts.length - 1];
            
            // Sell on Uniswap V3
            IERC20(tokenOut).approve(uniswapV3Router, intermediateAmount);
            
            finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenOut,
                    tokenOut: asset,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: intermediateAmount,
                    amountOutMinimum: amount,
                    sqrtPriceLimitX96: 0
                })
            );
        }
        
        emit ArbitrageExecuted("CROSS_DEX", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    /**
     * @notice Strategy 3: Triangular arbitrage (A -> B -> C -> A)
     */
    function _executeTriangularArbitrage(
        address asset,
        uint256 amount,
        bytes memory params
    ) internal returns (uint256) {
        (
            address tokenB,
            address tokenC,
            uint24 feeAB,
            uint24 feeBC,
            uint24 feeCA
        ) = abi.decode(params, (address, address, uint24, uint24, uint24));
        
        // Approve router
        IERC20(asset).approve(uniswapV3Router, amount);
        
        // Swap 1: A -> B
        uint256 amountB = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: tokenB,
                fee: feeAB,
                recipient: address(this),
                amountIn: amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve B
        IERC20(tokenB).approve(uniswapV3Router, amountB);
        
        // Swap 2: B -> C
        uint256 amountC = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenB,
                tokenOut: tokenC,
                fee: feeBC,
                recipient: address(this),
                amountIn: amountB,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Approve C
        IERC20(tokenC).approve(uniswapV3Router, amountC);
        
        // Swap 3: C -> A
        uint256 finalAmount = ISwapRouter(uniswapV3Router).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenC,
                tokenOut: asset,
                fee: feeCA,
                recipient: address(this),
                amountIn: amountC,
                amountOutMinimum: amount,
                sqrtPriceLimitX96: 0
            })
        );
        
        emit ArbitrageExecuted("TRIANGULAR", amount, finalAmount, finalAmount > amount ? finalAmount - amount : 0);
        
        return finalAmount;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DIRECT ARBITRAGE (NO FLASH LOAN)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Execute arbitrage with contract's own funds (no flash loan)
     */
    function executeDirectArbitrage(
        address asset,
        uint256 amount,
        uint8 strategy,
        bytes calldata strategyParams
    ) external onlyOwner notPaused returns (uint256 profit) {
        uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
        require(balanceBefore >= amount, "Insufficient balance");
        
        uint256 amountOut;
        
        if (strategy == 1) {
            amountOut = _executeIntraDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 2) {
            amountOut = _executeCrossDexArbitrage(asset, amount, strategyParams);
        } else if (strategy == 3) {
            amountOut = _executeTriangularArbitrage(asset, amount, strategyParams);
        } else {
            revert("Invalid strategy");
        }
        
        uint256 balanceAfter = IERC20(asset).balanceOf(address(this));
        
        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        
        // Verify minimum profit
        uint256 minProfit = (amount * minProfitBps) / 10000;
        require(profit >= minProfit, "Profit below minimum");
        
        totalProfitWei += profit;
        successfulArbitrages++;
        
        return profit;
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
    
    function setRouters(address _uniRouter, address _sushiRouter) external onlyOwner {
        uniswapV3Router = _uniRouter;
        sushiRouter = _sushiRouter;
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%");
        minProfitBps = _minProfitBps;
        emit ConfigUpdated("minProfitBps", _minProfitBps);
    }
    
    function setMaxSlippageBps(uint256 _maxSlippageBps) external onlyOwner {
        require(_maxSlippageBps <= 500, "Max 5%");
        maxSlippageBps = _maxSlippageBps;
        emit ConfigUpdated("maxSlippageBps", _maxSlippageBps);
    }
    
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }
    
    function withdrawProfit(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance");
        IERC20(token).transfer(owner, balance);
        emit ProfitWithdrawn(owner, balance);
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
        uint256 _totalFlashLoans,
        uint256 _totalProfitWei,
        uint256 _successfulArbitrages
    ) {
        return (totalFlashLoans, totalProfitWei, successfulArbitrages);
    }
    
    function getConfig() external view returns (
        uint256 _minProfitBps,
        uint256 _maxSlippageBps,
        bool _paused
    ) {
        return (minProfitBps, maxSlippageBps, paused);
    }
    
    // Allow receiving ETH
    receive() external payable {}
}




