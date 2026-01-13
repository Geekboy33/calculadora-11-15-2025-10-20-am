// 🔌 DeFi FUNCTIONS - WEB3 MINTING & CONVERSION UTILITIES
// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};






// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};






// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};






// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};






// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};






// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};






// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};





// Funciones DeFi especializadas para mintear y convertir USD → USDT/USDC

import { ethers } from 'ethers';
import axios from 'axios';

// ============================================
// 1. CURVE FINANCE - STABLECOIN SWAP
// ============================================

export class CurveSwap {
  private provider: ethers.providers.Provider;
  private signer: ethers.Signer;
  private curvePoolAddress = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7'; // 3Pool
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
  }

  // ABI simplificado de Curve Pool
  private CURVE_POOL_ABI = [
    'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) returns (uint256)',
    'function get_dy(int128 i, int128 j, uint256 dx) returns (uint256)',
    'function coins(uint256 i) returns (address)'
  ];

  /**
   * Ejecuta swap USDC → USDT en Curve
   * @param amountUsdc - Cantidad de USDC (en wei)
   * @param minAmountUsdt - Cantidad mínima de USDT (con slippage)
   * @returns Hash de transacción
   */
  async swapUsdcToUsdt(
    amountUsdc: ethers.BigNumber,
    minAmountUsdt: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.signer
    );

    // USDC index: 1, USDT index: 0 en 3Pool
    const tx = await contract.exchange(
      1, // i (USDC)
      0, // j (USDT)
      amountUsdc,
      minAmountUsdt
    );

    return tx.hash;
  }

  /**
   * Estima cantidad de USDT a recibir
   * @param amountUsdc - Cantidad de USDC
   * @returns Cantidad estimada de USDT
   */
  async estimateOutput(amountUsdc: ethers.BigNumber): Promise<ethers.BigNumber> {
    const contract = new ethers.Contract(
      this.curvePoolAddress,
      this.CURVE_POOL_ABI,
      this.provider
    );

    return await contract.get_dy(1, 0, amountUsdc);
  }
}

// ============================================
// 2. UNISWAP V3 - FLEXIBLE SWAP
// ============================================

export class UniswapV3Swap {
  private signer: ethers.Signer;
  private routerAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Swap Router V3

  private ROUTER_ABI = [
    `function exactInputSingle(
      tuple(bytes path, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum) params
    ) returns (uint256)`
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Ejecuta swap en Uniswap V3
   * @param amountIn - Cantidad de entrada
   * @param amountOutMin - Cantidad mínima de salida
   * @param path - Encoded path (USDC → USDT)
   * @returns Hash de transacción
   */
  async exactInputSingle(
    amountIn: ethers.BigNumber,
    amountOutMin: ethers.BigNumber,
    path: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.routerAddress,
      this.ROUTER_ABI,
      this.signer
    );

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutos

    const tx = await contract.exactInputSingle({
      path: path,
      recipient: await this.signer.getAddress(),
      deadline: deadline,
      amountIn: amountIn,
      amountOutMinimum: amountOutMin
    });

    return tx.hash;
  }

  /**
   * Encoda path para swap USDC → USDT
   * @param fee - Fee tier (100, 500, 3000, 10000)
   * @returns Encoded path
   */
  encodePathUsdcToUsdt(fee: number = 100): string {
    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';

    // Encode: token address (20 bytes) + fee (3 bytes) + token address (20 bytes)
    return ethers.utils.solidityPacked(
      ['address', 'uint24', 'address'],
      [USDC, fee, USDT]
    );
  }
}

// ============================================
// 3. MAKERDAO - MINTING DAI
// ============================================

export class MakerDAOMint {
  private signer: ethers.Signer;
  private manager = '0x5ef30b9986B756569b89DdC4900b0241f6Ae26A2';

  private MANAGER_ABI = [
    'function open(bytes32 ilk, address usr) returns (uint256)',
    'function frob(uint256 cdp, int256 dink, int256 dart) external',
    'function move(uint256 cdp, address dst, uint256 rad) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Crea una posición de deuda asegurada (CDP) en MakerDAO
   * @param ilk - Tipo de colateral (ej: 'ETH-A')
   * @returns ID del CDP
   */
  async createCDP(ilk: string): Promise<number> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const ilkBytes = ethers.utils.formatBytes32String(ilk);
    const userAddress = await this.signer.getAddress();

    const tx = await contract.open(ilkBytes, userAddress);
    const receipt = await tx.wait();

    // Extrae ID del CDP del evento
    if (receipt.events) {
      const event = receipt.events[0];
      return event.args.id;
    }
    throw new Error('No se pudo crear CDP');
  }

  /**
   * Ajusta colateral y deuda
   * @param cdpId - ID del CDP
   * @param dink - Cantidad de colateral a agregar (positivo) o remover (negativo)
   * @param dart - Cantidad de DAI a mintear (positivo) o quemar (negativo)
   */
  async adjustPosition(
    cdpId: number,
    dink: ethers.BigNumber,
    dart: ethers.BigNumber
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.manager,
      this.MANAGER_ABI,
      this.signer
    );

    const tx = await contract.frob(cdpId, dink, dart);
    return tx.hash;
  }
}

// ============================================
// 4. AAVE - LENDING & CONVERSION
// ============================================

export class AaveSwap {
  private signer: ethers.Signer;
  private lendingPoolAddress = '0x794a61358D6845594F94dc1DB02A252b5b4814aD'; // Aave V3

  private POOL_ABI = [
    'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external',
    'function withdraw(address asset, uint256 amount, address to) external returns (uint256)',
    'function flashLoan(address receiver, address token, uint256 amount, bytes calldata params) external',
    'function borrow(address asset, uint256 amount, uint256 interestRateMode, uint16 referralCode, address onBehalfOf) external'
  ];

  constructor(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Deposita USDC en Aave
   * @param usdcAmount - Cantidad de USDC
   */
  async depositUsdc(usdcAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.supply(USDC, usdcAmount, userAddress, 0);
    return tx.hash;
  }

  /**
   * Retira como USDT
   * @param usdtAmount - Cantidad de USDT a retirar
   */
  async withdrawUsdt(usdtAmount: ethers.BigNumber): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const userAddress = await this.signer.getAddress();

    const tx = await contract.withdraw(USDT, usdtAmount, userAddress);
    return tx.hash;
  }

  /**
   * Utiliza Flash Loan para conversión
   * @param amount - Cantidad
   * @param receiver - Dirección del receptor
   */
  async flashLoan(
    amount: ethers.BigNumber,
    receiver: string
  ): Promise<string> {
    const contract = new ethers.Contract(
      this.lendingPoolAddress,
      this.POOL_ABI,
      this.signer
    );

    const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

    const tx = await contract.flashLoan(
      receiver,
      USDC,
      amount,
      '0x'
    );
    return tx.hash;
  }
}

// ============================================
// 5. FRAX FINANCE - HYBRID STABLECOIN
// ============================================

export class FraxSwap {
  private provider: ethers.providers.Provider;
  private fraxSwapRouter = '0xa05Bc33786b3D6e46D91DA45fb29C5DDA4E2e3E8';

  private ROUTER_ABI = [
    'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline) returns (uint256[] memory amounts)'
  ];

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
  }

  /**
   * Calcula salida estimada
   * @param amountIn - Cantidad de entrada
   * @param path - Ruta de tokens
   */
  async getAmountsOut(
    amountIn: ethers.BigNumber,
    path: string[]
  ): Promise<ethers.BigNumber> {
    // Llamaría a un oráculo como CoinGecko
    const rateUsdc = 1;
    const rateUsdt = 1;
    
    // Asumir 1:1 para stablecoins
    return amountIn.mul(ethers.BigNumber.from(1000000)).div(ethers.BigNumber.from(1000000));
  }
}

// ============================================
// 6. ORACLE - COINECKO RATES
// ============================================

export class CoinGeckoOracle {
  private baseUrl = 'https://api.coingecko.com/api/v3';

  /**
   * Obtiene tasa USD/USDT
   */
  async getUsdtRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=tether&vs_currencies=usd`
      );
      return response.data.tether.usd;
    } catch (error) {
      console.error('Error fetching USDT rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa USD/USDC
   */
  async getUsdcRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=usd-coin&vs_currencies=usd`
      );
      return response.data['usd-coin'].usd;
    } catch (error) {
      console.error('Error fetching USDC rate:', error);
      return 1.0; // Fallback
    }
  }

  /**
   * Obtiene tasa DAI
   */
  async getDaiRate(): Promise<number> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/simple/price?ids=dai&vs_currencies=usd`
      );
      return response.data.dai.usd;
    } catch (error) {
      console.error('Error fetching DAI rate:', error);
      return 1.0; // Fallback
    }
  }
}

// ============================================
// 7. UTILIDADES GENERALES
// ============================================

export class DeFiUtils {
  /**
   * Calcula gas fee con buffer
   */
  static async estimateGasFee(
    provider: ethers.providers.Provider,
    multiplier: number = 1.5
  ): Promise<ethers.BigNumber> {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(Math.floor(multiplier * 100)).div(100);
  }

  /**
   * Formatea cantidad a Wei
   */
  static toWei(amount: number, decimals: number = 6): ethers.BigNumber {
    return ethers.utils.parseUnits(amount.toString(), decimals);
  }

  /**
   * Formatea cantidad desde Wei
   */
  static fromWei(amount: ethers.BigNumber, decimals: number = 6): number {
    return parseFloat(ethers.utils.formatUnits(amount, decimals));
  }

  /**
   * Calcula slippage
   */
  static calculateSlippage(
    expectedAmount: ethers.BigNumber,
    slippagePercent: number = 0.5
  ): ethers.BigNumber {
    const slippageAmount = expectedAmount.mul(slippagePercent).div(100);
    return expectedAmount.sub(slippageAmount);
  }

  /**
   * Verifica aprobación de token
   */
  static async checkAllowance(
    tokenAddress: string,
    ownerAddress: string,
    spenderAddress: string,
    provider: ethers.providers.Provider
  ): Promise<ethers.BigNumber> {
    const ERC20_ABI = [
      'function allowance(address owner, address spender) external view returns (uint256)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    return await contract.allowance(ownerAddress, spenderAddress);
  }

  /**
   * Aprueba token para spender
   */
  static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: ethers.BigNumber,
    signer: ethers.Signer
  ): Promise<string> {
    const ERC20_ABI = [
      'function approve(address spender, uint256 amount) external returns (bool)'
    ];

    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );

    const tx = await contract.approve(spenderAddress, amount);
    return tx.hash;
  }
}

// ============================================
// 8. FACTORY - SELECTOR AUTOMÁTICO
// ============================================

export class DeFiFactory {
  /**
   * Selecciona mejor protocolo basado en criterios
   */
  static async selectBestProtocol(
    criteria: {
      minSlippage?: boolean;
      minGasCost?: boolean;
      maxSpeed?: boolean;
      decentralized?: boolean;
    }
  ): Promise<string> {
    if (criteria.minSlippage) return 'CURVE';
    if (criteria.maxSpeed) return 'CURVE';
    if (criteria.decentralized) return 'MAKERDAO';
    if (criteria.minGasCost) return 'FRAX';
    
    return 'CURVE'; // Default
  }

  /**
   * Ejecuta swap con protocolo seleccionado
   */
  static async executeSwap(
    protocol: 'CURVE' | 'UNISWAP' | 'MAKERDAO' | 'AAVE' | 'FRAX',
    amount: ethers.BigNumber,
    signer: ethers.Signer,
    provider: ethers.providers.Provider
  ): Promise<string> {
    switch (protocol) {
      case 'CURVE':
        const curve = new CurveSwap(provider, signer);
        const estimated = await curve.estimateOutput(amount);
        const minOutput = DeFiUtils.calculateSlippage(estimated, 0.01);
        return await curve.swapUsdcToUsdt(amount, minOutput);

      case 'UNISWAP':
        const uniswap = new UniswapV3Swap(signer);
        const path = uniswap.encodePathUsdcToUsdt(100);
        const minOut = DeFiUtils.calculateSlippage(amount, 0.1);
        return await uniswap.exactInputSingle(amount, minOut, path);

      case 'MAKERDAO':
        const maker = new MakerDAOMint(signer);
        const cdpId = await maker.createCDP('ETH-A');
        return await maker.adjustPosition(cdpId, amount, amount);

      case 'AAVE':
        const aave = new AaveSwap(signer);
        return await aave.depositUsdc(amount);

      case 'FRAX':
        // Implementar Frax
        return '0x';

      default:
        throw new Error(`Unknown protocol: ${protocol}`);
    }
  }
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  CurveSwap,
  UniswapV3Swap,
  MakerDAOMint,
  AaveSwap,
  FraxSwap,
  CoinGeckoOracle,
  DeFiUtils,
  DeFiFactory
};







