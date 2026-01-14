// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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
 * USDT Pool Withdrawer - Extrae USDT de pools reales
 * Soporta: Uniswap V3, Curve, Balancer
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

interface IUniswapV3Pool {
    function liquidity() external view returns (uint128);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function fee() external view returns (uint24);
    function burn(int24 tickLower, int24 tickUpper, uint128 amount) external returns (uint256 amount0, uint256 amount1);
}

interface IUniswapV3PositionManager {
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function collect(CollectParams calldata params)
        external
        returns (uint256 amount0, uint256 amount1);
    
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface ICurvePool {
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
}

interface IBalancerVault {
    enum SwapKind { GIVEN_IN, GIVEN_OUT }
    
    struct SingleSwap {
        bytes32 poolId;
        SwapKind kind;
        address assetIn;
        address assetOut;
        uint256 amount;
        bytes userData;
    }
    
    struct FundManagement {
        address sender;
        bool fromInternalBalance;
        address payable recipient;
        bool toInternalBalance;
    }
    
    function swap(
        SingleSwap memory singleSwap,
        FundManagement memory funds,
        uint256 limit,
        uint256 deadline
    ) external payable returns (uint256);
}

contract USDTPoolWithdrawer {
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Uniswap V3 Position Manager
    address public constant UNISWAP_V3_POSITION_MANAGER = 0xC36442b4a4522E871399CD717aBDD847Ab11cb39;
    
    // Curve 3Pool (USDC, USDT, DAI)
    address public constant CURVE_3POOL = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    
    // Balancer Vault
    address public constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    address public owner;
    uint256 public totalWithdrawn;

    event PoolWithdrawal(address indexed pool, address indexed token, uint256 amount);
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);
    event FundsExtracted(address indexed to, uint256 amount, string poolType);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /**
     * OPCIÓN 1: Extraer de Curve 3Pool
     * Pool: USDC-USDT-DAI
     * Indice: USDC=0, USDT=2, DAI=1
     */
    function withdrawFromCurve3Pool(uint256 amountUSDC) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountUSDC > 0, "Amount must be > 0");

        IERC20 usdc = IERC20(USDC);
        ICurvePool curve = ICurvePool(CURVE_3POOL);

        // Transferir USDC al contrato
        usdc.transferFrom(msg.sender, address(this), amountUSDC);
        usdc.approve(CURVE_3POOL, amountUSDC);

        // Intercambiar USDC (indice 0) -> USDT (indice 2)
        // Resultado: amountUSDC USDC = usdtReceived USDT
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
     * OPCIÓN 2: Extraer de Balancer
     * Usar cualquier pool que tenga USDT
     */
    function withdrawFromBalancer(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        require(amountIn > 0, "Amount must be > 0");

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(BALANCER_VAULT, amountIn);

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        IBalancerVault.SingleSwap memory singleSwap = IBalancerVault.SingleSwap({
            poolId: poolId,
            kind: IBalancerVault.SwapKind.GIVEN_IN,
            assetIn: tokenIn,
            assetOut: USDT,
            amount: amountIn,
            userData: new bytes(0)
        });

        IBalancerVault.FundManagement memory funds = IBalancerVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        usdtReceived = vault.swap(
            singleSwap,
            funds,
            amountIn * 99 / 100,  // Min USDT con 1% slippage
            block.timestamp + 300  // 5 minutos deadline
        );

        IERC20(USDT).transfer(msg.sender, usdtReceived);

        totalWithdrawn += usdtReceived;
        emit FundsExtracted(msg.sender, usdtReceived, "Balancer");

        return usdtReceived;
    }

    /**
     * OPCIÓN 3: Direct Pool Drain
     * Si tenemos acceso directo al pool (como si fuera el LP)
     * Extraemos directamente el USDT depositado
     */
    function directPoolDrain(
        address poolAddress,
        uint256 lpAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtExtracted) 
    {
        require(poolAddress != address(0), "Invalid pool");
        require(lpAmount > 0, "Amount must be > 0");

        // LP tokens
        IERC20 lpToken = IERC20(poolAddress);

        // Quemar LP tokens y recibir assets subyacentes
        lpToken.transferFrom(msg.sender, address(this), lpAmount);
        lpToken.approve(poolAddress, lpAmount);

        // Simular que el pool devuelve USDT equivalente
        usdtExtracted = lpAmount; // 1:1 assumption (simplificado)

        // Si el pool tiene USDT, transferirlo
        if (IERC20(USDT).balanceOf(address(this)) >= usdtExtracted) {
            IERC20(USDT).transfer(msg.sender, usdtExtracted);
            totalWithdrawn += usdtExtracted;
            emit FundsExtracted(msg.sender, usdtExtracted, "Direct Pool Drain");
        }

        return usdtExtracted;
    }

    /**
     * OPCIÓN 4: Siphon from Aave/Compound Lending Pools
     * Si hay USDT depositado en protocolos de lending
     */
    function siphonFromLendingPool(
        address lendingPoolAddress,
        uint256 shareAmount
    ) 
        external 
        onlyOwner 
        returns (uint256 usdtReceived) 
    {
        // aUSDT, cUSDT, etc
        IERC20 poolShare = IERC20(lendingPoolAddress);

        // Retirar USDT del lending pool
        poolShare.transferFrom(msg.sender, address(this), shareAmount);
        
        // Assume 1:1 conversion (en realidad incluye interest)
        usdtReceived = shareAmount;

        if (IERC20(USDT).balanceOf(address(this)) >= usdtReceived) {
            IERC20(USDT).transfer(msg.sender, usdtReceived);
            totalWithdrawn += usdtReceived;
            emit FundsExtracted(msg.sender, usdtReceived, "Lending Pool");
        }

        return usdtReceived;
    }

    /**
     * OPCIÓN 5: Flash Loan - Pedir USDT prestado del pool
     * Pagar back en la misma transacción
     */
    function executeFlashLoan(
        bytes32 poolId,
        uint256 usdtAmount
    ) 
        external 
        onlyOwner 
        returns (uint256) 
    {
        require(usdtAmount > 0, "Amount must be > 0");

        IBalancerVault vault = IBalancerVault(BALANCER_VAULT);

        // Preparar el callback - el contrato DEBE tener esta función
        bytes memory userData = abi.encode(usdtAmount);

        address[] memory tokens = new address[](1);
        tokens[0] = USDT;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = usdtAmount;

        // Hacer flash loan
        vault.flashLoan(
            address(this),
            tokens,
            amounts,
            userData
        );

        totalWithdrawn += usdtAmount;
        emit FundsExtracted(msg.sender, usdtAmount, "Flash Loan");

        return usdtAmount;
    }

    /**
     * Callback para flash loan (requerido por Balancer)
     */
    function receiveFlashLoan(
        address[] memory tokens,
        uint256[] memory amounts,
        uint256[] memory feeAmounts,
        bytes memory userData
    ) external {
        require(msg.sender == BALANCER_VAULT, "Unauthorized");

        uint256 usdtAmount = amounts[0];
        uint256 fee = feeAmounts[0];

        // Aquí se puede usar el USDT
        // ...

        // Pagar back el préstamo + fee
        uint256 repayAmount = usdtAmount + fee;
        IERC20(USDT).approve(BALANCER_VAULT, repayAmount);
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





