# ✅ GUÍA DE VERIFICACIÓN DEL SISTEMA COMPLETO

## 🎯 **VERIFICAR QUE TODO FUNCIONA**

Sigue estos pasos para verificar que **TODO** el sistema está funcionando correctamente.

---

## 📋 **CHECKLIST DE VERIFICACIÓN:**

### **✅ PASO 1: Servidor Funcionando**

```
1. Abre navegador
2. Ve a: http://localhost:4001
3. ✅ Debe cargar la página de login
4. Si NO carga: Ejecuta en PowerShell:
   cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'
   npm run dev
```

---

### **✅ PASO 2: Login**

```
1. Usuario: ModoDios
2. Contraseña: DAES3334
3. Click "ACCESS SYSTEM"
4. ✅ Debe entrar al dashboard
```

---

### **✅ PASO 3: Custody Accounts**

```
1. Click en "Custody Accounts"
2. ✅ Módulo se abre
3. Click "Crear Cuenta"
4. Llenar:
   - Nombre: TEST HSBC USD
   - Tipo: banking
   - Moneda: USD
   - Balance: 100000
5. Guardar
6. ✅ Cuenta aparece en lista
```

---

### **✅ PASO 4: API VUSD - Crear Pledge**

```
1. Click en "API VUSD"
2. ✅ Módulo se abre (NO pantalla negra)
3. Ver métricas arriba (pueden estar en 0)
4. Click "Nuevo Pledge"
5. ✅ Modal se abre
6. Seleccionar cuenta del dropdown
7. ✅ Formulario se auto-completa
8. Ver botones de porcentaje:
   [10%] [20%] [30%] [50%] [100%]
9. Click "30%"
10. ✅ Amount = 30,000
11. Click "Create Pledge"
12. ✅ Pledge aparece INMEDIATAMENTE
13. ✅ Métricas se actualizan:
    - Cap Circulante: 30,000
    - Pledges USD: 30,000
```

---

### **✅ PASO 5: API VUSD - Proof of Reserve**

```
1. En API VUSD, Tab "Proof of Reserve"
2. Click "Publicar PoR"
3. ✅ Archivo TXT se descarga
4. ✅ Panel aparece en la interfaz con:
   - Resumen visual (4 cards)
   - TextArea con reporte completo
   - Clasificación M2/M3
5. Click en título para minimizar ▼
6. ✅ Reporte se oculta
7. Click otra vez ▶
8. ✅ Reporte se muestra
```

---

### **✅ PASO 6: Proof of Reserves API**

```
1. Click en módulo "Proof of Reserves API"
2. ✅ Módulo se abre (NO pantalla negra)
3. Ver sección "PoR Disponibles"
4. ✅ Debe mostrar el PoR generado en PASO 5
5. Ver estadísticas arriba:
   - X PoR Disponibles
   - 0 API Keys (si es primera vez)
```

---

### **✅ PASO 7: Generar API Key**

```
1. Click "Generar Nueva API Key"
2. ✅ Modal se abre
3. Llenar:
   - Nombre: Partner Test API
   - Seleccionar PoR (checkbox)
   - Webhook URL: https://webhook.site/unique-id (opcional)
   - Eventos: ☑️ api.request
4. Click "Generar API Key"
5. ✅ Modal muestra:
   - API Key: por_xxx
   - Secret Key: sk_xxx
6. Copiar ambas (importante)
7. Click "Entendido - Cerrar"
```

---

### **✅ PASO 8: Ver API Key Generada**

```
1. En lista de "API Keys Generadas"
2. ✅ Ver API key con:
   - Nombre: Partner Test API
   - Status: ACTIVA
   - API Key visible
   - Secret Key (oculta, click 👁️ para ver)
   
3. Ver "URLs API VINCULADAS":
   ✅ 5 endpoints mostrados:
   - 📍 Base Endpoint
   - 📊 Data Endpoint
   - ⬇️ Download Endpoint
   - 📈 Summary Endpoint
   - ✅ Verify Endpoint
   
4. Verificar URL base:
   ✅ Todas empiezan con: https://luxliqdaes.cloud
```

---

### **✅ PASO 9: Probar Webhook Real**

```
1. En "Base Endpoint"
2. Click botón "Probar"
3. Esperar 1-2 segundos
4. ✅ Ver mensaje:
   "✅ Llamada API Exitosa
    Endpoint: https://luxliqdaes.cloud/...
    Tiempo: 500ms
    PoR vinculados: 1
    Data completa: XXXX bytes"

5. Scroll abajo
6. ✅ Ver sección "Logs de Webhook"
7. ✅ Ver 2 logs nuevos:
   - [GET] api.request (llamada al endpoint)
   - [POST] webhook.sent (webhook enviado)
```

---

### **✅ PASO 10: Ver Payload Completo**

```
1. En "Logs de Webhook"
2. Click en el log reciente (tiene ▶)
3. ✅ Se expande mostrando ▼
4. ✅ Ver "📦 Payload Completo:"
5. ✅ Ver JSON formateado con TODA la data:
   - porReports con fullReport completo
   - summary con todas las métricas
   - metadata completa
6. ✅ Hacer scroll DENTRO del JSON
7. ✅ TODO el contenido es visible
8. ✅ NO está cortado
```

---

### **✅ PASO 11: Verificar Webhook Real (Opcional)**

```
Si configuraste webhook.site:

1. Abre https://webhook.site/your-unique-id
2. ✅ Deberías ver el POST recibido
3. ✅ Con todo el payload JSON
4. ✅ Headers incluyen:
   - X-API-Key
   - X-Secret-Key
   - Content-Type: application/json
```

---

### **✅ PASO 12: Crear Múltiples API Keys**

```
1. Generar 2-3 API keys más
2. ✅ Cada una aparece en la lista
3. ✅ Scroll aparece si hay muchas
4. ✅ Cada una tiene sus propias URLs
5. ✅ Contador de requests independiente
```

---

### **✅ PASO 13: Eliminar y Revocar**

```
Revocar:
1. Click "Revocar" en una API key
2. ✅ Status cambia a "REVOCADA"
3. ✅ Sigue visible

Eliminar:
1. Click 🗑️ en otra API key
2. Confirmar
3. ✅ API key desaparece INMEDIATAMENTE
```

---

### **✅ PASO 14: API VUSD1**

```
1. Click en "API VUSD1"
2. ✅ Módulo se abre
3. ✅ Ver métricas actualizadas
4. Crear pledge con selector de %
5. ✅ Funciona igual que API VUSD
```

---

### **✅ PASO 15: Persistencia**

```
1. Refrescar página (F5)
2. Login
3. API VUSD → Proof of Reserve
4. ✅ PoR generados SIGUEN AHÍ
5. Proof of Reserves API
6. ✅ API Keys SIGUEN AHÍ
7. ✅ Webhook logs SIGUEN AHÍ
```

---

## 📊 **CHECKLIST RÁPIDO:**

Marca cada uno que funcione:

- [ ] ✅ Servidor en http://localhost:4001
- [ ] ✅ Login funciona
- [ ] ✅ Custody Accounts crea cuentas
- [ ] ✅ API VUSD se abre sin error
- [ ] ✅ Crear pledge funciona
- [ ] ✅ Pledge aparece inmediato
- [ ] ✅ Métricas se actualizan
- [ ] ✅ Eliminar pledge funciona
- [ ] ✅ PoR se genera
- [ ] ✅ PoR visible en interfaz
- [ ] ✅ PoR persiste al cambiar módulo
- [ ] ✅ Proof of Reserves API se abre
- [ ] ✅ PoR aparecen desde VUSD
- [ ] ✅ Generar API key funciona
- [ ] ✅ URLs con https://luxliqdaes.cloud
- [ ] ✅ 5 endpoints generados
- [ ] ✅ Botón "Probar" funciona
- [ ] ✅ Webhook logs aparecen
- [ ] ✅ Click ▶ expande payload
- [ ] ✅ Payload JSON completo visible
- [ ] ✅ Scroll dentro del JSON
- [ ] ✅ Webhook real se envía (si configurado)

---

## 🐛 **SI ALGO NO FUNCIONA:**

### **Problema 1: Servidor no carga**
```
Solución:
Get-Process -Name node | Stop-Process -Force
cd 'C:\Users\USER\Desktop\calculator 11 15 2025  10 24 am\calculadora-11-15-2025-10-20-am'
npm run dev
```

### **Problema 2: Pantalla negra en algún módulo**
```
1. Abre consola (F12)
2. Busca errores en rojo
3. Dime qué error muestra
```

### **Problema 3: No aparecen PoR en PoR API**
```
1. Ve a API VUSD
2. Tab "Proof of Reserve"
3. Genera al menos 1 PoR
4. Vuelve a Proof of Reserves API
5. Click "Actualizar"
```

---

## 🖥️ **INFORMACIÓN DEL SERVIDOR:**

**URL:** http://localhost:4001  
**Usuario:** ModoDios  
**Contraseña:** DAES3334  
**Estado:** ✅ CORRIENDO (11 procesos Node)

---

## 🎯 **LO QUE DEBE FUNCIONAR:**

| Módulo | Función | Estado Esperado |
|--------|---------|-----------------|
| Login | Autenticar | ✅ Debe entrar |
| Custody Accounts | Crear cuentas | ✅ Debe guardar |
| API VUSD | Crear pledge | ✅ Aparece inmediato |
| API VUSD | Eliminar pledge | ✅ Desaparece inmediato |
| API VUSD | Métricas | ✅ NO están en 0 |
| API VUSD | PoR generar | ✅ Descarga TXT + muestra en UI |
| API VUSD | PoR minimizar | ✅ ▼/▶ funciona |
| API VUSD | PoR persiste | ✅ No se pierde |
| API VUSD1 | Crear pledge | ✅ Funciona |
| PoR API | Abrir módulo | ✅ NO pantalla negra |
| PoR API | Ver PoR | ✅ Lista desde VUSD |
| PoR API | Generar API key | ✅ Crea credenciales |
| PoR API | URLs generadas | ✅ 5 endpoints con luxliqdaes.cloud |
| PoR API | Probar endpoint | ✅ Ejecuta y logea |
| PoR API | Webhook real | ✅ POST enviado |
| PoR API | Logs expandibles | ✅ ▶/▼ muestra payload |
| PoR API | Payload completo | ✅ JSON sin cortes |

---

## 🚀 **PRUEBA AHORA - PASO A PASO:**

**1. Abre:** http://localhost:4001  
**2. Abre consola (F12)** - IMPORTANTE  
**3. Login:** ModoDios / DAES3334  
**4. Sigue los pasos 3-15 arriba**  

**Dime en qué paso tienes problema (si lo hay) y te ayudo.**

---

## 💡 **RESULTADO ESPERADO:**

Si TODO funciona, deberías poder:
- ✅ Crear cuentas custody
- ✅ Crear múltiples pledges
- ✅ Ver métricas en tiempo real
- ✅ Generar PoR con clasificación M2/M3
- ✅ Generar API keys
- ✅ Ver 5 URLs con https://luxliqdaes.cloud
- ✅ Probar endpoints y ver logs
- ✅ Ver payload JSON completo expandible
- ✅ Webhook POST real enviado

**¿En qué paso estás? ¿Todo funciona o hay algún error?**
