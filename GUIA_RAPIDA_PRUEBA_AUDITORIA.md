# 🚀 GUÍA RÁPIDA - PRUEBA EL MÓDULO DE AUDITORÍA AHORA

## ⚡ PRUEBA EN 3 MINUTOS

### **Paso 1: Abre la Aplicación** (30 segundos)
```
1. El servidor YA ESTÁ corriendo en: http://localhost:5173
2. Abre el navegador en esa URL
3. Login: admin / admin
4. Abre la consola del navegador (F12 → Console)
```

### **Paso 2: Navega al Módulo** (10 segundos)
```
1. Clic en el tab "Auditoría Bancaria" (icono de lupa 🔍)
2. Verás el panel principal vacío
```

### **Paso 3: Carga el Archivo de Prueba** (10 segundos)
```
1. Clic en botón verde "Cargar Archivo Digital Commercial Bank Ltd"
2. Selecciona el archivo: test_audit_extraction.txt
3. Ver progreso en pantalla
```

### **Paso 4: Ver Resultados** (2 minutos)
```
✅ En la CONSOLA verás:
============================================
INICIANDO EXTRACCIÓN PROFUNDA DE DATOS
Archivo: test_audit_extraction.txt | X.XX KB
============================================
✅ EXTRACCIÓN COMPLETADA:
- Cuentas bancarias: 15
- Códigos IBAN: 8
- Códigos SWIFT: 6
- Bancos detectados: 6
- Montos encontrados: 15+
- Entropía del archivo: ~5.5
- Archivo encriptado: ✓ NO
============================================

✅ En la PANTALLA verás:

📋 DATOS BANCARIOS DETECTADOS EN EL ARCHIVO

┌────────────────────────────────────────────┐
│ 💳 Cuentas Bancarias: 15                   │
│ ******3456, ******4444, ******8888 +12 más │
│                                             │
│ 🌍 Códigos IBAN: 8                         │
│ GB82****5432, BR12****2345 +6 más          │
│                                             │
│ 📡 Códigos SWIFT/BIC: 6                    │
│ EBILAEAD, BRASBRRJ, UBSWCHZH +3 más        │
│                                             │
│ 🏦 Bancos Detectados: 6                    │
│ • EMIRATES NBD                              │
│ • BANCO DO BRASIL                           │
│ • UBS                                       │
│ • BARCLAYS                                  │
│ • HSBC                                      │
│ • JPMORGAN                                  │
└────────────────────────────────────────────┘

📊 Metadatos del Archivo
Tamaño: ~3 KB | Bloques: 15+ | Entropía: ~5.5
Encriptación: ✓ No detectada
```

---

## ✅ LO QUE DEBERÍAS VER

### **En la Consola (F12)**:
- ✅ Líneas separadoras `============================================`
- ✅ "INICIANDO EXTRACCIÓN PROFUNDA DE DATOS"
- ✅ Contadores de cada tipo de dato
- ✅ "✅ EXTRACCIÓN COMPLETADA"
- ✅ Divisas detectadas listadas

### **En la Pantalla**:

#### **Panel 1: Estadísticas (Superior Derecha)**
```
Total de Hallazgos: 15
Bancos Detectados: 6
Cuentas Encontradas: 15
```

#### **Panel 2: Datos Bancarios (Nuevo)**
```
4 cuadrantes:
- 💳 Cuentas: 15 (lista con ******1234)
- 🌍 IBAN: 8 (lista con GB82****5432)
- 📡 SWIFT: 6 (lista completa)
- 🏦 Bancos: 6 (nombres completos)

Metadatos:
- Tamaño | Bloques | Entropía | Encriptación
```

#### **Panel 3: Clasificación M0-M4**
```
M0 | M1 | M2 | M3 | M4
Con montos y colores
```

#### **Panel 4: Totales Agregados**
```
Tabla con:
Divisa | M0 | M1 | M2 | M3 | M4 | USD Equiv.
USD    | 0  | X  | X  | X  | X  | $X,XXX,XXX
EUR    | 0  | X  | X  | 0  | 0  | $X,XXX,XXX
...
```

#### **Panel 5: Hallazgos Detallados**
```
Cards con:
- Clasificación (M0-M4)
- Monto y divisa
- Banco
- Cuenta
- Evidencia completa con todos los datos
```

---

## 🐛 SI ALGO NO FUNCIONA

### **1. No aparece nada después de cargar el archivo**

**Revisar**:
```
F12 → Console → Buscar "[AuditBank]"
```

**Si dice**: `[AuditBank] - Cuentas bancarias: 0`
- El archivo no tiene números de cuenta
- Normal si es archivo binario puro

**Si dice**: `Error...`
- Copiar el error completo
- Revisar el tipo de archivo

### **2. Solo detecta 3 divisas (USD, EUR, GBP)**

**Verificar**:
```
Console → Buscar "Divisas combinadas detectadas"
```

**Debería decir**: `✅ Divisas combinadas detectadas: X`

**Si solo dice 3**: 
- El archivo solo contiene USD, EUR, GBP
- Es normal para algunos archivos Digital Commercial Bank Ltd

### **3. No aparece el panel "Datos Bancarios Detectados"**

**Causas posibles**:
- No se ejecutó `setExtractedData(extracted)`
- Revisar consola para errores
- Recargar página (Ctrl+F5)

**Verificar en consola**:
```javascript
// Debe aparecer:
[AuditBank] ✅ EXTRACCIÓN COMPLETADA:
[AuditBank] - Cuentas bancarias: X (debe ser > 0)
```

### **4. Dice "Error al procesar archivo"**

**Solución**:
```
1. Verificar que el archivo no esté corrupto
2. Probar con test_audit_extraction.txt
3. Revisar mensaje de error en consola
```

---

## 🎯 ARCHIVO DE PRUEBA INCLUIDO

He creado **`test_audit_extraction.txt`** que contiene:

✅ **15 cuentas bancarias**  
✅ **8 códigos IBAN** (GB, BR, CH, US, etc.)  
✅ **6 códigos SWIFT** (EBILAEAD, BRASBRRJ, UBSWCHZH, etc.)  
✅ **6 bancos** (Emirates NBD, Banco do Brasil, UBS, Barclays, HSBC, JPMorgan)  
✅ **15 montos con divisas** (USD, EUR, GBP, CHF, CAD, AUD, JPY, CNY, INR, MXN, BRL, RUB, KRW, SGD, HKD)  
✅ **Clasificaciones M0-M4** sugeridas en el texto  

**Uso**: Carga este archivo para ver TODOS los datos extraídos perfectamente.

---

## 📊 RESULTADO ESPERADO CON test_audit_extraction.txt

### **Consola**:
```
[AuditBank] ✅ EXTRACCIÓN COMPLETADA:
[AuditBank] - Cuentas bancarias: 15
[AuditBank] - Códigos IBAN: 8
[AuditBank] - Códigos SWIFT: 6
[AuditBank] - Bancos detectados: 6
[AuditBank] - Montos encontrados: 15
[AuditBank] ✅ Divisas combinadas detectadas: 15
[AuditBank] Divisas: USD, EUR, GBP, CHF, CAD, AUD, JPY, CNY, INR, MXN, BRL, RUB, KRW, SGD, HKD
```

### **Pantalla**:
```
📋 Datos Bancarios Detectados en el Archivo

💳 Cuentas Bancarias: 15
******3456, ******4444, ******8888, ******6666, ******7654...

🌍 Códigos IBAN: 8
GB82****5432, BR12****2345, CH93****8957, US12****7890...

📡 Códigos SWIFT/BIC: 6
EBILAEAD, BRASBRRJ, UBSWCHZH80A, BARCGB22XXX, HSBCHKHH, CHASUS33

🏦 Bancos Detectados: 6
• EMIRATES NBD
• BANCO DO BRASIL
• UBS
• BARCLAYS
• HSBC
• JPMORGAN

📊 Metadatos
Tamaño: 3.2 KB | Bloques: 15 | Entropía: 5.48 | ✓ No encriptado
```

---

## 🎉 ÉXITO CONFIRMADO SI VES:

✅ **15 cuentas bancarias** enmascaradas  
✅ **8 códigos IBAN** enmascarados  
✅ **6 códigos SWIFT** completos  
✅ **6 bancos** por nombre  
✅ **15 divisas** en la tabla de agregados  
✅ **Hallazgos** con clasificación M0-M4  
✅ **Exportación** JSON/CSV funcional  

---

## ⚠️ IMPORTANTE

### **Recarga la Página**
```
Presiona: Ctrl + F5 (recarga forzada)
```

Esto asegura que el navegador cargue la versión más reciente del código.

### **Verifica la Consola Siempre**
Los logs son la mejor manera de ver qué está sucediendo internamente.

---

## 🎯 PASOS EXACTOS PARA PROBAR

```
1. Ctrl + F5 (recargar página)
2. F12 (abrir consola)
3. Login (admin/admin)
4. Clic en "Auditoría Bancaria"
5. Clic en botón verde "Cargar Archivo Digital Commercial Bank Ltd"
6. Seleccionar "test_audit_extraction.txt"
7. Ver logs en consola
8. Ver panel en pantalla
9. ✅ Éxito confirmado
```

---

**Tiempo total**: ~3 minutos  
**Archivo de prueba**: `test_audit_extraction.txt` (incluido)  
**Datos esperados**: 15 cuentas, 8 IBANs, 6 SWIFTs, 6 bancos, 15 divisas  
**Estado**: ✅ LISTO PARA PROBAR


