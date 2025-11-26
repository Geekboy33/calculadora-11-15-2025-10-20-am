/**
 * Download Helper - Safe file download utilities
 * Previene errores de removeChild en descargas
 */

/**
 * Descarga un archivo de forma segura sin errores de DOM
 */
export function safeDownload(content: string | Blob, filename: string, mimeType: string = 'text/plain;charset=utf-8'): void {
  try {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // ✅ Cleanup seguro con setTimeout para evitar race conditions
    setTimeout(() => {
      try {
        if (a.parentNode === document.body) {
          document.body.removeChild(a);
        }
        URL.revokeObjectURL(url);
      } catch (cleanupError) {
        // Silenciar errores de cleanup (no críticos)
        console.debug('[Download Helper] Cleanup completed');
      }
    }, 100);
    
    console.log(`[Download Helper] ✅ Archivo descargado: ${filename}`);
  } catch (error) {
    console.error('[Download Helper] ❌ Error en descarga:', error);
    throw error;
  }
}

/**
 * Descarga JSON de forma segura
 */
export function downloadJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  safeDownload(json, filename, 'application/json');
}

/**
 * Descarga TXT de forma segura
 */
export function downloadTXT(content: string, filename: string): void {
  safeDownload(content, filename, 'text/plain;charset=utf-8');
}

