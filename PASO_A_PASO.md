# 🎬 **GUÍA PASO A PASO - ALCHEMY RPC (VISUAL)**

## 📍 **PASO 1: ABRIR ARCHIVO `.env`**

### 1.1 Localizar el archivo
```
Ruta: C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am\.env
```

### 1.2 Abrir en editor (VSCode recomendado)
```
Click derecho en .env → Abrir con → Visual Studio Code
```

### 1.3 Buscar esta línea
```bash
# Si YA EXISTE ETH_RPC_URL, solo actualiza el valor:
ETH_RPC_URL=<cualquier_valor_anterior>

# Si NO EXISTE, agrégala al principio del archivo
```

---

## ✏️ **PASO 2: AGREGAR/ACTUALIZAR LA LÍNEA**

### 2.1 Al principio del archivo, agrega:
```bash
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

### 2.2 El archivo `.env` debe empezar así:
```bash
# ============================================
# ALCHEMY RPC (AÑADIDO HOY)
# ============================================
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh

# Anteriores (ya existían):
VITE_INFURA_PROJECT_ID=6b7bd498942d42edab758545c7d30403
VITE_ETH_PRIVATE_KEY=d1bf385c43fb999290e3e0365f8cc45bfa97b780a97c6eb4bd790ec3fa09a036
VITE_ETH_WALLET_ADDRESS=0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
VITE_USDT_CONTRACT_ADDRESS=0xdAC17F958D2ee523a2206206994597C13D831ec7
```

### 2.3 IMPORTANTE - También agrega para frontend:
```bash
# Al final del archivo, agrega:
VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh
```

### 2.4 Guarda el archivo
```
Ctrl+S
```

---

## 🔄 **PASO 3: REINICIAR SERVIDOR**

### 3.1 Abre PowerShell
```
Win + R → powershell → Enter
```

### 3.2 Navega a la carpeta del proyecto
```powershell
cd "C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am"
```

### 3.3 Detén el servidor anterior (si está corriendo)
```powershell
taskkill /F /IM node.exe
```

### 3.4 Inicia el servidor
```powershell
npm run dev:full
```

### 3.5 Espera este mensaje:
```
✅ [Alchemy] Usando RPC URL directo de Alchemy
  - RPC URL: https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG...
  - Red: Ethereum Mainnet
✅ [Wallet] Cargada: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a

[APP]   ➜  Local:   http://localhost:4000/
```

---

## 🌐 **PASO 4: ABRIR EL MÓDULO**

### 4.1 En tu navegador, entra a:
```
http://localhost:4000/
```

### 4.2 Busca el menú lateral y haz clic en:
```
USD → USDT
```

### 4.3 Deberías ver:
```
✅ Conexión exitosa a Ethereum Mainnet
   Block: 24,145,xxx

Balance Wallet Operadora:
   0.00 USDT
   0.0000 ETH

Tasa USDT/USD: $0.9989
```

---

## 💰 **PASO 5: INYECTAR FONDOS (OPCIONAL)**

### 5.1 Si NO tienes fondos aún
```
Salta este paso y ve a Paso 6
```

### 5.2 Si tienes otra wallet con USDT
```
1. Copia tu dirección: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
2. En otra wallet (Metamask, etc), envía USDT a esa dirección
3. Espera confirmación (~5 minutos)
4. Actualiza el módulo
5. Deberías ver el balance
```

### 5.3 Si tienes ETH y quieres swapear
```
1. Ve a: https://app.uniswap.org/
2. Conecta tu wallet (la que contiene ETH)
3. Elige: ETH → USDT
4. Cantidad: 0.1 ETH (ejemplo)
5. Confirma
6. Envía el USDT a: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
7. Listo!
```

---

## 🧪 **PASO 6: HACER UNA TRANSFERENCIA DE PRUEBA**

### 6.1 En el módulo USD → USDT, ingresa:

**Campo 1: Monto a Convertir (USD)**
```
Ingresa: 10
(o cualquier monto que tengas en balance)
```

**Campo 2: Dirección de Destino**
```
Ingresa: tu_otra_wallet_aqui
Ejemplo: 0xac56805515af1552d8ae9ac190050a8e549dd2fb
```

### 6.2 Haz clic en:
```
CONVERTIR $10 USD → USDT
```

### 6.3 Verás un modal. Click en:
```
Confirmar Transferencia
```

### 6.4 Espera a que procese:
```
⏳ Procesando...
   - Conectando a Ethereum
   - Calculando gas
   - Preparando firma
   - Enviando transacción
```

### 6.5 Resultado esperado:
```
✅ TRANSFERENCIA REALIZADA
   Hash: 0x1a2b3c4d5e6f...
   Etherscan: https://etherscan.io/tx/0x1a2b3c4d...
```

---

## 🔍 **PASO 7: VERIFICAR EN ETHERSCAN**

### 7.1 Click en el link de Etherscan (que se mostró arriba)
```
O copia el hash y ve a: https://etherscan.io/
```

### 7.2 Busca el hash
```
Pega el hash en la barra de búsqueda
```

### 7.3 Deberías ver:
```
Status: Success ✓ (o Pending ⏳)
From: 0x05316B102FE62574b9cBd45709f8F1B6C00beC8a
To: tu_direccion_destino
Value: 10 USDT
Gas: 65000 (ejemplo)
```

---

## 📊 **PASO 8: VERIFICAR HISTORIAL**

### 8.1 Vuelve al módulo USD → USDT
### 8.2 Click en la pestaña: **Historial**
### 8.3 Deberías ver tu transferencia listada:
```
✅ 10 USD → USDT
   Hash: 0x1a2b3c4d5e6f...
   Status: Confirmada
   Fecha: hoy
   Etherscan: [Link]
```

---

## ✅ **CHECKLIST FINAL**

- [ ] Abriste el archivo `.env`
- [ ] Agregaste: `ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh`
- [ ] Agregaste: `VITE_ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/mm-9UjI5oG51l94mRH3fh`
- [ ] Guardaste el archivo (Ctrl+S)
- [ ] Ejecutaste: `npm run dev:full`
- [ ] Viste el mensaje: "✅ [Alchemy] Usando RPC URL directo"
- [ ] Abriste: http://localhost:4000/
- [ ] Fuiste al módulo: USD → USDT
- [ ] Viste: "✅ Conexión exitosa a Ethereum Mainnet"

---

## 🎉 **¡COMPLETADO!**

Tu sistema ahora está:
- ✅ Conectado a Ethereum via Alchemy
- ✅ Listo para transferencias reales de USDT
- ✅ Con seguridad verificada
- ✅ Con documentación completa

**Próximos pasos:**
1. Inyecta USDT + ETH si quieres hacer transferencias reales
2. Prueba con montos pequeños primero
3. Verifica siempre en Etherscan

---

## 🆘 **PROBLEMAS COMUNES**

### Problema: "Ni ETH_RPC_URL ni ALCHEMY_API_KEY configurados"
```
✓ Verificar que ETH_RPC_URL está en .env (sin espacios extra)
✓ Reiniciar: npm run dev:full
✓ Si falla, borrar .env y volver a crear
```

### Problema: "Connection refused"
```
✓ Esperar 10 segundos y recargar página
✓ Verificar que localhost:4000 está disponible
✓ Ver si hay errores en consola
```

### Problema: "Invalid Private Key"
```
✓ Verificar que NO empieza con "0x"
✓ Debe tener exactamente 64 caracteres hex
✓ Debe ser de la wallet correcta
```

---

**¿Necesitas ayuda?** Lee los archivos:
- `INSTRUCCIONES_FINALES.md` - Detalles
- `RESUMEN_EJECUTIVO.md` - Resumen
- `ALCHEMY_RPC_CONFIG.md` - Configuración










