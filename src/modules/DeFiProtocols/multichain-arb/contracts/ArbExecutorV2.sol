// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/ISwapRouter.sol";

/**
 * @title ArbExecutorV2
 * @notice Ejecutor de arbitraje atómico para Uniswap V3
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */
contract ArbExecutorV2 {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════
    
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Estadísticas
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════
    
    event TradeExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 profit,
        uint256 timestamp
    );
    
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
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
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MAIN EXECUTION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * @notice Ejecuta arbitraje de 2 legs usando paths encoded
     * @param path1 Path encoded para primer swap (tokenIn -> tokenMid)
     * @param path2 Path encoded para segundo swap (tokenMid -> tokenOut)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minOut Cantidad mínima de tokenOut esperada
     * @param deadline Timestamp límite para la transacción
     */
    function execute(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut,
        uint256 deadline
    ) external onlyOwner returns (uint256 amountOut) {
        require(block.timestamp <= deadline, "Expired");
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extraer tokenIn del path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transferir tokens al contrato
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Aprobar router
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Ejecutar primer swap
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extraer tokenMid del path2
        address tokenMid = _extractToken(path2, 0);
        
        // Aprobar router para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Ejecutar segundo swap
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extraer tokenOut
        address tokenOut = _extractToken(path2, path2.length - 20);
        
        // Calcular profit
        uint256 profit = amountOut - amountIn;
        require(profit > 0, "No profit");
        
        // Transferir resultado al owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Actualizar estadísticas
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje simple con tokens específicos
     * @param tokenIn Token de entrada
     * @param tokenMid Token intermedio
     * @param tokenOut Token de salida
     * @param fee1 Fee del primer pool
     * @param fee2 Fee del segundo pool
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida
     */
    function executeSimple(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner returns (uint256 amountOut) {
        totalTrades++;
        
        // Transferir tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Primer swap: tokenIn -> tokenMid
        uint256 midAmount = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Aprobar para segundo swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Segundo swap: tokenMid -> tokenOut
        amountOut = swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut,
                sqrtPriceLimitX96: 0
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        uint256 profit = amountOut > amountIn ? amountOut - amountIn : 0;
        
        // Transferir resultado
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        if (profit > 0) {
            successfulTrades++;
            totalProfitWei += profit;
        }
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
        emit TokensWithdrawn(token, msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
            emit TokensWithdrawn(token, msg.sender, balance);
        }
    }
    
    function withdrawNative() external onlyOwner {
        uint256 balance = address(this).balance;
        if (balance > 0) {
            payable(msg.sender).transfer(balance);
        }
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
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
    
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}





