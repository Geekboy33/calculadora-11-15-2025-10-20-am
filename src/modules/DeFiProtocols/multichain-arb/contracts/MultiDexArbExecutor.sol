// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title MultiDexArbExecutor
 * @notice Ejecutor de arbitraje entre múltiples DEXs
 * @dev Soporta Uniswap V3, Curve, y otros DEXs
 */

// Interface para Curve StableSwap
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract MultiDexArbExecutor {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENUMS & STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    enum DexType { UNISWAP_V3, CURVE, BALANCER }
    
    struct SwapStep {
        DexType dex;
        address pool;           // Pool address (for Curve) or router (for Uniswap)
        address tokenIn;
        address tokenOut;
        uint24 fee;             // For Uniswap V3
        int128 curveIndexIn;    // For Curve
        int128 curveIndexOut;   // For Curve
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public uniswapRouter;
    
    uint256 public totalMultiDexTrades;
    uint256 public totalMultiDexProfit;
    
    // Routers registrados
    mapping(DexType => address) public dexRouters;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event MultiDexArbExecuted(
        uint256 indexed tradeId,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint8 numSteps
    );
    
    event DexRouterUpdated(DexType indexed dex, address router);
    
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
    
    constructor(address _uniswapRouter) {
        owner = msg.sender;
        uniswapRouter = ISwapRouter(_uniswapRouter);
        dexRouters[DexType.UNISWAP_V3] = _uniswapRouter;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function setDexRouter(DexType dex, address router) external onlyOwner {
        dexRouters[dex] = router;
        emit DexRouterUpdated(dex, router);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DEX EXECUTION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje multi-DEX
     * @param steps Array de pasos de swap
     * @param amountIn Cantidad inicial
     * @param minOut Cantidad mínima de salida
     */
    function executeMultiDex(
        SwapStep[] calldata steps,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        require(steps.length >= 2, "Min 2 steps");
        require(amountIn > 0, "Zero amount");
        
        totalMultiDexTrades++;
        
        // Transferir token inicial
        IERC20(steps[0].tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 currentAmount = amountIn;
        
        // Ejecutar cada paso
        for (uint256 i = 0; i < steps.length; i++) {
            SwapStep calldata step = steps[i];
            
            if (step.dex == DexType.UNISWAP_V3) {
                currentAmount = _swapUniswapV3(step, currentAmount);
            } else if (step.dex == DexType.CURVE) {
                currentAmount = _swapCurve(step, currentAmount);
            }
            
            require(currentAmount > 0, "Swap failed");
        }
        
        amountOut = currentAmount;
        require(amountOut >= minOut, "Insufficient output");
        
        // Calcular profit
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        address tokenOut = steps[steps.length - 1].tokenOut;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, uint8(steps.length));
    }
    
    /**
     * @notice Ejecuta arbitraje Curve vs Uniswap
     * @dev Compra en Curve, vende en Uniswap (o viceversa)
     */
    function executeCurveUniswapArb(
        address curvePool,
        int128 curveIndexIn,
        int128 curveIndexOut,
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 uniFee,
        uint256 amountIn,
        uint256 minOut,
        bool curveFirst
    ) external onlyOwner returns (uint256 amountOut) {
        totalMultiDexTrades++;
        
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        uint256 midAmount;
        
        if (curveFirst) {
            // Curve -> Uniswap
            IERC20(tokenIn).approve(curvePool, amountIn);
            midAmount = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, amountIn, 0);
            
            IERC20(tokenMid).approve(address(uniswapRouter), midAmount);
            amountOut = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenOut,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: midAmount,
                    amountOutMinimum: minOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else {
            // Uniswap -> Curve
            IERC20(tokenIn).approve(address(uniswapRouter), amountIn);
            midAmount = uniswapRouter.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: tokenIn,
                    tokenOut: tokenMid,
                    fee: uniFee,
                    recipient: address(this),
                    amountIn: amountIn,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            );
            
            IERC20(tokenMid).approve(curvePool, midAmount);
            amountOut = ICurvePool(curvePool).exchange(curveIndexIn, curveIndexOut, midAmount, minOut);
        }
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            totalMultiDexProfit += profit;
        }
        
        emit MultiDexArbExecuted(totalMultiDexTrades, amountIn, amountOut, profit, 2);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL SWAP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _swapUniswapV3(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(address(uniswapRouter), amountIn);
        
        return uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: step.tokenIn,
                tokenOut: step.tokenOut,
                fee: step.fee,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
    }
    
    function _swapCurve(SwapStep calldata step, uint256 amountIn) internal returns (uint256) {
        IERC20(step.tokenIn).approve(step.pool, amountIn);
        
        return ICurvePool(step.pool).exchange(
            step.curveIndexIn,
            step.curveIndexOut,
            amountIn,
            0
        );
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid");
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW
    // ═══════════════════════════════════════════════════════════════════════════
    
    function getStats() external view returns (uint256 trades, uint256 profit) {
        return (totalMultiDexTrades, totalMultiDexProfit);
    }
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    receive() external payable {}
}





