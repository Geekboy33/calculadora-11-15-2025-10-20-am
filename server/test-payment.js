/**
 * Test payment script - 1000 RUB
 */

const testPayment = async () => {
  const timestamp = Date.now();
  
  // Generate proper UUID format (required by Sberbank API)
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  const paymentData = {
    payment: {
      documentNumber: `${timestamp}`.slice(-8),
      externalId: generateUUID(), // Must be UUID format!
      date: new Date().toISOString().split('T')[0],
      amount: 1000,
      currency: 'RUB',
      operationCode: '01',
      priority: '5',
      urgencyCode: 'NORMAL',
      purpose: 'Test payment calibration 1000 RUB - verificacion API',
      
      // ═══════════════════════════════════════════════════════════════════
      // PAYER - ООО "ПОИНТЕР" (Corporate Settlement Account)
      // ═══════════════════════════════════════════════════════════════════
      payerName: 'ООО "ПОИНТЕР"',
      payerInn: '7328077215',
      payerKpp: '732801001',
      payerAccount: '40702810669000001880', // Settlement account
      payerBankBic: '047308602',
      payerBankCorrAccount: '30101810000000000602',
      
      // ═══════════════════════════════════════════════════════════════════
      // PAYEE - Test beneficiary
      // ═══════════════════════════════════════════════════════════════════
      payeeName: 'Test Beneficiary LLC',
      payeeInn: '7707083893',
      payeeKpp: '773601001',
      payeeAccount: '40702810938000060454',
      payeeBic: '044525225',
      payeeBankCorrAccount: '30101810400000000225',
    },
    immediate: true,
  };
  
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🧪 TEST PAYMENT - 1000 RUB');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Amount:', paymentData.payment.amount, 'RUB');
  console.log('Payer Account:', paymentData.payment.payerAccount);
  console.log('Payee:', paymentData.payment.payeeName);
  console.log('External ID:', paymentData.payment.externalId);
  console.log('═══════════════════════════════════════════════════════════════════');
  
  try {
    const response = await fetch('http://localhost:3001/api/sber-business/payments/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData),
    });
    
    const result = await response.json();
    
    console.log('\n📋 RESULT:');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('Success:', result.success);
    console.log('Mode:', result.mode);
    console.log('Message:', result.message);
    
    if (result.payment) {
      console.log('\n💰 Payment Details:');
      console.log('  External ID:', result.payment.externalId);
      console.log('  Document #:', result.payment.documentNumber);
      console.log('  Amount:', result.payment.amount, result.payment.currency);
      console.log('  Status:', result.payment.status);
    }
    
    if (result.multiSignature) {
      console.log('\n✍️ Multi-Signature:');
      console.log('  Total Signers:', result.multiSignature.totalSigners);
      console.log('  Collected:', result.multiSignature.collectedSignatures);
      console.log('  Status:', result.multiSignature.status);
    }
    
    if (result.sberResponse) {
      console.log('\n🏦 Sberbank Response:');
      console.log(JSON.stringify(result.sberResponse, null, 2));
    }
    
    if (result.sberError) {
      console.log('\n❌ Sberbank Error:');
      console.log(JSON.stringify(result.sberError, null, 2));
    }
    
    if (result.triedEndpoints) {
      console.log('\n🔗 Tried Endpoints:');
      result.triedEndpoints.forEach(ep => console.log('  -', ep));
    }
    
    if (result.lastError) {
      console.log('\n⚠️ Last Error:', result.lastError);
    }
    
    console.log('\n⏱️ Latency:', result.latency, 'ms');
    console.log('═══════════════════════════════════════════════════════════════════');
    
    return result;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
};

testPayment();
