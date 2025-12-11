# 🚀 CÓMO INICIAR EL SERVIDOR

## ✅ Estado Actual
- **Puerto:** 3000
- **URL:** http://localhost:3000
- **Endpoint Webhook:** http://localhost:3000/api/mg-webhook/transfer

---

## 📋 PASOS PARA INICIAR EL SERVIDOR

### Opción 1: Comando Simple (Recomendado)
```powershell
npm run server
```

### Opción 2: Comando Directo
```powershell
node server/index.js
```

### Opción 3: Iniciar Todo (Frontend + Backend)
```powershell
npm run dev:all
```

---

## ✅ VERIFICAR QUE ESTÁ CORRIENDO

### 1. Verificar en la Terminal
Deberías ver estos mensajes:
```
[PoR API] Server listening on http://localhost:3000
[MG Webhook Proxy] Proxy endpoint available at http://localhost:3000/api/mg-webhook/transfer
```

### 2. Verificar en el Navegador
Abre: **http://localhost:3000**

Si ves un error 404 o "Cannot GET /", **ES NORMAL**. El servidor está funcionando, solo que la ruta raíz no tiene una página HTML.

### 3. Probar el Endpoint
Abre en el navegador o usa curl:
```
http://localhost:3000/api/mg-webhook/transfer
```

---

## 🔧 SOLUCIÓN DE PROBLEMAS

### Error: "Puerto 3000 ya está en uso"
```powershell
# Detener todos los procesos de Node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Luego iniciar de nuevo
npm run server
```

### Error: "Cannot find module"
```powershell
# Reinstalar dependencias
npm install
```

### El servidor no responde
1. Verifica que el puerto esté libre:
   ```powershell
   netstat -ano | findstr ":3000"
   ```
2. Si hay un proceso LISTENING, el servidor está corriendo
3. Si no hay nada, inicia el servidor con `npm run server`

---

## 📝 NOTAS IMPORTANTES

- El servidor **NO** tiene una página de inicio en la raíz (`/`)
- El servidor está diseñado para ser una **API**, no un sitio web
- Para usar el frontend, necesitas iniciar también Vite:
  ```powershell
  npm run dev
  ```
- El frontend estará en: **http://localhost:5173**

---

## 🎯 USO DEL WEBHOOK

El endpoint del webhook está disponible en:
```
POST http://localhost:3000/api/mg-webhook/transfer
```

Headers requeridos:
- `Content-Type: application/json`
- `X-MG-Endpoint: <URL del destino>` (opcional, tiene un valor por defecto)

---

## ✅ CONFIRMACIÓN

Si ves estos mensajes en la terminal, **TODO ESTÁ BIEN**:
```
[PoR API] Server listening on http://localhost:3000
[MG Webhook Proxy] Proxy endpoint available at http://localhost:3000/api/mg-webhook/transfer
```

El servidor está funcionando correctamente, aunque no veas una página web en el navegador.

