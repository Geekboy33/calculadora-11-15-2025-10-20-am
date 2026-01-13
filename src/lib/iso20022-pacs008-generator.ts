/**
 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}



 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}



 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}



 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}



 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}



 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}



 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}


 * ISO 20022 pacs.008 XML Generator - DAES CoreBanking System
 * 
 * Genera mensajes pacs.008 reales (FIToFICstmrCdtTrf) para pruebas en UAT
 * Cumple con ISO 20022 estándar y exporta XML válido UTF-8
 */

import { v4 as uuidv4 } from 'uuid';

export interface Pacs008Params {
  messageId: string;
  creditorBIC: string;
  debtorBIC: string;
  amount: number;
  currency: string;
  creditorName: string;
  debtorName: string;
  creditorIBAN: string;
  debtorIBAN: string;
  settlementMethod: 'CLRG' | 'INDA' | 'INGA' | 'COVE';
  chargeBearer: 'SLEV' | 'SHAR' | 'CRED' | 'DEBT';
  description?: string;
}

/**
 * Generar mensaje pacs.008 válido en ISO 20022
 */
export function generatePacs008XML(params: Pacs008Params): string {
  const now = new Date();
  const timestamp = now.toISOString();
  const uetr = uuidv4();
  const instrId = `DAES-INSTR-${Date.now()}`;
  const endToEndId = `DAES-E2E-${Date.now()}`;
  
  // Formatear el monto con 2 decimales
  const formattedAmount = params.amount.toFixed(2);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>${params.messageId}</MsgId>
      <CreDtTm>${timestamp}</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>${formattedAmount}</CtrlSum>
      <InitgPty>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <OrgId>
            <BICOrBEI>${params.debtorBIC}</BICOrBEI>
          </OrgId>
        </Id>
      </InitgPty>
      <SttlmInf>
        <SttlmMtd>${params.settlementMethod}</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${instrId}</InstrId>
        <EndToEndId>${endToEndId}</EndToEndId>
        <UETR>${uetr}</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="${params.currency}">${formattedAmount}</IntrBkSttlmAmt>
      <ChrgBr>${params.chargeBearer}</ChrgBr>
      <Dbtr>
        <Nm>${params.debtorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.debtorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Dbtr>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>${params.debtorBIC}</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>${params.creditorBIC}</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>${params.creditorName}</Nm>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${params.creditorIBAN}</Id>
              <SchmeNm>
                <Prtry>IBAN</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${params.creditorIBAN}</IBAN>
        </Id>
      </CdtrAcct>
      <Purp>
        <Cd>TRAD</Cd>
      </Purp>
      <RmtInf>
        <Ustrd>${params.description || 'Test payment - DAES CoreBanking System'}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`;

  return xml;
}

/**
 * Validar estructura del XML pacs.008
 */
export function validatePacs008XML(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar declaración XML
  if (!xml.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    errors.push('❌ Missing or invalid XML declaration with UTF-8 encoding');
  }

  // Verificar namespace correcto
  if (!xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.08"')) {
    errors.push('❌ Invalid ISO 20022 namespace for pacs.008');
  }

  // Verificar elementos críticos
  const requiredElements = [
    { tag: 'FIToFICstmrCdtTrf', desc: 'Credit Transfer' },
    { tag: 'GrpHdr', desc: 'Group Header' },
    { tag: 'MsgId', desc: 'Message ID' },
    { tag: 'CreDtTm', desc: 'Creation Date/Time' },
    { tag: 'CdtTrfTxInf', desc: 'Credit Transfer Transaction Info' },
    { tag: 'IntrBkSttlmAmt', desc: 'Settlement Amount' },
    { tag: 'UETR', desc: 'Unique End-to-End Transaction Reference' },
    { tag: 'Dbtr', desc: 'Debtor' },
    { tag: 'Cdtr', desc: 'Creditor' }
  ];

  for (const elem of requiredElements) {
    if (!xml.includes(`<${elem.tag}>`)) {
      errors.push(`❌ Missing required element: <${elem.tag}> (${elem.desc})`);
    }
  }

  // Verificar monto
  const amountMatch = xml.match(/<IntrBkSttlmAmt Ccy="([A-Z]{3})">(\d+\.?\d*)<\/IntrBkSttlmAmt>/);
  if (!amountMatch) {
    errors.push('❌ Invalid or missing settlement amount');
  } else {
    const [, currency, amount] = amountMatch;
    if (!currency || !amount) {
      errors.push('❌ Settlement amount missing currency or value');
    }
  }

  // Verificar UETR (UUID format)
  const uetrMatch = xml.match(/<UETR>([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})<\/UETR>/i);
  if (!uetrMatch) {
    errors.push('❌ UETR not found or invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Descargar XML como archivo
 */
export function downloadXML(xmlContent: string, filename: string = 'pacs.008_test_case_01.xml'): void {
  try {
    // Asegurar encoding UTF-8
    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading XML:', error);
    throw new Error('Failed to download XML file');
  }
}

/**
 * Copiar XML al portapapeles
 */
export function copyXMLToClipboard(xmlContent: string): Promise<void> {
  return navigator.clipboard.writeText(xmlContent);
}

/**
 * Extraer información crítica del XML para verificación
 */
export function extractPacs008Info(xml: string): {
  messageId: string | null;
  uetr: string | null;
  amount: string | null;
  currency: string | null;
  debtor: string | null;
  creditor: string | null;
  createdAt: string | null;
} {
  return {
    messageId: xml.match(/<MsgId>([^<]+)<\/MsgId>/)?.[1] || null,
    uetr: xml.match(/<UETR>([^<]+)<\/UETR>/)?.[1] || null,
    amount: xml.match(/<IntrBkSttlmAmt[^>]*>([^<]+)<\/IntrBkSttlmAmt>/)?.[1] || null,
    currency: xml.match(/<IntrBkSttlmAmt Ccy="([^"]+)"/)?.[1] || null,
    debtor: xml.match(/<Dbtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    creditor: xml.match(/<Cdtr>\s*<Nm>([^<]+)<\/Nm>/)?.[1] || null,
    createdAt: xml.match(/<CreDtTm>([^<]+)<\/CreDtTm>/)?.[1] || null
  };
}

/**
 * Generar metadata de la transacción
 */
export function generateTransactionMetadata(xml: string): {
  generatedAt: string;
  filename: string;
  encoding: string;
  size: number;
  checksum: string;
} {
  const now = new Date().toISOString();
  const filename = 'pacs.008_test_case_01.xml';
  const encoding = 'UTF-8';
  const size = new Blob([xml]).size;
  
  // Generar checksum simple (SHA-256 sería ideal pero usamos hash simple para demo)
  const checksum = Array.from(xml).reduce((hash, char) => 
    ((hash << 5) - hash) + char.charCodeAt(0), 0
  ).toString(16);

  return {
    generatedAt: now,
    filename,
    encoding,
    size,
    checksum
  };
}




