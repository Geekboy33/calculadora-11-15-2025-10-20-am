# 🚀 Inicio Rápido - Módulo de Auditoría Bancaria

## ⚡ 3 Pasos para Empezar

### 1️⃣ Generar Datos de Prueba
```bash
python generate_sample_audit_data.py
```
✅ Crea 7 archivos de muestra en `./data/Digital Commercial Bank Ltd/`

### 2️⃣ Ejecutar Análisis
```bash
python audit_Digital Commercial Bank Ltd_mclassify.py
```
✅ Genera `audit_Digital Commercial Bank Ltd_output_*.json` y `audit_Digital Commercial Bank Ltd_aggregated_*.csv`

### 3️⃣ Ver en la Web
1. Abrir http://localhost:5173
2. Login (admin/admin)
3. Clic en **"Auditoría Bancaria"**
4. Configurar ruta: `./data/Digital Commercial Bank Ltd`
5. Clic en **"Iniciar Escaneo"**

---

## 🎯 Funciones Principales

### En la Interfaz Web:
- 📊 **Ver estadísticas** agregadas por moneda
- 🏷️ **Clasificación M0-M4** con colores
- 📋 **Tabla detallada** de hallazgos
- 💾 **Exportar JSON/CSV** para análisis
- 📁 **Cargar resultados** previos
- 🌍 **Cambiar idioma** ES/EN

### Clasificaciones:
- **M0** 🟣 Efectivo físico
- **M1** 🔵 Depósitos a la vista
- **M2** 🟢 Ahorro
- **M3** 🟡 Institucional (>1M USD)
- **M4** 🔴 Instrumentos financieros

---

## 📂 Estructura de Archivos Creados

```
.
├── src/
│   ├── components/
│   │   └── AuditBankWindow.tsx          # ✨ Componente principal
│   └── lib/
│       └── i18n-core.ts                 # 📝 Traducciones actualizadas
├── audit_Digital Commercial Bank Ltd_mclassify.py             # 🔧 Script de procesamiento
├── generate_sample_audit_data.py        # 🎲 Generador de muestras
├── requirements_audit.txt               # 📦 Dependencias opcionales
├── AUDIT_BANK_MODULE.md                 # 📚 Documentación completa
├── MODULO_AUDITORIA_COMPLETADO.md       # ✅ Resumen de implementación
└── QUICK_START_AUDIT.md                 # 🚀 Este archivo
```

---

## 🔒 Seguridad

- ✅ Cuentas enmascaradas: `******1234`
- ✅ Hashing SHA-256 de archivos
- ✅ Cumplimiento ISO 27001 / AML / FATF
- ✅ Logs de auditoría con timestamps

---

## 💡 Ejemplo de Resultado

```json
{
  "resumen": {
    "total_hallazgos": 47,
    "fecha": "2024-12-27T15:30:00Z"
  },
  "agregados": [
    {
      "currency": "USD",
      "M1": 2500000,
      "M3": 5000000,
      "M4": 8000000,
      "equiv_usd": 16750000
    }
  ]
}
```

---

## 🆘 Ayuda

**Documentación completa**: `AUDIT_BANK_MODULE.md`  
**Resumen de implementación**: `MODULO_AUDITORIA_COMPLETADO.md`

**Problemas comunes**:
- Si no hay archivos: Ejecuta `generate_sample_audit_data.py`
- Si faltan librerías Python: `pip install -r requirements_audit.txt`
- Si no aparece en el menú: Recargar la página

---

¡Listo para auditar! 🎉


