# ⚡ Sistema de Carga Rápida - Selector de Porcentajes

## 📋 Descripción General

Sistema completo de selección rápida de montos mediante porcentajes del capital disponible, implementado en todas las interfaces que requieren cargar fondos. Permite seleccionar 10%, 20%, 50%, 75% o 100% del balance disponible con un solo click.

---

## 🎯 Interfaces Actualizadas

### 1. **Custody Accounts Module - Crear Cuenta** ✅
**Ubicación:** Modal "Crear Cuenta Custodio"

**Funcionalidad:**
- Selector con 5 botones de porcentaje
- Calcula automáticamente basado en el balance total de la divisa seleccionada
- Actualiza el campo "Monto a Transferir" instantáneamente

**Porcentajes Disponibles:**
- 10% del capital disponible
- 20% del capital disponible
- 50% del capital disponible
- 75% del capital disponible
- 100% del capital disponible (todo el balance)

**Características:**
- Gradiente purple-pink
- Hover effect con glow
- Animación de escala al hacer click
- Muestra monto calculado en cada botón
- Muestra balance disponible total debajo

### 2. **Custody Accounts Module - Reservar Fondos** ✅
**Ubicación:** Modal "Reservar Fondos"

**Funcionalidad:**
- Selector con 5 botones de porcentaje
- Calcula basado en el balance disponible de la cuenta custodio seleccionada
- Actualiza el campo "Monto a Reservar" instantáneamente
- Funciona tanto para cuentas Blockchain como Banking

**Características:**
- Respeta el máximo del balance disponible
- No permite reservar más del 100% disponible
- Ideal para tokenización y transferencias bancarias

### 3. **Transfer Interface - Transferencias** ✅
**Ubicación:** Módulo de Transferencias

**Funcionalidad:**
- Selector con 5 botones de porcentaje
- Calcula basado en el balance actual de la cuenta seleccionada
- Actualiza el campo "Monto" instantáneamente
- Sincronizado con el sistema de validación de balance

**Características:**
- Previene transferencias que excedan el balance
- Muestra balance disponible en tiempo real
- Compatible con todas las divisas

---

## 🎨 Diseño Visual

### Estilo del Selector:
```
┌─────────────────────────────────────────────┐
│ ⚡ Carga Rápida - % del Capital Disponible │
├─────────────────────────────────────────────┤
│  [10%]  [20%]  [50%]  [75%]  [100%]        │
│  USD    USD    USD    USD    USD            │
│  1,000  2,000  5,000  7,500  10,000        │
├─────────────────────────────────────────────┤
│  💰 Disponible: USD 10,000                 │
└─────────────────────────────────────────────┘
```

### Características Visuales:
- **Background**: Gradiente purple-pink con 20% opacidad
- **Border**: Purple/500 con 30% opacidad
- **Botones**: Gradiente from-purple-600 to-pink-600
- **Hover**: Glow effect rgba(168,85,247,0.6)
- **Animación**: Scale 105% en hover
- **Font**: Bold para porcentajes, pequeño para montos

### Estructura de cada Botón:
```
┌─────────┐
│   50%   │  ← Porcentaje en texto grande
│ USD     │  ← Monto calculado
│ 5,000   │     en formato legible
└─────────┘
```

---

## 📊 Cálculo Automático

### Fórmula:
```javascript
const calculatedAmount = (availableBalance * percentage) / 100;
```

### Ejemplo Práctico:

**Balance Disponible:** USD 10,000

| Botón | Cálculo | Resultado |
|-------|---------|-----------|
| 10%   | 10,000 × 0.10 | USD 1,000 |
| 20%   | 10,000 × 0.20 | USD 2,000 |
| 50%   | 10,000 × 0.50 | USD 5,000 |
| 75%   | 10,000 × 0.75 | USD 7,500 |
| 100%  | 10,000 × 1.00 | USD 10,000 |

---

## 🔄 Actualización Dinámica

### En Custody Account Creation:
```javascript
// Actualiza cuando se cambia la divisa
onChange(currency) → Recalcula porcentajes basados en nuevo balance
```

### En Reserve Modal:
```javascript
// Actualiza basado en cuenta seleccionada
selectedAccount.availableBalance → Recalcula porcentajes
```

### En Transfer Interface:
```javascript
// Actualiza basado en balance actual
currentBalance → Recalcula porcentajes en tiempo real
```

---

## ⚙️ Comportamiento

### Click en Botón de Porcentaje:

1. **Calcula** el monto exacto
2. **Actualiza** el campo de input correspondiente
3. **Formatea** el número con 2 decimales (para transfers)
4. **Valida** automáticamente si el sistema tiene validación
5. **Mantiene** el campo editable para ajustes manuales

### Edición Manual:

- El usuario puede modificar el valor después de seleccionar un porcentaje
- Los botones siguen funcionando y recalculan basados en el balance actual
- No hay bloqueo del campo después de usar un porcentaje

---

## 🎯 Casos de Uso

### 1. Crear Cuenta Custodio Rápidamente
```
Escenario: Usuario tiene USD 10,000,000 en el sistema
Acción: Click en "50%" al crear cuenta Blockchain
Resultado: Se asignan USD 5,000,000 automáticamente
```

### 2. Reservar Fondos para Tokenización
```
Escenario: Cuenta con USD 2,000,000 disponible
Acción: Click en "75%" para reservar para tokens
Resultado: USD 1,500,000 reservados para blockchain
```

### 3. Transferencia Completa
```
Escenario: Necesita transferir todo el balance
Acción: Click en "100%" en Transfer Interface
Resultado: Todo el balance se transfiere
```

### 4. Transferencia Parcial
```
Escenario: Transferir la mitad del balance
Acción: Click en "50%" en Transfer Interface
Resultado: 50% del balance listo para enviar
```

---

## 🌍 Soporte Multilenguaje

### Español:
- "Carga Rápida - % del Capital Disponible"
- "Reserva Rápida - % del Disponible"
- "💰 Disponible: {currency} {amount}"

### English:
- "Quick Load - % of Available Capital"
- "Quick Reserve - % of Available"
- "💰 Available: {currency} {amount}"

---

## 🔢 Formato de Números

### Botones (Monto Calculado):
```javascript
{calculatedAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}
```
- **Input:** 1234567.89
- **Output:** 1,234,568 (redondeado, sin decimales)

### Balance Disponible:
```javascript
{balance.toLocaleString()}
```
- **Input:** 10000000
- **Output:** 10,000,000

### Campo de Input (Transfer):
```javascript
calculatedAmount.toFixed(2)
```
- **Input:** 5000.5
- **Output:** 5000.50 (2 decimales exactos)

---

## 🚀 Ventajas del Sistema

### Para el Usuario:
- ✅ **Velocidad**: Carga de fondos en 1 click
- ✅ **Precisión**: Cálculos exactos automáticos
- ✅ **Flexibilidad**: Opciones comunes pre-calculadas
- ✅ **Visual**: Ve el monto antes de hacer click
- ✅ **Seguridad**: No puede exceder el balance disponible

### Para el Sistema:
- ✅ **Menos errores**: No hay errores de tipeo en montos
- ✅ **UX mejorada**: Proceso más rápido y eficiente
- ✅ **Validación**: Montos siempre dentro de límites
- ✅ **Consistencia**: Misma experiencia en todos los módulos

---

## 💡 Ejemplos de Uso Real

### Escenario 1: Startup Tokenizando USD
```
Balance Sistema: USD 1,000,000
Objetivo: Crear cuenta blockchain con 50%

1. Abrir "Crear Cuenta Custodio"
2. Seleccionar "USD" como moneda
3. Click en botón "50%"
4. Automáticamente: USD 500,000
5. Completar datos blockchain
6. Crear cuenta

Resultado: Cuenta creada con USD 500,000 en 30 segundos
```

### Escenario 2: Reserva para Múltiples Tokens
```
Cuenta Custodio: USD 5,000,000 disponible
Objetivo: Reservar 20% para nuevo token

1. Abrir modal "Reservar Fondos"
2. Click en botón "20%"
3. Automáticamente: USD 1,000,000
4. Ingresar dirección contrato
5. Confirmar reserva

Resultado: USD 1,000,000 reservados para tokenización
```

### Escenario 3: Transferencia Urgente
```
Balance Cuenta: EUR 250,000
Objetivo: Enviar mitad del balance urgente

1. Abrir Transfer Interface
2. Seleccionar cuenta y EUR
3. Click en botón "50%"
4. Automáticamente: EUR 125,000
5. Ingresar destinatario
6. Enviar

Resultado: EUR 125,000 transferidos en 1 minuto
```

---

## 🔧 Implementación Técnica

### Componentes Actualizados:
1. **CustodyAccountsModule.tsx**
   - Línea ~1319: Modal crear cuenta
   - Línea ~1529: Modal reservar fondos

2. **TransferInterface.tsx**
   - Línea ~397: Formulario de transferencia

### Código Base del Selector:
```tsx
<div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-lg p-4">
  <label className="text-sm text-purple-400 mb-3 block font-semibold">
    ⚡ Carga Rápida - % del Capital Disponible
  </label>
  <div className="grid grid-cols-5 gap-2">
    {[10, 20, 50, 75, 100].map(percentage => {
      const calculatedAmount = (availableBalance * percentage) / 100;
      return (
        <button
          key={percentage}
          type="button"
          onClick={() => setAmount(calculatedAmount)}
          className="px-3 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-[0_0_20px_rgba(168,85,247,0.6)] transition-all text-sm font-bold hover:scale-105"
        >
          <div className="text-lg mb-1">{percentage}%</div>
          <div className="text-xs opacity-80">
            {currency} {calculatedAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}
          </div>
        </button>
      );
    })}
  </div>
  <div className="mt-3 text-xs text-gray-400 text-center">
    💰 Disponible: {currency} {availableBalance.toLocaleString()}
  </div>
</div>
```

---

## ✅ Testing y Validación

### Pruebas Realizadas:
- ✅ Cálculos matemáticos correctos
- ✅ Actualización de campos instantánea
- ✅ Formato de números adecuado
- ✅ Responsive en mobile
- ✅ Compatible con todas las divisas
- ✅ Funciona con balances grandes (millones)
- ✅ Hover effects funcionando
- ✅ Animaciones suaves

### Build:
- ✅ Sin errores de compilación
- ✅ 84.00 kB (16.08 kB gzipped) - CustodyAccountsModule
- ✅ Total: 527.51 kB (155.55 kB gzipped)

---

## 📈 Impacto en la Experiencia

### Antes del Selector:
1. Usuario busca calculadora
2. Calcula 50% manualmente
3. Copia monto
4. Pega en campo
5. Verifica que sea correcto
**Tiempo:** ~2-3 minutos

### Con el Selector:
1. Click en botón "50%"
**Tiempo:** ~1 segundo

**Mejora:** 120-180x más rápido ⚡

---

© 2025 DAES - Data and Exchange Settlement
Sistema de Carga Rápida de Fondos
