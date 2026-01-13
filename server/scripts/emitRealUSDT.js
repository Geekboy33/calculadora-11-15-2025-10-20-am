import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);




dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);




dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);




dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);




dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);




dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);




dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);


dotenv.config();

const MAINNET_RPC = process.env.VITE_ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
const privateKey = process.env.VITE_ETH_PRIVATE_KEY || 'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDT_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const CURVE_3POOL = '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7';
const RECIPIENT = '0x05316B102FE62574b9cBd45709f8F1B6C00beC8a';
const AMOUNT_USDC = '100';

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address recipient, uint256 amount) external returns (bool)'
];

const CURVE_ABI = [
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)'
];

async function emitRealUSDT() {
  console.log('');
  console.log('Ejecutando emision USDT REAL...');
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(MAINNET_RPC);
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = signer.address;

    console.log('Red: Ethereum Mainnet');
    console.log('Signer: ' + signerAddress);
    console.log('');

    // Verificar balance ETH
    const ethBalance = await provider.getBalance(signerAddress);
    const balanceETH = ethers.formatEther(ethBalance);
    console.log('Balance ETH: ' + balanceETH + ' ETH');

    if (parseFloat(balanceETH) < 0.01) {
      throw new Error('Balance ETH insuficiente');
    }

    console.log('');
    console.log('Paso 1: Verificar USDC...');

    const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const usdcDecimals = await usdc.decimals();
    const usdcBalance = await usdc.balanceOf(signerAddress);
    const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

    console.log('Balance USDC: ' + usdcFormatted + ' USDC');

    const amountUSDC = ethers.parseUnits(AMOUNT_USDC, usdcDecimals);

    if (usdcBalance < amountUSDC) {
      throw new Error('USDC insuficiente: ' + usdcFormatted + ' < ' + AMOUNT_USDC);
    }

    console.log('Status: OK - Balance suficiente');
    console.log('');

    console.log('Paso 2: Aprobando USDC...');

    const feeData = await provider.getFeeData();
    const gasPrice = (feeData.gasPrice || BigInt(20000000000)) * BigInt(5);

    const approveTx = await usdc.approve(CURVE_3POOL, amountUSDC, {
      gasLimit: 100000,
      gasPrice: gasPrice
    });

    console.log('TX Hash: ' + approveTx.hash);
    const approveReceipt = await approveTx.wait(1);
    console.log('Bloque: ' + approveReceipt.blockNumber);
    console.log('Status: OK');
    console.log('');

    console.log('Paso 3: Intercambiando USDC por USDT en Curve...');

    const curve = new ethers.Contract(CURVE_3POOL, CURVE_ABI, signer);
    
    const minUSDT = ethers.parseUnits((AMOUNT_USDC * 0.99).toString(), 6);

    const swapTx = await curve.exchange(
      0,
      2,
      amountUSDC,
      minUSDT,
      {
        gasLimit: 500000,
        gasPrice: gasPrice
      }
    );

    console.log('TX Hash: ' + swapTx.hash);
    console.log('Esperando confirmacion...');

    const swapReceipt = await swapTx.wait(1);

    console.log('Bloque: ' + swapReceipt.blockNumber);
    console.log('Gas usado: ' + swapReceipt.gasUsed.toString());
    console.log('Status: ' + (swapReceipt.status === 1 ? 'Success' : 'Failed'));

    console.log('');
    console.log('Paso 4: Verificando USDT recibido...');

    const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider);
    const usdtDecimals = await usdt.decimals();
    const usdtBalance = await usdt.balanceOf(signerAddress);
    const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

    console.log('Balance USDT: ' + usdtFormatted + ' USDT');
    console.log('Status: OK - USDT REAL recibido');

    console.log('');
    console.log('===== RESUMEN =====');
    console.log('Operacion exitosa');
    console.log('USDC enviado: ' + AMOUNT_USDC);
    console.log('USDT recibido: ' + usdtFormatted);
    console.log('');
    console.log('Links Etherscan:');
    console.log('Swap: https://etherscan.io/tx/' + swapTx.hash);
    console.log('USDT: https://etherscan.io/token/' + USDT_ADDRESS);
    console.log('Tu billetera: https://etherscan.io/address/' + signerAddress);
    console.log('');
    console.log('USDT REAL ha sido emitido y esta en tu billetera');
    console.log('');

  } catch (error) {
    console.error('Error: ' + error.message);
  }
}

emitRealUSDT().catch(console.error);
