/**
 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};





 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};





 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};





 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};





 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};





 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};





 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};




 * INTEGRACIÓN DE USDT CONVERSION REAL
 * Actualización para DeFiProtocolsModule.tsx
 * 
 * Reemplaza la función convertUSDToUSDT con la nueva lógica
 */

// Agregar esta importación al inicio del archivo
// import { executeUSDToUSDTConversion } from '../lib/usdt-conversion-real';

// Reemplazar la función convertUSDToUSDT completa por esta:

const convertUSDToUSDT = async () => {
  if (!walletConnected) {
    alert('Conecta tu wallet primero');
    return;
  }

  if (!selectedAccountId) {
    alert('Selecciona una cuenta de custodio');
    return;
  }

  const selectedAccount = custodyAccounts.find(a => a.id === selectedAccountId);
  if (!selectedAccount) {
    alert('Cuenta no encontrada');
    return;
  }

  const numAmount = parseFloat(amount);
  if (numAmount > selectedAccount.availableBalance) {
    alert(
      `No tienes suficiente USD en esta cuenta. Disponible: ${selectedAccount.availableBalance}`
    );
    return;
  }

  setIsExecuting(true);
  setExecutionStatus('converting');

  try {
    console.log('[DeFi] 🚀 Iniciando conversión REAL USD → USDT:', {
      amount: numAmount,
      account: selectedAccount.name,
      wallet: userAddress,
      timestamp: new Date().toISOString()
    });

    // Obtener configuración
    const rpcUrl =
      import.meta.env.VITE_ETH_RPC_URL ||
      'https://eth-mainnet.g.alchemy.com/v2/7iQ1gZ82J1A6Fig-QwHDb4_4GeoayYqj';
    const privateKey =
      import.meta.env.VITE_ETH_PRIVATE_KEY ||
      'd1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036';

    console.log('[DeFi] Configuración:', {
      rpcUrl: rpcUrl.slice(0, 50) + '...',
      network: 'Ethereum Mainnet',
      chainId: 1
    });

    // ============================================================================
    // OPCIÓN 1: Usar backend (RECOMENDADO para producción)
    // ============================================================================
    const useBackendEndpoint = true;

    if (useBackendEndpoint) {
      console.log('[DeFi] Usando backend endpoint para transacción REAL...');

      const swapResponse = await fetch('/api/uniswap/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: numAmount.toString(),
          recipientAddress: userAddress,
          slippageTolerance: 1
        })
      });

      if (!swapResponse.ok) {
        throw new Error(
          `Backend error: ${swapResponse.status} - ${await swapResponse.text()}`
        );
      }

      const swapResult = await swapResponse.json();

      // Validar respuesta
      if (!swapResult.success) {
        const error = swapResult.error || 'Error desconocido';
        const suggestion = swapResult.suggestedAction || 'Intenta nuevamente';
        alert(`❌ Error en conversion:\n\n${error}\n\n${suggestion}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.txHash) {
        alert('❌ Error: No se recibió TX Hash');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (swapResult.status !== 'SUCCESS') {
        alert(`❌ Transacción NO confirmada. Status: ${swapResult.status}`);
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      if (!swapResult.real) {
        alert('❌ Transacción NO es real (simulada)');
        setExecutionStatus('idle');
        setIsExecuting(false);
        return;
      }

      // ✅ TODO OK - Procesar resultado
      handleConversionSuccess(swapResult, numAmount, selectedAccount);
    }
    // ============================================================================
    // OPCIÓN 2: Ejecutar directamente en frontend (solo para testing)
    // ============================================================================
    else {
      console.log('[DeFi] Usando lógica directa en frontend (TESTING)...');

      // Importar función
      // const { executeUSDToUSDTConversion } = await import('../lib/usdt-conversion-real');

      // const result = await executeUSDToUSDTConversion(
      //   numAmount,
      //   userAddress,
      //   privateKey,
      //   rpcUrl
      // );

      // if (!result.success) {
      //   alert(`❌ Error: ${result.error}`);
      //   setExecutionStatus('idle');
      //   setIsExecuting(false);
      //   return;
      // }

      // handleConversionSuccess(result, numAmount, selectedAccount);
    }
  } catch (error) {
    console.error('[DeFi] Error en conversión:', error);
    alert(
      'Error en la conversión: ' +
        (error instanceof Error ? error.message : 'Desconocido')
    );
    setExecutionStatus('idle');
  } finally {
    setIsExecuting(false);
  }
};

// Nueva función auxiliar para manejar éxito
const handleConversionSuccess = (swapResult: any, numAmount: number, selectedAccount: any) => {
  const receivedUSDT = swapResult.amountUSDT || swapResult.amountOut || (numAmount * 0.99).toFixed(2);

  setUsdtReceived(receivedUSDT);
  setTxHash(swapResult.txHash || '');
  setEtherscanLink(swapResult.etherscanUrl || '');
  setOraclePrice(swapResult.oraclePrice || 0);
  setNetwork(swapResult.network || 'Ethereum Mainnet');
  setExecutionStatus('done');

  // Registrar evento
  transactionEventStore.recordEvent(
    'BALANCE_DECREASE',
    'SYSTEM',
    `✅ Conversión REAL USD → USDT: ${numAmount} USD → ${receivedUSDT} USDT`,
    {
      amount: numAmount,
      currency: 'USD',
      status: 'COMPLETED',
      metadata: {
        received: receivedUSDT,
        wallet: userAddress,
        txHash: swapResult.txHash,
        fromAccount: selectedAccount?.name,
        protocol: 'Uniswap V3 / USDT Transfer',
        oraclePrice: swapResult.oraclePrice
      }
    }
  );

  // Guardar en historial
  const newConversion = {
    id: Date.now(),
    from: 'USD',
    to: 'USDT',
    amountFrom: numAmount,
    amountTo: parseFloat(receivedUSDT),
    wallet: userAddress,
    fromAccount: selectedAccount.name,
    txHash: swapResult.txHash,
    date: new Date().toISOString(),
    status: 'completed',
    protocol: 'USDT Transfer (REAL)',
    oraclePrice: swapResult.oraclePrice
  };

  const updated = [newConversion, ...conversionHistory];
  setConversionHistory(updated);
  localStorage.setItem('usd_usdt_conversions', JSON.stringify(updated));

  // Deducir balance SOLO si transacción real
  const accounts = custodyStore.getAccounts();
  const usdAccount = accounts.find(a => a.id === selectedAccountId);

  if (usdAccount) {
    custodyStore.updateAccountBalance(usdAccount.id, -numAmount);
  }

  console.log('[DeFi] ✅ Conversión REAL completada:', {
    received: receivedUSDT,
    txHash: swapResult.txHash,
    oraclePrice: swapResult.oraclePrice
  });

  setTimeout(() => {
    setAmount('');
    setExecutionStatus('idle');
    setUsdtReceived('');
    loadCustodyAccounts();
  }, 3000);
};







