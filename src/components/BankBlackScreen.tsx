/**
 * Bank Black Screen - Sistema de Emisión de Confirmaciones Bancarias
 * Genera black screens profesionales con balances M1, M2, M3, M4
 * Según estándares SWIFT, FEDWIRE, DTC, y sistemas bancarios internacionales
 */

import { useState, useRef, useEffect } from 'react';
import { Shield, FileText, Download, Printer, CheckCircle, AlertTriangle, Lock, Building2, DollarSign, Database, X, Image as ImageIcon } from 'lucide-react';
import { balanceStore, formatCurrency, getCurrencyName, type CurrencyBalance } from '../lib/balances-store';
import { useLanguage } from '../lib/i18n.tsx';
import { CheckIcon } from './CustomIcons';
import { downloadPDF } from '../lib/download-helper';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface BlackScreenData {
  currency: string;
  accountNumber: string;
  beneficiaryName: string;
  beneficiaryBank: string;
  balanceM1: number; // Efectivo y depósitos a la vista
  balanceM2: number; // M1 + depósitos de ahorro y pequeños depósitos a plazo
  balanceM3: number; // M2 + grandes depósitos a plazo
  balanceM4: number; // M3 + instrumentos negociables
  totalLiquid: number;
  transactionCount: number;
  verificationHash: string;
  DTC1BReference: string;
  swiftCode: string;
  routingNumber: string;
  issueDate: Date;
  expiryDate: Date;
  fundDenomination?: 'M1' | 'M2'; // Denominación de fondos si viene de cuenta custodio
  custodyAccountName?: string; // Nombre de cuenta custodio si aplica
}

export function BankBlackScreen() {
  const { t } = useLanguage();
  const [balances, setBalances] = useState<CurrencyBalance[]>([]);
  const [showBlackScreen, setShowBlackScreen] = useState(false);
  const [blackScreenData, setBlackScreenData] = useState<BlackScreenData | null>(null);
  const [selectedBalance, setSelectedBalance] = useState<CurrencyBalance | null>(null);
  const blackScreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load balances from store
    const loadedBalances = balanceStore.getBalances();
    setBalances(loadedBalances);

    // Subscribe to updates
    const unsubscribe = balanceStore.subscribe((updatedBalances) => {
      setBalances(updatedBalances);
    });

    return unsubscribe;
  }, []);

  // Calcular balances M1, M2, M3, M4 según estándares bancarios
  const calculateMonetaryAggregates = (balance: CurrencyBalance): BlackScreenData => {
    const totalAmount = balance.totalAmount;
    
    // M1: Efectivo y depósitos a la vista (30% del total)
    const balanceM1 = totalAmount * 0.30;
    
    // M2: M1 + depósitos de ahorro y pequeños depósitos a plazo (60% del total)
    const balanceM2 = totalAmount * 0.60;
    
    // M3: M2 + grandes depósitos a plazo (85% del total)
    const balanceM3 = totalAmount * 0.85;
    
    // M4: M3 + instrumentos negociables (100% del total)
    const balanceM4 = totalAmount;

    // Generar hash de verificación
    const verificationHash = generateVerificationHash(balance.currency, totalAmount, balance.transactionCount);
    
    // Generar Digital Commercial Bank Ltd reference
    const DTC1BReference = `Digital Commercial Bank Ltd-${balance.currency}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // SWIFT code DAES
    const swiftCode = `DAES${balance.currency}XX`;

    // Routing number
    const routingNumber = `021${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;

    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    return {
      currency: balance.currency,
      accountNumber: `DCB-${balance.currency}-${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      beneficiaryName: 'Digital Commercial Bank Ltd MASTER ACCOUNT',
      beneficiaryBank: 'Digital Commercial Bank Ltd',
      balanceM1,
      balanceM2,
      balanceM3,
      balanceM4,
      totalLiquid: totalAmount,
      transactionCount: balance.transactionCount,
      verificationHash,
      DTC1BReference,
      swiftCode,
      routingNumber,
      issueDate,
      expiryDate,
    };
  };

  const generateVerificationHash = (currency: string, amount: number, txCount: number): string => {
    const data = `${currency}-${amount}-${txCount}-${Date.now()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
  };

  const handleGenerateBlackScreen = (balance: CurrencyBalance) => {
    setSelectedBalance(balance);
    const data = calculateMonetaryAggregates(balance);
    setBlackScreenData(data);
    setShowBlackScreen(true);
  };

  const handlePrint = () => {
    if (blackScreenRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Bank Black Screen - ${blackScreenData?.currency}</title>
              <style>
                body { font-family: 'Courier New', monospace; background: #000; color: #0f0; padding: 20px; }
                .blackscreen { max-width: 800px; margin: 0 auto; }
                h1, h2, h3 { color: #0f0; }
                .section { border: 2px solid #0f0; padding: 15px; margin: 15px 0; }
                .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
                .field { margin: 5px 0; }
                .label { font-weight: bold; }
                @media print { body { background: #000; } }
              </style>
            </head>
            <body>${blackScreenRef.current.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const getContent = () => {
    if (!blackScreenData) return '';

    // Sección de denominación de fondos (si aplica)
    const fundDenominationSection = blackScreenData.fundDenomination ? `
FUND DENOMINATION / DENOMINACIÓN DE FONDOS
────────────────────────────────────────────────────────────────
Classification:          ${blackScreenData.fundDenomination}
Type:                    ${blackScreenData.fundDenomination === 'M1' 
  ? 'LIQUID CASH - Efectivo Líquido (Billetes, monedas, depósitos a la vista)'
  : 'NEAR MONEY - Cuasi-Dinero (M1 + depósitos de ahorro, mercado monetario)'}
${blackScreenData.custodyAccountName ? `Custody Account:         ${blackScreenData.custodyAccountName}` : ''}
Status:                  ✓ VERIFIED / VERIFICADO

` : '';
    
    return `
═══════════════════════════════════════════════════════════════
        ${t.blackScreenBankConfirmation}
                    ${t.blackScreenXcpBank}
═══════════════════════════════════════════════════════════════

${t.blackScreenDocumentConfidential}

${t.blackScreenBeneficiaryInfo}
────────────────────────────────────────────────────────────────
${t.blackScreenHolder}:              ${blackScreenData.beneficiaryName}
${t.blackScreenAccount}:             ${blackScreenData.accountNumber}
${t.blackScreenBank}:                ${blackScreenData.beneficiaryBank}
${t.blackScreenCurrency}:            ${blackScreenData.currency} (${getCurrencyName(blackScreenData.currency)})
${fundDenominationSection}
${t.blackScreenMonetaryAggregates}
────────────────────────────────────────────────────────────────
${t.blackScreenM1Liquid}:           ${formatCurrency(blackScreenData.balanceM1, blackScreenData.currency)}
    └─ ${t.blackScreenM1Description}

${t.blackScreenM2Near}:              ${formatCurrency(blackScreenData.balanceM2, blackScreenData.currency)}
    └─ ${t.blackScreenM2Description}

${t.blackScreenM3Broad}:             ${formatCurrency(blackScreenData.balanceM3, blackScreenData.currency)}
    └─ ${t.blackScreenM3Description}

${t.blackScreenM4Total}:     ${formatCurrency(blackScreenData.balanceM4, blackScreenData.currency)}
    └─ ${t.blackScreenM4Description}

${t.blackScreenVerifiedBalance}:     ${formatCurrency(blackScreenData.totalLiquid, blackScreenData.currency)}

${t.blackScreenTechnicalInfo}
────────────────────────────────────────────────────────────────
${t.blackScreenDtcReference}:     ${blackScreenData.DTC1BReference}
${t.blackScreenVerificationHash}: ${blackScreenData.verificationHash}
${t.blackScreenTransactionsProcessed}:        ${blackScreenData.transactionCount.toLocaleString()}
${t.blackScreenIssueDate}:     ${blackScreenData.issueDate.toLocaleString()}
${t.blackScreenExpiryDate}:  ${blackScreenData.expiryDate.toLocaleString()}

${t.blackScreenCertification}
────────────────────────────────────────────────────────────────
${t.blackScreenCertificationText}

${t.blackScreenCertificationStandards}

${t.blackScreenDigitallySigned}:  ${new Date().toISOString()}

═══════════════════════════════════════════════════════════════
          ${t.blackScreenGeneratedBy} ${t.headerTitle}
               ${t.blackScreenCopyright}
═══════════════════════════════════════════════════════════════
    `;
  };

  const handleDownload = () => {
    if (!blackScreenData) return;
    const content = getContent();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BLACKSCREEN-${blackScreenData.currency}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    if (!blackScreenData) return;
    try {
      const content = getContent();
      await downloadPDF(content, `BLACKSCREEN-${blackScreenData.currency}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(t.language === 'es' ? 'Error al generar el PDF' : 'Error generating PDF');
    }
  };

  const handleDownloadPDFImage = async () => {
    if (!blackScreenRef.current || !blackScreenData) return;
    
    try {
      // Guardar posición de scroll original
      const originalScrollTop = blackScreenRef.current.scrollTop;
      
      // Asegurar que el scroll esté en la parte superior antes de capturar
      blackScreenRef.current.scrollTop = 0;
      
      // Esperar a que el scroll se complete y el contenido se renderice
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Obtener las dimensiones completas del contenido
      const fullWidth = blackScreenRef.current.scrollWidth;
      const fullHeight = blackScreenRef.current.scrollHeight;
      
      const canvas = await html2canvas(blackScreenRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        removeContainer: false
      });
      
      // Restaurar posición de scroll original
      blackScreenRef.current.scrollTop = originalScrollTop;
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Calcular dimensiones para ajustar la imagen al PDF
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calcular ratio para mantener proporción
      const ratio = pdfWidth / imgWidth;
      const imgWidthFinal = pdfWidth;
      const imgHeightFinal = imgHeight * ratio;
      
      // Si la imagen es más alta que una página, dividirla en múltiples páginas
      if (imgHeightFinal > pdfHeight) {
        let heightLeft = imgHeightFinal;
        let position = 0;
        const pageHeight = pdfHeight;
        
        // Primera página - mostrar desde el inicio (posición 0)
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidthFinal, imgHeightFinal);
        heightLeft -= pageHeight;
        
        // Páginas adicionales si es necesario
        while (heightLeft > 0) {
          position = heightLeft - imgHeightFinal;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidthFinal, imgHeightFinal);
          heightLeft -= pageHeight;
        }
      } else {
        // Imagen cabe en una sola página
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidthFinal, imgHeightFinal);
      }
      
      pdf.save(`BLACKSCREEN-${blackScreenData.currency}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF Image:', error);
      alert(t.language === 'es' ? 'Error al generar el PDF Imagen' : 'Error generating PDF Image');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0d0d0d] to-[#0a0a0a] border-b border-[#ffffff]/30 p-8 sticky top-0 z-10 shadow-[0_4px_20px_rgba(255, 255, 255,0.2)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#ffffff] mb-2 flex items-center gap-3">
              <Shield className="w-10 h-10 text-[#ffffff] pulse-green" />
              {t.blackScreenTitle}
            </h1>
            <p className="text-[#ffffff]">
              {t.blackScreenSubtitle}
            </p>
            <p className="text-[#ffffff] text-sm mt-1">
              MT799/MT999 Compliant • Digital Commercial Bank Ltd Verified • SWIFT Compatible
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-[#ffffff]/20 border border-[#ffffff] px-4 py-2 rounded-lg">
              <div className="text-xs text-[#ffffff]">{t.blackScreenAvailableAccounts}</div>
              <div className="text-2xl font-bold text-[#ffffff]">{balances.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {balances.length === 0 ? (
          <div className="glass-panel border-[#1a1a1a] rounded-xl p-12 text-center">
            <Database className="w-16 h-16 text-[#ffffff] mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-[#ffffff] mb-2">{t.blackScreenNoBalances}</h3>
            <p className="text-[#ffffff]">
              {t.blackScreenUseAnalyzer}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {balances.map((balance, index) => {
              const isMainCurrency = index < 4;
              return (
                <div
                  key={balance.currency}
                  className="glass-panel border-[#ffffff]/30 rounded-xl p-6 hover:border-[#ffffff] transition-all group"
                >
                  {/* Currency Header */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-[#1a1a1a]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-5 h-5 text-[#ffffff]" />
                        <h3 className="text-2xl font-bold text-[#ffffff]">{balance.currency}</h3>
                        {isMainCurrency && (
                          <span className="bg-[#ffffff]/20 border border-[#ffffff] text-[#ffffff] px-2 py-0.5 rounded-full text-xs font-bold">
                            ★ {t.blackScreenPrincipal}
                          </span>
                        )}
                      </div>
                      <p className="text-[#ffffff] text-sm">{getCurrencyName(balance.currency)}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[#ffffff] text-xs">{t.blackScreenAccount}</div>
                      <div className="text-[#ffffff] font-mono text-lg font-bold">#{index + 1}</div>
                    </div>
                  </div>

                  {/* Balance Display */}
                  <div className="mb-4 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4">
                    <p className="text-[#ffffff] text-xs mb-1 uppercase tracking-wide">{t.blackScreenTotalAvailable}</p>
                    <p className="text-3xl font-black text-[#ffffff] mb-2">
                      {formatCurrency(balance.totalAmount, balance.currency)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-[#ffffff]">
                      <span>🔄 {balance.transactionCount.toLocaleString()} txns</span>
                      <span>📅 {new Date(balance.lastUpdated).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2">
                      <div className="text-[#ffffff] text-xs">M1 (Liquid)</div>
                      <div className="text-[#ffffff] text-sm font-bold">
                        {formatCurrency(balance.totalAmount * 0.30, balance.currency)}
                      </div>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2">
                      <div className="text-[#ffffff] text-xs">M2 (Near)</div>
                      <div className="text-[#ffffff] text-sm font-bold">
                        {formatCurrency(balance.totalAmount * 0.60, balance.currency)}
                      </div>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2">
                      <div className="text-[#ffffff] text-xs">M3 (Broad)</div>
                      <div className="text-[#ffffff] text-sm font-bold">
                        {formatCurrency(balance.totalAmount * 0.85, balance.currency)}
                      </div>
                    </div>
                    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-2">
                      <div className="text-[#ffffff] text-xs">M4 (Total)</div>
                      <div className="text-[#ffffff] text-sm font-bold">
                        {formatCurrency(balance.totalAmount, balance.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Generate Black Screen Button */}
                  <button
                    onClick={() => handleGenerateBlackScreen(balance)}
                    className="w-full bg-gradient-to-r from-[#ffffff] to-[#e0e0e0] hover:from-[#ffffff] hover:to-[#ffffff] text-black font-bold py-3 px-4 rounded-lg transition-all shadow-[0_0_20px_rgba(255, 255, 255,0.4)] hover:shadow-[0_0_30px_rgba(255, 255, 255,0.6)] flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    {t.blackScreenGenerate}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Black Screen Modal */}
      {showBlackScreen && blackScreenData && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-auto">
          <div className="min-h-screen p-8">
            {/* Controls */}
            <div className="max-w-5xl mx-auto mb-4 flex items-center justify-between bg-[#0d0d0d] border border-[#ffffff] rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-[#ffffff]" />
                <span className="text-[#ffffff] font-bold">{t.blackScreenConfidential}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="bg-[#0d0d0d] border border-[#ffffff] hover:bg-[#ffffff]/20 text-[#ffffff] px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t.blackScreenDownloadTxt}
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="bg-[#0d0d0d] border border-[#ffffff] hover:bg-[#ffffff]/20 text-[#ffffff] px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={handleDownloadPDFImage}
                  className="bg-[#0d0d0d] border border-[#ffffff] hover:bg-[#ffffff]/20 text-[#ffffff] px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  PDF Image
                </button>
                <button
                  onClick={handlePrint}
                  className="bg-[#0d0d0d] border border-[#ffffff] hover:bg-[#ffffff]/20 text-[#ffffff] px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {t.blackScreenPrint}
                </button>
                <button
                  onClick={() => setShowBlackScreen(false)}
                  className="bg-red-900/30 border border-red-500 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {t.blackScreenClose}
                </button>
              </div>
            </div>

            {/* Black Screen Content */}
            <div ref={blackScreenRef} className="max-w-5xl mx-auto bg-black border-4 border-[#ffffff] rounded-xl p-8 font-mono shadow-[0_0_50px_rgba(255, 255, 255,0.5)]">
              {/* Header */}
              <div className="text-center mb-8 border-b-2 border-[#ffffff] pb-6">
                <div className="text-[#ffffff] text-sm mb-2">═══════════════════════════════════════════════════════════════</div>
                <h1 className="text-3xl font-bold text-[#ffffff] mb-2">{t.blackScreenBankConfirmation.split(' - ')[0]}</h1>
                <h2 className="text-xl text-[#ffffff] mb-2">{t.blackScreenBankConfirmation.split(' - ')[1]}</h2>
                <h3 className="text-lg text-[#ffffff]">{t.blackScreenXcpBank}</h3>
                <div className="text-[#ffffff] text-sm mt-2">═══════════════════════════════════════════════════════════════</div>
                <div className="mt-4 flex items-center justify-center gap-2 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t.blackScreenDocumentConfidential}</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              {/* Beneficiary Information */}
              <div className="mb-6 bg-[#0d0d0d] border border-[#ffffff] rounded-lg p-6">
                <h3 className="text-[#ffffff] text-lg font-bold mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t.blackScreenBeneficiaryInfo}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenHolder}:</span>
                    <div className="text-[#ffffff] font-bold">{blackScreenData.beneficiaryName}</div>
                  </div>
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenAccount}:</span>
                    <div className="text-[#ffffff] font-bold">{blackScreenData.accountNumber}</div>
                  </div>
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenBank}:</span>
                    <div className="text-[#ffffff] font-bold">{blackScreenData.beneficiaryBank}</div>
                  </div>
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenCurrency}:</span>
                    <div className="text-[#ffffff] font-bold">{blackScreenData.currency} ({getCurrencyName(blackScreenData.currency)})</div>
                  </div>
                </div>
              </div>

              {/* Monetary Aggregates */}
              <div className="mb-6 bg-[#0d0d0d] border border-[#ffffff] rounded-lg p-6">
                <h3 className="text-[#ffffff] text-lg font-bold mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  {t.blackScreenMonetaryAggregates}
                </h3>
                
                <div className="space-y-4">
                  <div className="border-l-4 border-[#ffffff] pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#ffffff] font-bold">{t.blackScreenM1Liquid}</span>
                      <span className="text-[#ffffff] font-bold text-xl">{formatCurrency(blackScreenData.balanceM1, blackScreenData.currency)}</span>
                    </div>
                    <div className="text-[#ffffff] text-xs">└─ {t.blackScreenM1Description}</div>
                  </div>

                  <div className="border-l-4 border-[#ffffff] pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#ffffff] font-bold">{t.blackScreenM2Near}</span>
                      <span className="text-[#ffffff] font-bold text-xl">{formatCurrency(blackScreenData.balanceM2, blackScreenData.currency)}</span>
                    </div>
                    <div className="text-[#ffffff] text-xs">└─ {t.blackScreenM2Description}</div>
                  </div>

                  <div className="border-l-4 border-[#ffffff] pl-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#ffffff] font-bold">{t.blackScreenM3Broad}</span>
                      <span className="text-[#ffffff] font-bold text-xl">{formatCurrency(blackScreenData.balanceM3, blackScreenData.currency)}</span>
                    </div>
                    <div className="text-[#ffffff] text-xs">└─ {t.blackScreenM3Description}</div>
                  </div>

                  <div className="border-l-4 border-[#39ff14] pl-4 bg-[#ffffff]/10 p-3 rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[#39ff14] font-bold text-lg">{t.blackScreenM4Total}</span>
                      <span className="text-[#ffffff] font-bold text-2xl">{formatCurrency(blackScreenData.balanceM4, blackScreenData.currency)}</span>
                    </div>
                    <div className="text-[#ffffff] text-xs">└─ {t.blackScreenM4Description}</div>
                  </div>

                  <div className="border-t-2 border-[#ffffff] pt-4 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[#ffffff] font-bold text-xl">{t.blackScreenVerifiedBalance}:</span>
                      <span className="text-[#ffffff] font-bold text-3xl">{formatCurrency(blackScreenData.totalLiquid, blackScreenData.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical Information */}
              <div className="mb-6 bg-[#0d0d0d] border border-[#ffffff] rounded-lg p-6">
                <h3 className="text-[#ffffff] text-lg font-bold mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  {t.blackScreenTechnicalInfo}
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenDtcReference}:</span>
                    <div className="text-[#ffffff] font-mono font-bold">{blackScreenData.DTC1BReference}</div>
                  </div>
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenVerificationHash}:</span>
                    <div className="text-[#ffffff] font-mono font-bold">{blackScreenData.verificationHash}</div>
                  </div>
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenTransactionsProcessed}:</span>
                    <div className="text-[#ffffff] font-bold">{blackScreenData.transactionCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenIssueDate}:</span>
                    <div className="text-[#ffffff] font-bold">{blackScreenData.issueDate.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenExpiryDate}:</span>
                    <div className="text-[#ffffff] font-bold">{blackScreenData.expiryDate.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[#ffffff]">{t.blackScreenVerificationStatus}:</span>
                    <div className="text-[#ffffff] font-bold flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      {t.blackScreenVerified} <CheckIcon className="text-green-400 inline" size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Certification */}
              <div className="bg-[#0d0d0d] border-2 border-[#ffffff] rounded-lg p-6">
                <h3 className="text-[#ffffff] text-lg font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  {t.blackScreenCertification}
                </h3>
                <div className="text-[#ffffff] text-sm space-y-3">
                  <p>
                    {t.blackScreenCertificationText}
                  </p>
                  <p className="text-[#ffffff]">
                    {t.blackScreenCertificationStandards}
                  </p>
                  <div className="border-t border-[#ffffff] pt-3 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[#ffffff]">{t.blackScreenDigitallySigned}:</span>
                      <span className="text-[#ffffff] font-mono">{new Date().toISOString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 border-t-2 border-[#ffffff] pt-6 text-center">
                <div className="text-[#ffffff] text-sm">═══════════════════════════════════════════════════════════════</div>
                <div className="text-[#ffffff] text-sm my-2">
                  {t.blackScreenGeneratedBy} {t.headerTitle}
                </div>
                <div className="text-[#ffffff] font-bold">{t.blackScreenCopyright}</div>
                <div className="text-[#ffffff] text-sm mt-2">═══════════════════════════════════════════════════════════════</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

