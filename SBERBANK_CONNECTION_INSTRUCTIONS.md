# 🏦 Instrucciones para Conexión Real con SberBusinessAPI

## ⚠️ Estado Actual

El sistema está **completamente configurado** en el lado del cliente, pero se requiere un paso adicional en el **Portal de Sberbank** para completar la conexión.

### Error Actual
```
Этот сервис не настроен для работы со Сбер ID
(Este servicio no está configurado para funcionar con Sber ID)

Identificador de error: 1cbe3a9dd941dfff2fef288820a36fc2
```

Este error significa que el **Redirect URI** no está registrado en Sberbank.

---

## 📋 Pasos para Completar la Conexión

### Paso 1: Registrar Redirect URI en Sberbank

1. Ir al portal de desarrolladores de Sberbank: https://developers.sber.ru/
2. Iniciar sesión con las credenciales de empresa
3. Ir a la sección de **Mis Aplicaciones** o **Sber API**
4. Encontrar la aplicación con **Client ID: 25190**
5. En la configuración de OAuth2, agregar el siguiente **Redirect URI**:

```
https://luxliqdaes.cloud/api/sber/callback
```

6. Guardar los cambios

### Paso 2: Verificar Scopes Habilitados

Asegurarse de que los siguientes scopes estén habilitados para la aplicación:

#### Scopes Básicos (OpenID Connect)
- `openid`
- `acr`
- `amr`
- `aud`
- `auth_time`
- `azp`
- `exp`
- `iat`
- `iss`
- `nonce`
- `sid2`
- `sub`

#### Scopes de Negocio (SberBusinessAPI)
- `BANK_CONTROL_STATEMENT`
- `BB_CREATE_LINK_APP`
- `BUSINESS_CARDS_TRANSFER`
- `CARD_ISSUE_CERTIFICATE_REQUEST`
- `CONFIRMATORY_DOCUMENTS_INQUIRY`
- `CORPORATE_CARDS`
- `CRYPTO_CERT_REQUEST_EIO`
- `CURRENCY_OPERATION_DETAILS`
- `CURR_CONTROL_INFO_REQ`
- `CURR_CONTROL_MESSAGE_FROM_BANK`
- `CURR_CONTROL_MESSAGE_TO_BANK`
- `DEPOSIT_REQUEST_DICT`
- `ENCASHMENTS_REQUEST_FILES`
- `GENERIC_LETTER_FROM_BANK`
- `GENERIC_LETTER_TO_BANK`
- `GET_CLIENT_ACCOUNTS`
- `GET_CORRESPONDENTS`
- `GET_CRYPTO_INFO`
- `GET_CRYPTO_INFO_EIO`
- `GET_STATEMENT_ACCOUNT`
- `GET_STATEMENT_TRANSACTION`
- `MINIMUMBALANCE_REQUEST`
- `NOMINAL_ACCOUNTS_ORGNAME_PAYROLL`
- `PAY_DOC_CUR`
- `PAY_DOC_RU`
- `SALARY_AGREEMENT`
- `SBERRATING_REPORT_FILE`
- `SBERRATING_REPORT_LINK`
- `SBERRATING_TRAFFIC_LIGHT`

### Paso 3: Contactar Soporte de Sberbank (si es necesario)

Si el Redirect URI no puede ser agregado desde el portal, contactar al soporte:

📧 **Email de Soporte**: supportdbo2@sberbank.ru

**Asunto**: Solicitud de registro de Redirect URI para Client ID 25190

**Contenido sugerido**:
```
Buenas tardes,

Solicitamos el registro del siguiente Redirect URI para nuestra aplicación 
SberBusinessAPI con Client ID 25190:

Redirect URI: https://luxliqdaes.cloud/api/sber/callback

Servicio: 7328077215_Company
Producto: SberBusinessAPI

Gracias.
```

⏱️ **Tiempo de respuesta estimado**: 1-3 días hábiles

---

## 🔧 Configuración del Sistema (Ya Completada)

### Frontend (Sberbank2ApiModule.tsx)
- ✅ Configuración de OAuth2 implementada
- ✅ Scopes v2 seleccionados (41 scopes)
- ✅ Flujo de autorización implementado
- ✅ Intercambio de código por token implementado
- ✅ Refresh token implementado
- ✅ Llamadas a API implementadas

### Backend (server/index.js)
- ✅ Endpoint de callback OAuth2: `/api/sber/callback`
- ✅ Proxy de token: `/api/sberbank-business/oauth/token`
- ✅ Proxy de API: `/api/sberbank-business/api-call`
- ✅ Health check: `/api/sber-business/health`

### Parámetros Configurados
| Parámetro | Valor |
|-----------|-------|
| Client ID | 25190 |
| Redirect URI | https://luxliqdaes.cloud/api/sber/callback |
| Auth URL | https://online.sberbank.ru/CSAFront/oidc/authorize.do |
| Token URL | https://online.sberbank.ru/CSAFront/oidc/token.do |
| API Base URL | https://api.sberbank.ru/sberbusinessapi |

---

## 🚀 Una vez registrado el Redirect URI

1. Volver al módulo **Sberbank 2 API** en DAES CoreBanking
2. Ir a la pestaña **OAuth2**
3. Hacer clic en **"Abrir Autorización Sber"**
4. Iniciar sesión con las credenciales de Sberbank Business
5. Autorizar los permisos solicitados
6. Sberbank redirigirá a `https://luxliqdaes.cloud/api/sber/callback?code=XXXX`
7. El código se intercambiará automáticamente por tokens
8. El sistema mostrará **"Conectado"** ✅

---

## 📊 Funcionalidades Disponibles después de la Conexión

Una vez conectado, podrás usar:

1. **Cuentas** - Ver cuentas bancarias de la empresa
2. **Estados de Cuenta** - Obtener extractos y movimientos
3. **Pagos** - Crear pagos domésticos (RU) e internacionales (CUR)
4. **Tarjetas Corporativas** - Gestionar tarjetas de empresa
5. **Depósitos** - Ver ofertas y abrir depósitos
6. **Comunicaciones** - Enviar/recibir mensajes del banco
7. **Reportes** - Obtener reportes de SberRating

---

## 📞 Soporte

- **Sberbank API Support**: supportdbo2@sberbank.ru
- **Documentación Oficial**: https://developers.sber.ru/docs/ru/sber-api/overview

---

*Documento generado: 17/01/2026*
*Versión del módulo: SberBusinessAPI v1.0*
