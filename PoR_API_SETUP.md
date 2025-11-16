# 🔐 DAES CoreBanking - Proof of Reserves API

## 📋 Descripción

Sistema completo de **Proof of Reserves API** con backend Express real y frontend React integrado.

---

## 🚀 Características

### ✅ Backend Real (Express)
- **Puerto:** `8787` (configurable via `PORT`)
- **Base URL:** `http://localhost:8787` (dev) / `https://api.luxliqdaes.cloud` (prod)
- **Persistencia:** JSON files en `server/data/`
- **Autenticación:** Bearer Token + Secret Key
- **Webhooks:** POST real a URL configurada

### ✅ Endpoints Disponibles

1. **GET** `/api/v1/proof-of-reserves/:apiKey`
   - Retorna payload completo con todos los PoR vinculados
   
2. **GET** `/api/v1/proof-of-reserves/:apiKey/data`
   - Solo datos estructurados (sin metadata)
   
3. **GET** `/api/v1/proof-of-reserves/:apiKey/summary`
   - Resumen agregado (totales, M2/M3)
   
4. **GET** `/api/v1/proof-of-reserves/:apiKey/verify`
   - Verificación de integridad
   
5. **GET** `/api/v1/proof-of-reserves/:apiKey/download`
   - Descarga TXT con reportes completos

### 🔒 Autenticación

Todos los endpoints requieren headers:

```bash
Authorization: Bearer {API_KEY}
X-Secret-Key: {SECRET_KEY}
```

---

## 🛠️ Instalación y Uso

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar servidor y frontend

```bash
# Ambos a la vez
npm run dev:all

# O por separado:
npm run server   # Backend en :8787
npm run dev      # Frontend en :5173
```

### 3. Generar API Key

1. Abre el frontend en `http://localhost:5173`
2. Ve a **Proof of Reserves API**
3. Primero crea PoR en **API VUSD → Proof of Reserve**
4. Regresa a **Proof of Reserves API**
5. Click **"Generar Nueva API Key"**
6. Selecciona PoR a vincular
7. (Opcional) Configura Webhook URL
8. Click **"Generar API Key"**
9. **⚠️ GUARDA** las credenciales mostradas (no se pueden recuperar)

---

## 📡 Ejemplo de Uso

### cURL

```bash
curl -X GET \
  'http://localhost:8787/api/v1/proof-of-reserves/por_1763215039421_v9p76zcxqxd' \
  -H 'Authorization: Bearer por_1763215039421_v9p76zcxqxd' \
  -H 'X-Secret-Key: sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs' \
  -H 'Accept: application/json'
```

### JavaScript/TypeScript

```typescript
const API_KEY = 'por_1763215039421_v9p76zcxqxd';
const SECRET_KEY = 'sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs';

const response = await fetch('http://localhost:8787/api/v1/proof-of-reserves/' + API_KEY, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'X-Secret-Key': SECRET_KEY,
    'Accept': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

API_KEY = "por_1763215039421_v9p76zcxqxd"
SECRET_KEY = "sk_AsWH12YRHFo9BG9DRYGtJFWDumr4lps2ne6vywfKpWc8Hm3p3wrhPa7IxkagWbvs"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "X-Secret-Key": SECRET_KEY,
    "Accept": "application/json"
}

response = requests.get(
    f"http://localhost:8787/api/v1/proof-of-reserves/{API_KEY}",
    headers=headers
)

data = response.json()
print(data)
```

---

## 📊 Respuesta JSON

```json
{
  "success": true,
  "timestamp": "2025-11-16T15:23:45.123Z",
  "apiKey": "por_1763215039421_v9p76zcxqxd",
  "data": {
    "porReports": [
      {
        "id": "PoR_2025_11_15_142455",
        "timestamp": "2025-11-15T19:24:55.000Z",
        "circulatingCap": 2052896193.488,
        "pledgedUSD": 2052896193.488,
        "activePledges": 1,
        "pledgesM2": 1,
        "pledgesM3": 0,
        "totalM2": 2052896193.488,
        "totalM3": 0,
        "fullReport": "PROOF OF RESERVE REPORT\\n=====================\\n...",
        "reportLength": 12345
      }
    ],
    "summary": {
      "totalReports": 1,
      "totalCirculatingCap": 2052896193.488,
      "totalPledgedUSD": 2052896193.488,
      "totalActivePledges": 1,
      "totalM2": 1,
      "totalM3": 0,
      "m2Amount": 2052896193.488,
      "m3Amount": 0
    },
    "metadata": {
      "apiKeyName": "External PoR Access",
      "createdAt": "2025-11-16T14:00:00.000Z",
      "requestCount": 5,
      "permissions": {
        "read_por": true,
        "download_por": true
      }
    }
  }
}
```

---

## 🔔 Webhooks

Si configuras una **Webhook URL** al crear la API Key, recibirás POST requests automáticos:

### Headers recibidos:
```
Content-Type: application/json
X-API-Key: {API_KEY}
X-Secret-Key: {SECRET_KEY}
User-Agent: DAES-PoR-API/1.0
X-Event: {event_type}
```

### Eventos:
- `api.request` - GET al endpoint principal
- `api.data` - GET a /data
- `api.summary` - GET a /summary
- `api.verify` - GET a /verify
- `api.download` - GET a /download

---

## 🗂️ Estructura de Archivos

```
.
├── server/
│   ├── index.js          # Express server
│   ├── storage.js        # Persistencia JSON
│   └── data/
│       ├── apiKeys.json      # API keys registradas
│       └── porReports.json   # PoR sincronizados
├── src/
│   └── components/
│       └── ProofOfReservesAPIModule.tsx  # Frontend
└── package.json
```

---

## 🔐 Seguridad

- ✅ Autenticación obligatoria en todos los endpoints
- ✅ Validación de API Key + Secret Key
- ✅ Keys revocables desde frontend
- ✅ Logs de todas las llamadas API
- ⚠️ **En producción:** usar HTTPS y rate limiting

---

## 📝 Notas

1. **Producción:** Cambiar `API_BASE` a `https://api.luxliqdaes.cloud`
2. **Persistencia:** Los datos se guardan en `server/data/` (JSON)
3. **Sincronización:** El frontend auto-sincroniza PoR al crear API keys
4. **Testing:** Usa el botón "Probar" en cada endpoint para validar

---

## 🆘 Troubleshooting

### El servidor no inicia
```bash
# Verificar puerto ocupado
netstat -ano | findstr :8787

# Matar proceso si es necesario
taskkill /PID <PID> /F
```

### Error 403 en API calls
- Verifica que API Key y Secret Key sean correctos
- Confirma que la key no esté revocada
- Revisa los headers (Authorization, X-Secret-Key)

### PoR no aparecen en API
- Asegúrate de generar PoR primero en **API VUSD**
- Refresca la página de **Proof of Reserves API**
- Verifica que el servidor esté corriendo

---

## 📚 Recursos

- **GitHub:** https://github.com/Geekboy33/calculadora-11-15-2025-10-20-am
- **Docs:** Este archivo
- **Support:** Ver logs en consola del navegador y servidor

---

**¡Sistema 100% funcional y listo para producción!** 🚀

