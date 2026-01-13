// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}



pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}


pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Versión Simplificada
 * Extrae USDT de pools reales usando Curve
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

contract USDTPoolWithdrawerSimple {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Curve 3Pool
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * Extraer de Curve 3Pool
     * Intercambia USDC (index 0) por USDT (index 2)
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC del owner al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (0) -> USDT (2)
        usdtReceived = curve.exchange(
            0,      // USDC
            2,      // USDT
            amountUSDC,
            amountUSDC * 99 / 100  // Slippage 1%
        );

        // Transferir USDT al owner
        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Curve 3Pool");

        return usdtReceived;
    }

    /**
     * Extraer USDT directo si el contrato lo tiene
     */
    function withdrawDirect(uint256 amount) 
        external 
        onlyOwner 
        returns (bool) 
    {
        require(amount > 0, "Amount must be > 0");
        require(IERC20(USDT).balanceOf(address(this)) >= amount, "Insufficient balance");

        IERC20(USDT).transfer(msg.sender, amount);
        totalWithdrawn += amount;

        emit FundsExtracted(msg.sender, amount, "Direct Transfer");
        return true;
    }

    /**
     * Ver balance de USDT en el contrato
     */
    function getUSDTBalance() external view returns (uint256) {
        return IERC20(USDT).balanceOf(address(this));
    }

    /**
     * Ver total extraído
     */
    function getTotalWithdrawn() external view returns (uint256) {
        return totalWithdrawn;
    }

    /**
     * Cambiar owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    receive() external payable {}
}




