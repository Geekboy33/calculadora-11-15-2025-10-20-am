# 🚀 GUÍA DE DESPLIEGUE - DCB Treasury & Treasury Minting LemonChain

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCCIÓN                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐    │
│  │  DCB Treasury    │     │ Treasury Minting │     │  Bridge Server   │    │
│  │  (Frontend)      │     │ (Frontend)       │     │  (Node.js)       │    │
│  │                  │     │                  │     │                  │    │
│  │  dcb.domain.com  │     │ treasury.domain  │     │  api.domain.com  │    │
│  │  Port: 443       │     │ Port: 443        │     │  Ports: 4010-12  │    │
│  └────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘    │
│           │                        │                        │              │
│           └────────────────────────┼────────────────────────┘              │
│                                    │                                        │
│                           ┌────────▼────────┐                              │
│                           │    Nginx/       │                              │
│                           │    Reverse      │                              │
│                           │    Proxy        │                              │
│                           └────────┬────────┘                              │
│                                    │                                        │
│                           ┌────────▼────────┐                              │
│                           │   LemonChain    │                              │
│                           │   (Blockchain)  │                              │
│                           └─────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📋 Requisitos

### Servidor
- **OS**: Ubuntu 22.04 LTS o superior
- **RAM**: Mínimo 2GB (recomendado 4GB)
- **CPU**: 2 cores mínimo
- **Disco**: 20GB SSD
- **Node.js**: v18.x o superior
- **npm**: v9.x o superior

### Dominios y SSL
- Dominio principal: `luxliqdaes.cloud`
- Subdominio DCB: `dcb.luxliqdaes.cloud`
- Subdominio Treasury: `treasury.luxliqdaes.cloud`
- Subdominio API: `api.luxliqdaes.cloud`
- Certificados SSL (Let's Encrypt recomendado)

---

## 🔧 Instalación Paso a Paso

### 1. Preparar el Servidor

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalación
node --version  # v18.x.x
npm --version   # 9.x.x

# Instalar build essentials (para better-sqlite3)
sudo apt install -y build-essential python3

# Instalar PM2 para gestión de procesos
sudo npm install -g pm2

# Instalar Nginx
sudo apt install -y nginx
```

### 2. Clonar y Configurar el Proyecto

```bash
# Crear directorio
sudo mkdir -p /var/www/lemx
cd /var/www/lemx

# Clonar repositorio (o subir archivos)
git clone <tu-repositorio> .

# Instalar dependencias del Bridge Server
cd server
cp package-v2.json package.json
npm install

# Crear archivo de configuración
cp env.production.example .env
nano .env  # Editar con valores de producción
```

### 3. Configurar Variables de Entorno

Editar `/var/www/lemx/server/.env`:

```env
# PRODUCCIÓN
NODE_ENV=production

# Puertos
DCB_PORT=4010
LEMX_PORT=4011
WS_PORT=4012
SERVER_HOST=0.0.0.0

# SEGURIDAD - ¡CAMBIAR ESTOS VALORES!
JWT_SECRET=<generar-con-openssl-rand-base64-64>
API_SECRET_KEY=<generar-clave-segura>
WEBHOOK_HMAC_SECRET=<generar-clave-segura>
ENCRYPTION_KEY=<generar-32-bytes-hex>

# Base de datos
DATABASE_PATH=/var/www/lemx/server/data/bridge-server.db

# CORS - Dominios permitidos
ALLOWED_ORIGINS=https://dcb.luxliqdaes.cloud,https://treasury.luxliqdaes.cloud

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# LemonChain
LEMON_CHAIN_ID=8866
LEMON_RPC_URL=https://rpc.lemonchain.io
LUSD_CONTRACT_ADDRESS=0x8DE60f88f19DAD42dde0D9ED2eebA68269722a99
```

### 4. Generar Claves Seguras

```bash
# Generar JWT Secret
openssl rand -base64 64

# Generar API Key
openssl rand -hex 32

# Generar Encryption Key (32 bytes)
openssl rand -hex 32
```

### 5. Build de Frontends

```bash
# DCB Treasury Frontend
cd /var/www/lemx
npm install
npm run build

# Treasury Minting Frontend
cd /var/www/lemx/LEMX_MINTING_PLATFORM_CODE
npm install
npm run build
```

Crear archivos `.env.production` para cada frontend:

**DCB Treasury** (`/var/www/lemx/.env.production`):
```env
VITE_DCB_API_URL=https://api.luxliqdaes.cloud:4010
VITE_LEMX_API_URL=https://api.luxliqdaes.cloud:4011
VITE_WS_URL=wss://api.luxliqdaes.cloud:4012
VITE_LEMON_RPC_URL=https://rpc.lemonchain.io
VITE_SANDBOX_MODE=false
```

**Treasury Minting** (`/var/www/lemx/LEMX_MINTING_PLATFORM_CODE/.env.production`):
```env
VITE_DCB_API_URL=https://api.luxliqdaes.cloud:4010
VITE_LEMX_API_URL=https://api.luxliqdaes.cloud:4011
VITE_WS_URL=wss://api.luxliqdaes.cloud:4012
VITE_LEMON_RPC_URL=https://rpc.lemonchain.io
VITE_SANDBOX_MODE=false
VITE_ENCRYPTION_KEY=<tu-clave-encriptacion>
VITE_HMAC_SECRET=<tu-hmac-secret>
```

### 6. Configurar Nginx

Crear configuración para cada servicio:

**`/etc/nginx/sites-available/dcb-treasury`**:
```nginx
server {
    listen 80;
    server_name dcb.luxliqdaes.cloud;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dcb.luxliqdaes.cloud;

    ssl_certificate /etc/letsencrypt/live/dcb.luxliqdaes.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dcb.luxliqdaes.cloud/privkey.pem;

    root /var/www/lemx/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:4010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**`/etc/nginx/sites-available/treasury-minting`**:
```nginx
server {
    listen 80;
    server_name treasury.luxliqdaes.cloud;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name treasury.luxliqdaes.cloud;

    ssl_certificate /etc/letsencrypt/live/treasury.luxliqdaes.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/treasury.luxliqdaes.cloud/privkey.pem;

    root /var/www/lemx/LEMX_MINTING_PLATFORM_CODE/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:4011;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**`/etc/nginx/sites-available/api-bridge`**:
```nginx
server {
    listen 80;
    server_name api.luxliqdaes.cloud;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.luxliqdaes.cloud;

    ssl_certificate /etc/letsencrypt/live/api.luxliqdaes.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.luxliqdaes.cloud/privkey.pem;

    # DCB Treasury API
    location /dcb/ {
        rewrite ^/dcb/(.*) /$1 break;
        proxy_pass http://127.0.0.1:4010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # LEMX Minting API
    location /lemx/ {
        rewrite ^/lemx/(.*) /$1 break;
        proxy_pass http://127.0.0.1:4011;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:4012;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

Activar sitios:
```bash
sudo ln -s /etc/nginx/sites-available/dcb-treasury /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/treasury-minting /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api-bridge /etc/nginx/sites-enabled/

sudo nginx -t
sudo systemctl restart nginx
```

### 7. Configurar SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx

sudo certbot --nginx -d dcb.luxliqdaes.cloud
sudo certbot --nginx -d treasury.luxliqdaes.cloud
sudo certbot --nginx -d api.luxliqdaes.cloud

# Auto-renovación
sudo certbot renew --dry-run
```

### 8. Iniciar Bridge Server con PM2

```bash
cd /var/www/lemx/server

# Iniciar servidor
pm2 start lemx-bridge-server-v2.js --name "lemx-bridge"

# Guardar configuración
pm2 save

# Configurar inicio automático
pm2 startup
```

### 9. Configurar Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 4010/tcp
sudo ufw allow 4011/tcp
sudo ufw allow 4012/tcp
sudo ufw enable
```

---

## 🔒 Seguridad en Producción

### Checklist de Seguridad

- [ ] Cambiar todas las claves por defecto
- [ ] Configurar SSL/TLS
- [ ] Habilitar rate limiting
- [ ] Configurar CORS correctamente
- [ ] Habilitar firewall
- [ ] Configurar backups automáticos
- [ ] Monitorear logs
- [ ] Actualizar dependencias regularmente

### Backup de Base de Datos

```bash
# Crear script de backup
cat > /var/www/lemx/server/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/lemx"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp /var/www/lemx/server/data/bridge-server.db $BACKUP_DIR/bridge-server_$DATE.db
find $BACKUP_DIR -mtime +7 -delete
EOF

chmod +x /var/www/lemx/server/backup.sh

# Agregar a crontab (backup diario a las 2am)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/lemx/server/backup.sh") | crontab -
```

---

## 📊 Monitoreo

### Ver Logs del Bridge Server

```bash
pm2 logs lemx-bridge

# Logs en tiempo real
pm2 monit
```

### Verificar Estado

```bash
# Estado de PM2
pm2 status

# Estado de Nginx
sudo systemctl status nginx

# Verificar puertos
sudo netstat -tlnp | grep -E '4010|4011|4012'
```

### Health Check

```bash
# DCB Treasury API
curl https://api.luxliqdaes.cloud:4010/api/health

# LEMX Minting API
curl https://api.luxliqdaes.cloud:4011/api/health
```

---

## 🔄 Actualización

```bash
cd /var/www/lemx

# Pull cambios
git pull

# Actualizar dependencias
npm install
cd server && npm install && cd ..
cd LEMX_MINTING_PLATFORM_CODE && npm install && cd ..

# Rebuild frontends
npm run build
cd LEMX_MINTING_PLATFORM_CODE && npm run build && cd ..

# Reiniciar servidor
pm2 restart lemx-bridge
```

---

## 🆘 Solución de Problemas

### Error: CORS bloqueado
- Verificar que el dominio esté en `ALLOWED_ORIGINS`
- Verificar configuración de Nginx

### Error: WebSocket no conecta
- Verificar que el puerto 4012 esté abierto
- Verificar configuración de proxy en Nginx

### Error: Base de datos
- Verificar permisos del directorio `data/`
- Verificar que `better-sqlite3` esté instalado correctamente

### Error: SSL
- Verificar certificados con `sudo certbot certificates`
- Renovar si es necesario: `sudo certbot renew`

---

## 📞 Soporte

Para soporte técnico, contactar:
- Email: support@dcbtreasury.com
- Documentación: https://docs.luxliqdaes.cloud

---

*Última actualización: Enero 2026*
