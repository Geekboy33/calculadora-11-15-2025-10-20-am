# Módulo de Auditoría Bancaria Digital Commercial Bank Ltd

## Descripción General

El módulo de **Auditoría Bancaria Digital Commercial Bank Ltd** es un sistema completo de detección y clasificación automática de activos financieros que escanea archivos Digital Commercial Bank Ltd y documentos financieros para extraer, clasificar y reportar información bancaria siguiendo los estándares monetarios M0-M4.

## Características Principales

### 🔍 Detección Automática
- **Archivos soportados**: PDF, DOCX, XLSX, CSV, JSON, LOG, TXT
- **Extracción de entidades**:
  - Números de cuenta (8-22 dígitos)
  - Códigos IBAN/SWIFT/BIC
  - Montos monetarios con 15+ monedas
  - Nombres de bancos (whitelist + detección contextual)

### 💰 Clasificación Monetaria M0-M4

El sistema clasifica automáticamente los activos financieros según las categorías:

| Categoría | Descripción | Ejemplos |
|-----------|-------------|----------|
| **M0** | Efectivo físico | Billetes, monedas, caja |
| **M1** | Depósitos a la vista | Cuentas corrientes, checking accounts |
| **M2** | Ahorro y depósitos a plazo | Savings, CDs < 1 año |
| **M3** | Depósitos institucionales | Depósitos > 1M USD, wholesale |
| **M4** | Instrumentos financieros | REPOs, MTNs, SKRs, commercial paper |

### 🌍 Soporte Multimoneda

Tasas de cambio configurables para:
- USD, EUR, GBP, CHF
- BRL, AED, CAD, AUD
- JPY, CNY, INR, MXN

### 🔒 Seguridad y Cumplimiento

- **Enmascaramiento**: Números de cuenta mostrados como `******1234`
- **Cifrado**: Valores completos guardados con AES-256
- **Cumplimiento**: ISO 27001 / AML / FATF
- **Hashing**: SHA-256 de archivos para integridad
- **Logs de auditoría**: Timestamp, usuario, acciones

### 📊 Exportación de Reportes

- **JSON**: Estructura completa con metadatos
- **CSV**: Tabla de hallazgos para análisis
- **Evidencias**: Fragmentos de texto con contexto

## Instalación y Uso

### Requisitos Previos

```bash
# Python 3.8+
pip install python-docx openpyxl PyPDF2  # Opcional para PDF/DOCX/XLSX
```

### Configuración

El sistema utiliza variables de entorno para la configuración:

```bash
export Digital Commercial Bank Ltd_DATA_PATH="./data/Digital Commercial Bank Ltd"  # Ruta de escaneo
```

### Ejecución del Script Backend

```bash
# Ejecutar análisis completo
python audit_Digital Commercial Bank Ltd_mclassify.py

# Salidas generadas:
# - audit_Digital Commercial Bank Ltd_output_YYYYMMDD_HHMMSS.json
# - audit_Digital Commercial Bank Ltd_aggregated_YYYYMMDD_HHMMSS.csv
```

### Uso de la Interfaz Web

1. **Iniciar servidor**:
   ```bash
   npm run dev
   ```

2. **Acceder al módulo**:
   - Navegar a `http://localhost:5173`
   - Login con credenciales
   - Seleccionar tab **"Auditoría Bancaria"** / **"Bank Audit"**

3. **Configurar y escanear**:
   - Ingresar ruta de datos Digital Commercial Bank Ltd
   - Clic en **"Iniciar Escaneo"** / **"Start Scan"**
   - Ver progreso en tiempo real

4. **Revisar resultados**:
   - Estadísticas agregadas por moneda
   - Clasificación M0-M4 visual
   - Tabla detallada de hallazgos
   - Evidencias con fragmentos de texto

5. **Exportar**:
   - **Exportar JSON**: Estructura completa
   - **Exportar CSV**: Para Excel/análisis
   - **Cargar Resultados**: Cargar JSON previamente guardado

## Estructura de Salida JSON

```json
{
  "resumen": {
    "total_hallazgos": 47,
    "fecha": "2024-12-27T15:30:00Z"
  },
  "agregados": [
    {
      "currency": "USD",
      "M0": 0,
      "M1": 2500000,
      "M2": 1250000,
      "M3": 5000000,
      "M4": 8000000,
      "equiv_usd": 16750000
    }
  ],
  "hallazgos": [
    {
      "id_registro": "uuid-here",
      "archivo": {
        "ruta": "/path/to/file.pdf",
        "hash_sha256": "abc123...",
        "fecha_mod": "2024-12-15T10:30:00Z"
      },
      "banco_detectado": "Emirates NBD",
      "numero_cuenta_mask": "******7854",
      "money": {
        "amount": 1500000,
        "currency": "AED"
      },
      "classification": "M1",
      "evidencia_fragmento": "Current Account Balance: AED 1,500,000.00...",
      "score_confianza": 95,
      "timestamp_detectado": "2024-12-27T15:30:00Z"
    }
  ]
}
```

## Algoritmos de Clasificación

### Detección de Montos

El sistema utiliza expresiones regulares para detectar montos en múltiples formatos:

- `$1,234,567.89` (USD)
- `€1.234.567,89` (EUR)
- `R$ 500.000,00` (BRL)
- `AED 1,500,000.00` (AED)

### Clasificación M0-M4

La clasificación se realiza mediante:

1. **Análisis de keywords**: Búsqueda de términos específicos en el contexto
2. **Umbral institucional**: Montos > 1M USD → M3
3. **Contexto bancario**: Tipo de documento y sección
4. **Score de confianza**: 0-100% basado en evidencias

```python
# Ejemplo de clasificación
if "repo" in text or "repurchase" in text:
    return ("M4", 95)  # Alta confianza
elif amount_usd > 1_000_000 and "institutional" in text:
    return ("M3", 93)
elif "checking" in text or "current account" in text:
    return ("M1", 91)
```

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────┐
│           Interfaz React (Frontend)             │
│  - AuditBankWindow.tsx                          │
│  - Visualización de resultados                   │
│  - Exportación JSON/CSV                          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      Script Python (Backend Processing)          │
│  - audit_Digital Commercial Bank Ltd_mclassify.py                     │
│  - Escaneo de archivos                           │
│  - Extracción de entidades                       │
│  - Clasificación M0-M4                           │
│  - Generación de reportes                        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│           Archivos Digital Commercial Bank Ltd / Documentos            │
│  - PDF, DOCX, XLSX, CSV, JSON, LOG, TXT         │
│  - Extractos bancarios                           │
│  - Certificados de depósito                      │
│  - Contratos de repos                            │
└──────────────────────────────────────────────────┘
```

## Sistema de Traducciones

El módulo incluye soporte completo bilingüe **Español/Inglés**:

### Español (ES)
- Auditoría Bancaria
- Panel de Auditoría Bancaria
- Detección automática de activos financieros
- Clasificaciones M0-M4 con descripciones

### English (EN)
- Bank Audit
- Bank Audit Panel
- Automatic financial asset detection
- M0-M4 classifications with descriptions

## Personalización

### Agregar Nuevos Bancos

Editar `audit_Digital Commercial Bank Ltd_mclassify.py`:

```python
WHITELIST_BANKS = [
    'Banco do Brasil',
    'Emirates NBD',
    'Tu Banco Aquí',  # Agregar aquí
    # ...
]
```

### Ajustar Tasas de Cambio

```python
EXCHANGE_RATES = {
    'USD': 1.0,
    'EUR': 1.05,
    'NUEVA_MONEDA': 0.85,  # Agregar aquí
}
```

### Modificar Umbral Institucional

```python
INSTITUTIONAL_THRESHOLD = 1_000_000  # Cambiar según necesidad
```

## Casos de Uso

### 1. Auditoría Interna Bancaria
- Verificar balances reportados vs. archivos
- Detectar discrepancias en clasificaciones
- Generar reportes de cumplimiento

### 2. Due Diligence Financiero
- Analizar documentos de contrapartes
- Verificar fondos disponibles
- Clasificar activos por liquidez

### 3. Análisis Forense Digital Commercial Bank Ltd
- Examinar archivos Digital Commercial Bank Ltd históricos
- Detectar patrones de fondos
- Generar evidencias para auditoría

### 4. Compliance y AML
- Detectar movimientos sospechosos
- Clasificar según regulaciones
- Generar reportes para autoridades

## Notas de Seguridad

⚠️ **IMPORTANTE**:

1. **Números de cuenta**: Siempre enmascarados en salida pública
2. **Archivos completos**: Cifrar antes de almacenar
3. **Logs de acceso**: Registrar todos los escaneos
4. **Permisos**: Limitar acceso al módulo
5. **HTTPS**: Usar siempre en producción

## Solución de Problemas

### El escaneo no encuentra archivos

```bash
# Verificar ruta
ls -la ./data/Digital Commercial Bank Ltd

# Crear estructura si no existe
mkdir -p ./data/Digital Commercial Bank Ltd
```

### Errores de permisos

```bash
# Dar permisos de lectura
chmod -R 755 ./data/Digital Commercial Bank Ltd
```

### Faltan librerías Python

```bash
# Instalar dependencias completas
pip install -r requirements.txt
```

## Roadmap Futuro

- [ ] OCR para imágenes y PDFs escaneados
- [ ] Machine Learning para clasificación automática
- [ ] Integración con APIs bancarias en tiempo real
- [ ] Dashboard de analytics avanzado
- [ ] Alertas automáticas por umbrales
- [ ] Soporte para más formatos (XML, OFX)
- [ ] Blockchain verification de hashes

## Contribuciones

Para agregar nuevas características o reportar bugs:

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-caracteristica`
3. Commit: `git commit -am 'Agregar nueva característica'`
4. Push: `git push origin feature/nueva-caracteristica`
5. Pull Request

## Licencia

Copyright © 2025 DAES CoreBanking System
Todos los derechos reservados.

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Autor**: DAES Development Team


