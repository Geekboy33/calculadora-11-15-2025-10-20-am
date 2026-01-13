# Script para agregar módulo DCB Integration al servidor DAES

$filePath = "index.js"
$content = Get-Content $filePath -Raw

$newModule = @"

// ============================================================================
// DCB INTEGRATION - Módulo de Integración con DCB Platform
// ============================================================================
try {
  const dcbIntegrationRoutes = await import('./routes/dcb-integration-routes.js');
  app.use('/api/dcb', dcbIntegrationRoutes.default);
  console.log('✅ [DCB Integration] Rutas configuradas en /api/dcb');
  console.log('   → Endpoints disponibles:');
  console.log('      GET    /api/dcb/accounts/user/:userId');
  console.log('      GET    /api/dcb/accounts/:accountId');
  console.log('      GET    /api/dcb/accounts/:accountId/balance');
  console.log('      GET    /api/dcb/accounts/:accountId/movements');
  console.log('      POST   /api/dcb/accounts');
  console.log('      POST   /api/dcb/transfers');
  console.log('      GET    /api/dcb/payments/user/:userId');
  console.log('      GET    /api/dcb/payments/:transactionId');
  console.log('      GET    /api/dcb/fx/rates');
  console.log('      GET    /api/dcb/fx/rate');
  console.log('      POST   /api/dcb/fx/quote');
  console.log('      POST   /api/dcb/fx/exchange');
  console.log('      GET    /api/dcb/health');
} catch (error) {
  console.warn('⚠️  [DCB Integration] No se pudieron cargar las rutas:', error.message);
}

"@

# Buscar la línea antes de APP LISTEN y reemplazar
$pattern = '(// TEST DELEGADOR - Ruta de prueba[\s\S]*?console\.warn\(''⚠️  \[Test Delegador\] Error:'', error\.message\);\n\})\n\n// ============================================================================\n// APP LISTEN)'
$replacement = "`$1`n`n$newModule`n`n// ============================================================================`n// APP LISTEN"

$newContent = $content -replace $pattern, $replacement

Set-Content -Path $filePath -Value $newContent -NoNewline

Write-Host "✅ Módulo DCB Integration agregado a index.js"

