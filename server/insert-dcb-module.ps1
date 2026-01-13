$file = "index.js"
$lines = Get-Content $file
$insertAt = 9467

$newCode = @(
'',
'// ============================================================================',
'// DCB INTEGRATION - Módulo de Integración con DCB Platform',
'// ============================================================================',
'try {',
"  const dcbIntegrationRoutes = await import('./routes/dcb-integration-routes.js');",
"  app.use('/api/dcb', dcbIntegrationRoutes.default);",
"  console.log('✅ [DCB Integration] Rutas configuradas en /api/dcb');",
"  console.log('   → Endpoints disponibles:');",
"  console.log('      GET    /api/dcb/accounts/user/:userId');",
"  console.log('      GET    /api/dcb/accounts/:accountId');",
"  console.log('      GET    /api/dcb/accounts/:accountId/balance');",
"  console.log('      GET    /api/dcb/accounts/:accountId/movements');",
"  console.log('      POST   /api/dcb/accounts');",
"  console.log('      POST   /api/dcb/transfers');",
"  console.log('      GET    /api/dcb/payments/user/:userId');",
"  console.log('      GET    /api/dcb/payments/:transactionId');",
"  console.log('      GET    /api/dcb/fx/rates');",
"  console.log('      GET    /api/dcb/fx/rate');",
"  console.log('      POST   /api/dcb/fx/quote');",
"  console.log('      POST   /api/dcb/fx/exchange');",
"  console.log('      GET    /api/dcb/health');",
"} catch (error) {",
"  console.warn('⚠️  [DCB Integration] No se pudieron cargar las rutas:', error.message);",
'}'
)

$newLines = $lines[0..($insertAt-1)] + $newCode + $lines[$insertAt..($lines.Length-1)]
$newLines | Set-Content $file

Write-Host "✅ Módulo DCB Integration agregado exitosamente"

