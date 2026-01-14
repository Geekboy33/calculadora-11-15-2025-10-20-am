# 🔐 SEGURIDAD - DAES dUSD Bridge

## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados


## ⚠️ PROTECCIÓN DE PRIVATE KEYS

### Nivel 1: MVP (Actual)
La private key está en `.env`:
```env
DAES_SIGNER_PRIVATE_KEY=0x...
```

**Riesgos:**
- Cualquiera con acceso al servidor puede leer la key
- Si se filtra, pueden imprimir dUSD infinitos

---

### Nivel 2: Archivo Cifrado con Passphrase

Crea un archivo cifrado que requiere passphrase al iniciar:

```typescript
// server/src/utils/secureKey.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import * as readline from 'readline';

const scryptAsync = promisify(scrypt);

export async function encryptKey(privateKey: string, passphrase: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(passphrase, salt, 32) as Buffer;
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex')
  });
}

export async function decryptKey(encryptedData: string, passphrase: string): Promise<string> {
  const { salt, iv, encrypted, authTag } = JSON.parse(encryptedData);
  const key = await scryptAsync(passphrase, Buffer.from(salt, 'hex'), 32) as Buffer;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function promptPassphrase(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('🔑 Enter DAES Signer passphrase: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
```

**Uso:**
```bash
# Al iniciar el servidor, pide la passphrase
npm run start
🔑 Enter DAES Signer passphrase: ********
```

---

### Nivel 3: AWS KMS (Producción)

```typescript
import { KMSClient, SignCommand } from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });

// La private key NUNCA sale de KMS
// Solo KMS puede firmar
async function signWithKMS(message: Uint8Array): Promise<Uint8Array> {
  const command = new SignCommand({
    KeyId: process.env.KMS_KEY_ID,
    Message: message,
    SigningAlgorithm: "ECDSA_SHA_256"
  });
  const response = await kms.send(command);
  return response.Signature!;
}
```

**Ventajas:**
- La key privada NUNCA está en el servidor
- Auditoría completa de cada firma
- Rotación automática de keys

---

### Nivel 4: Hardware Security Module (HSM)

Para máxima seguridad, usa HSM como:
- AWS CloudHSM
- Thales Luna
- YubiHSM

---

## 🛡️ PROTECCIONES IMPLEMENTADAS

### 1. Rate Limiting

```
Por IP:      10 requests/minuto
Por Wallet:   5 mints/minuto
```

Si se excede:
```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### 2. Idempotencia

Cada request puede incluir `idempotency_key`:

```json
{
  "amount_usd": 100,
  "wallet_destino": "0x...",
  "idempotency_key": "mint_user123_20241226_001"
}
```

Si el mismo `idempotency_key` se envía dos veces:
- NO vuelve a mintear
- Retorna el resultado anterior

```json
{
  "success": true,
  "tx_hash": "0x...",
  "idempotent": true,
  "message": "This request was already processed"
}
```

### 3. Beneficiary Server-Side

El `beneficiary` (a quién va el dUSD) es decidido por el servidor:
- Frontend NO puede cambiarlo
- Previene que un atacante redirija fondos

### 4. Validación de Montos

```
Mínimo: $1 USD
Máximo: $1,000,000 USD
```

---

## 📋 CHECKLIST DE SEGURIDAD

- [ ] `.env` NO está en git (verificar `.gitignore`)
- [ ] Alchemy key rotada si fue expuesta
- [ ] `DAES_SIGNER_PRIVATE_KEY` corresponde a address autorizada
- [ ] `DEFAULT_BENEFICIARY` es una address que controlas
- [ ] Rate limiting habilitado
- [ ] Logs de auditoría habilitados
- [ ] HTTPS en producción (no HTTP)
- [ ] Firewall configurado (solo puertos necesarios)

---

## 🚨 QUÉ HACER SI SE FILTRA LA KEY

1. **INMEDIATAMENTE:**
   - Revocar la autorización del signer en BridgeMinter
   - `bridge.revokeSigner(oldSignerAddress)`

2. **LUEGO:**
   - Generar nueva wallet
   - Autorizar nuevo signer
   - Actualizar `.env`
   - Rotar todas las keys relacionadas

3. **AUDITORÍA:**
   - Revisar todos los mints de las últimas 24h
   - Verificar que no hubo mints no autorizados

















