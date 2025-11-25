/**
 * Statement Exporter - Digital Commercial Bank Ltd
 * Genera estados de cuenta detallados en formato TXT
 * Completamente localizado en ES/EN
 */

import { ProfessionalFormatters } from './professional-formatters';
import type { CurrencyBalance } from './balances-store';
import type { CustodyAccount } from './custody-store';
import type { UnifiedPledge } from './unified-pledge-store';

interface StatementData {
  metrics: {
    totalBalances: { [currency: string]: number };
    totalAccounts: number;
    activePledges: number;
    totalTransactions: number;
    activeCurrencies: number;
    ledgerProgress: number;
    systemHealth: string;
    totalCustodyValue: number;
    totalPledgedValue: number;
  };
  balances: CurrencyBalance[];
  custodyAccounts: CustodyAccount[];
  pledges: UnifiedPledge[];
  recentActivity: Array<{
    type: string;
    title: string;
    description: string;
    timestamp: string;
  }>;
}

export class StatementExporter {
  /**
   * Genera estado de cuenta completo en TXT
   */
  static generateStatement(data: StatementData, locale: string = 'en-US'): string {
    const isSpanish = locale === 'es-ES';
    const now = new Date();
    const fmt = (amount: number, currency: string) => 
      ProfessionalFormatters.currency(amount, currency, locale);
    const fmtNum = (value: number) => 
      ProfessionalFormatters.number(value, locale);
    const fmtDate = (date: Date | string) => 
      ProfessionalFormatters.dateTime(date, locale);

    let txt = '';

    // ═══════════════════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════════════════
    txt += '═'.repeat(80) + '\n';
    txt += this.center('DIGITAL COMMERCIAL BANK LTD', 80) + '\n';
    txt += this.center(isSpanish ? 'ESTADO DE CUENTAS CONSOLIDADO' : 'CONSOLIDATED ACCOUNT STATEMENT', 80) + '\n';
    txt += '═'.repeat(80) + '\n';
    txt += '\n';
    
    txt += (isSpanish ? 'Fecha de emisión: ' : 'Issue date: ') + fmtDate(now) + '\n';
    txt += (isSpanish ? 'Estado del sistema: ' : 'System status: ') + 
           (data.metrics.systemHealth === 'excellent' 
             ? (isSpanish ? '✓ EXCELENTE' : '✓ EXCELLENT')
             : data.metrics.systemHealth.toUpperCase()) + '\n';
    txt += (isSpanish ? 'Progreso de análisis: ' : 'Analysis progress: ') + 
           data.metrics.ledgerProgress.toFixed(1) + '%\n';
    txt += '\n';

    // ═══════════════════════════════════════════════════════════════
    // RESUMEN EJECUTIVO
    // ═══════════════════════════════════════════════════════════════
    txt += '━'.repeat(80) + '\n';
    txt += (isSpanish ? ' RESUMEN EJECUTIVO' : ' EXECUTIVE SUMMARY') + '\n';
    txt += '━'.repeat(80) + '\n';
    txt += '\n';

    const totalAssets = Object.values(data.metrics.totalBalances).reduce((sum, v) => sum + v, 0);
    
    txt += this.formatLine(isSpanish ? 'Activos totales:' : 'Total assets:', fmt(totalAssets, 'USD'), 50) + '\n';
    txt += this.formatLine(isSpanish ? 'Cuentas activas:' : 'Active accounts:', data.metrics.totalAccounts.toString(), 50) + '\n';
    txt += this.formatLine(isSpanish ? 'Fondos custodiados:' : 'Custodied funds:', fmt(data.metrics.totalCustodyValue, 'USD'), 50) + '\n';
    txt += this.formatLine(isSpanish ? 'Fondos reservados (Pledges):' : 'Reserved funds (Pledges):', fmt(data.metrics.totalPledgedValue, 'USD'), 50) + '\n';
    txt += this.formatLine(isSpanish ? 'Divisas activas:' : 'Active currencies:', data.metrics.activeCurrencies.toString(), 50) + '\n';
    txt += this.formatLine(isSpanish ? 'Total de transacciones:' : 'Total transactions:', fmtNum(data.metrics.totalTransactions), 50) + '\n';
    txt += '\n';

    // ═══════════════════════════════════════════════════════════════
    // BALANCES POR DIVISA
    // ═══════════════════════════════════════════════════════════════
    txt += '━'.repeat(80) + '\n';
    txt += (isSpanish ? ' BALANCES POR DIVISA' : ' BALANCES BY CURRENCY') + '\n';
    txt += '━'.repeat(80) + '\n';
    txt += '\n';

    const sortedCurrencies = Object.keys(data.metrics.totalBalances).sort((a, b) => {
      const priority = ['USD', 'EUR', 'GBP', 'CHF', 'JPY'];
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return data.metrics.totalBalances[b] - data.metrics.totalBalances[a];
    });

    sortedCurrencies.forEach((currency, idx) => {
      const amount = data.metrics.totalBalances[currency];
      const total = totalAssets;
      const percentage = total > 0 ? (amount / total) * 100 : 0;
      
      txt += `${(idx + 1).toString().padStart(2, ' ')}. ${currency.padEnd(6)} `;
      txt += `${fmt(amount, currency).padStart(20)} `;
      txt += `(${percentage.toFixed(1)}% ${isSpanish ? 'del total' : 'of total'})\n`;
    });
    txt += '\n';

    // ═══════════════════════════════════════════════════════════════
    // CUENTAS CUSTODIO
    // ═══════════════════════════════════════════════════════════════
    txt += '━'.repeat(80) + '\n';
    txt += (isSpanish ? ' CUENTAS CUSTODIO' : ' CUSTODY ACCOUNTS') + '\n';
    txt += '━'.repeat(80) + '\n';
    txt += '\n';

    if (data.custodyAccounts.length > 0) {
      data.custodyAccounts.forEach((account, idx) => {
        txt += `[${(idx + 1).toString().padStart(2, '0')}] ${account.accountName}\n`;
        txt += '    ' + this.formatLine(isSpanish ? 'Tipo:' : 'Type:', 
          account.accountType === 'blockchain' ? '⛓️  Blockchain' : '🏦 Banking', 40) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Divisa:' : 'Currency:', account.currency, 40) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Balance total:' : 'Total balance:', 
          fmt(account.totalBalance, account.currency), 40) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Balance reservado:' : 'Reserved balance:', 
          fmt(account.reservedBalance, account.currency), 40) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Balance disponible:' : 'Available balance:', 
          fmt(account.availableBalance, account.currency), 40) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Estado API:' : 'API status:', 
          account.apiStatus === 'active' ? '✓ ACTIVO' : account.apiStatus.toUpperCase(), 40) + '\n';
        
        if (account.accountType === 'blockchain' && account.contractAddress) {
          txt += '    ' + this.formatLine(isSpanish ? 'Contrato:' : 'Contract:', 
            account.contractAddress.slice(0, 42), 40) + '\n';
        }
        if (account.accountType === 'banking' && account.iban) {
          txt += '    ' + this.formatLine('IBAN:', account.iban, 40) + '\n';
        }
        
        txt += '\n';
      });
    } else {
      txt += '    ' + (isSpanish ? 'No hay cuentas custodio registradas.' : 'No custody accounts registered.') + '\n\n';
    }

    // ═══════════════════════════════════════════════════════════════
    // PLEDGES ACTIVOS
    // ═══════════════════════════════════════════════════════════════
    txt += '━'.repeat(80) + '\n';
    txt += (isSpanish ? ' RESERVAS ACTIVAS (PLEDGES)' : ' ACTIVE RESERVES (PLEDGES)') + '\n';
    txt += '━'.repeat(80) + '\n';
    txt += '\n';

    const activePledges = data.pledges.filter(p => p.status === 'ACTIVE');
    
    if (activePledges.length > 0) {
      activePledges.forEach((pledge, idx) => {
        txt += `[${(idx + 1).toString().padStart(2, '0')}] ${pledge.account_name}\n`;
        txt += '    ' + this.formatLine(isSpanish ? 'Beneficiario:' : 'Beneficiary:', pledge.beneficiary, 45) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Monto:' : 'Amount:', 
          fmt(pledge.amount, pledge.currency), 45) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Divisa:' : 'Currency:', pledge.currency, 45) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Módulo origen:' : 'Source module:', pledge.source_module, 45) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Estado:' : 'Status:', '✓ ' + pledge.status, 45) + '\n';
        txt += '    ' + this.formatLine(isSpanish ? 'Fecha de creación:' : 'Created at:', 
          fmtDate(pledge.created_at), 45) + '\n';
        
        if (pledge.token_symbol) {
          txt += '    ' + this.formatLine(isSpanish ? 'Token:' : 'Token:', pledge.token_symbol, 45) + '\n';
        }
        if (pledge.anchored_coins) {
          txt += '    ' + this.formatLine(isSpanish ? 'Monedas ancladas:' : 'Anchored coins:', 
            fmtNum(pledge.anchored_coins), 45) + '\n';
        }
        
        txt += '\n';
      });
    } else {
      txt += '    ' + (isSpanish ? 'No hay pledges activos en este momento.' : 'No active pledges at this time.') + '\n\n';
    }

    // ═══════════════════════════════════════════════════════════════
    // ACTIVIDAD RECIENTE
    // ═══════════════════════════════════════════════════════════════
    txt += '━'.repeat(80) + '\n';
    txt += (isSpanish ? ' ACTIVIDAD RECIENTE DEL SISTEMA' : ' RECENT SYSTEM ACTIVITY') + '\n';
    txt += '━'.repeat(80) + '\n';
    txt += '\n';

    if (data.recentActivity.length > 0) {
      data.recentActivity.slice(0, 15).forEach((activity, idx) => {
        txt += `${(idx + 1).toString().padStart(2, ' ')}. ${activity.title}\n`;
        txt += `    ${activity.description}\n`;
        txt += `    ${isSpanish ? 'Fecha:' : 'Date:'} ${fmtDate(activity.timestamp)}\n`;
        txt += '\n';
      });
    } else {
      txt += '    ' + (isSpanish ? 'No hay actividad reciente registrada.' : 'No recent activity recorded.') + '\n\n';
    }

    // ═══════════════════════════════════════════════════════════════
    // DETALLES DEL ANÁLISIS DE LEDGER
    // ═══════════════════════════════════════════════════════════════
    txt += '━'.repeat(80) + '\n';
    txt += (isSpanish ? ' ANÁLISIS DEL LEDGER' : ' LEDGER ANALYSIS') + '\n';
    txt += '━'.repeat(80) + '\n';
    txt += '\n';

    txt += this.formatLine(isSpanish ? 'Progreso de análisis:' : 'Analysis progress:', 
      data.metrics.ledgerProgress.toFixed(1) + '%', 50) + '\n';
    txt += this.formatLine(isSpanish ? 'Divisas detectadas:' : 'Detected currencies:', 
      data.metrics.activeCurrencies.toString(), 50) + '\n';
    txt += this.formatLine(isSpanish ? 'Transacciones procesadas:' : 'Processed transactions:', 
      fmtNum(data.metrics.totalTransactions), 50) + '\n';
    txt += '\n';

    // ═══════════════════════════════════════════════════════════════
    // PIE DE PÁGINA
    // ═══════════════════════════════════════════════════════════════
    txt += '═'.repeat(80) + '\n';
    txt += this.center(isSpanish ? 'CUMPLIMIENTO Y CERTIFICACIONES' : 'COMPLIANCE & CERTIFICATIONS', 80) + '\n';
    txt += '═'.repeat(80) + '\n';
    txt += '\n';
    
    txt += this.center('✓ ISO 27001 Certified', 80) + '\n';
    txt += this.center('✓ SOC 2 Type II Compliant', 80) + '\n';
    txt += this.center('✓ PCI DSS Level 1', 80) + '\n';
    txt += this.center('✓ Bank-Grade Encryption', 80) + '\n';
    txt += '\n';

    txt += '─'.repeat(80) + '\n';
    txt += this.center(isSpanish 
      ? 'Este documento es confidencial y está destinado únicamente al destinatario autorizado.'
      : 'This document is confidential and intended solely for the authorized recipient.', 80) + '\n';
    txt += this.center('Digital Commercial Bank Ltd © 2025', 80) + '\n';
    txt += '─'.repeat(80) + '\n';
    txt += '\n';
    
    txt += (isSpanish ? 'Generado el: ' : 'Generated on: ') + fmtDate(now) + '\n';
    txt += (isSpanish ? 'Formato: ' : 'Format: ') + 'TXT/Plain Text\n';
    txt += (isSpanish ? 'Idioma: ' : 'Language: ') + (isSpanish ? 'Español (ES)' : 'English (EN)') + '\n';
    txt += '\n';
    txt += '═'.repeat(80) + '\n';
    txt += this.center('FIN DEL ESTADO DE CUENTAS / END OF STATEMENT', 80) + '\n';
    txt += '═'.repeat(80) + '\n';

    return txt;
  }

  /**
   * Centra texto en una línea de ancho específico
   */
  private static center(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Formatea línea con label y valor alineados
   */
  private static formatLine(label: string, value: string, width: number): string {
    const dots = Math.max(2, width - label.length - value.length);
    return label + ' ' + '.'.repeat(dots) + ' ' + value;
  }

  /**
   * Descarga el statement como archivo TXT
   */
  static downloadStatement(data: StatementData, locale: string = 'en-US'): void {
    const isSpanish = locale === 'es-ES';
    const statement = this.generateStatement(data, locale);
    
    const blob = new Blob([statement], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = isSpanish 
      ? `Estado_de_Cuentas_DCB_${timestamp}.txt`
      : `Account_Statement_DCB_${timestamp}.txt`;
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log(`[StatementExporter] Estado de cuentas descargado: ${fileName}`);
  }
}

