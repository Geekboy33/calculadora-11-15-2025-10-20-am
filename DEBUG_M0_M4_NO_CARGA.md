# 🔍 DEBUG: M0-M4 NO SE CARGAN EN TABLA

## 🐛 PROBLEMA

Los totales M0, M1, M2, M3, M4 no aparecen en la tabla "Totales por Divisa" en Bank Audit.

---

## 🔬 PASOS DE DEBUGGING

### **Paso 1: Abre la Consola del Navegador**
```
F12 → Pestaña Console
```

### **Paso 2: Ve a "Auditoría Bancaria"**

### **Paso 3: Carga un Archivo Digital Commercial Bank Ltd**
```
Botón: "Cargar Archivo Digital Commercial Bank Ltd"
Selecciona: test_audit_extraction.txt
```

### **Paso 4: Busca en Consola**

Deberías ver estos logs:

```javascript
// 1. Verificar extracción de montos
[AuditBank] ✅ DATOS EXTRAÍDOS:
  - Montos: XX  ← ¿Este número es > 0?

// 2. Verificar clasificación
[AuditBank] 🔍 DEPURACIÓN: Clasificando XX montos...

// 3. Verificar distribución por divisa
[AuditBank] 📊 DISTRIBUCIÓN REAL DEL DINERO POR CATEGORÍA:

  💰 USD:
     Total: USD XXX
     M0 (<$10K): USD XXX (XX%)  ← ¿Aparece esto?
     M1 ($10K-$100K): USD XXX (XX%)
     M2 ($100K-$1M): USD XXX (XX%)
     M3 ($1M-$5M): USD XXX (XX%)
     M4 (>$5M): USD XXX (XX%)
```

---

## 🎯 DIAGNÓSTICO

### **Si ves "Montos: 0"**:
```
PROBLEMA: No se están extrayendo montos del archivo
SOLUCIÓN: El archivo no tiene montos en formato reconocible

Verifica que test_audit_extraction.txt existe y contiene:
USD 1,500,000.00
EUR 1,200,000.00
etc.
```

### **Si ves "Clasificando 0 montos"**:
```
PROBLEMA: extracted.amounts está vacío
SOLUCIÓN: La extracción no funcionó

En consola, ejecuta:
console.log(extracted.amounts);

Debe mostrar un array con objetos como:
[{value: 1500000, currency: 'USD', offset: 123}, ...]
```

### **Si NO ves los logs de "DISTRIBUCIÓN REAL"**:
```
PROBLEMA: El código no llegó a esa parte
SOLUCIÓN: Hubo un error antes

Busca mensajes de error en rojo en la consola
```

### **Si ves M0-M4 pero todos son 0 o '-' en la tabla**:
```
PROBLEMA: agregados.M0, M1, M2, M3, M4 están en 0
SOLUCIÓN: 

En consola, ejecuta:
console.log(results.agregados);

Debe mostrar algo como:
[
  {
    currency: 'USD',
    M0: 0,
    M1: 850000,  ← Debe tener valores > 0
    M2: 0,
    M3: 5000000,
    M4: 8000000,
    equiv_usd: 13850000
  },
  ...
]

Si todos los M0-M4 son 0, el problema está en la clasificación.
```

---

## 🔧 SOLUCIÓN RÁPIDA

### **Opción 1: Recarga Completa**
```javascript
// En consola del navegador (F12), ejecuta:
localStorage.clear();
location.reload();

// Luego:
1. Login nuevamente
2. Ve a "Auditoría Bancaria"
3. Carga test_audit_extraction.txt
4. Verifica logs en consola
```

### **Opción 2: Verifica el Archivo de Prueba**
```
El archivo test_audit_extraction.txt debe contener líneas como:

Balance: USD 850,000.00
Amount: EUR 1,200,000.00
Total: BRL 3,200,000.00
Balance: CHF 5,000,000.00
Amount: GBP 8,000,000.00

Si no tiene estas líneas, los montos no se detectarán.
```

### **Opción 3: Usa el Analizador del Sistema**
```
1. Ve a "Analizador de Archivos Grandes"
2. Carga un archivo Digital Commercial Bank Ltd
3. Déjalo procesar completamente (100%)
4. Ve a "Auditoría Bancaria"
5. Los datos deberían sincronizarse automáticamente
6. Si no, clic en "Analizar Balances del Sistema"
```

---

## 📊 CÓMO VERIFICAR QUE FUNCIONA

### **En la Consola deberías ver**:
```javascript
[AuditBank] 📊 DISTRIBUCIÓN REAL DEL DINERO POR CATEGORÍA:

  💰 USD:
     Total: USD 13,850,000
     M1 ($10K-$100K): USD 850,000 (6.1%)
     M3 ($1M-$5M): USD 5,000,000 (36.1%)
     M4 (>$5M): USD 8,000,000 (57.8%)

  💰 EUR:
     Total: EUR 1,200,000
     M1 ($10K-$100K): EUR 1,200,000 (100.0%)

... (para cada divisa)
```

### **En la Pantalla (Tabla) deberías ver**:
```
Divisa | Total      | M0 | M1      | M2 | M3        | M4        | USD Equiv
──────┼────────────┼────┼─────────┼────┼───────────┼───────────┼───────────
USD   | 13,850,000 | -  | 850,000 | -  | 5,000,000 | 8,000,000 | $13,850,000
EUR   | 1,200,000  | -  | 1,200,000| - | -         | -         | $1,260,000
BRL   | 3,200,000  | -  | 3,200,000| - | -         | -         | $608,000
...
```

**Los valores en color** (no '-') deben aparecer.

---

## 🚨 SI TODAVÍA NO FUNCIONA

### **Ejecuta esto en la consola del navegador**:

```javascript
// 1. Verificar que results existe
console.log('Results:', results);

// 2. Verificar agregados
console.log('Agregados:', results?.agregados);

// 3. Verificar primer agregado
console.log('Primer agregado:', results?.agregados?.[0]);

// 4. Ver todos los valores M0-M4
results?.agregados?.forEach(a => {
  console.log(`${a.currency}:`, {
    M0: a.M0,
    M1: a.M1,
    M2: a.M2,
    M3: a.M3,
    M4: a.M4,
    total: a.M0 + a.M1 + a.M2 + a.M3 + a.M4
  });
});
```

**Copia y pega la salida** para ver exactamente qué hay en los datos.

---

## ✅ VERIFICACIÓN DE CÓDIGO

El código está correcto:

```typescript
// Línea 926-938: Crea agregados con valores reales
const agregados = Array.from(currencyData.entries()).map(([currency, data]) => {
  return {
    currency,
    M0: data.M0,  // ✓ Correcto
    M1: data.M1,  // ✓ Correcto
    M2: data.M2,  // ✓ Correcto
    M3: data.M3,  // ✓ Correcto
    M4: data.M4,  // ✓ Correcto
    equiv_usd: equivUsd,
  };
});

// Línea 2224-2236: Muestra en tabla
{a.M0 > 0 ? a.M0.toLocaleString() : '-'}  // ✓ Correcto
{a.M1 > 0 ? a.M1.toLocaleString() : '-'}  // ✓ Correcto
... etc
```

El problema debe estar en los **datos de entrada**.

---

## 🎯 PRUEBA DEFINITIVA

### **Crea un archivo de prueba simple**:

Archivo: `test_simple.txt`
```
Account: 1234567890123456
Balance: USD 850000.00
Balance: EUR 1200000.00
Balance: BRL 3200000.00
Balance: CHF 5000000.00
Balance: GBP 8000000.00
```

**Carga este archivo** y verifica los logs en consola.

Deberías ver:
```
[AuditBank] ✅ DATOS EXTRAÍDOS:
  - Montos: 5

[AuditBank] 📊 DISTRIBUCIÓN REAL:
  💰 USD:
     M1: USD 850,000
  💰 CHF:
     M3: CHF 5,000,000
  💰 GBP:
     M4: GBP 8,000,000
```

Y en la tabla deberían aparecer los valores.

---

## 📝 REPORTE DE BUG

Si después de todo esto sigue sin funcionar, proporciona:

1. **Captura de consola** completa después de cargar archivo
2. **Resultado de** `console.log(results.agregados)` en consola
3. **Captura de pantalla** de la tabla vacía
4. **Archivo que usaste** para la prueba

---

**Servidor**: http://localhost:5174 ✅ CORRIENDO (Puerto 5174)  
**Código**: ✅ VERIFICADO  
**Próximo paso**: 🔍 DEBUG CON CONSOLA  

🚀 **Abre la consola (F12) y busca los logs para identificar dónde falla** 🚀

