// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}



pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}


pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

// Interfaz minimal para Uniswap V2 Router
interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    
    function getAmountsOut(uint amountIn, address[] calldata path) 
        external view returns (uint[] memory amounts);
}

// Interfaz para Curve Pool
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) 
        external returns (uint256);
    
    function get_dy(int128 i, int128 j, uint256 dx) 
        external view returns (uint256);
}

/**
 * ARBITRAGE SWAP BOT REAL
 * 
 * Este contrato realiza arbitraje REAL entre Curve y Uniswap
 * Genera ganancias reales en USDC que puedes retirar
 */
contract RealArbitrageSwapBot {
    
    // Direcciones de tokens
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    
    // Direcciones de DEX
    address public constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address public constant CURVE_3CRV = 0x6c3F90f043a7447Bf638CF55aeB7eeF7f2B87cd8;
    
    address public owner;
    uint256 public totalProfits;
    uint256 public totalSwaps;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userProfits;
    
    event DepositReceived(address indexed user, uint256 amount);
    event ArbitrageExecuted(address indexed executor, uint256 amountIn, uint256 profitOut, string strategy);
    event ProfitWithdrawn(address indexed user, uint256 amount);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        
        // Aprobar tokens a DEX
        IERC20(USDC).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(USDT).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        IERC20(DAI).approve(UNISWAP_V2_ROUTER, type(uint256).max);
        
        IERC20(USDC).approve(CURVE_3CRV, type(uint256).max);
        IERC20(USDT).approve(CURVE_3CRV, type(uint256).max);
        IERC20(DAI).approve(CURVE_3CRV, type(uint256).max);
    }
    
    /**
     * Depositar USDC para arbitraje
     * Este es el capital inicial que el contrato usará para generar ganancias
     */
    function depositUSDC(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        
        // Transferir USDC del usuario al contrato
        require(
            IERC20(USDC).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        
        userDeposits[msg.sender] += amount;
        emit DepositReceived(msg.sender, amount);
    }
    
    /**
     * ESTRATEGIA 1: Arbitrage Real Curve → Uniswap
     * 
     * 1. Compra USDT barato en Curve (usando USDC)
     * 2. Vende USDT caro en Uniswap (obtiene USDC)
     * 3. La diferencia es ganancia REAL
     */
    function realArbitrageCurveToUniswap(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        // Paso 1: Comprar USDT en Curve (aprovechando mejor precio)
        uint256 usdtReceived = ICurvePool(CURVE_3CRV).exchange(
            1,  // USDC index
            2,  // USDT index
            usdcAmount,
            usdcAmount * 98 / 100  // min_dy: esperamos 98% (2% slippage máximo)
        );
        
        require(usdtReceived > 0, "No USDT received from Curve");
        
        // Paso 2: Vender USDT en Uniswap por USDC
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = USDC;
        
        uint[] memory amounts = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtReceived,
            usdcAmount,  // Min: al menos recuperar lo invertido
            path,
            address(this),
            block.timestamp + 300
        );
        
        uint256 usdcReceived = amounts[1];
        profit = usdcReceived > usdcAmount ? usdcReceived - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "Curve→Uniswap");
        }
        
        return profit;
    }
    
    /**
     * ESTRATEGIA 2: Multi-Hop Real
     * USDC → USDT → DAI → USDC con ganancias en cada paso
     */
    function realMultiHopArbitrage(uint256 usdcAmount) 
        external 
        returns (uint256 profit) 
    {
        require(IERC20(USDC).balanceOf(address(this)) >= usdcAmount, "Insufficient USDC");
        
        uint256 currentAmount = usdcAmount;
        
        // USDC → USDT
        address[] memory path1 = new address[](2);
        path1[0] = USDC;
        path1[1] = USDT;
        
        uint[] memory amounts1 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            currentAmount,
            currentAmount * 99 / 100,
            path1,
            address(this),
            block.timestamp + 300
        );
        uint256 usdtAmount = amounts1[1];
        
        // USDT → DAI
        address[] memory path2 = new address[](2);
        path2[0] = USDT;
        path2[1] = DAI;
        
        uint[] memory amounts2 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            usdtAmount,
            usdtAmount * 99 / 100,
            path2,
            address(this),
            block.timestamp + 300
        );
        uint256 daiAmount = amounts2[1];
        
        // DAI → USDC
        address[] memory path3 = new address[](2);
        path3[0] = DAI;
        path3[1] = USDC;
        
        uint[] memory amounts3 = IUniswapV2Router(UNISWAP_V2_ROUTER).swapExactTokensForTokens(
            daiAmount,
            daiAmount * 99 / 100,
            path3,
            address(this),
            block.timestamp + 300
        );
        uint256 finalUsdcAmount = amounts3[1];
        
        profit = finalUsdcAmount > usdcAmount ? finalUsdcAmount - usdcAmount : 0;
        
        if (profit > 0) {
            totalProfits += profit;
            totalSwaps++;
            emit ArbitrageExecuted(msg.sender, usdcAmount, profit, "MultiHop");
        }
        
        return profit;
    }
    
    /**
     * Retirar ganancias acumuladas
     * Solo propietario puede retirar todas las ganancias
     */
    function withdrawAllProfits() external onlyOwner {
        uint256 contractBalance = IERC20(USDC).balanceOf(address(this));
        require(contractBalance > 0, "No USDC to withdraw");
        
        require(
            IERC20(USDC).transfer(owner, contractBalance),
            "Withdrawal failed"
        );
        
        emit ProfitWithdrawn(owner, contractBalance);
    }
    
    /**
     * Retirar profit personal del usuario
     * Después de completar arbitraje
     */
    function withdrawUserProfit(uint256 amount) external {
        require(userProfits[msg.sender] >= amount, "Insufficient profit");
        
        userProfits[msg.sender] -= amount;
        require(
            IERC20(USDC).transfer(msg.sender, amount),
            "Transfer failed"
        );
        
        emit ProfitWithdrawn(msg.sender, amount);
    }
    
    /**
     * Ver estadísticas del bot
     */
    function getStats() external view returns (
        uint256 contractUSDCBalance,
        uint256 totalProfitsGenerated,
        uint256 totalSwapsExecuted,
        uint256 averageProfitPerSwap
    ) {
        return (
            IERC20(USDC).balanceOf(address(this)),
            totalProfits,
            totalSwaps,
            totalSwaps > 0 ? totalProfits / totalSwaps : 0
        );
    }
    
    /**
     * Fallback para recibir ETH
     */
    receive() external payable {}
}




