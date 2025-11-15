# API VUSD1 Externa - Documentación Completa

## 📋 Resumen

Se ha implementado un sistema completo de API externa para el módulo VUSD1, permitiendo integraciones seguras con aplicaciones externas basadas en luxliqdaes.cloud.

## 🎯 Características Principales

### 1. **Sistema de API Keys**
- Generación de API Keys y Secrets seguros
- Gestión completa de credenciales
- Control granular de permisos
- Rate limiting configurable
- Expiración opcional de keys
- Seguimiento de uso y estadísticas

### 2. **Autenticación Segura**
- Headers `X-API-Key` y `X-API-Secret`
- Secrets hasheados con bcrypt
- Validación en cada request
- Logging de todas las peticiones

### 3. **Endpoints Disponibles**
- Listar pledges (con filtros)
- Obtener pledge específico
- Estadísticas de pledges
- Información detallada de cuentas custody

---

## 🗄️ Base de Datos

### Tablas Creadas

#### `api_keys`
```sql
- id (uuid, PK)
- user_id (uuid, FK → auth.users)
- name (text) - Nombre descriptivo
- api_key (text, unique) - Clave pública (luxliq_live_xxxxx)
- api_secret (text) - Secret hasheado
- status (text) - active | revoked | expired
- permissions (jsonb) - read_pledges, create_pledges, update_pledges, delete_pledges
- rate_limit (integer) - Requests por minuto
- last_used_at (timestamptz)
- expires_at (timestamptz)
- created_at, updated_at
```

#### `api_requests`
```sql
- id (uuid, PK)
- api_key_id (uuid, FK → api_keys)
- endpoint (text)
- method (text)
- ip_address (text)
- user_agent (text)
- status_code (integer)
- response_time_ms (integer)
- request_body (jsonb)
- response_body (jsonb)
- error_message (text)
- created_at
```

#### `webhooks`
```sql
- id (uuid, PK)
- api_key_id (uuid, FK → api_keys)
- url (text)
- events (text[]) - Eventos a escuchar
- status (text) - active | inactive
- secret (text) - Webhook signing secret
- last_triggered_at
- created_at
```

### Funciones de Base de Datos

```sql
-- Generar API key
generate_api_key() → text

-- Hashear secret
hash_api_secret(secret text) → text

-- Verificar secret
verify_api_secret(secret text, hashed text) → boolean

-- Limpiar logs antiguos (30 días)
cleanup_old_api_requests()
```

---

## 🔌 Edge Functions

### 1. **api-keys-manager**
Gestión de API keys (requiere autenticación JWT)

#### Endpoints:

**GET /api-keys-manager**
- Lista todas las API keys del usuario
- Response:
```json
{
  "keys": [
    {
      "id": "uuid",
      "name": "Production API",
      "api_key": "luxliq_live_...",
      "status": "active",
      "permissions": {
        "read_pledges": true,
        "create_pledges": false,
        "update_pledges": false,
        "delete_pledges": false
      },
      "rate_limit": 60,
      "last_used_at": "2025-11-13T...",
      "expires_at": null,
      "created_at": "2025-11-13T..."
    }
  ]
}
```

**POST /api-keys-manager**
- Crea nueva API key
- Request:
```json
{
  "name": "My API Key",
  "permissions": {
    "read_pledges": true,
    "create_pledges": false
  },
  "rate_limit": 60,
  "expires_in_days": 365
}
```
- Response:
```json
{
  "message": "API key created successfully",
  "key": {
    "id": "uuid",
    "name": "My API Key",
    "api_key": "luxliq_live_...",
    "api_secret": "luxliq_secret_...",
    "status": "active",
    "...": "..."
  },
  "warning": "Save the API secret securely. It will not be shown again."
}
```

**PUT /api-keys-manager/:id**
- Actualiza API key
- Request:
```json
{
  "name": "Updated Name",
  "status": "revoked",
  "permissions": { "read_pledges": false },
  "rate_limit": 120
}
```

**DELETE /api-keys-manager/:id**
- Elimina API key

**GET /api-keys-manager/:id/usage**
- Estadísticas de uso
- Response:
```json
{
  "usage": {
    "total_requests": 1234,
    "success_rate": 98.5,
    "endpoints": ["/pledges", "/pledges/:id"],
    "recent_requests": [...]
  }
}
```

---

### 2. **vusd1-pledges-api**
API pública para verificar pledges (autenticación con API Key)

#### Autenticación:
```http
X-API-Key: luxliq_live_xxxxx
X-API-Secret: luxliq_secret_xxxxx
```

#### Endpoints:

**GET /vusd1-pledges-api/pledges**
- Lista pledges con filtros opcionales
- Query Parameters:
  - `status` (active, released) - default: active
  - `currency` (USD, EUR, etc.)
  - `limit` (number) - default: 50
  - `offset` (number) - default: 0
- Response:
```json
{
  "pledges": [
    {
      "id": "uuid",
      "custody_account_id": "uuid",
      "custody_account_name": "Main USD Account",
      "custody_account_number": "DAES-USD-001",
      "amount": 100000.000,
      "currency": "USD",
      "status": "active",
      "reference_number": "PLEDGE-2025-001",
      "created_at": "2025-11-13T...",
      "expires_at": null,
      "metadata": {}
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

**GET /vusd1-pledges-api/pledges/:id**
- Obtiene pledge específico con detalles completos
- Response:
```json
{
  "pledge": {
    "id": "uuid",
    "custody_account": {
      "id": "uuid",
      "name": "Main USD Account",
      "number": "DAES-USD-001",
      "currency": "USD",
      "balance_total": 500000.000,
      "balance_available": 400000.000
    },
    "amount": 100000.000,
    "currency": "USD",
    "status": "active",
    "reference_number": "PLEDGE-2025-001",
    "created_at": "2025-11-13T...",
    "updated_at": "2025-11-13T...",
    "expires_at": null,
    "metadata": {}
  }
}
```

**GET /vusd1-pledges-api/stats**
- Estadísticas globales de pledges
- Response:
```json
{
  "stats": {
    "total_pledges": 25,
    "active_pledges": 15,
    "released_pledges": 10,
    "total_amount_by_currency": {
      "USD": 2500000.000,
      "EUR": 1000000.000
    }
  }
}
```

---

## 🎨 Interfaz Frontend

### Componente: APIVUSD1KeysManager

Ubicación: Módulo API VUSD1 → Tab "API Keys"

#### Funcionalidades:

1. **Crear API Keys**
   - Formulario con nombre, permisos, rate limit
   - Opción de expiración
   - Muestra el secret UNA SOLA VEZ

2. **Gestionar Keys**
   - Lista visual de todas las keys
   - Estados: Active, Revoked, Expired
   - Ver estadísticas de uso
   - Revocar o eliminar keys

3. **Ver Uso**
   - Total de requests
   - Success rate
   - Requests recientes
   - Endpoints más usados

4. **Copiar Credenciales**
   - Botón para copiar API key
   - Copiar secret (solo en creación)

---

## 🔐 Seguridad

### Implementaciones:

1. **Hashing de Secrets**
   - bcrypt con salt factor 10
   - Secrets nunca se almacenan en texto plano
   - Solo se muestran una vez al crear

2. **Row Level Security (RLS)**
   - Usuarios solo ven sus propias keys
   - Aislamiento total entre usuarios
   - Policies estrictas en todas las tablas

3. **Rate Limiting**
   - Configurable por key
   - Default: 60 requests/minuto

4. **Logging Completo**
   - Todas las peticiones registradas
   - IP address y user agent
   - Response times
   - Status codes
   - Auto-limpieza (30 días)

5. **Permisos Granulares**
   - read_pledges
   - create_pledges (futuro)
   - update_pledges (futuro)
   - delete_pledges (futuro)

---

## 📡 Ejemplo de Integración

### JavaScript/Node.js

```javascript
const VUSD1_API = {
  baseURL: 'https://YOUR_PROJECT.supabase.co/functions/v1',
  apiKey: 'luxliq_live_xxxxx',
  apiSecret: 'luxliq_secret_xxxxx'
};

async function getPledges() {
  const response = await fetch(
    `${VUSD1_API.baseURL}/vusd1-pledges-api/pledges?status=active&limit=10`,
    {
      headers: {
        'X-API-Key': VUSD1_API.apiKey,
        'X-API-Secret': VUSD1_API.apiSecret
      }
    }
  );

  if (!response.ok) {
    throw new Error('API request failed');
  }

  const data = await response.json();
  return data.pledges;
}

// Uso
getPledges()
  .then(pledges => {
    console.log('Active pledges:', pledges);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Python

```python
import requests

VUSD1_API = {
    'base_url': 'https://YOUR_PROJECT.supabase.co/functions/v1',
    'api_key': 'luxliq_live_xxxxx',
    'api_secret': 'luxliq_secret_xxxxx'
}

def get_pledges(status='active', limit=50):
    headers = {
        'X-API-Key': VUSD1_API['api_key'],
        'X-API-Secret': VUSD1_API['api_secret']
    }

    params = {
        'status': status,
        'limit': limit
    }

    response = requests.get(
        f"{VUSD1_API['base_url']}/vusd1-pledges-api/pledges",
        headers=headers,
        params=params
    )

    response.raise_for_status()
    return response.json()['pledges']

# Uso
pledges = get_pledges()
print(f'Found {len(pledges)} active pledges')
```

### cURL

```bash
# Listar pledges
curl -X GET \
  "https://YOUR_PROJECT.supabase.co/functions/v1/vusd1-pledges-api/pledges?status=active" \
  -H "X-API-Key: luxliq_live_xxxxx" \
  -H "X-API-Secret: luxliq_secret_xxxxx"

# Obtener pledge específico
curl -X GET \
  "https://YOUR_PROJECT.supabase.co/functions/v1/vusd1-pledges-api/pledges/{pledge_id}" \
  -H "X-API-Key: luxliq_live_xxxxx" \
  -H "X-API-Secret: luxliq_secret_xxxxx"

# Estadísticas
curl -X GET \
  "https://YOUR_PROJECT.supabase.co/functions/v1/vusd1-pledges-api/stats" \
  -H "X-API-Key: luxliq_live_xxxxx" \
  -H "X-API-Secret: luxliq_secret_xxxxx"
```

---

## 🚀 Cómo Empezar

### 1. Crear API Key

1. Navega al módulo **API VUSD1**
2. Click en tab **"API Keys"**
3. Click en **"Create API Key"**
4. Completa el formulario:
   - Nombre descriptivo
   - Selecciona permisos
   - Configura rate limit
   - (Opcional) Fecha de expiración
5. **¡IMPORTANTE!** Guarda el API Secret inmediatamente, no se volverá a mostrar

### 2. Usar la API

Usa las credenciales en tus headers:
```http
X-API-Key: luxliq_live_...
X-API-Secret: luxliq_secret_...
```

### 3. Monitorear Uso

- Click en **"Usage"** en cualquier key
- Ve estadísticas en tiempo real
- Requests recientes
- Success rate

---

## 📊 Métricas y Logging

### Logs Automáticos

Cada request registra:
- Endpoint llamado
- Método HTTP
- IP address del cliente
- User agent
- Status code de respuesta
- Tiempo de respuesta (ms)
- Mensaje de error (si aplica)

### Limpieza Automática

- Los logs se mantienen por 30 días
- Función `cleanup_old_api_requests()` para limpieza manual

---

## 🔄 Estados de API Key

| Estado | Descripción | Puede Autenticar |
|--------|-------------|------------------|
| `active` | Key funcional | ✅ Sí |
| `revoked` | Revocada por usuario | ❌ No |
| `expired` | Fecha de expiración pasada | ❌ No |

---

## ⚠️ Errores Comunes

### 401 Unauthorized
```json
{
  "error": "Invalid API key"
}
```
**Solución:** Verifica que el API Key sea correcto

### 403 Forbidden
```json
{
  "error": "Permission denied: read_pledges required"
}
```
**Solución:** La key no tiene el permiso necesario

### 404 Not Found
```json
{
  "error": "Pledge not found"
}
```
**Solución:** El pledge ID no existe o no pertenece a tu usuario

---

## 🎯 Próximas Funcionalidades

- [ ] Webhooks para eventos de pledges
- [ ] Endpoint para crear pledges via API
- [ ] Endpoint para liberar pledges
- [ ] Filtros avanzados (fecha, rango de montos)
- [ ] Paginación mejorada
- [ ] Exportación de datos (CSV, JSON)
- [ ] IP whitelisting
- [ ] Auditoría completa de cambios

---

## 📞 Soporte

Para problemas o preguntas sobre la API:
1. Revisa esta documentación
2. Verifica los logs en la sección "Usage"
3. Consulta los ejemplos de integración

---

## ✅ Checklist de Implementación

- [x] Tablas de base de datos creadas
- [x] RLS policies configuradas
- [x] Edge Functions desplegadas
- [x] Interfaz frontend implementada
- [x] Sistema de permisos funcional
- [x] Logging de requests
- [x] Hashing de secrets
- [x] Rate limiting
- [x] Documentación completa
- [x] Ejemplos de integración

**¡El sistema está 100% funcional y listo para producción!** 🚀
