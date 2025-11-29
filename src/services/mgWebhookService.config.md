# Configuración del Servicio MG Webhook

## Variables de Entorno

Para configurar el servicio de webhook de MG Productive Investments, agrega la siguiente variable de entorno en tu archivo `.env`:

### Frontend (Vite)
```env
# MG Webhook Service Configuration
VITE_MG_WEBHOOK_URL=https://api.mgproductiveinvestments.com/webhook/dcb/transfer
```

### Backend (Node.js)
```env
# MG Webhook Service Configuration
MG_WEBHOOK_URL=https://api.mgproductiveinvestments.com/webhook/dcb/transfer
```

## Valor por Defecto

Si no se configura la variable de entorno, el servicio usará automáticamente:
```
https://api.mgproductiveinvestments.com/webhook/dcb/transfer
```

## Ejemplo de Archivo .env Completo

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MG Webhook Service
VITE_MG_WEBHOOK_URL=https://api.mgproductiveinvestments.com/webhook/dcb/transfer

# Otras configuraciones
VITE_APP_TITLE=CoreBanking System DAES
VITE_APP_VERSION=3.1.0
```

## Notas Importantes

1. **URL del Webhook**: La URL debe ser accesible desde tu servidor DAES
2. **HTTPS**: El servicio requiere conexión HTTPS segura
3. **Timeout**: El timeout por defecto es de 15 segundos
4. **Formato de Datos**: El servicio envía datos en formato JSON estricto según la especificación de MG

## Integración con BankSettlementModule

Este servicio está diseñado para ser integrado con el módulo de liquidación bancaria (`BankSettlementModule`). 

Flujo recomendado:
1. Usuario crea una instrucción de liquidación en `BankSettlementModule`
2. El sistema valida saldo y debita el ledger interno
3. Se llama a `sendTransferToMG()` con los parámetros de la transferencia
4. Si la respuesta es 200 OK, se marca la transacción como enviada
5. Se actualiza el estado en el ledger y se registra en el audit log

