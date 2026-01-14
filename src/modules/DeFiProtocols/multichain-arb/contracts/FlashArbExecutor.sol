// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title FlashArbExecutor
 * @notice Ejecutor de arbitraje con Flash Loans de Uniswap V3
 * @dev Usa flash swaps para arbitraje sin capital inicial
 */

// Interface para Uniswap V3 Pool (Flash)
interface IUniswapV3Pool {
    function flash(
        address recipient,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
    
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

contract FlashArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    IUniswapV3Factory public immutable factory;
    
    uint256 public totalFlashTrades;
    uint256 public totalFlashProfit;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event FlashArbExecuted(
        address indexed pool,
        address indexed tokenBorrowed,
        uint256 amountBorrowed,
        uint256 profit,
        uint256 timestamp
    );
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MODIFIERS
    // ═══════════════════════════════════════════════════════════════════════════
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    constructor(address _swapRouter, address _factory) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
        factory = IUniswapV3Factory(_factory);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FLASH ARB EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    struct FlashParams {
        address tokenBorrow;    // Token a pedir prestado
        address tokenMid;       // Token intermedio
        address tokenRepay;     // Token para repagar (igual a tokenBorrow)
        uint24 poolFee;         // Fee del pool de flash
        uint24 fee1;            // Fee primer swap
        uint24 fee2;            // Fee segundo swap
        uint256 amount;         // Cantidad a pedir prestada
        uint256 minProfit;      // Ganancia mínima requerida
    }
    
    /**
     * @notice Inicia un flash arbitrage
     * @param params Parámetros del flash arb
     */
    function executeFlashArb(FlashParams calldata params) external onlyOwner {
        // Obtener el pool para el flash loan
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(pool != address(0), "Pool not found");
        
        IUniswapV3Pool uniPool = IUniswapV3Pool(pool);
        
        // Determinar si token0 o token1
        bool isToken0 = uniPool.token0() == params.tokenBorrow;
        
        uint256 amount0 = isToken0 ? params.amount : 0;
        uint256 amount1 = isToken0 ? 0 : params.amount;
        
        // Encodear datos para el callback
        bytes memory data = abi.encode(params);
        
        // Ejecutar flash
        uniPool.flash(address(this), amount0, amount1, data);
    }
    
    /**
     * @notice Callback de Uniswap V3 Flash
     * @dev Llamado por el pool después de transferir los tokens
     */
    function uniswapV3FlashCallback(
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external {
        FlashParams memory params = abi.decode(data, (FlashParams));
        
        // Verificar que el caller es un pool válido
        address pool = factory.getPool(params.tokenBorrow, params.tokenMid, params.poolFee);
        require(msg.sender == pool, "Invalid callback");
        
        uint256 fee = fee0 > 0 ? fee0 : fee1;
        uint256 amountOwed = params.amount + fee;
        
        // Ejecutar arbitraje
        uint256 balanceBefore = IERC20(params.tokenBorrow).balanceOf(address(this));
        
        // Swap 1: tokenBorrow -> tokenMid
        IERC20(params.tokenBorrow).approve(address(swapRouter), params.amount);
        
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenBorrow,
                tokenOut: params.tokenMid,
                fee: params.fee1,
                recipient: address(this),
                amountIn: params.amount,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Swap 2: tokenMid -> tokenRepay
        IERC20(params.tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 finalAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: params.tokenMid,
                tokenOut: params.tokenRepay,
                fee: params.fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountOwed + params.minProfit,
                sqrtPriceLimitX96: 0
            })
        );
        
        // Verificar profit
        require(finalAmount >= amountOwed + params.minProfit, "Insufficient profit");
        
        // Repagar el flash loan
        IERC20(params.tokenBorrow).transfer(msg.sender, amountOwed);
        
        // Calcular y registrar profit
        uint256 profit = finalAmount - amountOwed;
        totalFlashTrades++;
        totalFlashProfit += profit;
        
        // Enviar profit al owner
        if (profit > 0) {
            IERC20(params.tokenBorrow).transfer(owner, profit);
        }
        
        emit FlashArbExecuted(pool, params.tokenBorrow, params.amount, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(owner, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalFlashTrades, totalFlashProfit);
    }
    
    receive() external payable {}
}





