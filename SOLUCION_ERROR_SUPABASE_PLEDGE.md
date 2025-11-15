# 🔧 SOLUCIÓN: Error "Supabase not configured" al Crear Pledge

## ❌ **ERROR ACTUAL**

```
Error creando pledge: Supabase not configured
```

Este error ocurre porque el sistema **REQUIERE** credenciales de Supabase para funcionar.

---

## ✅ **SOLUCIÓN COMPLETA - PASO A PASO**

### **PASO 1: Crear Cuenta en Supabase (5 minutos)**

1. Ve a: **https://app.supabase.com**
2. Haz clic en **"Start your project"** o **"New Project"**
3. Ingresa con tu cuenta de GitHub/Google/Email
4. Crea un nuevo proyecto:
   - **Name:** `CoreBanking-DAES` (o el nombre que prefieras)
   - **Database Password:** Guarda esta contraseña en un lugar seguro
   - **Region:** Selecciona el más cercano a ti
   - **Pricing Plan:** **Free** (gratis, 500MB es suficiente para empezar)
5. Espera 2-3 minutos mientras Supabase crea tu proyecto

---

### **PASO 2: Obtener Credenciales (2 minutos)**

1. Una vez creado el proyecto, ve al menú lateral izquierdo
2. Haz clic en **⚙️ Settings** (abajo del todo)
3. Haz clic en **API** en el menú de Settings
4. Copia los siguientes valores:

```
┌─────────────────────────────────────────────────────────────┐
│ Project URL                                                 │
│ https://xxxxxxxxxxxx.supabase.co     [📋 Copiar]          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Project API keys                                            │
│                                                             │
│ anon / public                                               │
│ eyJhbGciOiJIUzI1NiIsInR5c...         [📋 Copiar]          │
└─────────────────────────────────────────────────────────────┘
```

---

### **PASO 3: Configurar Variables de Entorno (1 minuto)**

#### **Opción A: Editar archivo .env (RECOMENDADO)**

1. Abre el archivo `.env` en el directorio raíz del proyecto
2. Reemplaza los valores de ejemplo con tus credenciales reales:

```env
# Supabase Configuration (OBLIGATORIO)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1LXByb3llY3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzg4OTc2MDAsImV4cCI6MTk5NDQ3MzYwMH0.tu-firma-completa

# Configuración opcional
VITE_APP_TITLE=CoreBanking System DAES
VITE_APP_VERSION=3.1.0
```

3. **IMPORTANTE:** Asegúrate de que:
   - ✅ La URL empiece con `https://` y termine con `.supabase.co`
   - ✅ La KEY sea la completa (empieza con `eyJ...`)
   - ✅ No haya espacios ni comillas extras

4. Guarda el archivo

#### **Opción B: Crear .env desde PowerShell**

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

@"
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
VITE_APP_TITLE=CoreBanking System DAES
VITE_APP_VERSION=3.1.0
"@ | Out-File -FilePath .env -Encoding UTF8
```

---

### **PASO 4: Ejecutar Migraciones SQL (5 minutos)**

1. En Supabase, ve al menú lateral: **🗄️ SQL Editor**
2. Haz clic en **"New query"**
3. Abre los archivos SQL del proyecto en orden:

**📁 Ubicación:** `supabase/migrations/`

Ejecuta cada uno en este orden:

#### **1. create_processing_state_table.sql**
```sql
-- Copiar contenido del archivo y ejecutar
```

#### **2. add_file_hash_to_processing_state.sql**
```sql
-- Copiar contenido del archivo y ejecutar
```

#### **3. create_persistent_balances_table.sql**
```sql
-- Copiar contenido del archivo y ejecutar
```

#### **4. create_transactions_history_table.sql**
```sql
-- Copiar contenido del archivo y ejecutar
```

#### **5. add_performance_indexes.sql**
```sql
-- Copiar contenido del archivo y ejecutar
```

#### **6. create_ledger_accounts_table.sql**
```sql
-- Copiar contenido del archivo y ejecutar
```

#### **7. create_daes_pledges_cache.sql** (MUY IMPORTANTE)
```sql
-- Esta tabla es CRÍTICA para crear pledges
CREATE TABLE IF NOT EXISTS public.daes_pledges_cache (
  id BIGSERIAL PRIMARY KEY,
  pledge_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  available NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  custody_account_id TEXT,
  expires_at TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daes_pledges_status ON public.daes_pledges_cache(status);
CREATE INDEX IF NOT EXISTS idx_daes_pledges_custody ON public.daes_pledges_cache(custody_account_id);
CREATE INDEX IF NOT EXISTS idx_daes_pledges_currency ON public.daes_pledges_cache(currency);
```

#### **8. create_treasury_transfers.sql**
```sql
CREATE TABLE IF NOT EXISTS public.treasury_transfers (
  id BIGSERIAL PRIMARY KEY,
  external_ref TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treasury_from ON public.treasury_transfers(from_account);
CREATE INDEX IF NOT EXISTS idx_treasury_to ON public.treasury_transfers(to_account);
```

4. Después de cada query, haz clic en **"Run"** (o presiona F5)
5. Verifica que aparezca: ✅ **"Success. No rows returned"**

---

### **PASO 5: Reiniciar el Servidor (1 minuto)**

1. **Detener el servidor actual:**

```powershell
# PowerShell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

2. **Reiniciar el servidor:**

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'
npm run dev
```

3. El servidor debería iniciar en: **http://localhost:4001/**

---

### **PASO 6: Verificar que Funciona ✅**

1. Abre el navegador en: **http://localhost:4001**
2. Inicia sesión:
   - **Usuario:** `ModoDios`
   - **Contraseña:** `DAES3334`
3. Ve al módulo **"API VUSD"**
4. Intenta crear un pledge
5. **✅ DEBERÍA FUNCIONAR SIN ERRORES**

---

## 🎯 **VERIFICACIÓN RÁPIDA**

Ejecuta esto en PowerShell para verificar que el `.env` existe:

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'
Get-Content .env
```

**Deberías ver:**
```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## 🐛 **TROUBLESHOOTING**

### **Error: "Invalid API key"**
- ✅ Verifica que copiaste la key **completa** (muy larga, ~200+ caracteres)
- ✅ Debe empezar con `eyJ` y NO debe tener espacios

### **Error: "Network error"**
- ✅ Verifica que la URL termine en `.supabase.co`
- ✅ Verifica tu conexión a internet
- ✅ Verifica que el proyecto de Supabase esté activo

### **Error: "relation does not exist"**
- ✅ Ejecuta todas las migraciones SQL del PASO 4
- ✅ La tabla `daes_pledges_cache` es CRÍTICA

### **El archivo .env no se reconoce**
- ✅ Reinicia el servidor después de crear/editar `.env`
- ✅ Verifica que el archivo se llame exactamente `.env` (sin `.txt` u otra extensión)

### **Sigue sin funcionar**
1. Borra el archivo `.env`
2. Crea uno nuevo con este comando:

```powershell
@"
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-KEY-COMPLETA-AQUI
"@ | Out-File -FilePath .env -Encoding UTF8 -NoNewline
```

3. Edita el archivo y reemplaza los valores
4. Reinicia el servidor

---

## 📊 **ESTADO ACTUAL DEL SISTEMA**

| Componente | Estado | Acción Requerida |
|------------|--------|------------------|
| ✅ Servidor Vite | **FUNCIONANDO** | Ninguna - Puerto 4001 |
| ✅ Dependencias npm | **INSTALADAS** | Ninguna - 402 paquetes |
| ✅ Login (ModoDios/DAES3334) | **CONFIGURADO** | Ninguna |
| ❌ Supabase | **NO CONFIGURADO** | **CONFIGURAR AHORA** |
| ❌ Base de datos | **NO CONECTADA** | Ejecutar migraciones SQL |
| ❌ Crear Pledges | **NO FUNCIONA** | Requiere Supabase + SQL |

---

## 🚀 **DESPUÉS DE CONFIGURAR**

Una vez configurado Supabase, podrás usar:

- ✅ **Crear Pledges** en API VUSD, VUSD1, y DAES
- ✅ **Cuentas de Custodia** con persistencia
- ✅ **Historial de Transferencias**
- ✅ **Dashboard con datos reales**
- ✅ **Módulo de Auditoría**
- ✅ **Black Screen bancario**
- ✅ **Ledger de 15 divisas**

---

## 📞 **SOPORTE**

Si después de seguir todos los pasos el error persiste:

1. Verifica la consola del navegador (F12 → Console)
2. Busca errores específicos de Supabase
3. Verifica que el archivo `.env` tenga las credenciales correctas
4. Asegúrate de haber ejecutado TODAS las migraciones SQL

---

**Última actualización:** 2025-11-15  
**Versión del documento:** 1.0  
**Sistema:** CoreBanking DAES v3.1.0

