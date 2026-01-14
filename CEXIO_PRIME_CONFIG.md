# 🔧 Configuración de CEX.io Prime

## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances












## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances












## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances












## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances












## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances












## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances












## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances











## Variables de Entorno Requeridas

Agrega las siguientes variables a tu archivo `.env`:

```env
# ============================================================================
# CEX.IO PRIME API CONFIGURATION
# ============================================================================

# Modo de operación (true = simulación, false = API real)
CEXIO_LOCAL_MODE=false

# Credenciales de API CEX.io Prime
CEXIO_API_KEY=tu_api_key_aqui
CEXIO_API_SECRET=tu_api_secret_aqui

# Opcional: User ID de CEX.io
CEXIO_USER_ID=tu_user_id_aqui
```

## Pasos para Activar el Módulo

### 1. Obtener Credenciales API

1. Ve a [CEX.io Prime](https://prime.cex.io) o [CEX.io](https://cex.io)
2. Inicia sesión en tu cuenta
3. Ve a **Profile → API** o **Settings → API Access**
4. Crea una nueva API Key con los permisos:
   - ✅ Account Balance
   - ✅ Open Orders
   - ✅ Trade
   - ✅ Deposit/Withdrawal (opcional)
5. Copia el **API Key** y **API Secret**

### 2. Configurar el .env

```powershell
# Abrir el archivo .env (créalo si no existe)
notepad .env
```

Agrega:
```env
CEXIO_LOCAL_MODE=false
CEXIO_API_KEY=tu_api_key
CEXIO_API_SECRET=tu_api_secret
```

### 3. Reiniciar el Servidor

```powershell
# Detener el servidor actual
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Iniciar de nuevo
npm run server
```

### 4. Verificar Conexión

1. Abre la aplicación en http://localhost:4000
2. Ve al módulo **CEX.io Prime**
3. Haz clic en **"Probar"** para verificar la conexión
4. Si está en modo LIVE, verás tus balances reales

---

## Flujo de Depósito desde Custody

### Paso 1: Crear Cuenta Custody
1. Ve al módulo **Cuentas Custodio**
2. Crea una nueva cuenta con fondos

### Paso 2: Depositar en CEX.io Prime
1. Ve al módulo **CEX.io Prime**
2. Selecciona la pestaña **"Depósitos"**
3. Selecciona la **Cuenta Custody de Origen**
4. Ingresa el **monto a depositar**
5. Haz clic en **"Depositar en CEX.io Prime"**

### Paso 3: Trading
1. Los fondos aparecerán en tus balances de CEX.io
2. Ve a la pestaña **"Trading"**
3. Selecciona el par (ej: BTC/USD)
4. Crea órdenes de compra/venta

---

## Modos de Operación

| Modo | CEXIO_LOCAL_MODE | Descripción |
|------|------------------|-------------|
| **Simulación** | `true` | Usa datos ficticios, ideal para pruebas |
| **Live** | `false` | Conecta con API real de CEX.io |

---

## Endpoints Disponibles

El servidor expone estos endpoints proxy:

```
GET  http://localhost:3000/api/cexio/test        # Probar conexión
GET  http://localhost:3000/api/cexio/balances    # Obtener balances
GET  http://localhost:3000/api/cexio/ticker/:sym # Precio de un par
POST http://localhost:3000/api/cexio/order       # Crear orden
GET  http://localhost:3000/api/cexio/orders      # Órdenes abiertas
GET  http://localhost:3000/api/cexio/trades      # Historial de trades
POST http://localhost:3000/api/cexio/convert     # Convertir monedas
POST http://localhost:3000/api/cexio/deposit     # Registrar depósito
POST http://localhost:3000/api/cexio/withdraw    # Solicitar retiro
GET  http://localhost:3000/api/cexio/currencies  # Monedas soportadas
GET  http://localhost:3000/api/cexio/symbols     # Pares de trading
```

---

## Solución de Problemas

### Error: "Desconectado"
- Verifica que `CEXIO_LOCAL_MODE=false` en tu `.env`
- Verifica que las credenciales API son correctas
- Reinicia el servidor

### Error: "Invalid API Key"
- Verifica que copiaste correctamente el API Key
- Asegúrate de que la API Key tiene los permisos necesarios
- Verifica que no hay espacios extra en el valor

### Balances no aparecen
- La API Key necesita permiso de "Account Balance"
- Verifica que tu cuenta CEX.io tiene fondos

---

## Seguridad

⚠️ **IMPORTANTE:**
- NUNCA compartas tu API Secret
- NUNCA subas el archivo `.env` a Git
- Usa API Keys con permisos mínimos necesarios
- Considera usar API Keys de solo lectura para ver balances













