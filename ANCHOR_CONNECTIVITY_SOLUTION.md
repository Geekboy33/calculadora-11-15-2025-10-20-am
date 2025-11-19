# 🔧 SOLUCIÓN: Conectividad Anchor ↔ DAES API

## ❌ PROBLEMA IDENTIFICADO

```
Error: getaddrinfo ENOTFOUND api.luxliqdaes.cloud
```

**Causa:** El dominio `api.luxliqdaes.cloud` NO resuelve en DNS público

---

## ✅ SOLUCIONES DISPONIBLES

### OPCIÓN A: Configurar DNS Público (RECOMENDADO)

**Pasos:**

1. **Obtener IP pública del servidor DAES**
```bash
# En el servidor DAES, ejecutar:
curl ifconfig.me
# Ejemplo: 203.0.113.45
```

2. **Configurar DNS en Cloudflare/Route53:**
```
Tipo: A
Nombre: api.luxliqdaes.cloud
Valor: [IP_PUBLICA]
TTL: 300 (5 minutos)
Proxy: Desactivado (DNS only)
```

3. **Verificar que resuelva:**
```bash
dig api.luxliqdaes.cloud +short
# Debe retornar la IP
```

4. **Confirmar que el servidor escucha en puerto 443:**
```bash
curl -I https://api.luxliqdaes.cloud
# Debe retornar HTTP response (no "Could not resolve")
```

---

### OPCIÓN B: Usar Netlify como Proxy

**Ventaja:** No necesitas configurar DNS ni servidor propio

**Implementación:**

1. **Ya está implementado en:** `netlify/functions/proof-of-reserves.ts`

2. **Configurar en Netlify Environment Variables:**
```bash
DAES_API_KEY=por_1763273935407_lvnh05f90fl
DAES_SECRET_KEY=sk_oKDnjjt1wrEeSHLaShWvyCpc8gFekY3OlkwgQbAEY7tRfdZZy36vD15lo2PfrYwe
API_BASE=http://localhost:8788  # O IP pública si tienes
```

3. **Anchor usará:**
```
https://luxliqdaes.cloud/.netlify/functions/proof-of-reserves
```

En lugar de:
```
https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/...
```

4. **Configurar en Anchor (anchor.vergy.world):**
```bash
DAES_API_BASE=https://luxliqdaes.cloud/.netlify/functions/proof-of-reserves
```

---

### OPCIÓN C: Cloudflare Tunnel

**Si el servidor está en red privada:**

1. **Instalar Cloudflare Tunnel:**
```bash
# En servidor DAES
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o cloudflared
chmod +x cloudflared
```

2. **Crear túnel:**
```bash
cloudflared tunnel create daes-api
cloudflared tunnel route dns daes-api api.luxliqdaes.cloud
```

3. **Configurar túnel:**
```yaml
# config.yml
tunnel: [tunnel-id]
credentials-file: /path/to/credentials.json

ingress:
  - hostname: api.luxliqdaes.cloud
    service: http://localhost:8788
  - service: http_status:404
```

4. **Iniciar túnel:**
```bash
cloudflared tunnel run daes-api
```

5. **Verificar:**
```bash
curl https://api.luxliqdaes.cloud/health
```

---

### OPCIÓN D: Cambiar a Dominio Existente

**Si luxliqdaes.cloud ya funciona:**

Usar:
```
https://luxliqdaes.cloud/api/v1/proof-of-reserves/...
```

En lugar de:
```
https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/...
```

**Ventaja:** No necesitas subdomain, usa dominio principal

---

## 🧪 TESTS DE VERIFICACIÓN

### Test 1: DNS Resuelve
```bash
dig api.luxliqdaes.cloud +short
# ✅ Debe retornar IP pública
# ❌ Si vacío → DNS no configurado
```

### Test 2: HTTPS Responde
```bash
curl -I https://api.luxliqdaes.cloud
# ✅ HTTP/1.1 200 OK (o 401/403)
# ❌ Could not resolve host → DNS falla
```

### Test 3: Endpoint Funciona
```bash
curl https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/por_1763273935407_lvnh05f90fl/summary \
  -H "Authorization: Bearer por_1763273935407_lvnh05f90fl" \
  -H "X-Secret-Key: sk_oKDnjjt1wrEeSHLaShWvyCpc8gFekY3OlkwgQbAEY7tRfdZZy36vD15lo2PfrYwe"

# ✅ Debe retornar JSON:
{
  "success": true,
  "data": { ... }
}

# ❌ Si HTML → endpoint incorrecto
# ❌ Si error 404 → ruta incorrecta
```

### Test 4: Desde Anchor (Backend)
```javascript
// En anchor.vergy.world backend
const response = await fetch('https://api.luxliqdaes.cloud/api/v1/proof-of-reserves/por_1763273935407_lvnh05f90fl/summary', {
  headers: {
    'Authorization': 'Bearer por_1763273935407_lvnh05f90fl',
    'X-Secret-Key': 'sk_oKDnjjt1wrEeSHLaShWvyCpc8gFekY3OlkwgQbAEY7tRfdZZy36vD15lo2PfrYwe'
  }
});

console.log(await response.json());
// ✅ Debe funcionar sin ENOTFOUND
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Para Configurar DNS (Opción A):
```
□ Obtener IP pública del servidor DAES
□ Acceder a panel DNS (Cloudflare/Route53)
□ Crear registro A: api.luxliqdaes.cloud → [IP]
□ Esperar propagación (5-10 min)
□ Verificar con: dig api.luxliqdaes.cloud
□ Confirmar HTTPS funciona
□ Probar endpoint desde curl
□ Actualizar Anchor con nueva URL
```

### Para Usar Netlify Proxy (Opción B):
```
□ Variables de entorno en Netlify configuradas
□ Función serverless desplegada
□ Anchor apunta a /.netlify/functions/
□ Test desde Anchor funciona
```

### Para Cloudflare Tunnel (Opción C):
```
□ Cloudflared instalado en servidor
□ Túnel creado y configurado
□ DNS automático configurado
□ Túnel corriendo (daemon)
□ Verificar acceso público
□ Anchor puede conectarse
```

---

## 🎯 RECOMENDACIÓN

**Mejor opción según escenario:**

1. **Si tienes servidor con IP pública → OPCIÓN A (DNS)**
   - Más directo
   - Mejor performance
   - Control total

2. **Si servidor en red privada → OPCIÓN C (Cloudflare Tunnel)**
   - Seguro
   - Sin exponer IP
   - Fácil de configurar

3. **Si no quieres servidor propio → OPCIÓN B (Netlify Proxy)**
   - Serverless
   - Escalable
   - Sin mantenimiento

---

## ⚠️ IMPORTANTE

**Mientras no se resuelva, Anchor NO PUEDE:**
- ❌ Consultar Proof of Reserves
- ❌ Calcular CIRC_CAP
- ❌ Obtener pledges activos
- ❌ Publicar datos on-chain

**Todas estas operaciones fallarán con:**
```
Error: getaddrinfo ENOTFOUND api.luxliqdaes.cloud
```

---

## 📞 RESPUESTA NECESARIA

Por favor confirma:

1. ✅ Qué solución implementarás (A, B, C, o D)
2. ✅ URL final del API (ejemplo: https://api-prod.luxliq.com)
3. ✅ IP pública del servidor (si aplica)
4. ✅ Resultados de tests (dig, curl)

**Una vez configurado, el Anchor podrá conectarse sin problemas.**

