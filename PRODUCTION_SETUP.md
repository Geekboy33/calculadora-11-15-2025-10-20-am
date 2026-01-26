# Production Setup - DCB Treasury & Treasury Minting

## Architecture Overview

```
┌─────────────────────────┐         HTTPS/WSS           ┌─────────────────────────┐
│     DCB TREASURY        │ ◄─────────────────────────► │   TREASURY MINTING      │
│     (Server A)          │                             │   (Server B)            │
│                         │                             │                         │
│  Frontend: port 443     │                             │  Frontend: port 443     │
│  API: port 4010         │                             │  API: port 4011         │
│                         │                             │  WebSocket: port 4012   │
└─────────────────────────┘                             └─────────────────────────┘
         │                                                        │
         └────────────────────────┬───────────────────────────────┘
                                  │
                         ┌────────▼────────┐
                         │  LemonChain RPC │
                         │  (Blockchain)   │
                         └─────────────────┘
```

## Environment Variables

### DCB Treasury Platform (.env)

```env
# API Endpoints
VITE_DCB_API_URL=https://api.dcb-treasury.your-domain.com
VITE_LEMX_API_URL=https://api.treasury-minting.your-domain.com
VITE_WS_URL=wss://ws.treasury-minting.your-domain.com

# LemonChain
VITE_LEMON_RPC_URL=https://rpc.lemonchain.io
VITE_LEMON_WSS_URL=wss://ws.lemonchain.io
VITE_LEMON_EXPLORER_URL=https://explorer.lemonchain.io

# Smart Contracts
VITE_VUSD_CONTRACT=0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b
VITE_LOCKBOX_CONTRACT=0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00

# Security
VITE_WEBHOOK_SECRET=<your-secure-webhook-secret>
VITE_ADMIN_ADDRESS=<your-admin-wallet-address>
```

### Treasury Minting Platform (.env)

```env
# API Endpoints (same URLs - they need to communicate)
VITE_DCB_API_URL=https://api.dcb-treasury.your-domain.com
VITE_LEMX_API_URL=https://api.treasury-minting.your-domain.com
VITE_WS_URL=wss://ws.treasury-minting.your-domain.com

# LemonChain
VITE_LEMON_RPC_URL=https://rpc.lemonchain.io
VITE_LEMON_WSS_URL=wss://ws.lemonchain.io
VITE_LEMON_EXPLORER_URL=https://explorer.lemonchain.io

# Smart Contracts
VITE_VUSD_CONTRACT=0x0bF07709c94D32c9F000c51D4Ee0BCFfEeb1011b
VITE_LOCKBOX_CONTRACT=0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00

# Security (must match DCB Treasury)
VITE_WEBHOOK_SECRET=<your-secure-webhook-secret>
VITE_ADMIN_ADDRESS=<your-admin-wallet-address>
```

## Deployment Steps

### 1. Backend Server (Bridge Server)

The bridge server handles all API and WebSocket connections:

```bash
# On Treasury Minting Server
cd /var/www/treasury-minting
node server/lemx-bridge-server.js
```

Use PM2 for process management:
```bash
pm2 start server/lemx-bridge-server.js --name "treasury-bridge"
pm2 save
```

### 2. Frontend Builds

**DCB Treasury:**
```bash
cd /path/to/dcb-treasury
npm run build
# Deploy dist/ folder to web server
```

**Treasury Minting:**
```bash
cd /path/to/LEMX_MINTING_PLATFORM_CODE
npm run build
# Deploy dist/ folder to web server
```

### 3. Nginx Configuration

**DCB Treasury (Server A):**
```nginx
server {
    listen 443 ssl;
    server_name dcb-treasury.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/dcb-treasury.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dcb-treasury.your-domain.com/privkey.pem;
    
    root /var/www/dcb-treasury/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Treasury Minting API (Server B):**
```nginx
server {
    listen 443 ssl;
    server_name api.treasury-minting.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/treasury-minting.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/treasury-minting.your-domain.com/privkey.pem;
    
    # API proxy (ports 4010, 4011)
    location /api {
        proxy_pass http://localhost:4011;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name ws.treasury-minting.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/treasury-minting.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/treasury-minting.your-domain.com/privkey.pem;
    
    # WebSocket proxy
    location / {
        proxy_pass http://localhost:4012;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

## Communication Flow

1. **User creates Lock in DCB Treasury**
   - Frontend sends POST to `VITE_DCB_API_URL/api/locks`
   - Bridge server creates lock and broadcasts via WebSocket

2. **Treasury Minting receives Lock**
   - WebSocket delivers real-time notification
   - Lock appears in pending queue

3. **Treasury Minting approves/mints**
   - Sends approval back to DCB Treasury API
   - Both platforms sync via WebSocket

## Security Checklist

- [ ] HTTPS enabled on all endpoints
- [ ] WSS (WebSocket Secure) for real-time
- [ ] CORS configured for allowed domains
- [ ] Webhook secrets match between platforms
- [ ] Private keys stored securely (not in .env files)
- [ ] Rate limiting enabled on APIs
- [ ] Firewall rules restrict direct port access

## Troubleshooting

### Connection Issues
```bash
# Test API connectivity
curl https://api.treasury-minting.your-domain.com/api/health

# Test WebSocket
wscat -c wss://ws.treasury-minting.your-domain.com
```

### Logs
```bash
# PM2 logs
pm2 logs treasury-bridge

# Nginx logs
tail -f /var/log/nginx/error.log
```
