/**
 * Export Manager - Exportación Avanzada
 * Soporte para múltiples formatos: JSON, CSV, Excel-like
 */

import { balanceStore } from './balances-store';
import { custodyStore } from './custody-store';
import { analyticsStore } from './analytics-store';
import { notificationsStore } from './notifications-store';

export type ExportFormat = 'json' | 'csv' | 'html' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeTimestamp?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  currencies?: string[];
  template?: 'standard' | 'detailed' | 'summary';
}

class ExportManager {
  /**
   * Export balances
   */
  async exportBalances(options: ExportOptions): Promise<void> {
    try {
      const balances = balanceStore.getBalances();

      // Filter by currencies if specified
      let filteredBalances = balances;
      if (options.currencies && options.currencies.length > 0) {
        filteredBalances = balances.filter(b => options.currencies!.includes(b.currency));
      }

      const data = {
        type: 'balances',
        exportedAt: new Date().toISOString(),
        recordCount: filteredBalances.length,
        data: filteredBalances
      };

      this.download(data, options, 'balances-export');

      notificationsStore.success(
        'Exportación completada',
        `${filteredBalances.length} registros exportados`,
        { priority: 'medium' }
      );
    } catch (error) {
      console.error('[ExportManager] Error exporting balances:', error);
      notificationsStore.error('Error en exportación', 'No se pudo exportar los datos');
    }
  }

  /**
   * Export custody accounts
   */
  async exportCustody(options: ExportOptions): Promise<void> {
    try {
      const accounts = custodyStore.getAccounts();

      const data = {
        type: 'custody',
        exportedAt: new Date().toISOString(),
        recordCount: accounts.length,
        data: accounts.map(acc => ({
          id: acc.id,
          accountName: acc.accountName,
          accountType: acc.accountType,
          currency: acc.currency,
          totalBalance: acc.totalBalance,
          availableBalance: acc.availableBalance,
          reservedBalance: acc.reservedBalance,
          bankName: acc.bankName,
          iban: acc.iban,
          swiftCode: acc.swiftCode,
          apiId: acc.apiId,
          createdAt: acc.createdAt
        }))
      };

      this.download(data, options, 'custody-export');

      notificationsStore.success(
        'Exportación completada',
        `${accounts.length} cuentas exportadas`
      );
    } catch (error) {
      console.error('[ExportManager] Error exporting custody:', error);
      notificationsStore.error('Error en exportación', 'No se pudo exportar las cuentas');
    }
  }

  /**
   * Export analytics report
   */
  async exportAnalytics(options: ExportOptions): Promise<void> {
    try {
      const analytics = await analyticsStore.getAnalytics();

      const data = {
        type: 'analytics',
        exportedAt: new Date().toISOString(),
        period: 'current',
        data: {
          kpis: analytics.kpis,
          charts: analytics.charts,
          comparisons: analytics.comparisons
        }
      };

      this.download(data, options, 'analytics-report');

      notificationsStore.success(
        'Reporte exportado',
        'Reporte de analytics exportado exitosamente'
      );
    } catch (error) {
      console.error('[ExportManager] Error exporting analytics:', error);
      notificationsStore.error('Error en exportación', 'No se pudo exportar el reporte');
    }
  }

  /**
   * Export complete system snapshot
   */
  async exportFullSnapshot(options: ExportOptions): Promise<void> {
    try {
      const balances = balanceStore.loadBalances();
      const custody = custodyStore.getAccounts();
      const analytics = await analyticsStore.getAnalytics();

      const data = {
        type: 'full_snapshot',
        exportedAt: new Date().toISOString(),
        version: '1.0',
        system: {
          balances: balances,
          custody: custody,
          analytics: analytics,
          metadata: {
            totalCurrencies: balances?.balances.length || 0,
            totalCustodyAccounts: custody.length,
            lastUpdate: new Date().toISOString()
          }
        }
      };

      this.download(data, options, 'system-snapshot');

      notificationsStore.success(
        'Snapshot exportado',
        'Snapshot completo del sistema exportado',
        { priority: 'high' }
      );
    } catch (error) {
      console.error('[ExportManager] Error exporting snapshot:', error);
      notificationsStore.error('Error en exportación', 'No se pudo exportar el snapshot');
    }
  }

  /**
   * Download file with specified format
   */
  private download(data: any, options: ExportOptions, basename: string): void {
    let content: string;
    let mimeType: string;
    let extension: string;

    switch (options.format) {
      case 'json':
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
        break;

      case 'csv':
        content = this.convertToCSV(data);
        mimeType = 'text/csv';
        extension = 'csv';
        break;

      case 'html':
        content = this.convertToHTML(data);
        mimeType = 'text/html';
        extension = 'html';
        break;

      case 'txt':
        content = this.convertToText(data);
        mimeType = 'text/plain';
        extension = 'txt';
        break;

      default:
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${basename}-${new Date().toISOString().split('T')[0]}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Convert to CSV format
   */
  private convertToCSV(data: any): string {
    if (!data.data || !Array.isArray(data.data)) {
      return 'No data available';
    }

    const items = data.data;
    if (items.length === 0) return 'No data';

    // Get headers from first item
    const headers = Object.keys(items[0]);

    // Create CSV
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add rows
    for (const item of items) {
      const values = headers.map(header => {
        const value = item[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Convert to HTML format
   */
  private convertToHTML(data: any): string {
    let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.type} Export</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #0a0a0a; color: #e0ffe0; }
    h1 { color: #00ff88; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #1a1a1a; }
    th { background: #1a1a1a; color: #00ff88; font-weight: bold; }
    tr:hover { background: #0d0d0d; }
    .metadata { color: #4d7c4d; font-size: 14px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>${data.type.toUpperCase()} Export</h1>
  <div class="metadata">
    <p>Exportado: ${data.exportedAt}</p>
    <p>Registros: ${data.recordCount || data.data?.length || 0}</p>
  </div>
`;

    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      const headers = Object.keys(data.data[0]);

      html += '<table><thead><tr>';
      headers.forEach(header => {
        html += `<th>${header}</th>`;
      });
      html += '</tr></thead><tbody>';

      data.data.forEach((item: any) => {
        html += '<tr>';
        headers.forEach(header => {
          html += `<td>${item[header]}</td>`;
        });
        html += '</tr>';
      });

      html += '</tbody></table>';
    } else {
      html += '<p>No hay datos para mostrar</p>';
    }

    html += '</body></html>';

    return html;
  }

  /**
   * Convert to plain text format
   */
  private convertToText(data: any): string {
    let text = `${data.type.toUpperCase()} EXPORT\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Exportado: ${data.exportedAt}\n`;
    text += `Registros: ${data.recordCount || data.data?.length || 0}\n\n`;

    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((item: any, index: number) => {
        text += `\nRegistro ${index + 1}:\n`;
        text += `${'-'.repeat(30)}\n`;

        Object.entries(item).forEach(([key, value]) => {
          text += `${key}: ${value}\n`;
        });
      });
    } else {
      text += '\nNo hay datos disponibles\n';
    }

    return text;
  }

  /**
   * Get export format options
   */
  getFormatOptions(): { value: ExportFormat; label: string }[] {
    return [
      { value: 'json', label: 'JSON' },
      { value: 'csv', label: 'CSV (Excel)' },
      { value: 'html', label: 'HTML' },
      { value: 'txt', label: 'Text' }
    ];
  }
}

// Export singleton instance
export const exportManager = new ExportManager();
