/**
 * Black Screen Generator
 * Funciones compartidas para generar Black Screens desde cualquier módulo
 */

export interface BlackScreenData {
  currency: string;
  accountNumber: string;
  beneficiaryName: string;
  beneficiaryBank: string;
  balanceM1: number;
  balanceM2: number;
  balanceM3: number;
  balanceM4: number;
  totalLiquid: number;
  transactionCount: number;
  verificationHash: string;
  DTC1BReference: string;
  swiftCode: string;
  routingNumber: string;
  issueDate: Date;
  expiryDate: Date;
}

/**
 * Genera un hash de verificación único
 */
export function generateVerificationHash(
  currency: string,
  amount: number,
  txCount: number
): string {
  const data = `${currency}-${amount}-${txCount}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
}

/**
 * Genera datos completos de Black Screen desde información de cuenta
 */
export function generateBlackScreenData(params: {
  currency: string;
  totalAmount: number;
  transactionCount?: number;
  accountNumber?: string;
  beneficiaryName?: string;
  beneficiaryBank?: string;
}): BlackScreenData {
  const {
    currency,
    totalAmount,
    transactionCount = 0,
    accountNumber,
    beneficiaryName,
    beneficiaryBank,
  } = params;

  // Calcular agregados monetarios según estándares bancarios
  const balanceM1 = totalAmount * 0.30; // Efectivo y depósitos a la vista
  const balanceM2 = totalAmount * 0.60; // M1 + depósitos de ahorro
  const balanceM3 = totalAmount * 0.85; // M2 + grandes depósitos a plazo
  const balanceM4 = totalAmount; // M3 + instrumentos negociables

  // Generar hash de verificación
  const verificationHash = generateVerificationHash(
    currency,
    totalAmount,
    transactionCount
  );

  // Generar referencia Digital Commercial Bank Ltd
  const DTC1BReference = `Digital Commercial Bank Ltd-${currency}-${Date.now()
    .toString(36)
    .toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // SWIFT code
  const swiftCode = `DAES${currency}XX`;

  // Routing number
  const routingNumber = `021${Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0')}`;

  // Account number si no se proporciona
  const generatedAccountNumber =
    accountNumber ||
    `DAES-${currency}-${Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0')}`;

  const issueDate = new Date();
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  return {
    currency,
    accountNumber: generatedAccountNumber,
    beneficiaryName: beneficiaryName || 'DAES MASTER ACCOUNT',
    beneficiaryBank: beneficiaryBank || 'DAES - DATA AND EXCHANGE SETTLEMENT',
    balanceM1,
    balanceM2,
    balanceM3,
    balanceM4,
    totalLiquid: totalAmount,
    transactionCount,
    verificationHash,
    DTC1BReference,
    swiftCode,
    routingNumber,
    issueDate,
    expiryDate,
  };
}

/**
 * Genera el contenido HTML de la Black Screen
 */
export function generateBlackScreenHTML(data: BlackScreenData): string {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return `
    <div style="background: #000000; color: #00ff00; font-family: 'Courier New', monospace; padding: 40px; min-height: 100vh;">
      <div style="border: 2px solid #00ff00; padding: 30px; max-width: 800px; margin: 0 auto;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #00ff00; padding-bottom: 20px;">
          <h1 style="font-size: 24px; letter-spacing: 4px; margin: 0 0 10px 0;">
            █████ BANK CONFIRMATION █████
          </h1>
          <p style="font-size: 12px; margin: 5px 0; color: #00cc00;">
            DIGITAL COMMERCIAL BANK LTD - BANKING SYSTEM
          </p>
          <p style="font-size: 10px; margin: 5px 0; color: #00cc00;">
            SWIFT/FEDWIRE/DTC COMPLIANT DOCUMENT
          </p>
        </div>

        <!-- Account Information -->
        <div style="margin-bottom: 30px;">
          <div style="background: #001100; border: 1px solid #00ff00; padding: 20px; margin-bottom: 10px;">
            <p style="margin: 5px 0;"><strong>ACCOUNT NUMBER:</strong> ${data.accountNumber}</p>
            <p style="margin: 5px 0;"><strong>BENEFICIARY:</strong> ${data.beneficiaryName}</p>
            <p style="margin: 5px 0;"><strong>BANK:</strong> ${data.beneficiaryBank}</p>
            <p style="margin: 5px 0;"><strong>SWIFT CODE:</strong> ${data.swiftCode}</p>
            <p style="margin: 5px 0;"><strong>ROUTING NUMBER:</strong> ${data.routingNumber}</p>
            <p style="margin: 5px 0;"><strong>CURRENCY:</strong> ${data.currency}</p>
          </div>
        </div>

        <!-- Monetary Aggregates -->
        <div style="margin-bottom: 30px;">
          <h2 style="font-size: 16px; border-bottom: 1px solid #00ff00; padding-bottom: 10px; margin-bottom: 15px;">
            MONETARY AGGREGATES (FEDERAL RESERVE STANDARDS)
          </h2>

          <div style="background: #001100; border: 1px solid #00ff00; padding: 15px; margin-bottom: 10px;">
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>M1 (Cash + Demand Deposits):</strong><br/>
              <span style="font-size: 18px; color: #00ff88;">${data.currency} ${formatCurrency(data.balanceM1)}</span>
            </p>
          </div>

          <div style="background: #001100; border: 1px solid #00ff00; padding: 15px; margin-bottom: 10px;">
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>M2 (M1 + Savings + Small Time Deposits):</strong><br/>
              <span style="font-size: 18px; color: #00ff88;">${data.currency} ${formatCurrency(data.balanceM2)}</span>
            </p>
          </div>

          <div style="background: #001100; border: 1px solid #00ff00; padding: 15px; margin-bottom: 10px;">
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>M3 (M2 + Large Time Deposits):</strong><br/>
              <span style="font-size: 18px; color: #00ff88;">${data.currency} ${formatCurrency(data.balanceM3)}</span>
            </p>
          </div>

          <div style="background: #001100; border: 1px solid #00ff00; padding: 15px; margin-bottom: 10px;">
            <p style="margin: 8px 0; font-size: 14px;">
              <strong>M4 (M3 + Negotiable Instruments):</strong><br/>
              <span style="font-size: 20px; color: #00ff00; font-weight: bold;">${data.currency} ${formatCurrency(data.balanceM4)}</span>
            </p>
          </div>

          <div style="background: #003300; border: 2px solid #00ff00; padding: 15px; margin-top: 15px;">
            <p style="margin: 8px 0; font-size: 16px;">
              <strong>TOTAL LIQUID ASSETS:</strong><br/>
              <span style="font-size: 24px; color: #00ff00; font-weight: bold;">${data.currency} ${formatCurrency(data.totalLiquid)}</span>
            </p>
          </div>
        </div>

        <!-- Transaction Info -->
        <div style="margin-bottom: 30px;">
          <div style="background: #001100; border: 1px solid #00ff00; padding: 15px;">
            <p style="margin: 5px 0;"><strong>TRANSACTION COUNT:</strong> ${data.transactionCount.toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>VERIFICATION HASH:</strong> ${data.verificationHash}</p>
            <p style="margin: 5px 0;"><strong>Digital Commercial Bank Ltd REFERENCE:</strong> ${data.DTC1BReference}</p>
          </div>
        </div>

        <!-- Dates -->
        <div style="margin-bottom: 30px;">
          <div style="background: #001100; border: 1px solid #00ff00; padding: 15px;">
            <p style="margin: 5px 0;"><strong>ISSUE DATE:</strong> ${formatDate(data.issueDate)}</p>
            <p style="margin: 5px 0;"><strong>EXPIRY DATE:</strong> ${formatDate(data.expiryDate)}</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #00ff00;">
          <p style="font-size: 10px; margin: 5px 0; color: #00cc00;">
            THIS DOCUMENT IS GENERATED BY DIGITAL COMMERCIAL BANK LTD SECURE SYSTEM
          </p>
          <p style="font-size: 10px; margin: 5px 0; color: #00cc00;">
            COMPLIANT WITH SWIFT MT940, FEDWIRE, AND DTC STANDARDS
          </p>
          <p style="font-size: 10px; margin: 5px 0; color: #00cc00;">
            FOR VERIFICATION PURPOSES ONLY - CONFIDENTIAL BANKING INFORMATION
          </p>
          <p style="font-size: 12px; margin: 15px 0 5px 0; color: #00ff00;">
            ████████████████████████████████████████
          </p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Descarga la Black Screen como archivo HTML
 */
export function downloadBlackScreenHTML(data: BlackScreenData): void {
  const html = generateBlackScreenHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BlackScreen_${data.currency}_${data.accountNumber}_${
    data.issueDate.toISOString().split('T')[0]
  }.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Imprime la Black Screen
 */
export function printBlackScreen(data: BlackScreenData): void {
  const html = generateBlackScreenHTML(data);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}
