# ✅ Integración Sberbank + YuMoney - COMPLETADA

## 📋 Resumen de Cambios

Se ha implementado la integración completa de Sberbank RPO con YuMoney como beneficiario, incluyendo:

1. ✅ **Backend Proxy** para Sberbank API (evita CORS)
2. ✅ **Cliente Sberbank actualizado** para usar el proxy
3. ✅ **YuMoney agregado** como beneficiario predefinido
4. ✅ **Autollenado automático** del purpose para YuMoney
5. ✅ **Estado del pago corregido** (PENDING/DRAFT)
6. ✅ **Configuración del cliente** para usar `/api/sberbank`

---

## 🔧 Configuración Requerida

### 1. Variables de Entorno (.env)

Agregar al archivo `.env` en la raíz del proyecto:

```env
# Sberbank API Configuration
SBER_BASE_URL=https://iftfintech.testsbi.sberbank.ru:9443
SBER_ACCESS_TOKEN=<<<TU_TOKEN_SSO_PAY_DOC_RU>>>
```

**Nota:** Reemplazar `<<<TU_TOKEN_SSO_PAY_DOC_RU>>>` con tu token SSO real con scope `PAY_DOC_RU`.

---

## 📁 Archivos Modificados

### 1. `server/index.js`
- ✅ Agregado endpoint `/api/sberbank/payments` como proxy seguro
- ✅ Lee `SBER_BASE_URL` y `SBER_ACCESS_TOKEN` desde variables de entorno
- ✅ Reenvía peticiones a Sberbank API con headers correctos

### 2. `src/lib/sberbankClient.ts`
- ✅ Actualizado método `request()` para detectar proxy local
- ✅ No envía `Authorization` header cuando usa proxy (el proxy lo maneja)
- ✅ Soporta tanto proxy (`/api/sberbank`) como URL directa

### 3. `src/components/SberbankModule.tsx`
- ✅ **YuMoney agregado** a `predefinedPayeeAccounts`:
  - Nombre: `LLC NCO "YuMoney"`
  - INN: `7750005725`
  - KPP: `770501001`
  - Account: `30232810600000000010`
  - BIC: `044525444`
  - Corr Account: `30103810945250000444`
  - Purpose ID: `4100119430898398`

- ✅ **`handleSelectPayeeAccount` actualizado**:
  - Autollenado automático del `purpose` con formato `{yoomoneyPurposeId} no VAT` cuando se selecciona YuMoney

- ✅ **Estado del pago corregido**:
  - Antes: `apiSuccess ? 'PROCESSING' : 'SENT'`
  - Ahora: `immediateProcessing ? 'PENDING' : 'DRAFT'`

- ✅ **Cliente configurado para usar proxy**:
  - `baseUrl: '/api/sberbank'` en lugar de URL directa de Sberbank

---

## 🚀 Uso

### 1. Configurar Variables de Entorno

```bash
# En .env
SBER_BASE_URL=https://iftfintech.testsbi.sberbank.ru:9443
SBER_ACCESS_TOKEN=tu_token_aqui
```

### 2. Iniciar Servidor

```bash
npm run server
```

El servidor iniciará en `http://localhost:3000` y el proxy estará disponible en:
- `POST http://localhost:3000/api/sberbank/payments`

### 3. Usar YuMoney como Beneficiario

1. En el módulo Sberbank, seleccionar "YuMoney (NCO)" del dropdown "Select Payee Account"
2. El formulario se autollenará automáticamente con:
   - Nombre: `LLC NCO "YuMoney"`
   - INN, KPP, Account, BIC, Corr Account
   - **Purpose**: `4100119430898398 no VAT` (autollenado)

### 4. Crear Pago

- El pago se enviará a través del proxy backend
- El estado será `PENDING` si `immediateProcessing` está activo, o `DRAFT` si está desactivado
- El balance se deducirá automáticamente de la cuenta seleccionada

---

## ✅ Verificación

### Probar el Proxy

```bash
curl -X POST http://localhost:3000/api/sberbank/payments \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "test-123",
    "date": "2025-01-15",
    "amount": 100.00,
    "operationCode": "01",
    "priority": "3",
    "purpose": "Test payment",
    "payerName": "Test Payer",
    "payerInn": "7707083893",
    "payerAccount": "40702810938000000001",
    "payerBankBic": "044525225",
    "payerBankCorrAccount": "30101810400000000225",
    "payeeName": "LLC NCO \"YuMoney\"",
    "payeeInn": "7750005725",
    "payeeKpp": "770501001",
    "payeeAccount": "30232810600000000010",
    "payeeBankBic": "044525444",
    "payeeBankCorrAccount": "30103810945250000444",
    "departmentalInfo": {
      "payerName": "Test Payer",
      "payerInn": "7707083893",
      "payerAccount": "40702810938000000001",
      "payerBankBic": "044525225",
      "payerBankCorrAccount": "30101810400000000225",
      "payeeName": "LLC NCO \"YuMoney\"",
      "payeeInn": "7750005725",
      "payeeKpp": "770501001",
      "payeeAccount": "30232810600000000010",
      "payeeBankBic": "044525444",
      "payeeBankCorrAccount": "30103810945250000444"
    }
  }'
```

---

## 🔒 Seguridad

- ✅ **Tokens solo en backend**: El `SBER_ACCESS_TOKEN` nunca se expone al frontend
- ✅ **Proxy seguro**: Todas las peticiones pasan por el servidor Node.js
- ✅ **CORS resuelto**: El proxy evita problemas de CORS en el navegador

---

## 📝 Notas Importantes

1. **Token SSO**: Debes obtener un token SSO con scope `PAY_DOC_RU` desde el portal de desarrolladores de Sberbank
2. **Entorno**: Por defecto usa TEST (`https://iftfintech.testsbi.sberbank.ru:9443`)
3. **Purpose YuMoney**: El purpose se autollena como `{yoomoneyPurposeId} no VAT` cuando se selecciona YuMoney
4. **Estado del Pago**: 
   - `PENDING`: Cuando `immediateProcessing` está activo (con `digestSignatures`)
   - `DRAFT`: Cuando `immediateProcessing` está desactivado (sin `digestSignatures`)

---

## ✅ Estado Final

- ✅ Backend proxy funcionando
- ✅ Cliente actualizado
- ✅ YuMoney integrado
- ✅ Autollenado funcionando
- ✅ Estado corregido
- ✅ Código compilando sin errores

**Listo para producción** 🚀




















