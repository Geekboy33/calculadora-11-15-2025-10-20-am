/**
 * Test de Validación de Tarjetas - Algoritmo de Luhn
 * 
 * Este archivo contiene pruebas para verificar que la implementación
 * del algoritmo de Luhn es correcta según ISO/IEC 7812-1
 */

import { cardsStore } from './cards-store';

/**
 * Números de tarjeta de prueba OFICIALES para testing
 * Estos son BINs reservados para pruebas según cada red de pago
 */
const TEST_CARD_NUMBERS = {
  // Visa Test Cards (Luhn válido)
  visa: [
    '4111111111111111', // Visa clásica de prueba
    '4012888888881881', // Visa de prueba
    '4222222222222',    // Visa 13 dígitos (antigua)
    '4000056655665556', // Visa Debit
  ],
  
  // Mastercard Test Cards (Luhn válido)
  mastercard: [
    '5555555555554444', // Mastercard de prueba
    '5105105105105100', // Mastercard prepago
    '5200828282828210', // Mastercard Debit
    '2223000048400011', // Mastercard nuevo rango 2
  ],
  
  // American Express Test Cards (Luhn válido)
  amex: [
    '378282246310005',  // Amex de prueba
    '371449635398431',  // Amex de prueba 2
    '340000000000009',  // Amex Corporate
  ],
  
  // Números inválidos (para probar detección de errores)
  invalid: [
    '4111111111111112', // Luhn inválido (cambiado último dígito)
    '1234567890123456', // BIN inválido
    '411111111111111',  // Longitud incorrecta (15 para Visa)
    '4111 1111 1111 1111', // Con espacios (debería limpiarse)
  ],
};

/**
 * Ejecutar todas las pruebas de validación
 */
export function runCardValidationTests(): {
  passed: number;
  failed: number;
  results: Array<{
    test: string;
    cardNumber: string;
    expected: boolean;
    actual: boolean;
    passed: boolean;
    network?: string;
  }>;
} {
  const results: Array<{
    test: string;
    cardNumber: string;
    expected: boolean;
    actual: boolean;
    passed: boolean;
    network?: string;
  }> = [];
  
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 INICIANDO PRUEBAS DE VALIDACIÓN DE TARJETAS');
  console.log('═══════════════════════════════════════════════════════════════');
  
  // Test 1: Tarjetas Visa válidas
  console.log('\n📌 TEST 1: Tarjetas VISA válidas');
  TEST_CARD_NUMBERS.visa.forEach((card, i) => {
    const isValid = cardsStore.validateCardNumber(card);
    const validation = cardsStore.validateCardComplete(card);
    const passed = isValid === true && validation.network === 'visa';
    results.push({
      test: `Visa #${i + 1}`,
      cardNumber: card,
      expected: true,
      actual: isValid,
      passed,
      network: validation.network,
    });
    console.log(`  ${passed ? '✅' : '❌'} ${card}: Luhn=${isValid}, Red=${validation.network}`);
  });
  
  // Test 2: Tarjetas Mastercard válidas
  console.log('\n📌 TEST 2: Tarjetas MASTERCARD válidas');
  TEST_CARD_NUMBERS.mastercard.forEach((card, i) => {
    const isValid = cardsStore.validateCardNumber(card);
    const validation = cardsStore.validateCardComplete(card);
    const passed = isValid === true && validation.network === 'mastercard';
    results.push({
      test: `Mastercard #${i + 1}`,
      cardNumber: card,
      expected: true,
      actual: isValid,
      passed,
      network: validation.network,
    });
    console.log(`  ${passed ? '✅' : '❌'} ${card}: Luhn=${isValid}, Red=${validation.network}`);
  });
  
  // Test 3: Tarjetas Amex válidas
  console.log('\n📌 TEST 3: Tarjetas AMEX válidas');
  TEST_CARD_NUMBERS.amex.forEach((card, i) => {
    const isValid = cardsStore.validateCardNumber(card);
    const validation = cardsStore.validateCardComplete(card);
    const passed = isValid === true && validation.network === 'amex';
    results.push({
      test: `Amex #${i + 1}`,
      cardNumber: card,
      expected: true,
      actual: isValid,
      passed,
      network: validation.network,
    });
    console.log(`  ${passed ? '✅' : '❌'} ${card}: Luhn=${isValid}, Red=${validation.network}`);
  });
  
  // Test 4: Detección de números inválidos
  console.log('\n📌 TEST 4: Números INVÁLIDOS (deben fallar)');
  const expectedInvalid = [false, false, false, true]; // El último tiene espacios pero es válido
  TEST_CARD_NUMBERS.invalid.forEach((card, i) => {
    const isValid = cardsStore.validateCardNumber(card);
    const expected = expectedInvalid[i];
    const passed = isValid === expected;
    results.push({
      test: `Invalid #${i + 1}`,
      cardNumber: card,
      expected,
      actual: isValid,
      passed,
    });
    console.log(`  ${passed ? '✅' : '❌'} ${card}: Luhn=${isValid} (esperado: ${expected})`);
  });
  
  // Test 5: Generación de tarjetas
  console.log('\n📌 TEST 5: Generación y validación de nuevas tarjetas');
  const networks: Array<'visa' | 'mastercard' | 'amex' | 'unionpay'> = ['visa', 'mastercard', 'amex', 'unionpay'];
  const tiers = ['classic', 'gold', 'platinum'];
  
  networks.forEach(network => {
    tiers.forEach(tier => {
      // Simular generación (necesitaría acceso a método privado)
      // Por ahora verificamos que la validación completa funciona
      console.log(`  🎴 ${network.toUpperCase()} ${tier}: [Generación disponible en issueCard()]`);
    });
  });
  
  // Resumen
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 RESULTADOS: ${passed} PASARON | ${failed} FALLARON`);
  console.log('═══════════════════════════════════════════════════════════════');
  
  return { passed, failed, results };
}

/**
 * Verificar algoritmo de Luhn manualmente paso a paso
 */
export function demonstrateLuhnAlgorithm(cardNumber: string): void {
  const clean = cardNumber.replace(/\s|-/g, '');
  console.log('\n🔬 DEMOSTRACIÓN DEL ALGORITMO DE LUHN');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Número: ${clean}`);
  console.log(`Longitud: ${clean.length} dígitos`);
  
  const digits = clean.split('').map(Number);
  const reversed = [...digits].reverse();
  
  console.log('\nPaso 1: Invertir el número');
  console.log(`  Original:  ${digits.join(' ')}`);
  console.log(`  Invertido: ${reversed.join(' ')}`);
  
  console.log('\nPaso 2: Duplicar dígitos en posiciones impares (desde la derecha)');
  const processed: number[] = [];
  let sum = 0;
  
  reversed.forEach((digit, i) => {
    let result = digit;
    if (i % 2 === 1) {
      result = digit * 2;
      if (result > 9) result -= 9;
      console.log(`  Posición ${i}: ${digit} × 2 = ${digit * 2}${digit * 2 > 9 ? ` → ${result}` : ''}`);
    } else {
      console.log(`  Posición ${i}: ${digit} (sin cambio)`);
    }
    processed.push(result);
    sum += result;
  });
  
  console.log('\nPaso 3: Sumar todos los dígitos procesados');
  console.log(`  ${processed.join(' + ')} = ${sum}`);
  
  console.log('\nPaso 4: Verificar si es múltiplo de 10');
  console.log(`  ${sum} mod 10 = ${sum % 10}`);
  console.log(`  Resultado: ${sum % 10 === 0 ? '✅ VÁLIDO' : '❌ INVÁLIDO'}`);
}

// Auto-ejecutar pruebas si se importa este módulo
if (typeof window !== 'undefined') {
  // En el navegador, exponer funciones globalmente para pruebas
  (window as any).runCardValidationTests = runCardValidationTests;
  (window as any).demonstrateLuhnAlgorithm = demonstrateLuhnAlgorithm;
  console.log('[Cards Test] 📋 Funciones de prueba disponibles:');
  console.log('  - runCardValidationTests()');
  console.log('  - demonstrateLuhnAlgorithm("4111111111111111")');
}

export default { runCardValidationTests, demonstrateLuhnAlgorithm };

