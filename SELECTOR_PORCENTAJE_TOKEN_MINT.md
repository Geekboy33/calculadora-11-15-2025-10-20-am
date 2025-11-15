# ⚡ Selector de Porcentajes para Token Mint

## 📋 Descripción General

Sistema de selección rápida de cantidad de tokens a emitir (mint) mediante porcentajes del monto reservado, implementado en el modal "Reserve Funds for Tokenization". Permite mintear 10%, 20%, 50%, 75% o 100% del monto reservado con un solo click.

---

## 🎯 Ubicación

**Modal:** Reserve Funds for Tokenization (Reservar Fondos para Tokenización)

**Sección:** Campos para Blockchain → Después de "Token Amount to Mint"

**Contexto:** Solo visible cuando se reservan fondos en cuentas de tipo Blockchain

---

## 🎨 Diseño Visual

### Estructura Completa:

```
┌────────────────────────────────────────────────┐
│ Token Amount to Mint                           │
│ [Input Field: 1000000]                        │
│ Token: USDT                                    │
├────────────────────────────────────────────────┤
│ ⚡ Minteo Rápido - % del Monto a Reservar     │
├────────────────────────────────────────────────┤
│  [10%]    [20%]    [50%]    [75%]    [100%]   │
│  100K     200K     500K     750K     1,000K    │
│  USDT     USDT     USDT     USDT     USDT      │
├────────────────────────────────────────────────┤
│ 💰 Monto Reservado: USD 1,000,000             │
│ ℹ️ 100% = 1:1 ratio (1,000,000 USDT)          │
└────────────────────────────────────────────────┘
```

### Características Visuales:

- **Background**: Gradiente cyan-900/20 → blue-900/20
- **Border**: Cyan-500 con 30% opacidad
- **Label**: Cyan-400, font semibold
- **Botones**: Gradiente from-cyan-600 to-blue-600
- **Hover**: Glow rgba(0,255,255,0.6)
- **Animación**: Scale 105% en hover
- **Info adicional**: Monto reservado y ratio 1:1

---

## 🔢 Cálculo de Tokens

### Fórmula Base:
```javascript
const calculatedTokens = (reservedAmount * percentage) / 100;
```

### Ejemplo Práctico:

**Monto Reservado:** USD 1,000,000

| Botón | Cálculo | Tokens a Mintear |
|-------|---------|------------------|
| 10%   | 1,000,000 × 0.10 | 100,000 USDT |
| 20%   | 1,000,000 × 0.20 | 200,000 USDT |
| 50%   | 1,000,000 × 0.50 | 500,000 USDT |
| 75%   | 1,000,000 × 0.75 | 750,000 USDT |
| 100%  | 1,000,000 × 1.00 | 1,000,000 USDT |

---

## 🌐 Concepto de Ratio 1:1

### ¿Qué significa 100% = 1:1 ratio?

Cuando se mintea el **100%**, significa que se emite **1 token por cada 1 unidad de divisa reservada**.

**Ejemplo:**
- Reservas: USD 1,000,000
- Click en 100%
- Minteas: 1,000,000 USDT
- **Ratio:** 1 USDT = 1 USD (respaldado)

### Otros Ratios:

**50% (Sobre-colateralización 2:1):**
- Reservas: USD 1,000,000
- Click en 50%
- Minteas: 500,000 USDT
- **Ratio:** 1 USDT = 2 USD (200% respaldado)

**75%:**
- Reservas: USD 1,000,000
- Click en 75%
- Minteas: 750,000 USDT
- **Ratio:** 1 USDT = 1.33 USD (133% respaldado)

**20% (Sobre-colateralización 5:1):**
- Reservas: USD 1,000,000
- Click en 20%
- Minteas: 200,000 USDT
- **Ratio:** 1 USDT = 5 USD (500% respaldado)

---

## 📊 Casos de Uso

### Caso 1: Stablecoin con Respaldo 1:1

**Proyecto:** USDX Stablecoin (estándar de la industria)

**Configuración:**
```
Cuenta: "USDX Reserve"
Monto Disponible: USD 10,000,000
Reservar: USD 10,000,000 (100% del disponible)
Token: USDX
```

**Proceso:**
1. Abrir "Reserve Funds for Tokenization"
2. Click en 100% para monto (USD 10,000,000)
3. Ingresar contract address
4. **Click en 100% para token mint → 10,000,000 USDX**
5. Confirmar reserva

**Resultado:** 10M USDX respaldados 1:1 con USD 10M

---

### Caso 2: Stablecoin Sobre-Colateralizado

**Proyecto:** DAI-Style Stablecoin (respaldo 150%)

**Configuración:**
```
Cuenta: "Collateralized Reserve"
Monto Disponible: USD 15,000,000
Reservar: USD 15,000,000
Token: CSTBL
```

**Proceso:**
1. Reservar USD 15,000,000
2. Ingresar contract address
3. **Mintear solo el 66.67%** (o usar custom)
   - Alternativamente: Click 75% = 11,250,000 tokens
   - O click 50% = 7,500,000 tokens
4. Confirmar

**Resultado:**
- 50%: 7.5M CSTBL respaldados con USD 15M (ratio 2:1)
- 75%: 11.25M CSTBL respaldados con USD 15M (ratio 1.33:1)

---

### Caso 3: Lanzamiento Gradual de Tokens

**Proyecto:** Startup lanzando token gradualmente

**Fase 1 - Lanzamiento Inicial (20%):**
```
Reserva: USD 5,000,000
Click: 20%
Minteo: 1,000,000 tokens
```

**Fase 2 - Expansión (50%):**
```
Reserva adicional: USD 5,000,000
Click: 50%
Minteo: 2,500,000 tokens más
```

**Fase 3 - Full Launch (100%):**
```
Reserva adicional: USD 10,000,000
Click: 100%
Minteo: 10,000,000 tokens más
```

---

### Caso 4: Token Algorítmico con Reserva Fraccionaria

**Proyecto:** Token con respaldo parcial

**Configuración:**
```
Reserva: USD 100,000,000
Objetivo: Mintear 1,000,000,000 tokens
```

**Cálculo:**
- 100% del monto = 100M tokens
- Necesitas 10x más tokens
- Solución: Click 100% → Ajustar manualmente a 1,000M
- O usar API para minteo adicional

**Resultado:** Token respaldado al 10% (1 token = $0.10 de reserva)

---

## 🚀 Funcionamiento Paso a Paso

### Flujo Completo de Reserva y Minteo:

```
1. Usuario selecciona cuenta custodio
   ↓
2. Abre modal "Reserve Funds for Tokenization"
   ↓
3. Ingresa monto a reservar (ej: USD 5,000,000)
   - Puede usar selector 10-100% del disponible
   ↓
4. Selecciona blockchain (Ethereum, Polygon, etc.)
   ↓
5. Ingresa contract address (0x...)
   ↓
6. Campo "Token Amount to Mint" aparece
   ↓
7. Usuario ve selector de porcentajes:
   [10%]  [20%]  [50%]  [75%]  [100%]
   500K   1,000K 2,500K 3,750K 5,000K USDT
   ↓
8. Click en porcentaje deseado
   ↓
9. Campo se actualiza automáticamente
   ↓
10. Confirmar reserva
    ↓
11. Fondos reservados + Token mint autorizado
```

---

## 🎯 Información Mostrada

### Línea 1 (Título):
```
⚡ Minteo Rápido - % del Monto a Reservar
   (Quick Mint - % of Reserved Amount)
```

### Línea 2 (Botones):
Cada botón muestra:
- **Porcentaje** (grande, arriba)
- **Cantidad de tokens** (pequeño, abajo)
- **Símbolo del token** (después del número)

### Línea 3 (Info Monto):
```
💰 Monto Reservado: USD 5,000,000
   (Reserved Amount: USD 5,000,000)
```

### Línea 4 (Info Ratio):
```
ℹ️ 100% = 1:1 ratio (5,000,000 USDT)
```

---

## 💡 Ventajas del Sistema

### Para el Usuario:
- ✅ **Claridad**: Ve exactamente cuántos tokens se mintearán
- ✅ **Velocidad**: Cálculo instantáneo
- ✅ **Flexibilidad**: Múltiples opciones de ratio
- ✅ **Educativo**: Muestra el ratio 1:1 como referencia
- ✅ **Seguridad**: Basado en monto efectivamente reservado

### Para el Sistema:
- ✅ **Precisión**: Cálculos automáticos sin errores
- ✅ **Transparencia**: Relación reserva/tokens clara
- ✅ **Eficiencia**: Menos pasos para completar operación
- ✅ **Compliance**: Ratios visibles para auditoría

---

## 🔒 Seguridad y Validaciones

### El selector respeta:
- ✅ Monto exacto reservado
- ✅ Límites del contrato blockchain
- ✅ Formato de números
- ✅ Token symbol de la cuenta

### Validaciones automáticas:
- ✅ Si reserveData.amount = 0 → Los botones muestran 0
- ✅ Actualización en tiempo real al cambiar monto reservado
- ✅ Formato de números con separadores de miles
- ✅ Redondeo apropiado para cantidades grandes

---

## 🌍 Soporte Multilenguaje

### Español:
```
⚡ Minteo Rápido - % del Monto a Reservar
💰 Monto Reservado: USD 1,000,000
ℹ️ 100% = 1:1 ratio (1,000,000 USDT)
```

### English:
```
⚡ Quick Mint - % of Reserved Amount
💰 Reserved Amount: USD 1,000,000
ℹ️ 100% = 1:1 ratio (1,000,000 USDT)
```

---

## 📐 Formato de Números

### En Botones:
```javascript
{calculatedTokens.toLocaleString(undefined, {maximumFractionDigits: 0})}
```
- **Input:** 1234567.89
- **Output:** 1,234,568 (sin decimales, redondeado)

### En Info de Ratio:
```javascript
{reserveData.amount.toLocaleString()}
```
- **Input:** 5000000
- **Output:** 5,000,000 (con separadores)

---

## 🎨 Ejemplos Visuales por Token

### USDT (Tether):
```
Monto Reservado: USD 1,000,000
[10%]      [20%]      [50%]      [75%]      [100%]
100,000    200,000    500,000    750,000    1,000,000
USDT       USDT       USDT       USDT       USDT
```

### DAI:
```
Monto Reservado: USD 2,500,000
[10%]      [20%]      [50%]      [75%]      [100%]
250,000    500,000    1,250,000  1,875,000  2,500,000
DAI        DAI        DAI        DAI        DAI
```

### VUSD (Custom):
```
Monto Reservado: USD 10,000,000
[10%]      [20%]      [50%]      [75%]      [100%]
1,000,000  2,000,000  5,000,000  7,500,000  10,000,000
VUSD       VUSD       VUSD       VUSD       VUSD
```

---

## 🔄 Integración con Otras Funcionalidades

### Se combina con:

1. **Selector de % para Monto a Reservar:**
   - Primero: Selecciona % del disponible para reservar
   - Segundo: Selecciona % del reservado para mintear

2. **Botón "Crear con TODO (100%)":**
   - Al crear cuenta con 100%
   - Luego reservar con %
   - Luego mintear con %

3. **Sistema de Validación:**
   - No permite mintear si monto reservado = 0
   - Actualiza automáticamente si se cambia monto reservado
   - Valida campos antes de confirmar

---

## 📊 Tabla de Ratios Comunes

| % Mint | Ratio | Colateralización | Uso Típico |
|--------|-------|-----------------|------------|
| 100%   | 1:1   | 100%           | Stablecoins estándar (USDT, USDC) |
| 75%    | 1:1.33| 133%           | Stablecoins con margen de seguridad |
| 50%    | 1:2   | 200%           | Stablecoins sobre-colateralizados (DAI) |
| 20%    | 1:5   | 500%           | Tokens ultra-seguros |
| 10%    | 1:10  | 1000%          | Tokens con respaldo masivo |

---

## ✅ Estado de Implementación

- ✅ Selector agregado al modal de reserva
- ✅ Cálculo automático basado en monto reservado
- ✅ 5 opciones de porcentaje (10, 20, 50, 75, 100)
- ✅ Diseño visual cyan-blue theme
- ✅ Hover effects con glow
- ✅ Animación scale en hover
- ✅ Info de monto reservado
- ✅ Info de ratio 1:1 como referencia
- ✅ Soporte multilenguaje (ES/EN)
- ✅ Formato de números con separadores
- ✅ Muestra símbolo del token
- ✅ Build exitoso sin errores

**Build:** 86.03 kB (16.38 kB gzipped) ✅

---

## 🎓 Guía Rápida de Uso

### Para Stablecoin 1:1:
1. Reservar fondos
2. Click **100%** en minteo
3. Confirmar
→ Token completamente respaldado

### Para Stablecoin Sobre-Colateralizado:
1. Reservar fondos
2. Click **50%** en minteo (2:1 ratio)
3. Confirmar
→ Token con 200% de respaldo

### Para Lanzamiento Gradual:
1. Reservar fondos fase 1
2. Click **20%** en minteo
3. Confirmar
4. Repetir para fases siguientes

---

## 🚀 Impacto en Experiencia

### Antes:
1. Calcular manualmente % del monto reservado
2. Abrir calculadora
3. Hacer operación: 1,000,000 × 0.50 = 500,000
4. Copiar resultado
5. Pegar en campo
**Tiempo:** ~1-2 minutos

### Ahora:
1. Click en botón de porcentaje deseado
**Tiempo:** ~1 segundo

**Mejora:** 60-120x más rápido ⚡

---

© 2025 DAES - Data and Exchange Settlement
Sistema de Minteo Rápido de Tokens
