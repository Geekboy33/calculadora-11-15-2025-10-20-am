# 🔄 Configuración de Supabase para Sincronización en Tiempo Real

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TÚ (País A) - DCB Treasury                      │
│                                                                     │
│   [Banco deposita USD] → [Crear Lock] → [First Signature]          │
│                              │                                      │
│                              ▼                                      │
│                     ┌────────────────┐                              │
│                     │   SUPABASE     │  ← Cloud Database            │
│                     │   Real-time    │  ← WebSocket Sync            │
│                     └────────────────┘                              │
│                              │                                      │
│                              ▼                                      │
│   [Recibe notificación] ← [Lock Approved] ← [VUSD Minted]          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                               ↑↓
                        Sincronización
                          Tiempo Real
                               ↑↓
┌─────────────────────────────────────────────────────────────────────┐
│                  OPERADOR (País B) - LemonMinted                    │
│                                                                     │
│   [Recibe Lock automáticamente] → [Aprobar] → [Second Signature]   │
│                                       │                             │
│                                       ▼                             │
│                              [Mint VUSD en Blockchain]              │
│                                       │                             │
│                                       ▼                             │
│                      [Notificar a DCB Treasury]                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Paso 1: Crear Cuenta en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta gratuita (el plan free incluye):
   - 500 MB de base de datos
   - Realtime ilimitado
   - 2 GB de transferencia
3. Crea un nuevo proyecto:
   - Nombre: `lemonminted-sync`
   - Región: Selecciona la más cercana a ambos países
   - Password: Genera uno seguro y guárdalo

## Paso 2: Obtener Credenciales

1. En tu proyecto de Supabase, ve a **Settings** → **API**
2. Copia:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (la llave larga)

## Paso 3: Crear las Tablas

1. En Supabase, ve a **SQL Editor**
2. Copia y pega todo el contenido de `supabase/schema.sql`
3. Click en **Run** para ejecutar

## Paso 4: Habilitar Realtime

1. Ve a **Database** → **Replication**
2. Encuentra la sección "Realtime" 
3. Habilita para las tablas:
   - ✅ `locks`
   - ✅ `mints`
   - ✅ `notifications`

## Paso 5: Configurar .env

### En DCB Treasury (País A):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_PLATFORM_ID=dcb
```

### En LemonMinted (País B):

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key
VITE_PLATFORM_ID=lemonminted
```

**⚠️ IMPORTANTE**: Ambas plataformas usan las MISMAS credenciales de Supabase, pero diferente `PLATFORM_ID`.

## Paso 6: Verificar Conexión

Cuando inicies la aplicación, deberías ver en la consola:

```
✅ [Supabase] Connected - Platform: LEMONMINTED
📡 [Supabase] Locks channel: SUBSCRIBED
📡 [Supabase] Mints channel: SUBSCRIBED
📡 [Supabase] Notifications channel: SUBSCRIBED
```

## Flujo de Operación

### 1. DCB Treasury crea un Lock:
```
DCB Treasury → Supabase → Notificación → LemonMinted
```

### 2. LemonMinted aprueba y mintea:
```
LemonMinted → Aprueba Lock → Mint VUSD → Supabase → Notificación → DCB Treasury
```

### 3. Ambos ven el mismo estado:
- Locks pendientes
- Locks aprobados
- Mints completados
- Estadísticas sincronizadas

## Seguridad

- ✅ Row Level Security (RLS) habilitado
- ✅ Audit log de todas las operaciones
- ✅ Solo usuarios autenticados pueden escribir
- ✅ Datos encriptados en tránsito (HTTPS/WSS)

## Costos (Plan Free)

| Recurso | Límite Free | Suficiente para |
|---------|-------------|-----------------|
| Database | 500 MB | ~1 millón de locks |
| Realtime | Ilimitado | ✅ |
| API Requests | 500K/mes | ✅ |
| Transferencia | 2 GB/mes | ✅ |

Para volumen de producción pequeño-mediano, el plan gratuito es suficiente.

## Troubleshooting

### "Not connected"
- Verifica las credenciales en `.env`
- Asegúrate que el proyecto de Supabase esté activo

### "Realtime not working"
- Ve a Database → Replication y habilita las tablas
- Verifica que ejecutaste el schema SQL completo

### "Permission denied"
- Verifica que las políticas RLS estén creadas
- Ejecuta nuevamente la sección de RLS del schema
