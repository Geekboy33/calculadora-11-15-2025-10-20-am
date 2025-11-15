# ⚡ EXPORTAR INFORME - PASOS SIMPLES

## 🎯 HAZ ESTO AHORA

### PASO 1: Cargar datos
```
http://localhost:5173
Bank Audit
Cargar sample_Digital Commercial Bank Ltd_real_data.txt
Esperar 2-3 segundos
```

### PASO 2: Verificar que hay datos
```
Debes ver en pantalla:
[19] [11] [15] [18+] [50+]  ← Tarjetas de colores

Si NO las ves: El archivo no se cargó
```

### PASO 3: Buscar el botón
```
En el header (arriba a la derecha):
[Vista] [JSON] [CSV] [📄 Informe Completo] [Limpiar]
                         ↑
                  ESTE BOTÓN (cyan)
```

### PASO 4: Click en el botón
```
Click en [📄 Informe Completo]
```

### PASO 5: Mirar consola (F12)
```
Debería decir:
[AuditBank] 📄 Informe completo exportado en TXT
```

### PASO 6: Buscar archivo
```
Carpeta: C:\Users\[TU_USUARIO]\Downloads
Nombre: Informe_Auditoria_XXXXXXX.txt
```

---

## ❌ SI NO DESCARGA

### Método Manual (100% funciona):

```javascript
// Copiar y pegar en Console (F12):

const auditData = JSON.parse(localStorage.getItem('Digital Commercial Bank Ltd_audit_data'));
if (!auditData) {
  console.log('❌ No hay datos. Carga un archivo primero.');
} else {
  const report = JSON.stringify(auditData, null, 2);
  const blob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Informe_Auditoria.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  console.log('✅ Archivo descargado');
}
```

---

## ✅ ÉXITO

**Si ves el archivo en Descargas: ✅ Funciona**

**Abre el archivo y verás:**
```
TODAS las cuentas
TODOS los IBANs
TODOS los SWIFT
TODOS los bancos
TODOS los montos
M0-M4 completo
Hallazgos detallados
```

---

**Lee:** `SOLUCION_EXPORTAR_NO_FUNCIONA.md` (más detalles)

**¡PRUÉBALO! ⚡**



