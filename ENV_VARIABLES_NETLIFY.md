# 🔐 Variables de Entorno para Netlify

## Configuración en Netlify Dashboard

### Paso 1: Ir a Environment Variables

```
1. Abre tu sitio en Netlify
2. Site settings → Environment variables
3. Click "Add a variable"
```

### Paso 2: Agregar Variables

**IMPORTANTE:** Estas claves deben ser NUEVAS (rotar las expuestas)

```bash
# Proof of Reserves API
DAES_API_KEY=por_[NUEVA_CLAVE_GENERADA]
DAES_SECRET_KEY=sk_[NUEVA_CLAVE_GENERADA_64_CHARS]

# API Base URL
API_BASE=https://api.luxliqdaes.cloud

# Webhook Secret
DAES_WEBHOOK_SECRET=whsec_[NUEVA_CLAVE_GENERADA]
```

### Paso 3: Regenerar Deploy

```
1. Click "Trigger deploy"
2. Las nuevas variables estarán disponibles
```

---

## 🔄 Cómo Rotar Claves

### 1. Generar Nuevas Claves

```javascript
// En consola local
const newApiKey = `por_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
const newSecret = `sk_${crypto.randomBytes(32).toString('base64')}`;
console.log('API Key:', newApiKey);
console.log('Secret:', newSecret);
```

### 2. Actualizar en Netlify

```
1. Netlify Dashboard → Environment variables
2. Edit DAES_API_KEY → Pegar nueva key
3. Edit DAES_SECRET_KEY → Pegar nuevo secret
4. Save
5. Trigger deploy
```

### 3. Actualizar en Anchor VUSD

```
En https://anchor.vergy.world
Variables de entorno:
DAES_API_KEY=[nueva key]
DAES_SECRET_KEY=[nuevo secret]
```

---

## ⚠️ Claves Expuestas (DEPRECADAS)

**NO USAR ESTAS - Ya están en GitHub:**

```
❌ DAES_API_KEY=por_1763215039421_v9p76zcxqxd
❌ DAES_SECRET_KEY=sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs
```

**Generar NUEVAS claves siguiendo Paso 1 arriba.**

---

## ✅ Seguridad

- ✅ Claves en variables de entorno de Netlify
- ✅ NO en código fuente
- ✅ Función serverless como proxy
- ✅ Frontend solo llama /.netlify/functions/
- ✅ Claves nunca expuestas al navegador

