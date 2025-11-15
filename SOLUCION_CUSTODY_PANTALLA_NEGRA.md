# 🔧 SOLUCIÓN: Custody Account Pantalla Negra

## 🐛 PROBLEMA

El módulo de Custody Accounts muestra pantalla negra (componente crashea).

## 🎯 CAUSAS POSIBLES

1. **Cuentas antiguas en localStorage** sin los nuevos campos
2. **Campos opcionales** undefined causando errores
3. **useLanguage** sin destructurar `language`

## ✅ SOLUCIÓN RÁPIDA

### **Opción 1: Limpiar localStorage**
```javascript
// En consola del navegador (F12):
localStorage.removeItem('Digital Commercial Bank Ltd_custody_accounts');
localStorage.removeItem('Digital Commercial Bank Ltd_custody_counter');
location.reload();

Luego:
1. Login
2. Tab "Cuentas Custodio"
3. ✅ Debería cargar
```

### **Opción 2: Limpiar TODO**
```javascript
// En consola (F12):
localStorage.clear();
sessionStorage.clear();
location.reload();

Nota: Perderás todos los datos (balances, auditorías, etc.)
Tendrás que volver a cargar archivos Digital Commercial Bank Ltd
```

### **Opción 3: Abrir Consola y Ver Error Exacto**
```
1. F12 → Console
2. Tab "Cuentas Custodio"
3. Ver mensaje de error en ROJO
4. Copiar el error completo
5. El error dirá exactamente qué falla
```

## 🚀 PASOS RECOMENDADOS

```
1️⃣ Abre: http://localhost:5175 (NUEVO PUERTO!)

2️⃣ F12 → Console

3️⃣ Ejecuta:
   localStorage.removeItem('Digital Commercial Bank Ltd_custody_accounts');
   location.reload();

4️⃣ Login: admin / admin

5️⃣ Tab: "Cuentas Custodio"

6️⃣ ✅ Debería cargar sin error

7️⃣ "Crear Cuenta Custodio"
   → Completar formulario
   → Crear
   → ✅ Debería funcionar
```

## ⚠️ NOTA IMPORTANTE

**El puerto cambió**: http://localhost:5175 (NO 5174)

Asegúrate de abrir el puerto correcto.

## 📝 SI EL ERROR PERSISTE

1. Abre consola (F12)
2. Ve a "Cuentas Custodio"
3. Copia el error EXACTO que aparece en rojo
4. Compártelo para diagnóstico preciso

El error dirá algo como:
- "Cannot read property 'X' of undefined"
- "X is not defined"
- etc.

## 🔧 SOLUCIÓN DEFINITIVA

Si nada funciona, voy a reescribir el componente de forma más simple y sin opcionales.

---

**URL Correcta**: http://localhost:5175 ✅  
**Solución 1**: Limpiar localStorage  
**Solución 2**: Ver error en consola  

🚀 **Prueba limpiar localStorage primero** 🚀

