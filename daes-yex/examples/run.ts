/**
 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});




 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});




 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});




 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});




 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});




 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});




 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});



 * DAES YEX SDK - Ejemplos de uso
 * 
 * Para ejecutar:
 * 1. Configura las variables de entorno en .env
 * 2. npm run build
 * 3. node dist/examples/run.js
 * 
 * NOTA: No pegues keys reales aquí. Rota cualquier key que ya haya quedado expuesta.
 */

import { createYexSdk } from "../src/index.js";

async function main() {
  console.log("🚀 DAES YEX SDK - Ejemplos de uso\n");

  // Crear instancia del SDK
  const yex = createYexSdk();

  // ============================================================================
  // PUBLIC ENDPOINTS (Sin autenticación)
  // ============================================================================

  console.log("📊 PUBLIC ENDPOINTS\n");

  // Ping
  console.log("1. Ping:");
  const ping = await yex.spot.ping();
  console.log("   Result:", ping.ok ? "✅ OK" : "❌ Failed");

  // Server time
  console.log("\n2. Server Time:");
  const time = await yex.spot.time();
  if (time.ok) {
    console.log("   Server Time:", new Date(time.data.serverTime).toISOString());
  } else {
    console.log("   Error:", time.error.message);
  }

  // Symbols
  console.log("\n3. Symbols:");
  const symbols = await yex.spot.symbols();
  if (symbols.ok) {
    console.log("   Total Symbols:", symbols.data.length);
    console.log("   First 3:", symbols.data.slice(0, 3).map((s) => s.symbol).join(", "));
  } else {
    console.log("   Error:", symbols.error.message);
  }

  // Ticker
  console.log("\n4. Ticker BTCUSDT:");
  const ticker = await yex.spot.ticker("BTCUSDT");
  if (ticker.ok) {
    const t = ticker.data as any;
    console.log("   Last Price:", t.lastPrice);
    console.log("   24h Change:", t.priceChangePercent, "%");
    console.log("   24h High:", t.highPrice);
    console.log("   24h Low:", t.lowPrice);
  } else {
    console.log("   Error:", ticker.error.message);
  }

  // Depth
  console.log("\n5. Order Book BTCUSDT (limit 5):");
  const depth = await yex.spot.depth("BTCUSDT", 5);
  if (depth.ok) {
    console.log("   Bids:", depth.data.bids.slice(0, 3).map((b) => `${b[0]} @ ${b[1]}`).join(", "));
    console.log("   Asks:", depth.data.asks.slice(0, 3).map((a) => `${a[0]} @ ${a[1]}`).join(", "));
  } else {
    console.log("   Error:", depth.error.message);
  }

  // ============================================================================
  // TRADE ENDPOINTS (Requieren autenticación)
  // ============================================================================

  console.log("\n\n💳 TRADE ENDPOINTS (Requieren API Key)\n");

  // Place order (ejemplo - usar con precaución)
  console.log("6. Place Order (LIMIT BUY BTCUSDT):");
  const orderRequest = {
    symbol: "BTCUSDT",
    side: "BUY" as const,
    type: "LIMIT" as const,
    quantity: "0.001",
    price: "30000",
    timeInForce: "GTC" as const,
    newClientOrderId: `DAES-ORDER-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(orderRequest, null, 2));

  // NOTA: Descomenta para ejecutar orden real
  // const order = await yex.spot.newOrder(orderRequest);
  // if (order.ok) {
  //   console.log("   Order ID:", order.data.orderId);
  //   console.log("   Status:", order.data.status);
  // } else {
  //   console.log("   Error:", order.error.message, order.yex);
  // }

  // Get open orders
  console.log("\n7. Open Orders:");
  const openOrders = await yex.spot.openOrders("BTCUSDT");
  if (openOrders.ok) {
    console.log("   Count:", openOrders.data.length);
    if (openOrders.data.length > 0) {
      console.log("   First:", JSON.stringify(openOrders.data[0], null, 2));
    }
  } else {
    console.log("   Error:", openOrders.error.message);
  }

  // Cancel order (ejemplo)
  console.log("\n8. Cancel Order:");
  console.log("   (Skipped - no order to cancel)");
  // const cancel = await yex.spot.cancel("BTCUSDT", undefined, "DAES-ORDER-000001");

  // ============================================================================
  // WITHDRAW ENDPOINTS
  // ============================================================================

  console.log("\n\n💸 WITHDRAW ENDPOINTS\n");

  // Withdraw (ejemplo - usar con precaución)
  console.log("9. Withdraw Request:");
  const withdrawRequest = {
    coin: "USDTBSC", // RealCoinName según Appendix 1
    address: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
    amount: "100",
    clientWithdrawId: `DAES-WD-${Date.now()}`, // idempotencia DAES
  };
  console.log("   Request:", JSON.stringify(withdrawRequest, null, 2));

  // NOTA: Descomenta para ejecutar withdraw real
  // const wd = await yex.withdraw.apply(withdrawRequest);
  // if (wd.ok) {
  //   console.log("   Withdraw ID:", wd.data.id);
  //   console.log("   Status:", wd.data.status);
  // } else {
  //   console.log("   Error:", wd.error.message, wd.yex);
  // }

  // ============================================================================
  // FUTURES ENDPOINTS
  // ============================================================================

  console.log("\n\n📈 FUTURES ENDPOINTS\n");

  // Futures ping
  console.log("10. Futures Ping:");
  const futuresPing = await yex.futures.ping();
  console.log("    Result:", futuresPing.ok ? "✅ OK" : "❌ Failed");

  // Futures index price
  console.log("\n11. Futures Index Price BTCUSDT:");
  const indexPrice = await yex.futures.index("BTCUSDT");
  if (indexPrice.ok) {
    const idx = indexPrice.data as any;
    console.log("    Index Price:", idx.indexPrice);
  } else {
    console.log("    Error:", indexPrice.error.message);
  }

  // ============================================================================
  // WEBSOCKET
  // ============================================================================

  console.log("\n\n🔌 WEBSOCKET\n");

  if (yex.ws) {
    console.log("12. WebSocket Connection:");

    // Handler para mensajes
    yex.ws.onMessage((msg) => {
      console.log("    WS Message:", JSON.stringify(msg).slice(0, 100) + "...");
    });

    // Handler para conexión
    yex.ws.onOpen(() => {
      console.log("    WS Connected!");

      // Suscribirse a canales
      yex.ws!.subscribe("market_BTCUSDT_ticker");
      yex.ws!.subscribe("market_BTCUSDT_kline_1min");
      console.log("    Subscribed to: BTCUSDT ticker, kline_1min");
    });

    // Handler para errores
    yex.ws.onError((err) => {
      console.log("    WS Error:", err.message);
    });

    // Conectar
    console.log("    Connecting...");
    yex.ws.connect();

    // Mantener conexión por 10 segundos para demo
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Cerrar
    yex.ws.close();
    console.log("    WS Closed");
  } else {
    console.log("12. WebSocket: Not configured (YEX_WS_URL not set)");
  }

  console.log("\n\n✅ Demo completed!");
}

// Ejecutar
main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});





