// Diagnostic Script - Ejecutar en la consola del navegador
// Copia y pega esto en la consola (F12) cuando estés en http://localhost:4001

console.log('🔍 ===== DIAGNÓSTICO CUSTODY ACCOUNTS =====');

const STORAGE_KEY = 'Digital Commercial Bank Ltd_custody_accounts';

// 1. Verificar localStorage
console.log('\n1️⃣ Verificando localStorage...');
const stored = localStorage.getItem(STORAGE_KEY);

if (!stored) {
    console.error('❌ NO HAY DATOS EN LOCALSTORAGE');
    console.log('💡 Solución: Ve a Custody Accounts y crea una cuenta');
} else {
    console.log('✅ Datos encontrados en localStorage');
    
    try {
        const data = JSON.parse(stored);
        console.log('✅ JSON parseado correctamente');
        console.log('📊 Estructura:', Object.keys(data));
        
        if (data.accounts && Array.isArray(data.accounts)) {
            console.log(`\n✅ Encontradas ${data.accounts.length} cuentas\n`);
            
            if (data.accounts.length === 0) {
                console.warn('⚠️ El array de cuentas está vacío');
                console.log('💡 Solución: Ve a Custody Accounts y crea una cuenta');
            } else {
                console.table(data.accounts.map(a => ({
                    Nombre: a.accountName,
                    Tipo: a.accountType,
                    Moneda: a.currency,
                    'Total': a.totalBalance,
                    'Reservado': a.reservedBalance,
                    'Disponible': a.availableBalance,
                    'Estado': a.reservedBalance > 0 ? '✅ CON RESERVAS' : '❌ SIN RESERVAS'
                })));
                
                // Análisis de reservas
                const withReserves = data.accounts.filter(a => a.reservedBalance > 0);
                console.log(`\n📊 RESUMEN:`);
                console.log(`   Total de cuentas: ${data.accounts.length}`);
                console.log(`   Con reservas: ${withReserves.length}`);
                console.log(`   Sin reservas: ${data.accounts.length - withReserves.length}`);
                
                if (withReserves.length === 0) {
                    console.error('\n❌ PROBLEMA IDENTIFICADO:');
                    console.error('   Ninguna cuenta tiene fondos RESERVADOS');
                    console.log('\n💡 SOLUCIÓN:');
                    console.log('   1. Ve al módulo "Custody Accounts"');
                    console.log('   2. Selecciona una cuenta');
                    console.log('   3. Busca el botón "Reservar Fondos" o similar');
                    console.log('   4. Reserva una cantidad (ej: 50000)');
                    console.log('   5. Verifica que "Reservado" sea > 0');
                    console.log('   6. Vuelve a API VUSD');
                } else {
                    console.log('\n✅ ESTAS CUENTAS DEBERÍAN APARECER EN API VUSD:');
                    withReserves.forEach(a => {
                        console.log(`   • ${a.accountName} · ${a.currency} ${a.reservedBalance.toLocaleString()} reservado`);
                    });
                }
            }
        } else {
            console.error('❌ No hay array de cuentas en los datos');
        }
        
    } catch (err) {
        console.error('❌ Error parseando JSON:', err);
    }
}

// 2. Verificar otras keys relacionadas
console.log('\n2️⃣ Verificando otras keys de localStorage...');
const allKeys = Object.keys(localStorage);
const daesKeys = allKeys.filter(k => k.includes('Digital Commercial Bank Ltd') || k.includes('DAES') || k.includes('custody'));
console.log('🔑 Keys relacionadas encontradas:', daesKeys);

console.log('\n✅ DIAGNÓSTICO COMPLETADO');
console.log('=======================================\n');

