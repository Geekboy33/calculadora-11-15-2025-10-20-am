# ⚡ CONFIGURAR SUPABASE EN 5 MINUTOS

## 🎯 **PROBLEMA**
```
❌ Error creando pledge: Supabase not configured
```

## ✅ **SOLUCIÓN RÁPIDA**

### **1️⃣ CREAR CUENTA EN SUPABASE (3 min)**

1. Ir a: **https://app.supabase.com**
2. Crear proyecto → Nombre: `CoreBanking-DAES`
3. Plan: **FREE** (gratis, 500MB)
4. Esperar 2 minutos...

---

### **2️⃣ COPIAR CREDENCIALES (1 min)**

En Supabase:
- **Settings** → **API** → Copiar:
  - ✅ Project URL
  - ✅ anon/public key

---

### **3️⃣ CONFIGURAR .ENV (1 min)**

**Abrir PowerShell y ejecutar:**

```powershell
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'

# Editar con tus credenciales reales:
notepad .env
```

**Pegar esto en el archivo:**

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...TU-KEY-COMPLETA...
VITE_APP_TITLE=CoreBanking System DAES
VITE_APP_VERSION=3.1.0
```

**⚠️ IMPORTANTE:** Reemplaza con tus valores reales

---

### **4️⃣ EJECUTAR SQL (3 min)**

En Supabase: **SQL Editor** → **New Query**

**Copiar y ejecutar TODO ESTO de una vez:**

```sql
-- ========================================
-- SCRIPT COMPLETO DE INICIALIZACIÓN
-- ========================================

-- Tabla de processing state
CREATE TABLE IF NOT EXISTS public.processing_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash TEXT,
  status TEXT NOT NULL,
  progress NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de balances persistentes
CREATE TABLE IF NOT EXISTS public.persistent_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  currency TEXT NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS public.transactions_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  from_account TEXT,
  to_account TEXT,
  reference TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de cuentas ledger
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  account_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  account_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⭐ TABLA CRÍTICA: PLEDGES (LA QUE CAUSA EL ERROR)
CREATE TABLE IF NOT EXISTS public.daes_pledges_cache (
  id BIGSERIAL PRIMARY KEY,
  pledge_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  amount NUMERIC NOT NULL,
  available NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  beneficiary TEXT NOT NULL,
  custody_account_id TEXT,
  expires_at TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de transferencias treasury
CREATE TABLE IF NOT EXISTS public.treasury_transfers (
  id BIGSERIAL PRIMARY KEY,
  external_ref TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  from_account TEXT NOT NULL,
  to_account TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de API keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  key_hash TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'active',
  rate_limit INTEGER DEFAULT 60,
  last_used TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ÍNDICES PARA RENDIMIENTO
-- ========================================

CREATE INDEX IF NOT EXISTS idx_daes_pledges_status ON public.daes_pledges_cache(status);
CREATE INDEX IF NOT EXISTS idx_daes_pledges_custody ON public.daes_pledges_cache(custody_account_id);
CREATE INDEX IF NOT EXISTS idx_daes_pledges_currency ON public.daes_pledges_cache(currency);
CREATE INDEX IF NOT EXISTS idx_treasury_from ON public.treasury_transfers(from_account);
CREATE INDEX IF NOT EXISTS idx_treasury_to ON public.treasury_transfers(to_account);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions_history(user_id);
CREATE INDEX IF NOT EXISTS idx_balances_user ON public.persistent_balances(user_id);

-- ========================================
-- POLÍTICAS RLS (Row Level Security)
-- ========================================

ALTER TABLE public.daes_pledges_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Permitir acceso completo por ahora (puedes restringir después)
CREATE POLICY "Allow all access to daes_pledges_cache" ON public.daes_pledges_cache FOR ALL USING (true);
CREATE POLICY "Allow all access to treasury_transfers" ON public.treasury_transfers FOR ALL USING (true);
CREATE POLICY "Allow all access to api_keys" ON public.api_keys FOR ALL USING (true);

-- ========================================
-- VERIFICACIÓN
-- ========================================

-- Ver todas las tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Hacer clic en "Run"** → Debe aparecer: ✅ **"Success"**

---

### **5️⃣ REINICIAR SERVIDOR**

```powershell
# Detener Node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Reiniciar
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'
npm run dev
```

---

### **6️⃣ PROBAR** ✅

1. Abrir: **http://localhost:4001**
2. Login:
   - Usuario: `ModoDios`
   - Contraseña: `DAES3334`
3. Ir a: **API VUSD**
4. **Crear un Pledge** → Debe funcionar ✅

---

## 🎉 **¡LISTO!**

Ahora puedes:
- ✅ Crear pledges
- ✅ Gestionar cuentas de custodia
- ✅ Ver transferencias
- ✅ Usar todos los módulos

---

## ⚠️ **SI SIGUE FALLANDO**

1. Verificar que el `.env` tiene las credenciales correctas:
```powershell
Get-Content .env
```

2. Verificar que las tablas se crearon:
   - En Supabase: **Table Editor** → Deberías ver `daes_pledges_cache`

3. Ver logs del navegador:
   - **F12** → **Console** → Buscar errores en rojo

---

## 📋 **CHECKLIST**

- [ ] Cuenta Supabase creada
- [ ] Project URL copiada
- [ ] Anon Key copiada
- [ ] Archivo `.env` editado con credenciales reales
- [ ] SQL ejecutado en Supabase (todas las tablas)
- [ ] Servidor reiniciado
- [ ] Login exitoso
- [ ] Pledge creado sin error ✅

---

**Tiempo total:** ~5-8 minutos  
**Dificultad:** ⭐⭐ Fácil  
**Costo:** 💰 GRATIS (plan Free de Supabase)

