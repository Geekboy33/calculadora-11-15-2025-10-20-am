# 🏦 COMPLETE GUIDE: Sberbank E-Commerce API - Production Connection

## 📋 TABLE OF CONTENTS
1. [Prerequisites](#1-prerequisites)
2. [Obtaining Credentials](#2-obtaining-credentials)
3. [URLs and Environments](#3-urls-and-environments)
4. [System Configuration](#4-system-configuration)
5. [Authentication](#5-authentication)
6. [Available Endpoints](#6-available-endpoints)
7. [Payment Flow](#7-payment-flow)
8. [Webhooks and Callbacks](#8-webhooks-and-callbacks)
9. [Security](#9-security)
10. [Production Checklist](#10-production-checklist)

---

## 1. PREREQUISITES

### Required Documents (Legal Entity):
- ✅ Company registration in Russia (OGRN/OGRNIP)
- ✅ Tax identification number (INN)
- ✅ Legal representative data
- ✅ Bank account at Sberbank (preferred) or any Russian bank
- ✅ Acquiring contract with Sberbank

### Technical Requirements:
- ✅ Server with HTTPS (valid SSL certificate)
- ✅ Static IP for whitelist
- ✅ Verified domain
- ✅ Privacy policy page
- ✅ Terms and conditions page

---

## 2. OBTAINING CREDENTIALS

### Step 1: Register on Sberbank Business Online
1. Access: https://sberbank.ru/ru/s_m_business/bankingservice/acquiring
2. Request "Internet-acquiring" service (интернет-эквайринг)
3. Complete the application form

### Step 2: Contact Sberbank
- **Phone:** 8-800-555-55-50 (toll-free in Russia)
- **Email:** sberbank@sberbank.ru
- **Developer Portal:** https://developers.sber.ru

### Step 3: Receive Credentials
After your application is approved, you will receive:

```
┌─────────────────────────────────────────────────────────────────┐
│  PRODUCTION CREDENTIALS                                         │
├─────────────────────────────────────────────────────────────────┤
│  Merchant Login:    your_merchant_login                         │
│  Password:          your_secure_password                        │
│  Terminal ID:       XXXXXXXX                                    │
│  Merchant ID:       XXXXXXXXXXXXXXXX                            │
│  Secret Key:        XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX (HMAC)     │
└─────────────────────────────────────────────────────────────────┘
```

### Alternative: Access Token (OAuth 2.0)
```
┌─────────────────────────────────────────────────────────────────┐
│  ACCESS TOKEN                                                   │
├─────────────────────────────────────────────────────────────────┤
│  Token:    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...             │
│  Expires:  2025-12-31T23:59:59Z                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. URLS AND ENVIRONMENTS

### TEST Environment
```
Base URL:     https://ecomtest.sberbank.ru
3DS Testing:  https://3dsec.sberbank.ru
API Path:     /ecomm/gw/partner/api/v1
P2P Path:     /ecomm/gw/partner/api/p2p/v1
```

### PRODUCTION Environment
```
Base URL:     https://securepayments.sberbank.ru
Alternative:  https://ecommerce.sberbank.ru
API Path:     /ecomm/gw/partner/api/v1
P2P Path:     /ecomm/gw/partner/api/p2p/v1
```

### Complete Production URLs
```
Register:           https://securepayments.sberbank.ru/ecomm/gw/partner/api/v1/register.do
Pre-authorization:  https://securepayments.sberbank.ru/ecomm/gw/partner/api/v1/registerPreAuth.do
Order Status:       https://securepayments.sberbank.ru/ecomm/gw/partner/api/v1/getOrderStatusExtended.do
Refund:             https://securepayments.sberbank.ru/ecomm/gw/partner/api/v1/refund.do
```

---

## 4. SYSTEM CONFIGURATION

### In your application (Sberbank 2 API Module):

```typescript
// PRODUCTION Configuration
const config = {
  baseUrl: 'https://securepayments.sberbank.ru',
  userName: 'YOUR_MERCHANT_LOGIN',      // Provided by Sberbank
  password: 'YOUR_SECURE_PASSWORD',     // Provided by Sberbank
  environment: 'PRODUCTION',
  merchantLogin: 'YOUR_MERCHANT_LOGIN',
  useProxy: true,                       // Use server proxy
  proxyUrl: 'http://localhost:3000/api/sberbank'
};
```

### Or using Token:
```typescript
const config = {
  baseUrl: 'https://securepayments.sberbank.ru',
  token: 'YOUR_ACCESS_TOKEN',           // OAuth 2.0 Token
  environment: 'PRODUCTION',
  useProxy: true,
  proxyUrl: 'http://localhost:3000/api/sberbank'
};
```

---

## 5. AUTHENTICATION

### Method 1: Username and Password (Recommended for Server-to-Server)
```http
POST /ecomm/gw/partner/api/v1/register.do HTTP/1.1
Host: securepayments.sberbank.ru
Content-Type: application/x-www-form-urlencoded

userName=your_merchant_login&password=your_password&orderNumber=ORD-001&amount=100000&returnUrl=https://yourdomain.com/success
```

### Method 2: Bearer Token (OAuth 2.0)
```http
POST /ecomm/gw/partner/api/v1/register.do HTTP/1.1
Host: securepayments.sberbank.ru
Content-Type: application/x-www-form-urlencoded
Authorization: Bearer your_access_token

orderNumber=ORD-001&amount=100000&returnUrl=https://yourdomain.com/success
```

---

## 6. AVAILABLE ENDPOINTS

### 📝 ORDER REGISTRATION
| Endpoint | Description |
|----------|-------------|
| `/register.do` | One-stage payment (immediate charge) |
| `/registerPreAuth.do` | Two-stage payment (pre-authorization) |

### 💳 PAYMENT PROCESSING
| Endpoint | Description |
|----------|-------------|
| `/deposit.do` | Confirm pre-authorization |
| `/reverse.do` | Cancel/void before settlement |
| `/refund.do` | Refund after settlement |
| `/decline.do` | Decline pending payment |
| `/autoRefund` | Automatic refund |

### 📊 ORDER STATUS
| Endpoint | Description |
|----------|-------------|
| `/getOrderStatus.do` | Basic status |
| `/getOrderStatusExtended.do` | Extended status with card data |
| `/getLastOrdersForMerchants.do` | Order history |

### 💾 SAVED CARDS (Bindings)
| Endpoint | Description |
|----------|-------------|
| `/getBindings.do` | Get saved cards |
| `/bindCard.do` | Save card |
| `/unBindCard.do` | Remove saved card |
| `/extendBinding.do` | Extend validity |
| `/paymentOrderBinding.do` | Pay with saved card |

### 🔄 RECURRING PAYMENTS
| Endpoint | Description |
|----------|-------------|
| `/recurrentPayment.do` | Process recurring payment |

### 📱 MOBILE PAYMENTS
| Endpoint | Description |
|----------|-------------|
| `/paymentSberPay.do` | SberPay (Sberbank app) |
| `/payment.do` | Apple Pay / Google Pay / Samsung Pay |
| `/paymentMirPay.do` | MIR Pay |

### 🔐 3D SECURE
| Endpoint | Description |
|----------|-------------|
| `/verifyEnrollment.do` | Verify 3DS enrollment |
| `/finish3dsPayment.do` | Complete 3DS authentication |

### 🧾 FISCALIZATION (OFD)
| Endpoint | Description |
|----------|-------------|
| `/sendReceipt.do` | Send fiscal receipt |
| `/getReceiptStatus.do` | Receipt status |

### 🎁 LOYALTY PROGRAM (SberSpasibo)
| Endpoint | Description |
|----------|-------------|
| `/getLoyaltyBalance.do` | Check bonus balance |
| `/payWithLoyalty.do` | Pay with bonus points |

### 💸 P2P TRANSFERS
| Endpoint | Description |
|----------|-------------|
| `/p2p/register` | Register P2P transfer |
| `/p2p/perform` | Execute P2P transfer |

---

## 7. PAYMENT FLOW

### Simple Payment Flow (One-Stage)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Customer   │     │  Your System │     │   Sberbank   │     │   Issuing    │
│              │     │              │     │     API      │     │    Bank      │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │                    │
       │  1. Start payment  │                    │                    │
       │───────────────────>│                    │                    │
       │                    │                    │                    │
       │                    │  2. register.do    │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │  3. orderId +      │                    │
       │                    │     formUrl        │                    │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │  4. Redirect to    │                    │                    │
       │     formUrl        │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
       │  5. Enter card     │                    │                    │
       │     details        │                    │                    │
       │───────────────────────────────────────>│                    │
       │                    │                    │                    │
       │                    │                    │  6. Authorization  │
       │                    │                    │───────────────────>│
       │                    │                    │                    │
       │                    │                    │  7. Response       │
       │                    │                    │<───────────────────│
       │                    │                    │                    │
       │  8. Redirect to    │                    │                    │
       │     returnUrl      │                    │                    │
       │<───────────────────────────────────────│                    │
       │                    │                    │                    │
       │                    │  9. getOrderStatus │                    │
       │                    │───────────────────>│                    │
       │                    │                    │                    │
       │                    │  10. Final status  │                    │
       │                    │<───────────────────│                    │
       │                    │                    │                    │
       │  11. Confirm       │                    │                    │
       │      successful    │                    │                    │
       │<───────────────────│                    │                    │
       │                    │                    │                    │
```

### Code Example - Register Payment

```typescript
// 1. Register order
const response = await client.registerOrder({
  orderNumber: 'ORD-2025-001',
  amount: 100000,              // 1000.00 RUB (in kopeks)
  currency: 643,               // RUB
  returnUrl: 'https://yourdomain.com/payment/success',
  failUrl: 'https://yourdomain.com/payment/failed',
  description: 'Online store purchase',
  clientId: 'CLIENT-12345',    // To save card
  email: 'customer@email.com',
  phone: '+79001234567',
});

if (response.orderId && response.formUrl) {
  // 2. Redirect customer to formUrl
  window.location.href = response.formUrl;
}
```

### Code Example - Verify Status

```typescript
// After redirect, verify status
const status = await client.getOrderStatusExtended({
  orderId: 'abc123-order-id'
});

if (status.orderStatus === 2) {
  console.log('✅ Payment successful');
  console.log('Card:', status.cardAuthInfo?.maskedPan);
  console.log('Amount:', status.amount / 100, 'RUB');
} else {
  console.log('❌ Payment failed:', status.actionCodeDescription);
}
```

---

## 8. WEBHOOKS AND CALLBACKS

### Configure Callback URL
In your Sberbank merchant panel, configure:
- **Callback URL:** `https://yourdomain.com/api/sberbank/callback`

### Callback Structure

```typescript
interface CallbackNotification {
  mdOrder: string;           // Sberbank order ID
  orderNumber: string;       // Your order number
  operation: 'deposited' | 'reversed' | 'refunded' | 'approved' | 'declinedByTimeout';
  status: number;            // Order status
  amount?: number;           // Amount in kopeks
  currency?: number;         // Currency code
  cardholderName?: string;
  pan?: string;              // Masked card number
  expiration?: string;       // Card expiration
  ip?: string;
  bindingId?: string;
  clientId?: string;
  checksum?: string;         // HMAC for verification
}
```

### Implement Callback Handler

```typescript
// server/routes/sberbank-callback.js
app.post('/api/sberbank/callback', async (req, res) => {
  const notification = req.body;
  
  // 1. Verify checksum (IMPORTANT for security)
  const isValid = SberbankEcomClient.verifyCallbackChecksum(
    notification,
    process.env.SBERBANK_SECRET_KEY
  );
  
  if (!isValid) {
    console.error('❌ Invalid callback checksum');
    return res.status(400).send('Invalid checksum');
  }
  
  // 2. Process based on operation
  switch (notification.operation) {
    case 'deposited':
      await handlePaymentSuccess(notification);
      break;
    case 'reversed':
      await handlePaymentReversed(notification);
      break;
    case 'refunded':
      await handlePaymentRefunded(notification);
      break;
    case 'declinedByTimeout':
      await handlePaymentTimeout(notification);
      break;
  }
  
  // 3. Respond OK
  res.status(200).send('OK');
});
```

---

## 9. SECURITY

### ⚠️ MANDATORY REQUIREMENTS

1. **HTTPS Required**
   - All URLs (returnUrl, failUrl, callback) MUST be HTTPS
   - Valid SSL certificate (not self-signed)

2. **IP Whitelist**
   - Register your server IPs with Sberbank
   - Only authorized IPs can make API calls

3. **Checksum Verification**
   - ALWAYS verify checksum on callbacks
   - Use HMAC-SHA256 with your Secret Key

4. **Credential Storage**
   ```typescript
   // ❌ NEVER do this
   const password = 'my_password_in_code';
   
   // ✅ Use environment variables
   const password = process.env.SBERBANK_PASSWORD;
   ```

5. **Logging and Audit**
   - Log all transactions
   - DO NOT store complete card data
   - Comply with PCI-DSS

### Environment Variables Example (.env)

```bash
# Sberbank E-Commerce API - PRODUCTION
SBERBANK_ENVIRONMENT=PRODUCTION
SBERBANK_BASE_URL=https://securepayments.sberbank.ru
SBERBANK_USERNAME=your_merchant_login
SBERBANK_PASSWORD=your_secure_password
SBERBANK_SECRET_KEY=your_secret_key_for_hmac
SBERBANK_TERMINAL_ID=XXXXXXXX
SBERBANK_MERCHANT_ID=XXXXXXXXXXXXXXXX

# Callback URLs
SBERBANK_RETURN_URL=https://yourdomain.com/payment/success
SBERBANK_FAIL_URL=https://yourdomain.com/payment/failed
SBERBANK_CALLBACK_URL=https://yourdomain.com/api/sberbank/callback
```

---

## 10. PRODUCTION CHECKLIST

### ✅ Before Going to Production

#### Security
- [ ] Production credentials configured
- [ ] Environment variables (not hardcoded)
- [ ] HTTPS enabled on all URLs
- [ ] Checksum validation implemented
- [ ] IP whitelist configured at Sberbank
- [ ] Audit logs active

#### Configuration
- [ ] PRODUCTION environment selected
- [ ] Correct merchant login
- [ ] Callback URL configured in Sberbank panel
- [ ] returnUrl and failUrl point to production domain
- [ ] OFD fiscalization configured (if applicable in Russia)

#### Testing
- [ ] Complete tests in TEST environment
- [ ] Error flows validated
- [ ] Refunds tested
- [ ] 3D Secure verified
- [ ] Recurring payments tested (if applicable)
- [ ] SberPay tested (if applicable)

#### Documentation
- [ ] Privacy policy published
- [ ] Terms and conditions published
- [ ] Contact information visible

---

## 📞 SBERBANK SUPPORT

### Official Contacts
- **Technical Support:** tech@sberbank.ru
- **Phone:** 8-800-555-55-50 (Russia, toll-free)
- **Developer Portal:** https://developers.sber.ru
- **Documentation:** https://securepayments.sberbank.ru/wiki/doku.php/integration:api:start

### Support Hours
- Monday to Friday: 9:00 - 18:00 (Moscow time)
- 24/7 technical support for critical incidents

---

## 🔗 ADDITIONAL RESOURCES

- [Official API Documentation](https://securepayments.sberbank.ru/wiki/doku.php/integration:api:start)
- [Sber Developer Portal](https://developers.sber.ru)
- [Test Sandbox](https://ecomtest.sberbank.ru)
- [SberPay Integration Guide](https://developers.sber.ru/docs/ru/sberpay)

---

## 📝 ORDER STATUS CODES

| Code | Description |
|------|-------------|
| 0 | Order registered, not paid |
| 1 | Pre-authorized amount held (two-stage) |
| 2 | ✅ Full authorization completed (success) |
| 3 | Authorization cancelled/reversed |
| 4 | Refund operation performed |
| 5 | Authorization initiated via ACS (3DS) |
| 6 | ❌ Authorization declined |

---

## 📝 COMMON ERROR CODES

| Code | Description | Solution |
|------|-------------|----------|
| 0 | Success | - |
| 1 | Order number already registered | Use a unique order number |
| 5 | Invalid credentials | Verify userName/password |
| 6 | Order not found | Verify orderId |
| 7 | System error | Retry or contact support |
| 201 | Insufficient funds | Inform customer |
| 202 | Card expired | Request another card |
| 203 | Card blocked | Contact issuing bank |

---

## 🧪 TEST CARDS (TEST Environment Only)

These cards only work on `ecomtest.sberbank.ru`:

### Successful Payments
| Card Type | Number | Expiry | CVV | 3DS Password |
|-----------|--------|--------|-----|--------------|
| VISA ✅ | `4111 1111 1111 1111` | 12/25 | 123 | 12345678 |
| MASTERCARD ✅ | `5555 5555 5555 4444` | 12/25 | 123 | 12345678 |
| MIR ✅ | `2200 0000 0000 0004` | 12/25 | 123 | - |

### Failed Payments
| Card Type | Number | Expiry | CVV | Error |
|-----------|--------|--------|-----|-------|
| VISA ❌ | `4111 1111 1111 1129` | 12/25 | 123 | Insufficient funds |
| VISA ❌ | `4111 1111 1111 1137` | 12/25 | 123 | Card blocked |

---

**Last Updated:** January 2026
**API Version:** v1
**Compatible with:** Sberbank E-Commerce Payment Gateway
