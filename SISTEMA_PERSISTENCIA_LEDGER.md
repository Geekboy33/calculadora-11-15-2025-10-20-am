# 🔐 Sistema de Persistencia del Ledger - DAES CoreBanking

## 📋 Descripción

Sistema completo de persistencia y recuperación inteligente para el archivo **Ledger1 Digital Commercial Bank DAES**. Garantiza que los datos de cuentas, balances y progreso de carga nunca se pierdan, incluso si:

- ❌ Se pierde la conexión a internet
- ❌ Se cierra la sesión del navegador
- ❌ Se recarga la página
- ❌ El proceso de carga se interrumpe

---

## 🎯 Características Principales

### ✅ 1. Persistencia Automática

- **localStorage**: Estado guardado cada 10 segundos durante procesamiento
- **Progreso**: Se guarda cada 5% de avance
- **Balances**: Actualizados en tiempo real
- **Recuperación**: Automática desde el último punto guardado

### ✅ 2. Recuperación Inteligente

```
┌─────────────────────────────────────────────┐
│  Usuario carga archivo hasta 50%           │
│  → Se pierde conexión                       │
│  → Cierra navegador                         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│  Usuario regresa                            │
│  → Sistema detecta carga parcial (50%)      │
│  → Ofrece continuar desde 50%               │
│  → NO inicia desde 0                        │
└─────────────────────────────────────────────┘
```

### ✅ 3. Indicador Global

**Componente**: `LedgerStatusIndicator`

Muestra en TODOS los módulos:
- ✅ Estado del archivo (Cargado/No Cargado)
- ✅ Progreso de procesamiento en tiempo real
- ✅ Cantidad de balances cargados
- ✅ Botón para refrescar/cargar archivo
- ✅ Disponibilidad de recuperación

### ✅ 4. Protección de Datos

- **Account Ledger**: Balances persistidos
- **Black Screen**: Cuentas persistidas
- **Custody Accounts**: Cuentas persistidas
- **API VUSD/DAES**: Pledges persistidos
- **Todas las transferencias**: Guardadas

---

## 📂 Estructura del Sistema

### Archivos Creados

```
src/
├── lib/
│   └── ledger-persistence-store.ts    # Store centralizado
└── components/
    └── LedgerStatusIndicator.tsx      # Indicador global
```

### Store: `ledger-persistence-store.ts`

#### Métodos Principales:

```typescript
// Gestión de Archivo
setFileState(fileName, fileSize, lastModified)
getFileState()
isFileLoaded()
clearFileState()

// Gestión de Progreso
updateProgress(bytesProcessed, totalBytes, chunkIndex)
getProgress()
pauseProcessing()
resumeProcessing()

// Gestión de Balances
addBalance(currency, balance, account?)
updateBalances(balances[])
getBalances()
getBalanceByCurrency(currency)

// Recuperación
needsRecovery()
getRecoveryInfo()

// Estado
getStatus()
requiresRefresh()
subscribe(listener)
```

---

## 🔧 Integración en Módulos

### 1. Large File Analyzer (Carga del Archivo)

```typescript
import { ledgerPersistenceStore } from '../lib/ledger-persistence-store';

// Al iniciar carga
ledgerPersistenceStore.setFileState(file.name, file.size, file.lastModified);

// Durante procesamiento
ledgerPersistenceStore.updateProgress(bytesProcessed, totalBytes, chunkIndex);

// Al extraer balances
ledgerPersistenceStore.addBalance('USD', 1000000, 'ACC123');

// Verificar recuperación
if (ledgerPersistenceStore.needsRecovery()) {
  const info = ledgerPersistenceStore.getRecoveryInfo();
  // Continuar desde info.lastChunkIndex
}
```

### 2. Account Ledger

```typescript
import { ledgerPersistenceStore } from '../lib/ledger-persistence-store';

// Verificar si Ledger está cargado
if (!ledgerPersistenceStore.isFileLoaded()) {
  // Mostrar warning
  return <LedgerStatusIndicator onLoadFile={handleLoadFile} />;
}

// Obtener balances
const balances = ledgerPersistenceStore.getBalances();
```

### 3. API Modules (VUSD, DAES, etc.)

```typescript
import { ledgerPersistenceStore } from '../lib/ledger-persistence-store';

// Antes de crear pledges/transferencias
const status = ledgerPersistenceStore.getStatus();
if (!status.isComplete) {
  alert('⚠️ Ledger no está completamente cargado');
  return;
}

// Obtener balance específico
const usdBalance = ledgerPersistenceStore.getBalanceByCurrency('USD');
```

### 4. Cualquier Módulo (Header/Sidebar)

```tsx
import { LedgerStatusIndicator } from './components/LedgerStatusIndicator';

function ModuleHeader() {
  return (
    <div className="flex items-center gap-4">
      <h1>Mi Módulo</h1>
      <LedgerStatusIndicator 
        onLoadFile={() => navigateToLargeFileAnalyzer()} 
      />
    </div>
  );
}
```

---

## 🎨 Indicador Visual

### Estados del Indicador:

| Estado | Color | Icono | Descripción |
|--------|-------|-------|-------------|
| **No Cargado** | 🔴 Rojo | ⚠️ | Archivo no cargado |
| **Procesando** | 🟡 Amarillo | 🔄 | Cargando archivo (X%) |
| **Parcial** | 🟠 Naranja | 💾 | Carga interrumpida, recuperable |
| **Completo** | 🟢 Verde | ✅ | Archivo completamente procesado |

### Ejemplo Visual:

```
┌─────────────────────────────────────────────┐
│  🔄 Procesando: 67.3%  [245 balances]  [⚡] │
└─────────────────────────────────────────────┘
    ↓ Click para expandir
┌─────────────────────────────────────────────┐
│  💾 Estado del Ledger                       │
│  ────────────────────────────────────────── │
│  📄 Archivo: Ledger1_DAES.bin              │
│  📊 Progreso: [████████░░] 67.3%           │
│  💰 Balances Cargados: 245                  │
│  🕐 Última actualización: 16/11/2025 18:45  │
│  ────────────────────────────────────────── │
│  [🔄 Refrescar Ledger]                     │
└─────────────────────────────────────────────┘
```

---

## 🔄 Flujo de Recuperación

### Escenario 1: Carga Interrumpida

```
1. Usuario carga archivo Ledger1 (800 GB)
2. Progreso llega a 45% (360 GB procesados)
3. ❌ Se pierde internet / se cierra navegador
4. Sistema guarda automáticamente:
   - Progreso: 45%
   - Último chunk: 3600
   - Balances: 1,250 cuentas
5. Usuario regresa
6. ✅ Sistema detecta carga parcial
7. Ofrece: "Continuar desde 45%"
8. Usuario acepta
9. ▶️ Continúa desde chunk 3600
10. ✅ Completa hasta 100%
```

### Escenario 2: Módulo sin Ledger

```
1. Usuario navega a "Account Ledger"
2. ❌ Ledger no está cargado
3. Módulo muestra:
   ┌─────────────────────────────────────┐
   │  ⚠️ Ledger No Cargado               │
   │  Carga el archivo para continuar    │
   │  [📤 Cargar Archivo Ledger]         │
   └─────────────────────────────────────┘
4. Usuario hace click
5. → Redirige a Large File Analyzer
6. ✅ Usuario carga archivo
7. ✅ Regresa al módulo anterior
8. ✅ Datos disponibles
```

---

## 💾 Datos Persistidos

### LocalStorage Keys:

```typescript
'daes_ledger_state'         // Estado principal del Ledger
'daes_ledger_file_cache'    // Cache del archivo (opcional)
'custody_accounts'          // Custody Accounts persistidos
'unified_pledges'           // Pledges unificados
'vusd_por_reports'          // Proof of Reserves
'por_api_keys'              // API Keys generadas
```

### Estructura del Estado:

```json
{
  "fileState": {
    "fileName": "Ledger1_Digital_Commercial_Bank_DAES.bin",
    "fileSize": 858993459200,
    "lastModified": 1692835200000,
    "uploadTimestamp": 1731787200000
  },
  "progress": {
    "bytesProcessed": 386847056640,
    "totalBytes": 858993459200,
    "percentage": 45.0,
    "lastChunkIndex": 3600,
    "isComplete": false
  },
  "balances": [
    { "currency": "USD", "balance": 5000000, "account": "ACC001", "lastUpdate": 1731787200000 },
    { "currency": "EUR", "balance": 3200000, "account": "ACC002", "lastUpdate": 1731787200000 }
  ],
  "isLoaded": true,
  "isProcessing": false,
  "lastSyncTimestamp": 1731787200000
}
```

---

## 🚀 Ventajas del Sistema

### ✅ Para el Usuario:

1. **Nunca pierde progreso**: Recuperación desde último punto
2. **Visibilidad total**: Indicador en todos los módulos
3. **Control completo**: Puede pausar/reanudar cuando quiera
4. **Seguridad**: Datos siempre protegidos

### ✅ Para el Sistema:

1. **Consistencia**: Todos los módulos ven el mismo estado
2. **Rendimiento**: Solo se carga una vez
3. **Memoria**: Optimizado con auto-guardado
4. **Escalabilidad**: Fácil agregar nuevos módulos

---

## 📊 Métricas de Persistencia

```
Auto-guardado:     Cada 10 segundos (durante procesamiento)
Guardado progreso: Cada 5% de avance
Guardado balances: Cada nueva actualización
Retención:         Indefinida (hasta clear manual)
Tamaño máximo:     ~10 MB (localStorage limit)
```

---

## 🔐 Seguridad

- ✅ Datos encriptados en memoria
- ✅ No se guarda el archivo completo (solo metadata)
- ✅ Validación de integridad
- ✅ Limpieza automática de datos antiguos
- ✅ Reset completo disponible

---

## 🎯 Próximos Pasos

1. ✅ Integrar en Large File Analyzer
2. ✅ Agregar indicador en todos los módulos
3. ✅ Implementar recuperación automática
4. ✅ Sincronizar con Account Ledger
5. ✅ Validar en todos los API modules

---

## 📚 Documentación Relacionada

- `PoR_API_SETUP.md` - Configuración API de Proof of Reserves
- `SISTEMA_CARGA_PERSISTENTE.md` - Sistema de carga anterior
- `USAR_ANALIZADOR_PARA_DATOS_REALES.md` - Uso del analizador

---

## 🆘 Troubleshooting

### Problema: "Ledger no se recupera después de cerrar"

**Solución:**
```typescript
// Verificar localStorage
console.log(localStorage.getItem('daes_ledger_state'));

// Forzar reload
ledgerPersistenceStore.reset();
```

### Problema: "Balances no aparecen en módulos"

**Solución:**
```typescript
// Verificar estado
const status = ledgerPersistenceStore.getStatus();
console.log(status);

// Forzar refresh
ledgerPersistenceStore.loadFromStorage();
```

---

## 🎉 ¡Sistema de Persistencia Completo!

**El archivo Ledger1 ahora es:**
- ✅ **Indestructible**: No se pierde nunca
- ✅ **Recuperable**: Continúa desde donde se quedó
- ✅ **Global**: Visible en todos los módulos
- ✅ **Confiable**: Auto-guardado constante

**¡Carga una vez, usa siempre!** 🚀

