// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}



pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}


pragma solidity ^0.8.20;

/**
 * @title ArbExecutorFinal
 * @notice Ejecutor de arbitraje atómico conectado a Uniswap V3 SwapRouter02
 * @dev Ejecuta 2 swaps en una sola transacción y valida ganancia mínima
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

interface ISwapRouter02 {
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

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

contract ArbExecutorFinal {
    // ─────────────────────────────────────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────────────────────────────────────
    
    address public owner;
    ISwapRouter02 public immutable swapRouter;
    
    // Statistics
    uint256 public totalTrades;
    uint256 public successfulTrades;
    uint256 public totalProfitWei;
    
    // Safety
    bool public paused;
    uint256 public minProfitBps; // Minimum profit in basis points (100 = 1%)
    
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
    
    event TradeReverted(
        address indexed tokenIn,
        uint256 amountIn,
        string reason
    );
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(bool status);
    event MinProfitUpdated(uint256 newMinProfitBps);
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────────────────────────────────────
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier notPaused() {
        require(!paused, "Contract paused");
        _;
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────────────────────────────────────
    
    constructor(address _swapRouter) {
        require(_swapRouter != address(0), "Invalid router");
        owner = msg.sender;
        swapRouter = ISwapRouter02(_swapRouter);
        minProfitBps = 10; // Default 0.1% minimum profit
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    /**
     * @notice Ejecuta arbitraje de 2 legs con tokens específicos
     * @param tokenIn Token de entrada (ej: USDC)
     * @param tokenMid Token intermedio (ej: WETH)
     * @param tokenOut Token de salida (debe ser igual a tokenIn para profit)
     * @param fee1 Fee del primer pool (ej: 500 = 0.05%)
     * @param fee2 Fee del segundo pool (ej: 3000 = 0.30%)
     * @param amountIn Cantidad de tokenIn a usar
     * @param minProfit Ganancia mínima requerida en tokenOut
     */
    function executeArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn,
        uint256 minProfit
    ) external onlyOwner notPaused returns (uint256 profit) {
        require(amountIn > 0, "Zero amount");
        require(tokenIn == tokenOut, "Must be round-trip");
        
        totalTrades++;
        
        // Transfer tokens from owner to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Approve router for first swap
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 1: tokenIn → tokenMid
        // ═══════════════════════════════════════════════════════════════════════
        
        uint256 midAmount;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenMid,
                fee: fee1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _midAmount) {
            midAmount = _midAmount;
        } catch {
            // Revert and return tokens
            IERC20(tokenIn).transfer(msg.sender, amountIn);
            emit TradeReverted(tokenIn, amountIn, "Swap1 failed");
            return 0;
        }
        
        require(midAmount > 0, "Swap1 returned 0");
        
        // ═══════════════════════════════════════════════════════════════════════
        // SWAP 2: tokenMid → tokenOut
        // ═══════════════════════════════════════════════════════════════════════
        
        // Approve router for second swap
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        uint256 amountOut;
        try swapRouter.exactInputSingle(
            ISwapRouter02.ExactInputSingleParams({
                tokenIn: tokenMid,
                tokenOut: tokenOut,
                fee: fee2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: amountIn + minProfit, // Must be profitable
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 _amountOut) {
            amountOut = _amountOut;
        } catch {
            // Swap2 failed - try to recover by swapping back
            IERC20(tokenMid).approve(address(swapRouter), midAmount);
            try swapRouter.exactInputSingle(
                ISwapRouter02.ExactInputSingleParams({
                    tokenIn: tokenMid,
                    tokenOut: tokenIn,
                    fee: fee1, // Use same fee to swap back
                    recipient: msg.sender,
                    amountIn: midAmount,
                    amountOutMinimum: 0,
                    sqrtPriceLimitX96: 0
                })
            ) {} catch {}
            
            emit TradeReverted(tokenIn, amountIn, "Swap2 failed - not profitable");
            return 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROFIT CALCULATION & TRANSFER
        // ═══════════════════════════════════════════════════════════════════════
        
        require(amountOut > amountIn, "No profit");
        profit = amountOut - amountIn;
        
        // Validate minimum profit
        uint256 minRequiredProfit = (amountIn * minProfitBps) / 10000;
        require(profit >= minRequiredProfit || profit >= minProfit, "Profit below minimum");
        
        // Transfer all output to owner
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        // Update statistics
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Ejecuta arbitraje usando path encoded (más eficiente para multi-hop)
     * @param path1 Path encoded para primer swap
     * @param path2 Path encoded para segundo swap
     * @param amountIn Cantidad de entrada
     * @param minOut Cantidad mínima de salida (debe ser > amountIn para profit)
     */
    function executeWithPath(
        bytes calldata path1,
        bytes calldata path2,
        uint256 amountIn,
        uint256 minOut
    ) external onlyOwner notPaused returns (uint256 amountOut) {
        require(amountIn > 0, "Zero amount");
        require(minOut > amountIn, "minOut must exceed amountIn");
        
        totalTrades++;
        
        // Extract tokenIn from path1
        address tokenIn = _extractToken(path1, 0);
        
        // Transfer tokens
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(swapRouter), amountIn);
        
        // Swap 1
        uint256 midAmount = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path1,
                recipient: address(this),
                amountIn: amountIn,
                amountOutMinimum: 0
            })
        );
        
        require(midAmount > 0, "Swap1 failed");
        
        // Extract tokenMid and approve
        address tokenMid = _extractToken(path2, 0);
        IERC20(tokenMid).approve(address(swapRouter), midAmount);
        
        // Swap 2
        amountOut = swapRouter.exactInput(
            ISwapRouter02.ExactInputParams({
                path: path2,
                recipient: address(this),
                amountIn: midAmount,
                amountOutMinimum: minOut
            })
        );
        
        require(amountOut >= minOut, "Insufficient output");
        
        // Extract tokenOut and transfer
        address tokenOut = _extractToken(path2, path2.length - 20);
        uint256 profit = amountOut - amountIn;
        
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        successfulTrades++;
        totalProfitWei += profit;
        
        emit TradeExecuted(tokenIn, tokenOut, amountIn, amountOut, profit, block.timestamp);
    }
    
    /**
     * @notice Simula un arbitraje sin ejecutar (para testing)
     */
    function simulateArbitrage(
        address tokenIn,
        address tokenMid,
        address tokenOut,
        uint24 fee1,
        uint24 fee2,
        uint256 amountIn
    ) external view returns (
        bool wouldBeProfit,
        uint256 estimatedProfit,
        uint256 minProfitRequired
    ) {
        // This is a view function - actual simulation would need quoter
        minProfitRequired = (amountIn * minProfitBps) / 10000;
        
        // Return placeholder - real simulation needs off-chain quoter call
        return (false, 0, minProfitRequired);
    }
    
    // ─────────────────────────────────────────────────────────────────────────────
    // ADMIN FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function pause() external onlyOwner {
        paused = true;
        emit Paused(true);
    }
    
    function unpause() external onlyOwner {
        paused = false;
        emit Paused(false);
    }
    
    function setMinProfitBps(uint256 _minProfitBps) external onlyOwner {
        require(_minProfitBps <= 1000, "Max 10%"); // Safety cap
        minProfitBps = _minProfitBps;
        emit MinProfitUpdated(_minProfitBps);
    }
    
    function withdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(msg.sender, amount);
    }
    
    function withdrawAll(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(msg.sender, balance);
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
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
    
    // ─────────────────────────────────────────────────────────────────────────────
    // INTERNAL FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────────
    
    function _extractToken(bytes calldata path, uint256 offset) internal pure returns (address token) {
        require(path.length >= offset + 20, "Invalid path");
        assembly {
            token := shr(96, calldataload(add(path.offset, offset)))
        }
    }
    
    receive() external payable {}
}





