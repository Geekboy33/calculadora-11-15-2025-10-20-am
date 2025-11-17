# 🔧 Solución: LocalStorage Quota Exceeded

## Error

```
Error creating pledge: Failed to execute 'setItem' on 'Storage': 
Setting the value of 'unified_pledges' exceeded the quota.
```

## Causa

LocalStorage tiene un límite de ~5-10MB por dominio. Con muchos pledges, PoR reports, eventos, etc., se llena.

## ✅ Solución Inmediata (Usuario)

### Opción 1: Limpiar desde Navegador

```
1. Presiona F12 (DevTools)
2. Ve a "Application" o "Almacenamiento"
3. Expande "Local Storage"
4. Click derecho → "Clear"
5. Recarga la página (F5)
6. ✅ Intenta crear el pledge de nuevo
```

### Opción 2: Desde Consola

```javascript
// En Console (F12):

// Ver tamaño usado
let total = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    total += localStorage[key].length;
  }
}
console.log('Tamaño:', (total / 1024 / 1024).toFixed(2), 'MB');

// Limpiar eventos antiguos
const events = JSON.parse(localStorage.getItem('daes_transactions_events') || '[]');
localStorage.setItem('daes_transactions_events', JSON.stringify(events.slice(0, 100)));

// Limpiar PoR antiguos
const pors = JSON.parse(localStorage.getItem('vusd_por_reports') || '[]');
localStorage.setItem('vusd_por_reports', JSON.stringify(pors.slice(0, 10)));

// Recargar
location.reload();
```

### Opción 3: URL de Limpieza

```
http://localhost:4000/clear-cache.html

Click "Limpiar Todo y Reiniciar"
```

## 🔧 Solución Técnica (Ya Implementada)

### StorageManager

El archivo `src/lib/storage-manager.ts` ahora:

✅ Detecta cuando localStorage está lleno
✅ Limpia automáticamente datos antiguos
✅ Mantiene solo últimos 1000 eventos
✅ Mantiene solo últimos 50 PoR reports
✅ Elimina API keys revocadas
✅ Preserva datos críticos

### Uso

```typescript
import { StorageManager } from '../lib/storage-manager';

// Antes de guardar
const success = StorageManager.safeSetItem('key', JSON.stringify(data));

if (!success) {
  // Mostrar alerta y limpiar
  if (StorageManager.showQuotaExceededAlert('es')) {
    // Reintentar después de limpieza
  }
}
```

## 📊 Monitorear Uso

```typescript
import { StorageManager } from '../lib/storage-manager';

const stats = StorageManager.getStats();
console.log('Tamaño:', stats.totalSizeMB, 'MB');
console.log('Uso:', stats.percentUsed, '%');
console.log('Items:', stats.itemsCount);

if (stats.nearLimit) {
  console.warn('⚠️ Cerca del límite!');
  StorageManager.cleanOldData();
}
```

## 🔄 Integración Necesaria

### En cada módulo que guarde pledges:

```typescript
import { StorageManager } from '../lib/storage-manager';

// Al crear pledge
try {
  const pledges = [...existingPledges, newPledge];
  const success = StorageManager.safeSetItem(
    'unified_pledges',
    JSON.stringify(pledges)
  );
  
  if (!success) {
    StorageManager.showQuotaExceededAlert(language);
    return;
  }
  
  // Continuar...
} catch (err) {
  console.error('Error:', err);
}
```

## ⚡ Solución Rápida para Usuario

**Si ves este error:**

1. Abre http://localhost:4000/clear-cache.html
2. Click "Limpiar Todo y Reiniciar"
3. Login de nuevo
4. ✅ Crea el pledge sin error

**O simplemente:**

1. Presiona Ctrl + Shift + Delete
2. Marca "Cached images and files"
3. Click "Clear data"
4. Recarga (F5)
5. ✅ Listo

