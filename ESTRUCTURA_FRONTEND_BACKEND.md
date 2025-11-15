# 🏗️ DIVISIÓN FRONTEND-BACKEND - ARQUITECTURA

## 🎯 **ESTRUCTURA PROPUESTA**

### **Actual (Monolítico):**
```
calculadora-11-15-2025-10-20-am/
├── src/
│   ├── components/     (Frontend)
│   ├── lib/           (Frontend + alguna lógica)
│   └── main.tsx       (Frontend)
├── public/
├── package.json
└── vite.config.ts
```

### **Nueva (Dividida):**
```
daes-corebanking/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── services/   (API calls)
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── por-api.ts
│   │   │   ├── pledges.ts
│   │   │   └── webhooks.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## 🔧 **IMPLEMENTACIÓN:**

### **Opción 1: Separación Simple (Recomendada)**

Mantener el frontend actual y crear backend separado que se acopla:

```
daes-corebanking/
├── client/              (Frontend actual)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
└── server/              (Backend nuevo)
    ├── src/
    │   ├── api/
    │   │   ├── por.ts
    │   │   ├── pledges.ts
    │   │   └── webhooks.ts
    │   ├── middleware/
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

### **Opción 2: Monorepo con Workspaces**

```
daes-corebanking/
├── packages/
│   ├── frontend/
│   ├── backend/
│   └── shared/         (Types compartidos)
│
├── package.json         (Root workspace)
└── README.md
```

---

## 📦 **BACKEND A CREAR:**

### **Tecnologías Sugeridas:**
- **Express.js** + TypeScript
- **Supabase** (ya configurado)
- **CORS** para frontend
- **Helmet** (seguridad)

### **Endpoints del Backend:**

```typescript
// server/src/api/por.ts

// GET /api/v1/proof-of-reserves/:apiKey
// Retorna PoR completo

// GET /api/v1/proof-of-reserves/:apiKey/data
// Retorna solo datos JSON

// GET /api/v1/proof-of-reserves/:apiKey/download
// Descarga TXT

// GET /api/v1/proof-of-reserves/:apiKey/summary
// Resumen ejecutivo

// GET /api/v1/proof-of-reserves/:apiKey/verify
// Verificación
```

```typescript
// server/src/api/pledges.ts

// POST /api/v1/pledges
// Crear pledge

// GET /api/v1/pledges
// Listar pledges

// DELETE /api/v1/pledges/:id
// Eliminar pledge
```

```typescript
// server/src/api/webhooks.ts

// POST /api/v1/webhooks
// Enviar webhook

// GET /api/v1/webhooks/logs
// Ver logs de webhooks
```

---

## 🔄 **ACOPLAMIENTO AL COMPILAR:**

### **1. Durante Desarrollo:**
```bash
# Terminal 1 - Backend
cd server
npm run dev
# Corre en http://localhost:3001

# Terminal 2 - Frontend
cd client
npm run dev
# Corre en http://localhost:4001
# Proxy a backend en vite.config.ts
```

### **2. Al Compilar (Build):**
```bash
# Script en root package.json
npm run build

# Ejecuta:
1. cd client && npm run build
   → Genera /client/dist

2. cd server && npm run build
   → Genera /server/dist

3. Copia /client/dist → /server/dist/public
   → Backend sirve frontend

# Resultado: 1 solo servidor que sirve todo
```

---

## 📁 **ESTRUCTURA DETALLADA:**

### **Frontend (client/):**
```
client/
├── src/
│   ├── components/      (Actual, no cambia)
│   ├── lib/
│   │   ├── api-client.ts  (NUEVO - llama backend)
│   │   └── ... (resto igual)
│   ├── main.tsx
│   └── App.tsx
├── public/
├── package.json
└── vite.config.ts      (Proxy a backend)
```

### **Backend (server/):**
```
server/
├── src/
│   ├── routes/
│   │   ├── por.ts
│   │   ├── pledges.ts
│   │   └── webhooks.ts
│   ├── controllers/
│   │   ├── porController.ts
│   │   └── pledgeController.ts
│   ├── services/
│   │   ├── porService.ts
│   │   └── webhookService.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── cors.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts        (Express server)
├── package.json
└── tsconfig.json
```

---

## ⚙️ **CONFIGURACIÓN:**

### **Frontend vite.config.ts:**
```typescript
export default defineConfig({
  server: {
    port: 4001,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

### **Backend package.json:**
```json
{
  "name": "daes-backend",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.57.4",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  }
}
```

---

## 🚀 **COMANDOS:**

### **Desarrollo:**
```bash
# Root package.json
npm run dev

# Ejecuta ambos:
- Frontend en :4001
- Backend en :3001
```

### **Build:**
```bash
npm run build

# Resultado:
server/dist/
├── index.js           (Backend)
└── public/            (Frontend compilado)
    ├── index.html
    └── assets/
```

### **Producción:**
```bash
cd server
npm start

# Sirve:
- API en /api/*
- Frontend en /*
- Todo en 1 puerto
```

---

## 💡 **¿QUIERES QUE IMPLEMENTE ESTO?**

Puedo:

**A) Crear estructura completa**
- Dividir proyecto actual
- Crear backend Express
- Configurar proxy
- Scripts de build

**B) Solo crear backend**
- Backend en carpeta separada
- Frontend actual sin cambios
- Instrucciones de integración

**C) Monorepo completo**
- Workspaces de npm
- Shared types
- Build unificado

**¿Qué opción prefieres? Te recomiendo la Opción A (más completa).**

---

**Tiempo estimado:** 15-20 minutos  
**Estado actual:** Monolítico funcional  
**Próximo paso:** Dividir en frontend-backend
