# ⚡ PLAN DE OPTIMIZACIÓN DE CARGA RÁPIDA

## 🔴 PROBLEMA ACTUAL:

1. **Carga Lenta al Recargar:**
   - Usuario carga archivo al 30%
   - Cierra y vuelve
   - Carga el archivo de nuevo
   - Sistema reprocesa DESDE EL BYTE 30% ❌
   - Tarda mucho en mostrar los balances ❌

2. **Se Detiene al Cambiar de Módulo:**
   - Usuario está procesando
   - Cambia a otro módulo
   - Procesamiento se detiene ❌
   - Al volver, tiene que recargar ❌

3. **Se Detiene al Refrescar:**
   - Usuario presiona F5
   - Procesamiento se detiene ❌
   - Tiene que recargar archivo ❌

## ✅ SOLUCIÓN OPTIMIZADA:

### 1. CARGA INSTANTÁNEA DE BALANCES:
```
Usuario carga archivo
↓
Sistema detecta progreso guardado (30%)
↓
✅ MUESTRA BALANCES INMEDIATAMENTE (sin reprocessar)
↓
Balances aparecen en pantalla (0.5 segundos)
↓
Procesamiento continúa DESDE byte 30%
↓
Actualiza balances en tiempo real
```

### 2. PROCESAMIENTO PERSISTENTE:
- Al cambiar de módulo → Sigue procesando en background
- Al refrescar página → Auto-reanuda en 3 segundos
- Al volver al módulo → Reconecta y muestra progreso
- Solo se detiene con botón "Stop"

### 3. INDICADOR GLOBAL:
- FloatingIndicator muestra progreso
- Visible en TODOS los módulos
- Click para volver al analizador
- Muestra % y divisas en tiempo real

## 🚀 IMPLEMENTACIÓN:

1. Modificar handleFileSelect
2. Separar "mostrar balances" de "continuar procesamiento"
3. Procesamiento no se detiene al desmontar
4. Auto-resume al montar si hay proceso activo
5. GlobalProcessingIndicator siempre visible

