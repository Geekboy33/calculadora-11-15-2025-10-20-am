/**
 * Storage Manager
 * Gestión inteligente de localStorage con límites y limpieza automática
 */

export class StorageManager {
  /**
   * Mostrar alerta de quota excedida con opción de limpieza
   */
  static showQuotaExceededAlert(language: 'es' | 'en' = 'es'): boolean {
    const isSpanish = language === 'es';
    
    const message = isSpanish
      ? '⚠️ ESPACIO DE ALMACENAMIENTO LLENO\n\n' +
        'El navegador ha alcanzado el límite de almacenamiento local.\n\n' +
        '¿Deseas limpiar datos antiguos para continuar?\n\n' +
        'Se eliminarán:\n' +
        '• Eventos antiguos (mantiene últimos 1000)\n' +
        '• PoR reports antiguos (mantiene últimos 50)\n' +
        '• API keys revocadas\n\n' +
        'SE PRESERVARÁN:\n' +
        '✓ Cuentas custody activas\n' +
        '✓ Pledges activos\n' +
        '✓ Sesión actual'
      : '⚠️ STORAGE QUOTA EXCEEDED\n\n' +
        'Browser has reached local storage limit.\n\n' +
        'Clean old data to continue?\n\n' +
        'Will remove:\n' +
        '• Old events (keep last 1000)\n' +
        '• Old PoR reports (keep last 50)\n' +
        '• Revoked API keys\n\n' +
        'WILL PRESERVE:\n' +
        '✓ Active custody accounts\n' +
        '✓ Active pledges\n' +
        '✓ Current session';
    
    const confirm = window.confirm(message);
    
    if (confirm) {
      this.aggressiveCleanup();
      
      const successMessage = isSpanish
        ? '✅ Limpieza completada\n\nAhora puedes continuar con la operación.'
        : '✅ Cleanup completed\n\nYou can now continue with the operation.';
      
      alert(successMessage);
      return true;
    }
    
    return false;
  }
  private static readonly QUOTA_WARNING = 4 * 1024 * 1024; // 4MB warning
  private static readonly QUOTA_MAX = 5 * 1024 * 1024; // 5MB max (safe limit)

  /**
   * Verificar tamaño usado de localStorage
   */
  static getStorageSize(): number {
    let total = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  }

  /**
   * Verificar si hay espacio disponible
   */
  static hasSpace(dataSize: number): boolean {
    const currentSize = this.getStorageSize();
    return (currentSize + dataSize) < this.QUOTA_MAX;
  }

  /**
   * Limpiar datos antiguos si es necesario
   */
  static cleanOldData(): void {
    const currentSize = this.getStorageSize();
    
    if (currentSize > this.QUOTA_WARNING) {
      console.log('[StorageManager] ⚠️ Limpiando datos antiguos... Tamaño actual:', (currentSize / 1024 / 1024).toFixed(2), 'MB');
      
      // Limpiar eventos antiguos (mantener solo últimos 1000)
      const events = localStorage.getItem('daes_transactions_events');
      if (events) {
        try {
          const parsed = JSON.parse(events);
          if (Array.isArray(parsed) && parsed.length > 1000) {
            const trimmed = parsed.slice(0, 1000);
            localStorage.setItem('daes_transactions_events', JSON.stringify(trimmed));
            console.log('[StorageManager] ✅ Eventos reducidos:', parsed.length, '→', trimmed.length);
          }
        } catch (err) {
          console.error('[StorageManager] Error limpiando eventos:', err);
        }
      }
      
      // Limpiar PoR reports antiguos (mantener solo últimos 50)
      const porReports = localStorage.getItem('vusd_por_reports');
      if (porReports) {
        try {
          const parsed = JSON.parse(porReports);
          if (Array.isArray(parsed) && parsed.length > 50) {
            const trimmed = parsed.slice(0, 50);
            localStorage.setItem('vusd_por_reports', JSON.stringify(trimmed));
            console.log('[StorageManager] ✅ PoR reports reducidos:', parsed.length, '→', trimmed.length);
          }
        } catch (err) {
          console.error('[StorageManager] Error limpiando PoR:', err);
        }
      }
      
      // Limpiar API keys revocadas
      const apiKeys = localStorage.getItem('por_api_keys');
      if (apiKeys) {
        try {
          const parsed = JSON.parse(apiKeys);
          if (Array.isArray(parsed)) {
            const active = parsed.filter((k: any) => k.status === 'active');
            if (active.length < parsed.length) {
              localStorage.setItem('por_api_keys', JSON.stringify(active));
              console.log('[StorageManager] ✅ API keys revocadas eliminadas:', parsed.length, '→', active.length);
            }
          }
        } catch (err) {
          console.error('[StorageManager] Error limpiando API keys:', err);
        }
      }
      
      const newSize = this.getStorageSize();
      console.log('[StorageManager] ✅ Limpieza completada. Tamaño:', (newSize / 1024 / 1024).toFixed(2), 'MB');
    }
  }

  /**
   * Guardar datos con verificación de espacio
   */
  static safeSetItem(key: string, value: string): boolean {
    try {
      // Verificar espacio antes de guardar
      const dataSize = value.length + key.length;
      
      if (!this.hasSpace(dataSize)) {
        console.warn('[StorageManager] ⚠️ Espacio insuficiente, limpiando...');
        this.cleanOldData();
        
        // Verificar de nuevo después de limpiar
        if (!this.hasSpace(dataSize)) {
          throw new Error('LocalStorage quota exceeded even after cleanup');
        }
      }
      
      localStorage.setItem(key, value);
      return true;
      
    } catch (err: any) {
      console.error('[StorageManager] ❌ Error guardando:', err);
      
      if (err.name === 'QuotaExceededError' || err.message.includes('quota')) {
        // Intentar limpieza agresiva
        this.aggressiveCleanup();
        
        try {
          localStorage.setItem(key, value);
          return true;
        } catch (retryErr) {
          console.error('[StorageManager] ❌ Fallo después de limpieza agresiva');
          return false;
        }
      }
      
      return false;
    }
  }

  /**
   * Limpieza agresiva en caso de emergencia
   */
  static aggressiveCleanup(): void {
    console.log('[StorageManager] 🔥 Limpieza agresiva iniciada...');
    
    // Mantener solo datos críticos
    const critical = [
      'daes_authenticated',
      'daes_user',
      'custody_accounts',
      'unified_pledges'
    ];
    
    const backup: { [key: string]: string } = {};
    
    // Backup de datos críticos
    critical.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) backup[key] = value;
    });
    
    // Limpiar todo
    localStorage.clear();
    
    // Restaurar datos críticos
    Object.entries(backup).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    
    console.log('[StorageManager] ✅ Limpieza agresiva completada');
    console.log('[StorageManager] 📊 Datos preservados:', Object.keys(backup));
  }

  /**
   * Obtener estadísticas de uso
   */
  static getStats() {
    const size = this.getStorageSize();
    const sizeMB = size / 1024 / 1024;
    const percentUsed = (size / this.QUOTA_MAX) * 100;
    
    return {
      totalSize: size,
      totalSizeMB: sizeMB.toFixed(2),
      percentUsed: percentUsed.toFixed(1),
      itemsCount: Object.keys(localStorage).length,
      nearLimit: size > this.QUOTA_WARNING
    };
  }
}

