/**
 * Custody Account Black Screen
 * Genera Black Screen para cuentas custodio individuales
 */

import { X, Download, Printer, Image as ImageIcon, FileText } from 'lucide-react';
import { useLanguage } from '../lib/i18n';
import { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BankIcon, BlockchainIcon, SecurityIcon, ComplianceIcon, AwardIcon, CheckIcon, IconText } from './CustomIcons';
import { downloadPDF } from '../lib/download-helper';

interface CustodyBlackScreenProps {
  account: any;
  onClose: () => void;
}

export function CustodyBlackScreen({ account, onClose }: CustodyBlackScreenProps) {
  const { language } = useLanguage();
  const blackScreenRef = useRef<HTMLDivElement>(null);

  const isBanking = (account.accountType || 'blockchain') === 'banking';

  const generateTxtContent = () => {
    const isSpanish = language === 'es';
    const date = new Date();
    const formattedDate = date.toLocaleString(isSpanish ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const documentHash = Math.random().toString(36).substring(2, 15).toUpperCase();
    const documentId = Math.random().toString(36).substring(2, 15).toUpperCase();
    const verificationHash = account.verificationHash || '3ad65ff0d75b1962d188...';

    return `
═══════════════════════════════════════════════════════════════════════════════
                    OFFICIAL BANK CONFIRMATION DOCUMENT
                    BLACK SCREEN - CUSTODY ACCOUNT STATEMENT
═══════════════════════════════════════════════════════════════════════════════

BANK:                          Digital Commercial Bank Ltd
SYSTEM:                        DAES 256 DATA AND EXCHANGE SETTLEMENT
DOCUMENT TYPE:                 CUSTODY ACCOUNT CONFIRMATION
DOCUMENT CLASSIFICATION:       ${isSpanish ? 'CONFIDENCIAL - SOLO USO BANCARIO AUTORIZADO' : 'CONFIDENTIAL - AUTHORIZED BANKING USE ONLY'}
GENERATION DATE:               ${formattedDate}
DOCUMENT ID:                   ${documentId}

═══════════════════════════════════════════════════════════════════════════════
                        ACCOUNT TYPE INFORMATION
═══════════════════════════════════════════════════════════════════════════════

ACCOUNT TYPE:                  ${IconText[isBanking ? 'bank' : 'blockchain']} ${isBanking 
  ? (isSpanish ? 'CUENTA BANCARIA CUSTODIO' : 'CUSTODY BANKING ACCOUNT')
  : (isSpanish ? 'CUENTA BLOCKCHAIN CUSTODIO' : 'CUSTODY BLOCKCHAIN ACCOUNT')}

═══════════════════════════════════════════════════════════════════════════════
                        BENEFICIARY INFORMATION
═══════════════════════════════════════════════════════════════════════════════

ACCOUNT HOLDER:                ${account.accountName}
ACCOUNT NUMBER:                ${account.accountNumber || account.id}
BANK:                          Digital Commercial Bank Ltd
SYSTEM:                        DAES 256 DATA AND EXCHANGE SETTLEMENT
CURRENCY:                      ${account.currency}
${!isBanking ? `BLOCKCHAIN:                    ${account.blockchainLink || 'N/A'}\nTOKEN SYMBOL:                  ${account.tokenSymbol || 'N/A'}` : ''}

═══════════════════════════════════════════════════════════════════════════════
                        FUND DENOMINATION / DENOMINACIÓN DE FONDOS
═══════════════════════════════════════════════════════════════════════════════

CLASSIFICATION:                ${account.fundDenomination || 'M1'}
TYPE:                          ${(account.fundDenomination === 'M2') 
  ? (isSpanish ? 'CUASI-DINERO (M1 + depósitos de ahorro, mercado monetario)' : 'NEAR MONEY (M1 + savings, money market)')
  : (isSpanish ? 'EFECTIVO LÍQUIDO (Billetes, monedas, depósitos a la vista)' : 'LIQUID CASH (Currency, coins, demand deposits)')}
STATUS:                        ✓ VERIFIED / VERIFICADO

═══════════════════════════════════════════════════════════════════════════════
                        CUSTODY FUNDS SUMMARY
═══════════════════════════════════════════════════════════════════════════════

TOTAL BALANCE:                 ${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
RESERVED BALANCE:              ${account.currency} ${account.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
AVAILABLE BALANCE:             ${account.currency} ${account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

═══════════════════════════════════════════════════════════════════════════════
                        TOTAL VERIFIED BALANCE
═══════════════════════════════════════════════════════════════════════════════

VERIFIED TOTAL:                ${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

═══════════════════════════════════════════════════════════════════════════════
                        STANDARDS COMPLIANCE
═══════════════════════════════════════════════════════════════════════════════

${IconText.security} ISO 27001:2022                  Information Security              ${IconText.check} COMPLIANT
${IconText.bank} ISO 20022                       Financial Interoperability         ${IconText.check} COMPATIBLE
${IconText.compliance} FATF AML/CFT                    Anti-Money Laundering             ${IconText.check} VERIFIED
KYC                             Know Your Customer                ${IconText.check} VERIFIED
AML SCORE:                      ${account.amlScore || 95}/100
RISK LEVEL:                     ${(account.riskLevel || 'low').toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════
                        TECHNICAL INFORMATION
═══════════════════════════════════════════════════════════════════════════════

VERIFICATION HASH:              ${verificationHash}
ISSUE DATE:                     ${new Date(account.createdAt || Date.now()).toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })}
VERIFICATION STATUS:            ${IconText.check} VERIFIED AND CERTIFIED

═══════════════════════════════════════════════════════════════════════════════
                        OFFICIAL BANK CERTIFICATION
═══════════════════════════════════════════════════════════════════════════════

Digital Commercial Bank Ltd
System DAES 256 DATA AND EXCHANGE SETTLEMENT

This document certifies that the above mentioned funds are under secure 
custody of the DAES 256 DATA AND EXCHANGE SETTLEMENT system and are 
available as indicated.

Compliant with standards: SWIFT MT799/MT999, FEDWIRE, DTC, ISO 20022

${IconText.check} DIGITALLY SIGNED

═══════════════════════════════════════════════════════════════════════════════
                        DOCUMENT FOOTER
═══════════════════════════════════════════════════════════════════════════════

GENERATED BY:                  DAES CoreBanking System
BANK:                          Digital Commercial Bank Ltd
SYSTEM:                        DAES 256 DATA AND EXCHANGE SETTLEMENT
COPYRIGHT:                     © ${new Date().getFullYear()} DAES - Data and Exchange Settlement
DOCUMENT HASH:                 ${documentHash}
CoreBanking v1.0.0
ISO 4217 Compliant
PCI-DSS Ready

═══════════════════════════════════════════════════════════════════════════════
                    END OF OFFICIAL BANK CONFIRMATION DOCUMENT
═══════════════════════════════════════════════════════════════════════════════
`;
  };

  const handleDownloadTxt = () => {
    const content = generateTxtContent();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CustodyAccount_${account.accountNumber || account.id}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadTxtAsPDF = async () => {
    try {
      const content = generateTxtContent();
      const filename = `CustodyAccount_${account.accountNumber || account.id}`;
      await downloadPDF(content, filename);
    } catch (error) {
      console.error('Error generating PDF from TXT:', error);
      alert(language === 'es' ? 'Error al generar el PDF desde TXT' : 'Error generating PDF from TXT');
    }
  };

  /**
   * PDF3 - SWIFT MT103/202 COV Professional Format
   * Genera documento con formato de terminal SWIFT profesional
   * Similar a Deutsche Bank AG MT103 Transfer Confirmation
   */
  const generatePDF3Content = () => {
    const isSpanish = language === 'es';
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    // Generate unique identifiers
    const sessionNumber = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const messageNumber = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    const transactionId = `${date.getFullYear().toString().slice(-2)}0x${Math.floor(Math.random() * 9999999999999999).toString().padStart(16, '0')}`;
    const transmissionRef = `DAES${Math.floor(Math.random() * 99999999999999).toString().padStart(14, '0')}`;
    const transactionIdNum = Math.floor(Math.random() * 999999999999999999).toString().padStart(18, '0');
    const telexCode = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    const branchNetwork = `00${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}-DAESXXXX-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
    const inputRef = `${date.toISOString().slice(2, 10).replace(/-/g, '')}-DAESXXXX-${Math.floor(Math.random() * 9999999999).toString().padStart(10, '0')}`;
    
    // SSL Certificate simulation
    const certHash = Array.from({length: 64}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    const masterKey = Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    const sessionId = Array.from({length: 24}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
    
    // SWIFT Code
    const swiftCode = `DAES${account.currency}XXXX`;
    const ibanCode = account.iban || `AE${Math.floor(Math.random() * 99).toString().padStart(2, '0')}0${Math.floor(Math.random() * 999999999999999999).toString().padStart(18, '0')}`;
    
    return `>>> Connected

>>> Identification data

>>> Waiting

>>> MTT: ${formattedTime}

>>> ${formattedDate}

>>> ${sessionNumber}xxxrt${messageNumber.slice(0, 3)}

>>> ${Math.floor(Math.random() * 9999)} bmcd pt

>>> ${telexCode} dbf-d

>>> Telex code: ${telexCode}

>>> Sending date: ${date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}

>>> Input time: ${formattedTime}

Privat Server IP: ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}

DNS server Domain: ${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}

>>> connected

(digitalCommercialBankSAS${sessionNumber})

SIGNS -AUTHORIZATION PIN: ${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}S SSN: ${Math.floor(Math.random() * 9999999).toString().padStart(7, '0')}

SEARCHING [REF. <${transactionIdNum}>]

Session Number: ${sessionNumber}

Message Number: ${messageNumber}

DIGITAL COMMERCIAL BANK LTD - DAES 256

TRANSACTION ID: ${transactionId}

Primary Certification Authority - MT 103/202 COV FTP Server ${Math.floor(Math.random() * 999999)}/AE/DCB${Math.floor(Math.random() * 9999)}

FrNt-AE${Math.floor(Math.random() * 9)}GVF${Math.floor(Math.random() * 9)}N${Math.floor(Math.random() * 99999)}H${Math.floor(Math.random() * 999999)}

CONNECTED (${Math.floor(Math.random() * 99999999).toString().padStart(8, '0')})

depth=1C = AE, 0= Symantec Corporation, OU= Symantec Swift Network, AE= Symantec Class 3 Secure Server CA - G4

verify return: corresponding.

Certificate Chain

s:/${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}=AE/C=AE/ST=Dubai/F=UAE/M=DigitalCommercialBankLtd/OU=InternetBanking/AE=internet.dcb.com

i:/C=US/0=SymantecCorporation/OU=SymantecSwiftNetwork/AE=SymantecClass3 Secure Server CA- G4

---

SSL handshake has read 37814 bytes and written 38067 bytes

---

New, TLSv1/SSLV3,

Server public key is 2259 bit

Secure Renegotiation is supported

Compression: NONE

Expansion: NONE

SSL-Session: SSL V3.04 FINISHED

Protocol: TLS v1.2

Session-ID : ${sessionId}

Master-Key: ${masterKey}

Key-Arg: None

PSK identity: None

SRP user name: None

---

TLS session ticket lifetime hint: 2815 (seconds)

---

═══════════════════════════════════════════════════════════════════════════════
                    SWIFT MT103/202 COV - CUSTODY TRANSFER CONFIRMATION
═══════════════════════════════════════════════════════════════════════════════

|  RCVD++ NETWORK DELIVERY STATUS    | : NETWORK                                |
|  RCVD++ BRANCH NETWORK             | : ${branchNetwork}                       |
|  RCVD++ MESSAGE INPUT REFERENCE    | : ${inputRef}                            |
|  RCVD++ TRANSACTION ID             | : ${transactionId}                       |
|  RCVD++ CONTRACT ID                | : CUSTODY                                |
|  RCVD++ ISIN                       | : ${account.currency}${Math.floor(Math.random() * 9999999999).toString().padStart(10, '0')} |
|  SESSION ${date.getFullYear()} SEQUENCE       | : ${date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase()} CUSTODY |

|  RCVD++ VALUE DATE                 | : ${date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()} |
|  RCVD++ VALUE AMOUNT               | : ${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} |

---Message Header---

|  57A: RCVD++ OWN/T/B/C/ID          | : ${Math.floor(Math.random() * 999999)}-DAES/DAES_${Math.floor(Math.random() * 999999)} |
|  RCVD++ SWIFT MESSAGE TYPE         | : (ACK) 103 BOX NETWORK                  |
|  RCVD++ RECEIVER'S BANK            | : DIGITAL COMMERCIAL BANK LTD            |
|  RCVD++ RECEIVER'S BANK ADDRESS    | : DUBAI INTERNATIONAL FINANCIAL CENTRE, DUBAI, UAE |
|  RCVD++ RECEIVER'S ACCOUNT NAME    | : ${account.accountName}                 |
|  RCVD++ RECEIVER'S ACCOUNT NUMBER  | : ${ibanCode}                            |
|  RCVD++ RECEIVER'S SWIFT CODE      | : ${swiftCode}                           |

---

Message Trailer

RCVD++ ACK: SWIFT AUTHENTIFICATION CORRECT TRN21
RCVD++ 00: EMBEDDED MESSAGE INITIALIZED
**12* SUB MESSAGE TYPE** : FIN MT 103/202 COV
**20* TRANSMISSION REFERENCE** : ${transmissionRef}
**21* TRANSACTION IDENTIFICATION NUMBER** : ${transactionIdNum}
**23B* BANK OPERATION CODE (BOC)** : CRED
**23E* INSTRUCTION CODE** : TELC
**26T* TRANSACTION TYPE CODE** : MO-K104
**31C* DATE OF ISSUE** : ${date.toISOString().slice(0, 10)}
**32B* CURRENCY/AMOUNT** : ${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
**70* REMITTANCE INFORMATION** : CUSTODY ACCOUNT FUNDS
**71A* DETAILS OF CHARGES** : OUR
**72A* SENDER TO RECEIVER INFORMATION** : ADVISE THE BENEFICIARY OF THIS SWIFT THIS TRANSFER IS VALID FOR CUSTODY
UPON IDENTIFICATION, THE DAY OF RECEIPT. THE FUNDS TO THE BEST OF OUR KNOWLEDGE ARE CLEAN, CLEAR AND FREE OF ANY LEVY,
ENCUMBRANCES AND LEGALLY OBTAINED AND FROM NON-CRIMINAL BUSINESS ACTIVITIES PLEASE.
THIS IRREVOCABLE CASH BACKED SWIFT MT103 TRANSFER CAN BE RELIED UPON FOR FULL CUSTODY VERIFICATION.

---

**FOR AND ON BEHALF OF DIGITAL COMMERCIAL BANK LTD**
**RECORD INFORMATION TELEX/SWIFT ORDER IS MAC (PAC) PEC ENC (CUK (INT) PED) (MAC)**
**72 : SENDER TO RECEIVER INFORMATION CASH BACKED/${account.currency}**
**CASH BACKED/${account.currency}** : ${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
**DIGITAL COMMERCIAL BANK LTD** :
**DATE RECORDED** : ${swiftCode}
**: ${date.toISOString().slice(0, 10)}**

---

**Interventions**

**CATEGORY** : NETWORK REPORT
**CREATION DATE, TIME** : ${formattedDate} ${formattedTime} +0400 :
**BANKING OFFICER** : DAES SYSTEM ADMINISTRATOR
**OPERATOR** : SYSTEM : AUTOMATED
**END TIME** : ${formattedTime} +0400
**CONF DATE**: ${date.toISOString().slice(0, 10)}+++${formattedTime}+0400+++DIGITAL COMMERCIAL BANK LTD HEADQUARTER++++${Math.floor(Math.random() * 999999999).toString().padStart(9, '0')}
**MSG NO**: 777+++TITLE+++MT103+++LOGICAL ANSWER BACK(Y) VALUE DATE/END TIME+++${date.toISOString().slice(0, 10)}+++${formattedTime}+0400(GMT)
**++MESSAGE HAS BEEN TRANSMITTED (01)**

---

**---End of Transmission---

Approved by the DAES 256 Data and Exchange Settlement technical committee. Includes UAE server security codes.
Do not share this information with others.
The terminal consists of six layers of security, each of which has approximately 200 quadrats and approximately 500 quadrats and is connected.
Therefore, Transaction.
Code in this screen shot will play a key role in the Digital Commercial Bank Ltd server.

---

**ACKNOWLEDGEMENT RECEIPT ${swiftCode} BUSINESS WIRES//${date.getFullYear()}**
${Math.floor(Math.random() * 99999999)} 5AE7/AE/${date.getFullYear()}-LOCAL
${Math.floor(Math.random() * 99999999999)}XXX ${swiftCode} / ING: DAESXXXX.118
STATUS: DELIVERED
SENDER: DIGITAL COMMERCIAL BANK LTD
CATEGORY CODE: RC
SEQUENCE NUMBER: ${Math.floor(Math.random() * 999999)}

---

**---END OF CODE---

ACKNOWLEDGEMENT RECEIPT ${swiftCode} BUSINESS WIRES//${date.getFullYear()}
STATUS: DELIVERED
SENDER: DIGITAL COMMERCIAL BANK LTD

---

**---END OF CODE TRANSMISSION---

SENDER IP.WEB
https://ipbankingdcb.com/private/index.do?loggedon&locate=enDcb&NavLB EBCH=${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 9999)}.${Math.floor(Math.random() * 99)}

BANK OFFICER
DAES COMPLIANCE OFFICER
CHIEF COMPLIANCE OFFICER
CCO MEMBER OF THE MANAGEMENT BOARD

BANK OFFICER
DAES OPERATIONS DIRECTOR
CHIEF OPERATING OFFICER
COO MEMBER OF THE MANAGEMENT BOARD

BANK TELEPHONE/FAX: +971-4-123-4567/+971-4-123-4568

CREATED ${formattedDate}

---

**---MESSAGE STATE: MT103---BY DAES SYSTEM

(-)END OF TRANSMISSION
**</PSEUDOACKNACK>**
**</ACKNACKTEXT>**
MESSAGE: TRANSMISSION: 100%: COMPLETED.
**(-)END OF TRANSMISSION**
ENCRYPTED CIPHERED ENDTRANSMS: AE50189.${certHash.slice(0, 6)}.${Math.floor(Math.random() * 9999999999)}.DAES.${Math.floor(Math.random() * 9999999)}
Transmitter v8.1. PTU5LX3TJ200RYIP-8

═══════════════════════════════════════════════════════════════════════════════
                    CUSTODY ACCOUNT INFORMATION
═══════════════════════════════════════════════════════════════════════════════

ACCOUNT HOLDER:          ${account.accountName}
ACCOUNT NUMBER:          ${account.accountNumber || account.id}
ACCOUNT TYPE:            ${isBanking ? 'CUSTODY BANKING ACCOUNT' : 'CUSTODY BLOCKCHAIN ACCOUNT'}
CURRENCY:                ${account.currency}
IBAN:                    ${ibanCode}
SWIFT/BIC:               ${swiftCode}

TOTAL BALANCE:           ${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
RESERVED BALANCE:        ${account.currency} ${account.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
AVAILABLE BALANCE:       ${account.currency} ${account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

FUND DENOMINATION:       ${account.fundDenomination || 'M1'}
CLASSIFICATION:          ${(account.fundDenomination === 'M2') 
  ? 'NEAR MONEY (M1 + savings, money market)'
  : 'LIQUID CASH (Currency, coins, demand deposits)'}

═══════════════════════════════════════════════════════════════════════════════
                    COMPLIANCE & VERIFICATION
═══════════════════════════════════════════════════════════════════════════════

✓ ISO 27001:2022         Information Security              COMPLIANT
✓ ISO 20022              Financial Interoperability        COMPATIBLE
✓ FATF AML/CFT           Anti-Money Laundering             VERIFIED
✓ KYC                    Know Your Customer                VERIFIED
✓ SWIFT MT799/MT999      Bank Confirmation                 COMPLIANT
✓ FEDWIRE                Federal Reserve Wire              COMPATIBLE
✓ DTC                    Depository Trust Company          VERIFIED

AML SCORE:               ${account.amlScore || 95}/100
RISK LEVEL:              ${(account.riskLevel || 'low').toUpperCase()}

═══════════════════════════════════════════════════════════════════════════════
                    DIGITAL SIGNATURE
═══════════════════════════════════════════════════════════════════════════════

Document Hash:           ${certHash}
Digital Signature:       VERIFIED
Timestamp:               ${date.toISOString()}
Certificate Authority:   DAES 256 DATA AND EXCHANGE SETTLEMENT

═══════════════════════════════════════════════════════════════════════════════
          GENERATED BY DIGITAL COMMERCIAL BANK LTD - DAES 256
               © ${date.getFullYear()} DAES - Data and Exchange Settlement
═══════════════════════════════════════════════════════════════════════════════
`;
  };

  const handleDownloadPDF3 = async () => {
    try {
      const content = generatePDF3Content();
      const filename = `SWIFT_MT103_CustodyAccount_${account.accountNumber || account.id}`;
      await downloadPDF(content, filename);
    } catch (error) {
      console.error('Error generating PDF3:', error);
      alert(language === 'es' ? 'Error al generar PDF3 SWIFT' : 'Error generating PDF3 SWIFT');
    }
  };

  /**
   * PDF4 - OFFICIAL ACCOUNT STATEMENT
   * Documento profesional de estado de cuenta bancario
   * Formato de terminal bancaria con fuente monoespaciada
   */
  const handleDownloadPDF4BlackStatement = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      let yPos = margin;
      const lineHeight = 4.5;
      const date = new Date();
      const statementDate = date.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
      const statementTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

      // ISO 4217 Currency Codes
      const currencyISO: Record<string, string> = {
        'USD': '840', 'EUR': '978', 'GBP': '826', 'CHF': '756', 'JPY': '392', 'CAD': '124',
        'AUD': '036', 'CNY': '156', 'INR': '356', 'MXN': '484', 'BRL': '986', 'AED': '784',
        'SGD': '702', 'HKD': '344', 'KRW': '410', 'RUB': '643'
      };

      // Generar identificadores únicos
      const statementNumber = `STM-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
      const documentRef = `DCB/${date.getFullYear()}/${Math.floor(Math.random() * 9999999).toString().padStart(7, '0')}`;
      const verificationCode = Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
      const securityHash = Array.from({length: 64}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();

      // Fechas del período
      const periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Función helper para agregar página con fondo negro
      const addBlackPage = () => {
        pdf.setFillColor(0, 0, 0);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      };

      // Función helper para texto verde terminal
      const setTerminalGreen = (size: number = 8) => {
        pdf.setTextColor(0, 255, 65);
        pdf.setFontSize(size);
        pdf.setFont('Courier', 'normal');
      };

      // Función helper para texto verde brillante
      const setBrightGreen = (size: number = 8) => {
        pdf.setTextColor(57, 255, 20);
        pdf.setFontSize(size);
        pdf.setFont('Courier', 'bold');
      };

      // Función helper para texto blanco
      const setWhiteText = (size: number = 8) => {
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(size);
        pdf.setFont('Courier', 'normal');
      };

      // Función helper para texto gris claro
      const setGrayText = (size: number = 7) => {
        pdf.setTextColor(180, 180, 180);
        pdf.setFontSize(size);
        pdf.setFont('Courier', 'normal');
      };

      // Función para dibujar línea
      const drawLine = (y: number, width: number = 0.2) => {
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(width);
        pdf.line(margin, y, pageWidth - margin, y);
      };

      // Función para dibujar línea de puntos
      const drawDottedLine = (y: number) => {
        pdf.setDrawColor(60, 60, 60);
        pdf.setLineWidth(0.1);
        for (let x = margin; x < pageWidth - margin; x += 2) {
          pdf.line(x, y, x + 1, y);
        }
      };

      // Función para agregar nueva página
      const checkNewPage = (requiredSpace: number = 25) => {
        if (yPos + requiredSpace > pageHeight - margin) {
          pdf.addPage();
          addBlackPage();
          yPos = margin;
          // Mini header en páginas siguientes
          setGrayText(6);
          pdf.text(`Statement: ${statementNumber} | Page ${pdf.getNumberOfPages()}`, pageWidth - margin, yPos, { align: 'right' });
          yPos += 8;
          return true;
        }
        return false;
      };

      // ==================== PÁGINA 1 ====================
      addBlackPage();

      // ===== HEADER INSTITUCIONAL =====
      setGrayText(6);
      pdf.text('ISO 27001:2022 | ISO 20022 | FATF COMPLIANT', margin, yPos);
      pdf.text(`REF: ${documentRef}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 6;

      drawLine(yPos, 0.5);
      yPos += 6;

      setTerminalGreen(10);
      pdf.text('DIGITAL COMMERCIAL BANK LTD', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;

      setWhiteText(8);
      pdf.text('OFFICIAL ACCOUNT STATEMENT', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;

      setGrayText(7);
      pdf.text('DAES 256 - DATA AND EXCHANGE SETTLEMENT SYSTEM', pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;

      drawLine(yPos, 0.5);
      yPos += 6;

      // ===== INFORMACIÓN DEL DOCUMENTO =====
      setGrayText(6);
      pdf.text('DOCUMENT INFORMATION', margin, yPos);
      yPos += 5;

      const docInfo = [
        ['STATEMENT NUMBER', statementNumber],
        ['STATEMENT DATE', statementDate],
        ['STATEMENT TIME', statementTime + ' UTC'],
        ['PERIOD', `${periodStart.toLocaleDateString('en-US', {month: 'short', day: '2-digit', year: 'numeric'})} - ${periodEnd.toLocaleDateString('en-US', {month: 'short', day: '2-digit', year: 'numeric'})}`],
      ];

      docInfo.forEach(([label, value]) => {
        setTerminalGreen(7);
        pdf.text(`${label}:`, margin, yPos);
        setWhiteText(7);
        pdf.text(value, margin + 45, yPos);
        yPos += lineHeight;
      });

      yPos += 4;
      drawDottedLine(yPos);
      yPos += 8;

      // ===== INFORMACIÓN DE LA CUENTA =====
      setGrayText(6);
      pdf.text('ACCOUNT INFORMATION', margin, yPos);
      yPos += 5;

      const accountDetails = [
        ['ACCOUNT HOLDER', account.accountName],
        ['ACCOUNT NUMBER', account.accountNumber || account.id],
        ['ACCOUNT TYPE', isBanking ? 'CUSTODY BANKING ACCOUNT' : 'CUSTODY BLOCKCHAIN ACCOUNT'],
        ['CURRENCY', `${account.currency} (ISO 4217: ${currencyISO[account.currency] || account.currency})`],
        ['FUND CLASS', account.fundDenomination || 'M1'],
        ['CLASSIFICATION', (account.fundDenomination === 'M2') ? 'NEAR MONEY - Quasi-liquid assets' : 'LIQUID CASH - Immediately available'],
        ['ACCOUNT STATUS', 'ACTIVE'],
      ];

      accountDetails.forEach(([label, value]) => {
        setTerminalGreen(7);
        pdf.text(`${label}:`, margin, yPos);
        setWhiteText(7);
        const maxWidth = pageWidth - margin - 60;
        const lines = pdf.splitTextToSize(String(value), maxWidth);
        pdf.text(lines[0], margin + 45, yPos);
        yPos += lineHeight;
      });

      yPos += 4;
      drawDottedLine(yPos);
      yPos += 8;

      // ===== RESUMEN DE BALANCE =====
      checkNewPage(50);
      
      setGrayText(6);
      pdf.text('BALANCE SUMMARY', margin, yPos);
      yPos += 6;

      // Desglose de balance - formato uniforme
      const balanceBreakdown = [
        ['CURRENT BALANCE', `${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['OPENING BALANCE', `${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
        ['CREDITS (+)', `${account.currency} 0.00`],
        ['DEBITS (-)', `${account.currency} 0.00`],
        ['RESERVED FUNDS', `${account.currency} ${account.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
        ['AVAILABLE BALANCE', `${account.currency} ${account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ];

      balanceBreakdown.forEach(([label, value], index) => {
        setTerminalGreen(7);
        pdf.text(label, margin, yPos);
        setWhiteText(7);
        pdf.text(value, pageWidth - margin, yPos, { align: 'right' });
        yPos += lineHeight;
        if (index === 0 || index === 3) {
          drawDottedLine(yPos);
          yPos += 3;
        }
      });

      yPos += 6;
      drawLine(yPos);
      yPos += 8;

      // ===== INFORMACIÓN DE CUSTODIA =====
      checkNewPage(45);

      setGrayText(6);
      pdf.text('CUSTODY INFORMATION', margin, yPos);
      yPos += 5;

      const custodyInfo = [
        ['CUSTODIAN BANK', 'Digital Commercial Bank Ltd'],
        ['CUSTODY TYPE', 'Segregated Account'],
        ['SAFEKEEPING', 'Full Title Transfer'],
        ['INSURANCE', 'FDIC Equivalent Coverage'],
        ['JURISDICTION', 'International Banking Standards'],
      ];

      custodyInfo.forEach(([label, value]) => {
        setTerminalGreen(7);
        pdf.text(`${label}:`, margin, yPos);
        setWhiteText(7);
        pdf.text(value, margin + 45, yPos);
        yPos += lineHeight;
      });

      yPos += 4;
      drawDottedLine(yPos);
      yPos += 8;

      // ===== COMPLIANCE & CERTIFICATIONS =====
      checkNewPage(55);

      setGrayText(6);
      pdf.text('REGULATORY COMPLIANCE', margin, yPos);
      yPos += 5;

      const compliance = [
        ['ISO 27001:2022', 'Information Security Management', 'CERTIFIED'],
        ['ISO 20022', 'Financial Messaging Standard', 'COMPLIANT'],
        ['FATF', 'Anti-Money Laundering Guidelines', 'VERIFIED'],
        ['KYC/AML', 'Customer Due Diligence', 'COMPLETED'],
        ['GDPR', 'Data Protection Regulation', 'COMPLIANT'],
        ['SOC 2 TYPE II', 'Security & Availability', 'CERTIFIED'],
      ];

      compliance.forEach(([standard, desc, status]) => {
        setTerminalGreen(6);
        pdf.text(`[*] ${standard}`, margin, yPos);
        setGrayText(6);
        pdf.text(desc, margin + 35, yPos);
        setTerminalGreen(6);
        pdf.text(status, pageWidth - margin, yPos, { align: 'right' });
        yPos += lineHeight;
      });

      yPos += 3;
      setTerminalGreen(7);
      pdf.text(`AML RISK SCORE: ${account.amlScore || 95}/100 | RISK LEVEL: ${(account.riskLevel || 'LOW').toUpperCase()}`, margin, yPos);
      
      yPos += 8;
      drawLine(yPos);
      yPos += 8;

      // ===== VERIFICACIÓN DIGITAL =====
      checkNewPage(45);

      setGrayText(6);
      pdf.text('DIGITAL VERIFICATION', margin, yPos);
      yPos += 5;

      setTerminalGreen(6);
      pdf.text('VERIFICATION CODE:', margin, yPos);
      setWhiteText(6);
      pdf.text(verificationCode, margin + 38, yPos);
      yPos += lineHeight;

      setTerminalGreen(6);
      pdf.text('SECURITY HASH:', margin, yPos);
      setWhiteText(5);
      pdf.text(securityHash.substring(0, 32), margin + 38, yPos);
      yPos += lineHeight - 1;
      pdf.text(securityHash.substring(32), margin + 38, yPos);
      yPos += lineHeight;

      setTerminalGreen(6);
      pdf.text('TIMESTAMP:', margin, yPos);
      setWhiteText(6);
      pdf.text(date.toISOString(), margin + 38, yPos);
      yPos += lineHeight;

      setTerminalGreen(6);
      pdf.text('DIGITAL SIGNATURE:', margin, yPos);
      setWhiteText(6);
      pdf.text('VALID - CRYPTOGRAPHICALLY VERIFIED', margin + 38, yPos);

      yPos += 10;
      drawLine(yPos, 0.5);
      yPos += 6;

      // ===== FOOTER =====
      setGrayText(5);
      pdf.text('This statement is electronically generated and is valid without signature.', pageWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      pdf.text('For verification, contact: verification@dcb-daes.com | Reference: ' + statementNumber, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;

      drawLine(yPos, 0.3);
      yPos += 4;

      setTerminalGreen(6);
      pdf.text('DIGITAL COMMERCIAL BANK LTD', pageWidth / 2, yPos, { align: 'center' });
      yPos += 3;
      setGrayText(5);
      pdf.text(`DAES 256 Data and Exchange Settlement | (C) ${date.getFullYear()} All Rights Reserved`, pageWidth / 2, yPos, { align: 'center' });

      // Guardar PDF
      pdf.save(`AccountStatement_${account.accountNumber || account.id}_${statementNumber}.pdf`);

    } catch (error) {
      console.error('Error generating PDF4:', error);
      alert(language === 'es' ? 'Error al generar Account Statement' : 'Error generating Account Statement');
    }
  };

  /**
   * PDF5 - INSTITUTIONAL GRADE ACCOUNT STATEMENT
   * Documento institucional de alta calidad con el mismo nivel del PDF de APIs
   * Diseño premium con header dorado, secciones numeradas y formato profesional
   */
  const handleDownloadPDF5Institutional = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let y = margin;
      const date = new Date();
      const isSpanish = language === 'es';

      // Colores corporativos institucionales
      const colors = {
        darkBlue: [8, 20, 40] as [number, number, number],
        navy: [12, 30, 55] as [number, number, number],
        gold: [197, 165, 55] as [number, number, number],
        lightGold: [218, 190, 100] as [number, number, number],
        green: [22, 163, 74] as [number, number, number],
        emerald: [16, 185, 129] as [number, number, number],
        gray: [75, 85, 99] as [number, number, number],
        lightGray: [248, 250, 252] as [number, number, number],
        black: [0, 0, 0] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
        red: [220, 38, 38] as [number, number, number]
      };

      // ISO 4217 Currency Codes
      const currencyData: Record<string, { num: string; name: string }> = {
        'USD': { num: '840', name: 'United States Dollar' },
        'EUR': { num: '978', name: 'Euro' },
        'GBP': { num: '826', name: 'Pound Sterling' },
        'JPY': { num: '392', name: 'Japanese Yen' },
        'CHF': { num: '756', name: 'Swiss Franc' },
        'CAD': { num: '124', name: 'Canadian Dollar' },
        'AUD': { num: '036', name: 'Australian Dollar' },
        'CNY': { num: '156', name: 'Yuan Renminbi' },
        'INR': { num: '356', name: 'Indian Rupee' },
        'BRL': { num: '986', name: 'Brazilian Real' },
        'MXN': { num: '484', name: 'Mexican Peso' },
        'KRW': { num: '410', name: 'South Korean Won' },
        'RUB': { num: '643', name: 'Russian Ruble' },
        'SGD': { num: '702', name: 'Singapore Dollar' },
        'HKD': { num: '344', name: 'Hong Kong Dollar' },
        'AED': { num: '784', name: 'UAE Dirham' }
      };

      // Identificadores únicos
      const statementNumber = `DCB-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`;
      const documentRef = `REF/${date.getFullYear()}/${Math.floor(Math.random() * 9999999).toString().padStart(7, '0')}`;
      const verificationCode = Array.from({length: 32}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();
      const securityHash = Array.from({length: 64}, () => Math.random().toString(16).charAt(2)).join('').toUpperCase();

      // Función para header institucional premium
      const drawInstitutionalHeader = () => {
        // Fondo principal del header
        pdf.setFillColor(...colors.darkBlue);
        pdf.rect(0, 0, pageWidth, 58, 'F');
        
        // Líneas doradas decorativas superiores
        pdf.setFillColor(...colors.gold);
        pdf.rect(0, 0, pageWidth, 2, 'F');
        pdf.setFillColor(...colors.lightGold);
        pdf.rect(0, 2, pageWidth, 0.5, 'F');
        
        // Marco dorado interior
        pdf.setDrawColor(...colors.gold);
        pdf.setLineWidth(0.8);
        pdf.rect(8, 8, pageWidth - 16, 42, 'S');
        
        // Patrón de líneas decorativo inferior
        pdf.setDrawColor(...colors.gold);
        pdf.setLineWidth(0.2);
        for (let i = 0; i < pageWidth; i += 6) {
          pdf.line(i, 56, i + 3, 56);
        }
        
        // Línea dorada inferior del header
        pdf.setFillColor(...colors.gold);
        pdf.rect(0, 58, pageWidth, 2.5, 'F');
        
        // Nombre del banco - institucional
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(26);
        pdf.setFont('helvetica', 'bold');
        pdf.text('DIGITAL COMMERCIAL BANK LTD', pageWidth / 2, 22, { align: 'center' });
        
        // Sistema DAES
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...colors.gold);
        pdf.text('DAES - Digital Asset & Electronic Services Platform', pageWidth / 2, 30, { align: 'center' });
        
        // URLs oficiales
        pdf.setFontSize(7);
        pdf.setTextColor(160, 170, 180);
        pdf.text('www.digcommbank.com    |    www.luxliqdaes.cloud', pageWidth / 2, 38, { align: 'center' });
        
        // Título del documento
        pdf.setFontSize(13);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...colors.white);
        const title = isSpanish ? 'ESTADO DE CUENTA OFICIAL - CUENTA CUSTODIO' : 'OFFICIAL ACCOUNT STATEMENT - CUSTODY ACCOUNT';
        pdf.text(title, pageWidth / 2, 48, { align: 'center' });
        
        // Subtítulo
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...colors.lightGold);
        const subtitle = isSpanish ? 'Documentación Institucional de Alta Calidad' : 'Institutional Grade Documentation';
        pdf.text(subtitle, pageWidth / 2, 54, { align: 'center' });
        
        y = 68;
      };

      // Función para footer institucional
      const drawInstitutionalFooter = (pageNum: number, totalPages: number) => {
        const footerY = pageHeight - 20;
        
        // Fondo del footer
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, footerY - 8, pageWidth, 28, 'F');
        
        // Línea dorada superior
        pdf.setFillColor(...colors.gold);
        pdf.rect(0, footerY - 8, pageWidth, 1.5, 'F');
        
        // Información del banco
        pdf.setTextColor(...colors.gray);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.text('Digital Commercial Bank Ltd | ISO 27001:2022 Certified | ISO 20022 Native | PCI-DSS Level 1 | FATF AML/CFT Compliant', pageWidth / 2, footerY - 2, { align: 'center' });
        
        // URLs
        pdf.setTextColor(...colors.darkBlue);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.text('https://digcommbank.com', margin, footerY + 4);
        pdf.text('https://luxliqdaes.cloud', margin + 48, footerY + 4);
        
        // Página
        pdf.setTextColor(...colors.gray);
        pdf.setFont('helvetica', 'normal');
        const pageText = `${isSpanish ? 'Página' : 'Page'} ${pageNum} ${isSpanish ? 'de' : 'of'} ${totalPages}`;
        pdf.text(pageText, pageWidth - margin, footerY + 4, { align: 'right' });
        
        // Fecha de generación
        const dateText = date.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { 
          year: 'numeric', month: 'long', day: 'numeric'
        });
        pdf.text(dateText, pageWidth / 2, footerY + 4, { align: 'center' });
        
        // Confidencial
        pdf.setTextColor(...colors.red);
        pdf.setFontSize(5.5);
        pdf.setFont('helvetica', 'bold');
        pdf.text(isSpanish ? 'DOCUMENTO CONFIDENCIAL' : 'CONFIDENTIAL DOCUMENT', pageWidth - margin, footerY - 2, { align: 'right' });
      };

      // Función para dibujar sección
      const drawSection = (title: string, sectionNum: number) => {
        if (y > pageHeight - 50) {
          pdf.addPage();
          y = margin + 10;
        }
        
        // Fondo de sección institucional
        pdf.setFillColor(...colors.darkBlue);
        pdf.rect(margin, y, pageWidth - (margin * 2), 8, 'F');
        
        // Borde dorado izquierdo
        pdf.setFillColor(...colors.gold);
        pdf.rect(margin, y, 2.5, 8, 'F');
        
        // Número de sección
        pdf.setFillColor(...colors.gold);
        pdf.rect(margin + 4, y + 1, 12, 6, 'F');
        pdf.setTextColor(...colors.darkBlue);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(String(sectionNum).padStart(2, '0'), margin + 10, y + 5.2, { align: 'center' });
        
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin + 20, y + 5.5);
        
        y += 11;
      };

      // Función para dibujar tabla
      const drawTable = (headers: string[], rows: string[][], colWidths: number[]) => {
        const tableWidth = pageWidth - (margin * 2);
        const rowHeight = 5.8;
        const startX = margin;
        
        // Header de tabla institucional
        pdf.setFillColor(...colors.navy);
        pdf.rect(startX, y, tableWidth, rowHeight + 0.5, 'F');
        
        // Línea dorada bajo header
        pdf.setFillColor(...colors.gold);
        pdf.rect(startX, y + rowHeight + 0.5, tableWidth, 0.4, 'F');
        
        pdf.setTextColor(...colors.gold);
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        
        let xPos = startX + 2;
        headers.forEach((header, i) => {
          pdf.text(header.toUpperCase(), xPos, y + 4.2);
          xPos += colWidths[i];
        });
        
        y += rowHeight + 1;
        
        // Filas de datos
        rows.forEach((row, rowIndex) => {
          if (y > pageHeight - 35) {
            pdf.addPage();
            y = margin + 10;
          }
          
          // Alternar colores
          pdf.setFillColor(rowIndex % 2 === 0 ? 250 : 255, rowIndex % 2 === 0 ? 251 : 255, rowIndex % 2 === 0 ? 252 : 255);
          pdf.rect(startX, y, tableWidth, rowHeight, 'F');
          
          // Borde sutil
          pdf.setDrawColor(230, 235, 240);
          pdf.setLineWidth(0.1);
          pdf.rect(startX, y, tableWidth, rowHeight, 'S');
          
          pdf.setFontSize(6.8);
          
          xPos = startX + 2;
          row.forEach((cell, i) => {
            if (cell.includes('✓') || cell.includes('✅')) {
              pdf.setTextColor(...colors.green);
              pdf.setFont('helvetica', 'bold');
            } else {
              pdf.setTextColor(...colors.black);
              pdf.setFont('helvetica', 'normal');
            }
            pdf.text(cell.substring(0, 55), xPos, y + 4);
            xPos += colWidths[i];
          });
          
          y += rowHeight;
        });
        
        y += 3;
      };

      // Función para box de información
      const drawInfoBox = (title: string, content: string[], bgColor: [number, number, number]) => {
        if (y > pageHeight - 40) {
          pdf.addPage();
          y = margin + 10;
        }
        
        const boxHeight = 7 + (content.length * 4.5);
        pdf.setFillColor(...bgColor);
        pdf.roundedRect(margin, y, pageWidth - (margin * 2), boxHeight, 1.5, 1.5, 'F');
        
        // Borde dorado
        pdf.setDrawColor(...colors.gold);
        pdf.setLineWidth(0.5);
        pdf.roundedRect(margin, y, pageWidth - (margin * 2), boxHeight, 1.5, 1.5, 'S');
        
        pdf.setTextColor(...colors.gold);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin + 4, y + 5);
        
        pdf.setTextColor(...colors.white);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        content.forEach((line, i) => {
          pdf.text(line, margin + 4, y + 10 + (i * 4.5));
        });
        
        y += boxHeight + 4;
      };

      // ═══════════════════════════════════════════════════════════════════════════
      // CONTENIDO DEL PDF5 INSTITUCIONAL
      // ═══════════════════════════════════════════════════════════════════════════

      drawInstitutionalHeader();

      // Box de información del documento
      drawInfoBox(
        isSpanish ? 'INFORMACIÓN DEL DOCUMENTO' : 'DOCUMENT INFORMATION',
        [
          `${isSpanish ? 'Referencia' : 'Reference'}: ${statementNumber}`,
          `${isSpanish ? 'Fecha de Emisión' : 'Issue Date'}: ${date.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          `${isSpanish ? 'Hora' : 'Time'}: ${date.toLocaleTimeString(isSpanish ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC`
        ],
        colors.navy
      );

      // 1. INFORMACIÓN DE LA CUENTA
      drawSection(isSpanish ? 'INFORMACIÓN DE LA CUENTA CUSTODIO' : 'CUSTODY ACCOUNT INFORMATION', 1);
      const currInfo = currencyData[account.currency] || { num: account.currency, name: account.currency };
      drawTable(
        [isSpanish ? 'Campo' : 'Field', isSpanish ? 'Valor' : 'Value'],
        [
          [isSpanish ? 'Titular de la Cuenta' : 'Account Holder', account.accountName],
          [isSpanish ? 'Número de Cuenta' : 'Account Number', account.accountNumber || account.id],
          [isSpanish ? 'Tipo de Cuenta' : 'Account Type', isBanking ? 'Custody Banking Account' : 'Custody Blockchain Account'],
          [isSpanish ? 'Divisa' : 'Currency', `${account.currency} - ${currInfo.name}`],
          ['ISO 4217', currInfo.num],
          [isSpanish ? 'Clasificación de Fondos' : 'Fund Classification', account.fundDenomination || 'M1'],
          [isSpanish ? 'Estado de la Cuenta' : 'Account Status', '✓ ACTIVE'],
          [isSpanish ? 'Banco Custodio' : 'Custodian Bank', 'Digital Commercial Bank Ltd']
        ],
        [55, 125]
      );

      // 2. BALANCE Y FONDOS
      drawSection(isSpanish ? 'RESUMEN DE BALANCE' : 'BALANCE SUMMARY', 2);
      drawTable(
        [isSpanish ? 'Concepto' : 'Concept', isSpanish ? 'Monto' : 'Amount', isSpanish ? 'Estado' : 'Status'],
        [
          [isSpanish ? 'Balance Total' : 'Total Balance', `${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '✓ Verified'],
          [isSpanish ? 'Balance Disponible' : 'Available Balance', `${account.currency} ${account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '✓ Available'],
          [isSpanish ? 'Fondos Reservados' : 'Reserved Funds', `${account.currency} ${account.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, isSpanish ? 'Comprometido' : 'Committed'],
          [isSpanish ? 'Balance de Apertura' : 'Opening Balance', `${account.currency} ${account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '-'],
          [isSpanish ? 'Créditos del Período' : 'Period Credits', `${account.currency} 0.00`, '-'],
          [isSpanish ? 'Débitos del Período' : 'Period Debits', `${account.currency} 0.00`, '-']
        ],
        [60, 70, 50]
      );

      // 3. CLASIFICACIÓN MONETARIA
      drawSection(isSpanish ? 'CLASIFICACIÓN MONETARIA - AGREGADOS' : 'MONETARY CLASSIFICATION - AGGREGATES', 3);
      drawTable(
        [isSpanish ? 'Agregado' : 'Aggregate', isSpanish ? 'Descripción' : 'Description', isSpanish ? 'Estado' : 'Status'],
        [
          ['M1', isSpanish ? 'Efectivo líquido - Disponibilidad inmediata' : 'Liquid cash - Immediately available', account.fundDenomination === 'M1' ? '✓ Applied' : '-'],
          ['M2', isSpanish ? 'Cuasi-dinero - Depósitos de ahorro' : 'Near money - Savings deposits', account.fundDenomination === 'M2' ? '✓ Applied' : '-'],
          ['M3', isSpanish ? 'Dinero amplio - Instrumentos monetarios' : 'Broad money - Monetary instruments', account.fundDenomination === 'M3' ? '✓ Applied' : '-'],
          ['M4', isSpanish ? 'Liquidez total - Activos financieros' : 'Total liquidity - Financial assets', account.fundDenomination === 'M4' ? '✓ Applied' : '-']
        ],
        [30, 100, 50]
      );

      // Nueva página
      pdf.addPage();
      y = margin + 10;

      // 4. INFORMACIÓN DE CUSTODIA
      drawSection(isSpanish ? 'DETALLES DE CUSTODIA' : 'CUSTODY DETAILS', 4);
      drawTable(
        [isSpanish ? 'Parámetro' : 'Parameter', isSpanish ? 'Valor' : 'Value'],
        [
          [isSpanish ? 'Banco Custodio' : 'Custodian Bank', 'Digital Commercial Bank Ltd'],
          [isSpanish ? 'Sistema' : 'System', 'DAES 256 - Data and Exchange Settlement'],
          [isSpanish ? 'Tipo de Custodia' : 'Custody Type', isSpanish ? 'Cuenta Segregada' : 'Segregated Account'],
          [isSpanish ? 'Salvaguarda' : 'Safekeeping', isSpanish ? 'Transferencia Total de Título' : 'Full Title Transfer'],
          [isSpanish ? 'Cobertura de Seguro' : 'Insurance Coverage', 'FDIC Equivalent'],
          [isSpanish ? 'Jurisdicción' : 'Jurisdiction', isSpanish ? 'Estándares Bancarios Internacionales' : 'International Banking Standards'],
          [isSpanish ? 'Frecuencia de Valoración' : 'Valuation Frequency', isSpanish ? 'Tiempo Real' : 'Real-time'],
          [isSpanish ? 'Acceso a Fondos' : 'Fund Access', isSpanish ? 'Bajo demanda' : 'On-demand']
        ],
        [55, 125]
      );

      // 5. CUMPLIMIENTO REGULATORIO
      drawSection(isSpanish ? 'CUMPLIMIENTO REGULATORIO Y CERTIFICACIONES' : 'REGULATORY COMPLIANCE & CERTIFICATIONS', 5);
      drawTable(
        [isSpanish ? 'Estándar' : 'Standard', isSpanish ? 'Descripción' : 'Description', isSpanish ? 'Estado' : 'Status'],
        [
          ['ISO 27001:2022', isSpanish ? 'Gestión de Seguridad de la Información' : 'Information Security Management', '✓ Certified'],
          ['ISO 20022', isSpanish ? 'Mensajería Financiera Estándar' : 'Financial Messaging Standard', '✓ Native'],
          ['PCI-DSS Level 1', isSpanish ? 'Seguridad de Datos de Tarjetas' : 'Card Data Security', '✓ Compliant'],
          ['SOC 2 Type II', isSpanish ? 'Controles de Seguridad y Disponibilidad' : 'Security & Availability Controls', '✓ Certified'],
          ['FATF AML/CFT', isSpanish ? 'Prevención de Lavado de Dinero' : 'Anti-Money Laundering', '✓ Verified'],
          ['KYC/KYB', isSpanish ? 'Debida Diligencia del Cliente' : 'Customer Due Diligence', '✓ Completed'],
          ['GDPR', isSpanish ? 'Protección de Datos Personales' : 'Personal Data Protection', '✓ Compliant'],
          ['Basel III', isSpanish ? 'Requisitos de Capital Bancario' : 'Banking Capital Requirements', '✓ Aligned']
        ],
        [40, 85, 55]
      );

      // 6. EVALUACIÓN DE RIESGO
      drawSection(isSpanish ? 'EVALUACIÓN DE RIESGO AML/CFT' : 'AML/CFT RISK ASSESSMENT', 6);
      drawTable(
        [isSpanish ? 'Indicador' : 'Indicator', isSpanish ? 'Valor' : 'Value', isSpanish ? 'Clasificación' : 'Classification'],
        [
          [isSpanish ? 'Puntuación AML' : 'AML Score', `${account.amlScore || 95}/100`, account.amlScore >= 80 ? '✓ Low Risk' : 'Review Required'],
          [isSpanish ? 'Nivel de Riesgo' : 'Risk Level', (account.riskLevel || 'LOW').toUpperCase(), '✓ Approved'],
          [isSpanish ? 'Estado KYC' : 'KYC Status', '✓ Verified', isSpanish ? 'Completado' : 'Completed'],
          [isSpanish ? 'Última Revisión' : 'Last Review', date.toLocaleDateString(isSpanish ? 'es-ES' : 'en-US'), isSpanish ? 'Vigente' : 'Current'],
          [isSpanish ? 'Próxima Revisión' : 'Next Review', new Date(date.getFullYear() + 1, date.getMonth(), date.getDate()).toLocaleDateString(isSpanish ? 'es-ES' : 'en-US'), isSpanish ? 'Programada' : 'Scheduled']
        ],
        [55, 60, 65]
      );

      // Nueva página
      pdf.addPage();
      y = margin + 10;

      // 7. VERIFICACIÓN DIGITAL
      drawSection(isSpanish ? 'VERIFICACIÓN DIGITAL Y SEGURIDAD' : 'DIGITAL VERIFICATION & SECURITY', 7);
      
      // Box especial para verificación
      y += 2;
      pdf.setFillColor(...colors.darkBlue);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 50, 2, 2, 'F');
      
      pdf.setDrawColor(...colors.gold);
      pdf.setLineWidth(1);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 50, 2, 2, 'S');
      
      // Marco interior
      pdf.setDrawColor(...colors.lightGold);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(margin + 3, y + 3, pageWidth - (margin * 2) - 6, 44, 1, 1, 'S');
      
      // Título
      pdf.setTextColor(...colors.gold);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(isSpanish ? 'CÓDIGOS DE VERIFICACIÓN CRIPTOGRÁFICA' : 'CRYPTOGRAPHIC VERIFICATION CODES', margin + 6, y + 10);
      
      // Códigos
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      
      pdf.setTextColor(...colors.gold);
      pdf.text('VERIFICATION CODE:', margin + 6, y + 18);
      pdf.setTextColor(...colors.white);
      pdf.text(verificationCode, margin + 45, y + 18);
      
      pdf.setTextColor(...colors.gold);
      pdf.text('SECURITY HASH:', margin + 6, y + 25);
      pdf.setTextColor(...colors.white);
      pdf.setFontSize(6);
      pdf.text(securityHash.substring(0, 32), margin + 45, y + 25);
      pdf.text(securityHash.substring(32), margin + 45, y + 30);
      
      pdf.setFontSize(7);
      pdf.setTextColor(...colors.gold);
      pdf.text('TIMESTAMP:', margin + 6, y + 38);
      pdf.setTextColor(...colors.white);
      pdf.text(date.toISOString(), margin + 45, y + 38);
      
      pdf.setTextColor(...colors.gold);
      pdf.text('DIGITAL SIGNATURE:', margin + 6, y + 45);
      pdf.setTextColor(...colors.emerald);
      pdf.setFont('helvetica', 'bold');
      pdf.text('VALID - CRYPTOGRAPHICALLY VERIFIED', margin + 45, y + 45);
      
      y += 58;

      // 8. HISTORIAL DE TRANSACCIONES
      if (account.transactions && account.transactions.length > 0) {
        // Nueva página para transacciones
        pdf.addPage();
        y = margin + 10;
        
        drawSection(isSpanish ? 'HISTORIAL DE MOVIMIENTOS' : 'TRANSACTION HISTORY', 8);
        
        const transactionRows = account.transactions.slice(-15).reverse().map((tx: any) => {
          const typeLabels: Record<string, string> = {
            initial: isSpanish ? 'Apertura' : 'Opening',
            deposit: isSpanish ? 'Depósito' : 'Deposit',
            withdrawal: isSpanish ? 'Retiro' : 'Withdrawal',
            transfer_in: isSpanish ? 'Trans. Ent.' : 'Transfer In',
            transfer_out: isSpanish ? 'Trans. Sal.' : 'Transfer Out',
            adjustment: isSpanish ? 'Ajuste' : 'Adjustment'
          };
          
          const typeLabel = typeLabels[tx.type] || tx.type;
          const amount = tx.amount >= 0 ? `+${account.currency} ${Math.abs(tx.amount).toLocaleString()}` : `-${account.currency} ${Math.abs(tx.amount).toLocaleString()}`;
          
          return [
            tx.transactionDate,
            tx.transactionTime?.substring(0, 5) || '-',
            typeLabel,
            (tx.description || '-').substring(0, 25),
            amount,
            `${account.currency} ${tx.balanceAfter.toLocaleString()}`
          ];
        });
        
        if (transactionRows.length > 0) {
          drawTable(
            [
              isSpanish ? 'Fecha' : 'Date',
              isSpanish ? 'Hora' : 'Time',
              isSpanish ? 'Tipo' : 'Type',
              isSpanish ? 'Descripción' : 'Description',
              isSpanish ? 'Monto' : 'Amount',
              isSpanish ? 'Balance' : 'Balance'
            ],
            transactionRows,
            [25, 16, 22, 45, 35, 37]
          );
        }
        
        // Info de transacciones
        y += 3;
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(margin, y, pageWidth - (margin * 2), 12, 1, 1, 'F');
        pdf.setTextColor(...colors.gray);
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.text(isSpanish 
          ? `Total transacciones: ${account.transactions.length} | Mostrando últimas 15 transacciones | Período: ${account.transactions[0]?.transactionDate || '-'} - ${account.transactions[account.transactions.length - 1]?.transactionDate || '-'}`
          : `Total transactions: ${account.transactions.length} | Showing last 15 transactions | Period: ${account.transactions[0]?.transactionDate || '-'} - ${account.transactions[account.transactions.length - 1]?.transactionDate || '-'}`,
          margin + 4, y + 7);
        y += 18;
      }

      // Nueva página para declaración
      if (y > pageHeight - 80) {
        pdf.addPage();
        y = margin + 10;
      }

      // 9. DECLARACIÓN OFICIAL
      drawSection(isSpanish ? 'DECLARACIÓN OFICIAL DEL BANCO' : 'OFFICIAL BANK DECLARATION', account.transactions && account.transactions.length > 0 ? 9 : 8);
      
      y += 2;
      pdf.setFillColor(250, 251, 252);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 38, 1.5, 1.5, 'F');
      pdf.setDrawColor(...colors.gold);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(margin, y, pageWidth - (margin * 2), 38, 1.5, 1.5, 'S');
      
      pdf.setTextColor(...colors.darkBlue);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      
      const declarationText = isSpanish 
        ? [
            'Digital Commercial Bank Ltd certifica que los fondos mencionados anteriormente están bajo custodia',
            'segura del sistema DAES 256 DATA AND EXCHANGE SETTLEMENT y están disponibles según lo indicado.',
            '',
            'Este documento es válido sin firma manuscrita al ser generado electrónicamente con verificación',
            'criptográfica. Los fondos, según nuestro conocimiento, son limpios, claros y libres de cualquier',
            'gravamen, y fueron obtenidos legalmente de actividades comerciales no criminales.'
          ]
        : [
            'Digital Commercial Bank Ltd certifies that the above mentioned funds are under secure custody',
            'of the DAES 256 DATA AND EXCHANGE SETTLEMENT system and are available as indicated.',
            '',
            'This document is valid without handwritten signature as it is electronically generated with',
            'cryptographic verification. The funds, to the best of our knowledge, are clean, clear and free',
            'of any levy or encumbrances, and were legally obtained from non-criminal business activities.'
          ];
      
      let declY = y + 6;
      declarationText.forEach(line => {
        pdf.text(line, margin + 4, declY);
        declY += 5;
      });
      
      y += 45;

      // Box de contacto
      drawInfoBox(
        isSpanish ? 'INFORMACIÓN DE CONTACTO INSTITUCIONAL' : 'INSTITUTIONAL CONTACT INFORMATION',
        [
          'Portal: https://luxliqdaes.cloud/partner-portal',
          'Corporate: https://digcommbank.com',
          `Email: operations@digcommbank.com | ${isSpanish ? 'Referencia' : 'Reference'}: ${statementNumber}`
        ],
        colors.emerald
      );

      // Añadir footers institucionales a todas las páginas
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        drawInstitutionalFooter(i, totalPages);
      }

      // Guardar PDF
      const filename = `DCB_DAES_Institutional_Statement_${account.accountNumber || account.id}_${statementNumber}`;
      pdf.save(`${filename}.pdf`);

      console.log(`[Custody] 📄 PDF5 Institucional generado: ${filename}.pdf`);

    } catch (error) {
      console.error('Error generating PDF5 Institutional:', error);
      alert(language === 'es' ? 'Error al generar Estado de Cuenta Institucional' : 'Error generating Institutional Account Statement');
    }
  };

  const handleDownloadImage = async () => {
    if (!blackScreenRef.current) return;
    
    try {
      const canvas = await html2canvas(blackScreenRef.current, {
        backgroundColor: '#000000',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true
      });
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CustodyAccount_${account.accountNumber || account.id}_${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      console.error('Error generating image:', error);
      alert(language === 'es' ? 'Error al generar la imagen' : 'Error generating image');
    }
  };

  const handleDownloadPdf = async () => {
    if (!blackScreenRef.current) return;
    
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
      
      pdf.save(`CustodyAccount_${account.accountNumber || account.id}_${Date.now()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(language === 'es' ? 'Error al generar el PDF' : 'Error generating PDF');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center p-4">
      <div className="bg-black w-full max-w-5xl max-h-[95vh] overflow-hidden border-2 border-[#ffffff] shadow-[0_0_50px_rgba(255, 255, 255,0.5)] rounded-lg flex flex-col">
        
        {/* Header con botones */}
        <div className="bg-black border-b-2 border-[#ffffff] p-4 flex justify-between items-center print:hidden">
          <h2 className="text-xl font-bold text-[#ffffff]">
            {language === 'es' ? 'BLACK SCREEN - CUENTA CUSTODIO' : 'BLACK SCREEN - CUSTODY ACCOUNT'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTxt}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm"
            >
              <Download className="w-4 h-4" />
              TXT
            </button>
            <button
              onClick={handleDownloadTxtAsPDF}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
            <button
              onClick={handleDownloadImage}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm flex items-center gap-1"
            >
              <ImageIcon className="w-4 h-4" />
              {language === 'es' ? 'Imagen' : 'Image'}
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              {language === 'es' ? 'PDF Imagen' : 'PDF Image'}
            </button>
            <button
              onClick={handleDownloadPDF3}
              className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 border border-emerald-400/50 text-white rounded hover:from-emerald-500 hover:to-cyan-500 text-sm flex items-center gap-1 font-bold shadow-lg shadow-emerald-500/20"
            >
              <FileText className="w-4 h-4" />
              PDF3 SWIFT
            </button>
            <button
              onClick={handleDownloadPDF4BlackStatement}
              className="px-3 py-2 bg-gradient-to-r from-purple-600 to-pink-600 border border-purple-400/50 text-white rounded hover:from-purple-500 hover:to-pink-500 text-sm flex items-center gap-1 font-bold shadow-lg shadow-purple-500/20"
            >
              <FileText className="w-4 h-4" />
              PDF4 Statement
            </button>
            <button
              onClick={handleDownloadPDF5Institutional}
              className="px-3 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 border border-amber-400/50 text-black rounded hover:from-amber-400 hover:to-yellow-400 text-sm flex items-center gap-1 font-bold shadow-lg shadow-amber-500/30"
            >
              <FileText className="w-4 h-4" />
              PDF5 Institucional
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm"
            >
              <Printer className="w-4 h-4 inline mr-1" />
              {language === 'es' ? 'Imprimir' : 'Print'}
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 bg-[#ffffff]/10 border border-[#ffffff]/30 text-[#ffffff] rounded hover:bg-[#ffffff]/20 text-sm"
            >
              <X className="w-4 h-4 inline mr-1" />
              {language === 'es' ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>

        {/* Contenido Black Screen */}
        <div ref={blackScreenRef} className="flex-1 overflow-y-auto p-8 space-y-6 text-[#ffffff] bg-black font-mono">
          
          {/* Header - Diseño Bancario Profesional */}
          <div className="text-center border-t-4 border-b-4 border-[#ffffff] py-8 bg-gradient-to-b from-[#1a1a1a] to-black">
            <div className="text-3xl font-bold mb-3 tracking-wider text-[#ffffff] uppercase">
              {language === 'es' ? 'BLACK SCREEN - CONFIRMACIÓN BANCARIA OFICIAL' : 'BLACK SCREEN - OFFICIAL BANK CONFIRMATION'}
            </div>
            <div className="text-xl mb-2 font-bold text-[#ffffff]">Digital Commercial Bank Ltd</div>
            <div className="text-lg mb-4 text-[#ffffff] font-semibold">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
            <div className="text-sm text-[#ffffff] font-semibold border-t border-b border-[#ffffff]/30 py-2 mt-4">
              {language === 'es' ? 'DOCUMENTO CONFIDENCIAL - SOLO PARA USO BANCARIO AUTORIZADO' : 'CONFIDENTIAL DOCUMENT - FOR AUTHORIZED BANKING USE ONLY'}
            </div>
          </div>

          {/* Tipo de Cuenta - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-4 border-b border-[#ffffff]/30 pb-3 uppercase tracking-wide">
              {language === 'es' ? 'TIPO DE CUENTA' : 'ACCOUNT TYPE'}
            </div>
            <div className="text-3xl font-bold text-[#ffffff] flex items-center gap-3">
              {isBanking ? <BankIcon className="text-cyan-400" size={32} /> : <BlockchainIcon className="text-cyan-400" size={32} />}
              <span className="tracking-wide">
                {isBanking 
                  ? (language === 'es' ? 'CUENTA BANCARIA CUSTODIO' : 'CUSTODY BANKING ACCOUNT')
                  : (language === 'es' ? 'CUENTA BLOCKCHAIN CUSTODIO' : 'CUSTODY BLOCKCHAIN ACCOUNT')}
              </span>
            </div>
          </div>

          {/* Información del Beneficiario - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-5 border-b-2 border-[#ffffff]/40 pb-3 uppercase tracking-wide">
              {language === 'es' ? 'INFORMACIÓN DEL BENEFICIARIO' : 'BENEFICIARY INFORMATION'}
            </div>
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Titular:' : 'Account Holder:'}</div>
                <div className="text-[#ffffff] font-bold text-base">{account.accountName}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Cuenta:' : 'Account:'}</div>
                <div className="text-[#ffffff] font-mono font-bold text-base">{account.accountNumber || account.id}</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Banco:' : 'Bank:'}</div>
                <div className="text-[#ffffff] font-bold text-base">Digital Commercial Bank Ltd</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Sistema:' : 'System:'}</div>
                <div className="text-[#ffffff] text-base">DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
              </div>
              <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">{language === 'es' ? 'Moneda:' : 'Currency:'}</div>
                <div className="text-[#ffffff] font-bold text-base">{account.currency}</div>
              </div>
              {!isBanking && (
                <>
                  <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                    <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">Blockchain:</div>
                    <div className="text-[#ffffff] text-base">{account.blockchainLink}</div>
                  </div>
                  <div className="bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                    <div className="text-[#ffffff]/70 mb-2 text-xs uppercase tracking-wide">Token:</div>
                    <div className="text-[#ffffff] font-mono text-base">{account.tokenSymbol}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Balances - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-5 border-b-2 border-[#ffffff]/40 pb-3 uppercase tracking-wide">
              {language === 'es' ? 'RESUMEN DE FONDOS CUSTODIO' : 'CUSTODY FUNDS SUMMARY'}
            </div>
            <div className="grid grid-cols-3 gap-5">
              <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border-2 border-cyan-500/60 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div className="text-xs text-[#ffffff]/70 mb-2 uppercase tracking-wide">{language === 'es' ? 'TOTAL' : 'TOTAL'}</div>
                <div className="text-4xl font-bold text-cyan-400">{account.currency} {account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border-2 border-yellow-500/60 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                <div className="text-xs text-[#ffffff]/70 mb-2 uppercase tracking-wide">{language === 'es' ? 'RESERVADO' : 'RESERVED'}</div>
                <div className="text-4xl font-bold text-yellow-400">{account.currency} {account.reservedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="bg-gradient-to-br from-[#0d0d0d] to-[#1a1a1a] border-2 border-white/50 rounded-xl p-6 text-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <div className="text-xs text-[#ffffff]/70 mb-2 uppercase tracking-wide">{language === 'es' ? 'DISPONIBLE' : 'AVAILABLE'}</div>
                <div className="text-4xl font-bold text-white">{account.currency} {account.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>
          </div>

          {/* Total Verificado - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] border-4 border-[#ffffff] rounded-xl p-8 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            <div className="text-center">
              <div className="text-base text-[#ffffff]/80 mb-3 uppercase tracking-widest">
                {language === 'es' ? 'BALANCE TOTAL VERIFICADO' : 'TOTAL VERIFIED BALANCE'}
              </div>
              <div className="text-5xl font-bold text-[#ffffff] mb-2 tracking-tight">
                {account.currency} {account.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Cumplimiento - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-5 border-b-2 border-[#ffffff]/40 pb-3 uppercase tracking-wide flex items-center gap-3">
              <AwardIcon className="text-yellow-400" size={24} />
              <span>{language === 'es' ? 'CUMPLIMIENTO DE ESTÁNDARES' : 'STANDARDS COMPLIANCE'}</span>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="flex items-center gap-2 text-base">
                  <SecurityIcon className="text-cyan-400" size={18} />
                  ISO 27001:2022 - {language === 'es' ? 'Seguridad de la Información' : 'Information Security'}
                </span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  COMPLIANT
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="flex items-center gap-2 text-base">
                  <BankIcon className="text-cyan-400" size={18} />
                  ISO 20022 - {language === 'es' ? 'Interoperabilidad Financiera' : 'Financial Interoperability'}
                </span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  COMPATIBLE
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="flex items-center gap-2 text-base">
                  <ComplianceIcon className="text-cyan-400" size={18} />
                  FATF AML/CFT - {language === 'es' ? 'Anti-Lavado de Dinero' : 'Anti-Money Laundering'}
                </span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  VERIFIED
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="text-base">KYC:</span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  VERIFIED
                </span>
              </div>
              <div className="flex justify-between bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="text-base">AML Score:</span>
                <span className="text-white font-bold text-base">{account.amlScore || 95}/100</span>
              </div>
              <div className="flex justify-between bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-3">
                <span className="text-base">Risk Level:</span>
                <span className="text-white font-bold text-base">{(account.riskLevel || 'low').toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Información Técnica - Diseño Bancario Profesional */}
          <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] border-2 border-[#ffffff]/40 rounded-xl p-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
            <div className="text-xl font-bold mb-5 border-b-2 border-[#ffffff]/40 pb-3 uppercase tracking-wide">
              {language === 'es' ? 'INFORMACIÓN TÉCNICA' : 'TECHNICAL INFORMATION'}
            </div>
            <div className="space-y-4 text-base">
              <div className="flex justify-between items-start bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <span className="font-semibold text-base">{language === 'es' ? 'Hash de Verificación:' : 'Verification Hash:'}</span>
                <span className="text-purple-400 font-mono text-sm break-all text-right max-w-[70%]">
                  {account.verificationHash || '3ad65ff0d75b1962d188...'}
                </span>
              </div>
              <div className="flex justify-between bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <span className="font-semibold text-base">{language === 'es' ? 'Fecha de Emisión:' : 'Issue Date:'}</span>
                <span className="text-white text-base">
                  {new Date(account.createdAt || Date.now()).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center bg-[#0d0d0d] border border-[#ffffff]/20 rounded-lg p-4">
                <span className="font-semibold text-base">{language === 'es' ? 'Estado de Verificación:' : 'Verification Status:'}</span>
                <span className="text-white font-bold flex items-center gap-2 text-base">
                  <CheckIcon className="text-green-400" size={18} />
                  {language === 'es' ? 'VERIFICADO Y CERTIFICADO' : 'VERIFIED AND CERTIFIED'}
                </span>
              </div>
            </div>
          </div>

          {/* Certificación - Diseño Bancario Profesional */}
          <div className="border-t-4 border-b-4 border-[#ffffff] py-8 bg-gradient-to-b from-[#1a1a1a] to-black">
            <div className="text-center">
              <div className="text-2xl font-bold mb-5 uppercase tracking-wider">
                {language === 'es' ? 'CERTIFICACIÓN BANCARIA OFICIAL' : 'OFFICIAL BANK CERTIFICATION'}
              </div>
              <div className="text-base text-[#ffffff] max-w-3xl mx-auto mb-5">
                <div className="font-bold text-lg mb-3">Digital Commercial Bank Ltd</div>
                <div className="font-semibold text-base mb-4">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
                <div className="text-base leading-relaxed mb-4">
                  {language === 'es'
                    ? 'Este documento certifica que los fondos arriba mencionados están bajo custodia segura del sistema DAES 256 DATA AND EXCHANGE SETTLEMENT y están disponibles según se indica.'
                    : 'This document certifies that the above mentioned funds are under secure custody of the DAES 256 DATA AND EXCHANGE SETTLEMENT system and are available as indicated.'}
                </div>
              </div>
              <div className="text-base text-[#ffffff] mt-5 mb-5 font-semibold">
                {language === 'es' ? 'Conforme con estándares' : 'Compliant with standards'}: SWIFT MT799/MT999, FEDWIRE, DTC, ISO 20022
              </div>
              <div className="mt-6 text-xl font-bold text-[#ffffff] flex items-center justify-center gap-3">
                <CheckIcon className="text-green-400" size={28} />
                <span className="uppercase tracking-wide">{language === 'es' ? 'FIRMADO DIGITALMENTE' : 'DIGITALLY SIGNED'}</span>
              </div>
            </div>
          </div>

          {/* Footer - Diseño Bancario Profesional */}
          <div className="text-center text-sm text-[#ffffff] border-t-2 border-[#ffffff]/40 pt-6 bg-gradient-to-b from-black to-[#0a0a0a]">
            <div className="font-bold mb-3 text-base">{language === 'es' ? 'Generado por' : 'Generated by'}: DAES CoreBanking System</div>
            <div className="font-bold mb-2 text-base">Digital Commercial Bank Ltd</div>
            <div className="mb-2 text-base">System DAES 256 DATA AND EXCHANGE SETTLEMENT</div>
            <div className="mb-4 text-base">© {new Date().getFullYear()} DAES - Data and Exchange Settlement</div>
            <div className="mt-4 text-xs space-y-2">
              <div className="font-semibold">
                {language === 'es' ? 'Hash del Documento' : 'Document Hash'}: {Math.random().toString(36).substring(2, 15).toUpperCase()}
              </div>
              <div className="mt-3 text-[#ffffff]/90 font-semibold">
                CoreBanking v1.0.0
              </div>
              <div className="text-[#ffffff]/90 font-semibold">
                ISO 4217 Compliant
              </div>
              <div className="text-[#ffffff]/90 font-semibold">
                PCI-DSS Ready
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

