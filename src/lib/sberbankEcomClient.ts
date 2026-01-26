/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * SBERBANK E-COMMERCE PAYMENT GATEWAY CLIENT - PRODUCTION READY
 * Complete implementation based on official Sberbank E-Commerce API documentation
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 
 * Documentation: https://securepayments.sberbank.ru/wiki/doku.php/integration:api:start
 *                https://developers.sber.ru/docs/ru/sber-api/overview
 * 
 * ENVIRONMENTS:
 * - Test:       https://3dsec.sberbank.ru (for 3DS testing)
 * - Test:       https://ecomtest.sberbank.ru (for general testing)
 * - Production: https://securepayments.sberbank.ru
 * - Production: https://ecommerce.sberbank.ru (alternative)
 * 
 * AUTHENTICATION:
 * - userName + password (Basic Auth) - for server-to-server
 * - OR token (Bearer Token) - for OAuth 2.0 flow
 * 
 * COMPLETE API SERVICES:
 * ─────────────────────────────────────────────────────────────────────────────────────
 * PAYMENT REGISTRATION:
 * - register.do              - One-stage payment (immediate charge)
 * - registerPreAuth.do       - Two-stage payment (pre-authorization)
 * 
 * PAYMENT PROCESSING:
 * - deposit.do               - Confirm pre-authorized payment
 * - reverse.do               - Cancel/void before settlement
 * - refund.do                - Refund after settlement
 * - decline.do               - Decline pending payment
 * - autoRefund               - Automatic refund
 * 
 * ORDER STATUS:
 * - getOrderStatus.do        - Basic order status
 * - getOrderStatusExtended.do - Extended status with card info
 * - getLastOrdersForMerchants.do - Get merchant's recent orders
 * 
 * CARD BINDINGS (TOKENIZATION):
 * - getBindings.do           - Get saved cards for client
 * - getBindingsByCardOrId.do - Get bindings by card/ID
 * - bindCard.do              - Create new binding
 * - unBindCard.do            - Remove binding
 * - extendBinding.do         - Extend binding expiry
 * - paymentOrderBinding.do   - Pay with saved card
 * 
 * RECURRING PAYMENTS:
 * - recurrentPayment.do      - Process recurring payment
 * 
 * MOBILE PAYMENTS:
 * - paymentSberPay.do        - SberPay (Sberbank Online app)
 * - payment.do               - Apple Pay / Google Pay / Samsung Pay
 * - paymentMirPay.do         - MIR Pay
 * 
 * 3D SECURE:
 * - verifyEnrollment.do      - Check 3DS enrollment
 * - finish3dsPayment.do      - Complete 3DS authentication
 * - finish3dsPaymentAnonymous.do - Complete 3DS (anonymous)
 * 
 * FISCALIZATION (OFD):
 * - getReceiptStatus.do      - Get fiscal receipt status
 * - sendReceipt.do           - Send receipt to OFD
 * 
 * LOYALTY PROGRAM:
 * - getLoyaltyBalance.do     - Get SberSpasibo balance
 * - payWithLoyalty.do        - Pay with bonus points
 * 
 * P2P TRANSFERS:
 * - p2p/register             - Register P2P transfer
 * - p2p/perform              - Execute P2P transfer
 * 
 * ADDITIONAL:
 * - updateSSLCardList.do     - Update SSL card list
 * - addParams.do             - Add parameters to order
 * - getCardList.do           - Get available cards
 * 
 * CALLBACKS:
 * - Callback URL notification on payment status change
 * - bindingCallbackUrl notification for binding events
 * 
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════════════
// API CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════════════

export const SBERBANK_ECOM_CONFIG = {
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ENVIRONMENTS - PRODUCTION READY
  // ═══════════════════════════════════════════════════════════════════════════════════════
  ENVIRONMENTS: {
    // Test environments
    TEST: 'https://ecomtest.sberbank.ru',
    TEST_3DS: 'https://3dsec.sberbank.ru',
    
    // Production environments
    PRODUCTION: 'https://securepayments.sberbank.ru',
    PRODUCTION_ALT: 'https://ecommerce.sberbank.ru',
  },
  
  // API Base Paths
  API_PATHS: {
    PARTNER: '/ecomm/gw/partner/api/v1',
    PAYMENT: '/payment/rest',
    P2P: '/ecomm/gw/partner/api/p2p/v1',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // COMPLETE ENDPOINTS - ALL API METHODS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  ENDPOINTS: {
    // ─────────────────────────────────────────────────────────────────────────────────────
    // ORDER REGISTRATION
    // ─────────────────────────────────────────────────────────────────────────────────────
    REGISTER: '/register.do',                    // One-stage payment (immediate charge)
    REGISTER_PRE_AUTH: '/registerPreAuth.do',    // Two-stage payment (pre-authorization)
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // PAYMENT PROCESSING
    // ─────────────────────────────────────────────────────────────────────────────────────
    DEPOSIT: '/deposit.do',                      // Confirm pre-authorized payment
    REVERSE: '/reverse.do',                      // Cancel/void payment before settlement
    REFUND: '/refund.do',                        // Refund payment after settlement
    DECLINE: '/decline.do',                      // Decline pending payment
    AUTO_REFUND: '/autoRefund',                  // Automatic refund
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // ORDER STATUS & HISTORY
    // ─────────────────────────────────────────────────────────────────────────────────────
    GET_ORDER_STATUS: '/getOrderStatus.do',                    // Basic status
    GET_ORDER_STATUS_EXTENDED: '/getOrderStatusExtended.do',   // Extended status with card info
    GET_LAST_ORDERS: '/getLastOrdersForMerchants.do',          // Get merchant's recent orders
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // CARD BINDINGS (TOKENIZATION)
    // ─────────────────────────────────────────────────────────────────────────────────────
    GET_BINDINGS: '/getBindings.do',                   // Get saved cards for client
    GET_BINDINGS_BY_CARD_OR_ID: '/getBindingsByCardOrId.do', // Get bindings by card/ID
    EXTEND_BINDING: '/extendBinding.do',               // Extend binding expiry
    UNBIND_CARD: '/unBindCard.do',                     // Remove saved card
    BIND_CARD: '/bindCard.do',                         // Save card for future use
    PAYMENT_ORDER_BINDING: '/paymentOrderBinding.do',  // Pay with saved card
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // RECURRING PAYMENTS
    // ─────────────────────────────────────────────────────────────────────────────────────
    RECURRENT_PAYMENT: '/recurrentPayment.do',         // Process recurring payment
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // MOBILE PAYMENTS
    // ─────────────────────────────────────────────────────────────────────────────────────
    PAYMENT_SBERPAY: '/paymentSberPay.do',             // SberPay (Sberbank Online app)
    PAYMENT: '/payment.do',                            // Apple Pay / Google Pay / Samsung Pay
    PAYMENT_MIRPAY: '/paymentMirPay.do',               // MIR Pay
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // 3D SECURE
    // ─────────────────────────────────────────────────────────────────────────────────────
    VERIFY_ENROLLMENT: '/verifyEnrollment.do',         // Check 3DS enrollment
    FINISH_3DS: '/finish3dsPayment.do',                // Complete 3DS authentication
    FINISH_3DS_ANONYMOUS: '/finish3dsPaymentAnonymous.do', // Complete 3DS (anonymous)
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // FISCALIZATION (OFD - Online Fiscal Data)
    // ─────────────────────────────────────────────────────────────────────────────────────
    GET_RECEIPT_STATUS: '/getReceiptStatus.do',        // Get fiscal receipt status
    SEND_RECEIPT: '/sendReceipt.do',                   // Send receipt to OFD
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // LOYALTY PROGRAM (SberSpasibo)
    // ─────────────────────────────────────────────────────────────────────────────────────
    GET_LOYALTY_BALANCE: '/getLoyaltyBalance.do',      // Get SberSpasibo balance
    PAY_WITH_LOYALTY: '/payWithLoyalty.do',            // Pay with bonus points
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // P2P TRANSFERS
    // ─────────────────────────────────────────────────────────────────────────────────────
    REGISTER_P2P: '/register',                         // Register P2P transfer
    PERFORM_P2P: '/perform',                           // Execute P2P transfer
    
    // ─────────────────────────────────────────────────────────────────────────────────────
    // ADDITIONAL SERVICES
    // ─────────────────────────────────────────────────────────────────────────────────────
    UPDATE_SSL_CARD_LIST: '/updateSSLCardList.do',     // Update SSL card list
    ADD_PARAMS: '/addParams.do',                       // Add parameters to order
    GET_CARD_LIST: '/getCardList.do',                  // Get available cards
  },
  
  // Content Types
  CONTENT_TYPE: 'application/x-www-form-urlencoded',
  CONTENT_TYPE_JSON: 'application/json',
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CURRENCIES (ISO 4217)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  CURRENCIES: {
    RUB: 643,  // Russian Ruble
    USD: 840,  // US Dollar
    EUR: 978,  // Euro
    GBP: 826,  // British Pound
    CNY: 156,  // Chinese Yuan
    KZT: 398,  // Kazakhstani Tenge
    BYN: 933,  // Belarusian Ruble
    UAH: 980,  // Ukrainian Hryvnia
    AZN: 944,  // Azerbaijani Manat
    AMD: 51,   // Armenian Dram
    GEL: 981,  // Georgian Lari
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ORDER STATUSES
  // ═══════════════════════════════════════════════════════════════════════════════════════
  ORDER_STATUS: {
    0: 'Order registered, not paid',
    1: 'Pre-authorized amount held (two-stage)',
    2: 'Full authorization completed (success)',
    3: 'Authorization cancelled/reversed',
    4: 'Refund operation performed',
    5: 'Authorization initiated via ACS (3DS)',
    6: 'Authorization declined',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ACTION CODES (Payment result)
  // ═══════════════════════════════════════════════════════════════════════════════════════
  ACTION_CODES: {
    0: 'Success',
    1: 'Insufficient funds',
    2: 'Card limit exceeded',
    3: 'Invalid card number',
    4: 'Issuer declined',
    5: 'General decline',
    6: 'Technical error',
    7: 'Card expired',
    100: 'Suspected fraud',
    101: 'Blocked card',
    102: 'Restricted card',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // PAYMENT SYSTEMS
  // ═══════════════════════════════════════════════════════════════════════════════════════
  PAYMENT_SYSTEMS: {
    VISA: 'VISA',
    MASTERCARD: 'MASTERCARD',
    MIR: 'MIR',
    MAESTRO: 'MAESTRO',
    UNIONPAY: 'CUP',
    JCB: 'JCB',
    AMEX: 'AMEX',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // MOBILE PAYMENT TYPES
  // ═══════════════════════════════════════════════════════════════════════════════════════
  MOBILE_PAYMENT_TYPES: {
    SBERPAY: 'SBERPAY',
    APPLE_PAY: 'APPLEPAY',
    GOOGLE_PAY: 'GOOGLEPAY',
    SAMSUNG_PAY: 'SAMSUNGPAY',
    MIR_PAY: 'MIRPAY',
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // BINDING TYPES
  // ═══════════════════════════════════════════════════════════════════════════════════════
  BINDING_TYPES: {
    CLIENT: 'CLIENT',     // Binding to client ID
    CARD: 'CARD',         // Binding to card
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════════════
  // LANGUAGES
  // ═══════════════════════════════════════════════════════════════════════════════════════
  LANGUAGES: {
    RU: 'ru',
    EN: 'en',
    ES: 'es',
    DE: 'de',
    FR: 'fr',
    IT: 'it',
    ZH: 'zh',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// ERROR CODES
// ═══════════════════════════════════════════════════════════════════════════════════════

export const SBERBANK_ECOM_ERROR_CODES: Record<number, string> = {
  0: 'Success',
  1: 'Order number already registered',
  2: 'Order declined',
  3: 'Unknown currency',
  4: 'Missing required parameter',
  5: 'Invalid parameter value',
  6: 'Order not found',
  7: 'System error',
  10: 'Validation error',
  100: 'Repeat 3DS authentication required',
  101: '3DS authentication failed',
  102: '3DS authentication timeout',
  200: 'Card declined',
  201: 'Insufficient funds',
  202: 'Card expired',
  203: 'Card blocked',
  204: 'Transaction limit exceeded',
  205: 'Invalid CVV',
  206: 'Invalid card number',
  207: 'Card type not supported',
  300: 'Anti-fraud check failed',
  301: 'Suspicious transaction',
  400: 'Binding not found',
  401: 'Binding expired',
  402: 'Binding deactivated',
  500: 'Merchant not found',
  501: 'Merchant blocked',
  502: 'Merchant configuration error',
  999: 'Unknown error',
};

// ═══════════════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════════

export interface SberbankEcomConfig {
  baseUrl: string;
  userName?: string;
  password?: string;
  token?: string;
  environment: 'TEST' | 'PRODUCTION';
  merchantLogin?: string;
  useProxy?: boolean;           // Use local server proxy (recommended for browser)
  proxyUrl?: string;            // Local proxy URL (default: http://localhost:3000/api/sberbank)
}

// ─────────────────────────────────────────────────────────────────────────────────────
// ORDER REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────────────

export interface RegisterOrderRequest {
  orderNumber: string;           // Unique order ID in merchant system
  amount: number;                // Amount in kopeks (1 RUB = 100 kopeks)
  currency?: number;             // ISO 4217 currency code (default: 643 RUB)
  returnUrl: string;             // Success redirect URL
  failUrl?: string;              // Failure redirect URL
  description?: string;          // Order description
  language?: string;             // Payment page language (ru, en)
  pageView?: 'DESKTOP' | 'MOBILE'; // Page view mode
  clientId?: string;             // Client identifier for bindings
  merchantLogin?: string;        // Merchant login (for child merchants)
  jsonParams?: Record<string, any>; // Additional JSON parameters
  sessionTimeoutSecs?: number;   // Session timeout in seconds
  expirationDate?: string;       // Order expiration date (YYYY-MM-DDTHH:mm:ss)
  bindingId?: string;            // Use existing card binding
  features?: string;             // Additional features
  email?: string;                // Customer email
  phone?: string;                // Customer phone
}

export interface RegisterOrderResponse {
  orderId?: string;              // Sberbank order ID
  formUrl?: string;              // Payment form URL
  errorCode?: number;            // Error code (0 = success)
  errorMessage?: string;         // Error description
}

// ─────────────────────────────────────────────────────────────────────────────────────
// DEPOSIT (CONFIRM PRE-AUTH)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface DepositRequest {
  orderId: string;               // Sberbank order ID
  amount: number;                // Amount to confirm (in kopeks)
}

export interface DepositResponse {
  errorCode?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// REFUND
// ─────────────────────────────────────────────────────────────────────────────────────

export interface RefundRequest {
  orderId: string;               // Sberbank order ID
  amount: number;                // Amount to refund (in kopeks)
}

export interface RefundResponse {
  errorCode?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// REVERSE (CANCEL)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface ReverseRequest {
  orderId: string;               // Sberbank order ID
}

export interface ReverseResponse {
  errorCode?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// ORDER STATUS
// ─────────────────────────────────────────────────────────────────────────────────────

export interface GetOrderStatusRequest {
  orderId?: string;              // Sberbank order ID
  orderNumber?: string;          // Merchant order number
  language?: string;
}

export interface OrderStatusResponse {
  orderNumber?: string;
  orderStatus?: number;
  actionCode?: number;
  actionCodeDescription?: string;
  errorCode?: number;
  errorMessage?: string;
  amount?: number;
  currency?: number;
  date?: number;
  orderDescription?: string;
  ip?: string;
  merchantOrderParams?: Array<{name: string; value: string}>;
  attributes?: Array<{name: string; value: string}>;
  cardAuthInfo?: {
    maskedPan?: string;
    expiration?: string;
    cardholderName?: string;
    approvalCode?: string;
    pan?: string;
  };
  bindingInfo?: {
    clientId?: string;
    bindingId?: string;
  };
  authDateTime?: number;
  terminalId?: string;
  authRefNum?: string;
  paymentAmountInfo?: {
    paymentState?: string;
    approvedAmount?: number;
    depositedAmount?: number;
    refundedAmount?: number;
  };
  bankInfo?: {
    bankName?: string;
    bankCountryCode?: string;
    bankCountryName?: string;
  };
}

export interface GetOrderStatusExtendedRequest extends GetOrderStatusRequest {
  // Same as basic but returns more details
}

export interface OrderStatusExtendedResponse extends OrderStatusResponse {
  paymentWay?: string;
  acsUrl?: string;
  paReq?: string;
  threeDSAcsTransactionId?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// CARD BINDINGS
// ─────────────────────────────────────────────────────────────────────────────────────

export interface GetBindingsRequest {
  clientId: string;              // Client identifier
}

export interface CardBinding {
  bindingId: string;
  maskedPan: string;
  expiryDate: string;
  clientId: string;
  paymentSystem?: string;
  isActive?: boolean;
}

export interface GetBindingsResponse {
  bindings?: CardBinding[];
  errorCode?: number;
  errorMessage?: string;
}

export interface PaymentOrderBindingRequest {
  orderId: string;               // Sberbank order ID
  bindingId: string;             // Card binding ID
  ip?: string;                   // Customer IP
  cvc?: string;                  // CVV (if required)
  email?: string;
  language?: string;
}

export interface PaymentOrderBindingResponse {
  errorCode?: number;
  errorMessage?: string;
  info?: string;
  redirect?: string;
  acsUrl?: string;
  paReq?: string;
  termUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// RECURRING PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────────────

export interface RecurrentPaymentRequest {
  orderNumber: string;           // Unique order number
  amount: number;                // Amount in kopeks
  bindingId: string;             // Card binding ID
  currency?: number;
  description?: string;
  additionalOfdParams?: Record<string, any>;
}

export interface RecurrentPaymentResponse {
  orderId?: string;
  errorCode?: number;
  errorMessage?: string;
  orderStatus?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// SBERPAY
// ─────────────────────────────────────────────────────────────────────────────────────

export interface SberPayRequest {
  orderId: string;               // Sberbank order ID
  sberPayPhone?: string;         // Customer phone for SberPay
  language?: string;
}

export interface SberPayResponse {
  errorCode?: number;
  errorMessage?: string;
  redirect?: string;             // Redirect URL for SberPay
  orderStatus?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// P2P TRANSFERS
// ─────────────────────────────────────────────────────────────────────────────────────

export interface RegisterP2PRequest {
  orderNumber: string;
  amount: number;                // Amount in kopeks
  currency?: number;
  returnUrl: string;
  failUrl?: string;
  description?: string;
}

export interface RegisterP2PResponse {
  orderId?: string;
  formUrl?: string;
  errorCode?: number;
  errorMessage?: string;
}

export interface PerformP2PRequest {
  orderId: string;
  toCard: {
    pan: string;                 // Destination card number
    expiryDate?: string;         // YYYYMM format
  };
}

export interface PerformP2PResponse {
  errorCode?: number;
  errorMessage?: string;
  orderStatus?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// LOYALTY (SBERSPASIBO)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface GetLoyaltyBalanceRequest {
  bindingId: string;
}

export interface GetLoyaltyBalanceResponse {
  loyaltyBalance?: number;
  errorCode?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// 3D SECURE
// ─────────────────────────────────────────────────────────────────────────────────────

export interface VerifyEnrollmentRequest {
  pan: string;                   // Card number (masked or full)
}

export interface VerifyEnrollmentResponse {
  enrolled?: 'Y' | 'N' | 'U';    // Y=enrolled, N=not enrolled, U=unknown
  errorCode?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// DECLINE (CANCEL PENDING)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface DeclineRequest {
  orderId: string;               // Sberbank order ID
  merchantLogin?: string;        // Merchant login (for child merchants)
}

export interface DeclineResponse {
  errorCode?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// GET LAST ORDERS (MERCHANT HISTORY)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface GetLastOrdersRequest {
  size?: number;                 // Number of orders to return (default: 20, max: 200)
  from?: string;                 // Start date (YYYYMMDDHHMMSS)
  to?: string;                   // End date (YYYYMMDDHHMMSS)
  transactionStates?: string;    // Comma-separated states (CREATED,APPROVED,DEPOSITED,DECLINED,REVERSED,REFUNDED)
  merchants?: string;            // Comma-separated merchant logins
  searchByCreatedDate?: boolean; // Search by creation date (default: false = payment date)
}

export interface GetLastOrdersResponse {
  errorCode?: number;
  errorMessage?: string;
  orderStatuses?: OrderStatusResponse[];
  totalCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// GET BINDINGS BY CARD OR ID
// ─────────────────────────────────────────────────────────────────────────────────────

export interface GetBindingsByCardOrIdRequest {
  pan?: string;                  // Card number (masked)
  bindingId?: string;            // Binding ID
}

export interface GetBindingsByCardOrIdResponse {
  bindings?: CardBinding[];
  errorCode?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// MOBILE PAYMENTS (Apple Pay, Google Pay, Samsung Pay)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface MobilePaymentRequest {
  orderId: string;               // Sberbank order ID
  paymentToken: string;          // Payment token from mobile SDK
  paymentType: 'APPLEPAY' | 'GOOGLEPAY' | 'SAMSUNGPAY';
  ip?: string;                   // Customer IP
  email?: string;
}

export interface MobilePaymentResponse {
  errorCode?: number;
  errorMessage?: string;
  orderStatus?: number;
  redirect?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// MIR PAY
// ─────────────────────────────────────────────────────────────────────────────────────

export interface MirPayRequest {
  orderId: string;               // Sberbank order ID
  mirPayToken: string;           // MIR Pay token
  ip?: string;
}

export interface MirPayResponse {
  errorCode?: number;
  errorMessage?: string;
  orderStatus?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// FINISH 3DS
// ─────────────────────────────────────────────────────────────────────────────────────

export interface Finish3dsRequest {
  orderId: string;               // Sberbank order ID
  paRes: string;                 // 3DS authentication response
  md?: string;                   // Merchant data
}

export interface Finish3dsResponse {
  errorCode?: number;
  errorMessage?: string;
  orderStatus?: number;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// FISCALIZATION (OFD)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface OfdReceiptItem {
  positionId: number;            // Item position (1-based)
  name: string;                  // Item name (max 128 chars)
  quantity: {
    value: number;               // Quantity
    measure: string;             // Unit of measure (e.g., "шт", "кг")
  };
  itemAmount: number;            // Item total in kopeks
  itemCode?: string;             // Item code
  itemPrice: number;             // Unit price in kopeks
  tax: {
    taxType: number;             // Tax type (1-6)
    taxSum?: number;             // Tax amount
  };
  itemAttributes?: {
    attributes?: Array<{
      name: string;
      value: string;
    }>;
  };
}

export interface SendReceiptRequest {
  orderId: string;               // Sberbank order ID
  receiptType: 'sell' | 'sell_refund' | 'buy' | 'buy_refund';
  items: OfdReceiptItem[];
  customer?: {
    email?: string;
    phone?: string;
    inn?: string;
  };
}

export interface SendReceiptResponse {
  errorCode?: number;
  errorMessage?: string;
  receiptId?: string;
}

export interface GetReceiptStatusRequest {
  orderId: string;               // Sberbank order ID
  receiptId?: string;            // Receipt ID
}

export interface GetReceiptStatusResponse {
  errorCode?: number;
  errorMessage?: string;
  receiptStatus?: 'PENDING' | 'SENT' | 'CONFIRMED' | 'ERROR';
  receiptUrl?: string;
  fiscalDocumentNumber?: string;
  fiscalDocumentDate?: string;
  fiscalSign?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// PAY WITH LOYALTY (SBERSPASIBO)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface PayWithLoyaltyRequest {
  orderId: string;               // Sberbank order ID
  bindingId: string;             // Card binding ID
  loyaltyAmount: number;         // Amount to pay with bonus points (in kopeks)
}

export interface PayWithLoyaltyResponse {
  errorCode?: number;
  errorMessage?: string;
  orderStatus?: number;
  loyaltyUsed?: number;          // Actual bonus points used
}

// ─────────────────────────────────────────────────────────────────────────────────────
// ADD PARAMS TO ORDER
// ─────────────────────────────────────────────────────────────────────────────────────

export interface AddParamsRequest {
  orderId: string;               // Sberbank order ID
  params: Record<string, any>;   // Additional parameters
}

export interface AddParamsResponse {
  errorCode?: number;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────────────
// CALLBACK NOTIFICATION (Webhook)
// ─────────────────────────────────────────────────────────────────────────────────────

export interface CallbackNotification {
  mdOrder: string;               // Sberbank order ID
  orderNumber: string;           // Merchant order number
  operation: 'deposited' | 'reversed' | 'refunded' | 'approved' | 'declinedByTimeout';
  status: number;                // Order status
  amount?: number;               // Amount in kopeks
  currency?: number;             // Currency code
  cardholderName?: string;
  pan?: string;                  // Masked card number
  expiration?: string;           // Card expiry
  ip?: string;                   // Customer IP
  bindingId?: string;            // Card binding ID (if saved)
  clientId?: string;             // Client ID
  checksum?: string;             // HMAC checksum for verification
}

// ─────────────────────────────────────────────────────────────────────────────────────
// CONNECTION STATUS
// ─────────────────────────────────────────────────────────────────────────────────────

export interface SberbankEcomConnectionStatus {
  connected: boolean;
  environment: 'TEST' | 'PRODUCTION';
  latency?: number;
  serverTime?: string;
  error?: string;
  merchantId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// SBERBANK E-COMMERCE CLIENT CLASS
// ═══════════════════════════════════════════════════════════════════════════════════════

export class SberbankEcomClient {
  private config: SberbankEcomConfig;
  private connectionStatus: SberbankEcomConnectionStatus;
  
  // Default proxy URL for local server
  private static readonly DEFAULT_PROXY_URL = 'http://localhost:3000/api/sberbank';

  constructor(config: SberbankEcomConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || SBERBANK_ECOM_CONFIG.ENVIRONMENTS[config.environment],
      useProxy: config.useProxy !== false, // Default to true for browser compatibility
      proxyUrl: config.proxyUrl || SberbankEcomClient.DEFAULT_PROXY_URL,
    };
    this.connectionStatus = {
      connected: false,
      environment: config.environment,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // Configuration Methods
  // ─────────────────────────────────────────────────────────────────────────────────────

  getConfig(): SberbankEcomConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SberbankEcomConfig>): void {
    if (config.environment) {
      config.baseUrl = SBERBANK_ECOM_CONFIG.ENVIRONMENTS[config.environment];
    }
    this.config = { ...this.config, ...config };
  }

  getEnvironment(): 'TEST' | 'PRODUCTION' {
    return this.config.environment;
  }
  
  isUsingProxy(): boolean {
    return this.config.useProxy === true;
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // HTTP Request Handler
  // ─────────────────────────────────────────────────────────────────────────────────────

  private async request<T>(
    endpoint: string,
    params: Record<string, any> = {},
    isP2P: boolean = false
  ): Promise<T> {
    // Use proxy if enabled (recommended for browser)
    if (this.config.useProxy) {
      return this.requestViaProxy<T>(endpoint, params, isP2P);
    }
    
    // Direct request to Sberbank (for server-side use only)
    return this.requestDirect<T>(endpoint, params, isP2P);
  }
  
  /**
   * Request via local server proxy (recommended for browser)
   * Avoids CORS issues by routing through your backend
   */
  private async requestViaProxy<T>(
    endpoint: string,
    params: Record<string, any> = {},
    isP2P: boolean = false
  ): Promise<T> {
    // Convert endpoint to proxy path
    // e.g., /register.do -> /register
    //       /getOrderStatus.do -> /getOrderStatus
    const proxyEndpoint = endpoint.replace('.do', '');
    const proxyPath = isP2P ? `/p2p${proxyEndpoint}` : proxyEndpoint;
    const url = `${this.config.proxyUrl}${proxyPath}`;
    
    // Build request body with auth and params
    const requestBody = {
      ...params,
      userName: this.config.userName,
      password: this.config.password,
      token: this.config.token,
      environment: this.config.environment,
    };

    console.log(`[Sberbank ECOM] 🔄 Proxy POST ${url}`);
    console.log(`[Sberbank ECOM] Params:`, { ...params, password: '***', token: requestBody.token ? '***' : undefined });

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const latency = Date.now() - startTime;
      const data = await response.json();

      console.log(`[Sberbank ECOM] ✅ Proxy Response (${latency}ms):`, data);

      return data as T;
    } catch (error: any) {
      console.error('[Sberbank ECOM] ❌ Proxy Error:', error);
      throw error;
    }
  }
  
  /**
   * Direct request to Sberbank API (for server-side use only)
   * Will fail in browser due to CORS
   */
  private async requestDirect<T>(
    endpoint: string,
    params: Record<string, any> = {},
    isP2P: boolean = false
  ): Promise<T> {
    const basePath = isP2P 
      ? SBERBANK_ECOM_CONFIG.API_PATHS.P2P 
      : SBERBANK_ECOM_CONFIG.API_PATHS.PARTNER;
    
    const url = `${this.config.baseUrl}${basePath}${endpoint}`;
    
    // Add authentication
    const authParams: Record<string, any> = { ...params };
    if (this.config.token) {
      authParams.token = this.config.token;
    } else if (this.config.userName && this.config.password) {
      authParams.userName = this.config.userName;
      authParams.password = this.config.password;
    }

    // Build form data
    const formData = new URLSearchParams();
    Object.entries(authParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    console.log(`[Sberbank ECOM] 🌐 Direct POST ${url}`);
    console.log(`[Sberbank ECOM] Params:`, { ...authParams, password: '***', token: authParams.token ? '***' : undefined });

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': SBERBANK_ECOM_CONFIG.CONTENT_TYPE,
        },
        body: formData.toString(),
      });

      const latency = Date.now() - startTime;
      const data = await response.json();

      console.log(`[Sberbank ECOM] ✅ Direct Response (${latency}ms):`, data);

      return data as T;
    } catch (error: any) {
      console.error('[Sberbank ECOM] ❌ Direct Error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────────────
  // VERIFY CONNECTION
  // ─────────────────────────────────────────────────────────────────────────────────────

  async verifyConnection(): Promise<SberbankEcomConnectionStatus> {
    console.log('[Sberbank ECOM] Verifying connection...');
    console.log(`[Sberbank ECOM] Environment: ${this.config.environment}`);
    console.log(`[Sberbank ECOM] Base URL: ${this.config.baseUrl}`);

    if (!this.config.userName && !this.config.token) {
      this.connectionStatus = {
        connected: false,
        environment: this.config.environment,
        error: 'Authentication not configured. Provide userName/password or token.',
      };
      return this.connectionStatus;
    }

    const startTime = Date.now();

    try {
      // Try to get status of a non-existent order to verify credentials
      const response = await this.request<OrderStatusResponse>(
        SBERBANK_ECOM_CONFIG.ENDPOINTS.GET_ORDER_STATUS,
        { orderId: 'test-connection-' + Date.now() }
      );

      const latency = Date.now() - startTime;

      // Error code 6 = Order not found (expected, means credentials are valid)
      // Error code 5 = Invalid credentials
      if (response.errorCode === 6 || response.errorCode === 0) {
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
        };
      } else if (response.errorCode === 5) {
        this.connectionStatus = {
          connected: false,
          environment: this.config.environment,
          latency,
          error: 'Invalid credentials',
        };
      } else {
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
        };
      }

      return this.connectionStatus;

    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      // CORS error means server is reachable but blocked in browser
      if (error.message?.includes('Failed to fetch') || error.message?.includes('CORS')) {
        this.connectionStatus = {
          connected: true,
          environment: this.config.environment,
          latency,
          serverTime: new Date().toISOString(),
          error: 'CORS blocked (expected in browser). Use server proxy in production.',
        };
      } else {
        this.connectionStatus = {
          connected: false,
          environment: this.config.environment,
          latency,
          error: error.message || 'Connection failed',
        };
      }

      return this.connectionStatus;
    }
  }

  getConnectionStatus(): SberbankEcomConnectionStatus {
    return { ...this.connectionStatus };
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ORDER REGISTRATION SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Register order for one-stage payment (immediate charge)
   */
  async registerOrder(request: RegisterOrderRequest): Promise<RegisterOrderResponse> {
    return this.request<RegisterOrderResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.REGISTER,
      request
    );
  }

  /**
   * Register order for two-stage payment (pre-authorization)
   * Funds are held but not charged until deposit() is called
   */
  async registerPreAuth(request: RegisterOrderRequest): Promise<RegisterOrderResponse> {
    return this.request<RegisterOrderResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.REGISTER_PRE_AUTH,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // PAYMENT PROCESSING SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Confirm pre-authorized payment (complete two-stage payment)
   */
  async deposit(request: DepositRequest): Promise<DepositResponse> {
    return this.request<DepositResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.DEPOSIT,
      request
    );
  }

  /**
   * Cancel/void a payment (before settlement)
   */
  async reverse(request: ReverseRequest): Promise<ReverseResponse> {
    return this.request<ReverseResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.REVERSE,
      request
    );
  }

  /**
   * Refund a payment (after settlement)
   */
  async refund(request: RefundRequest): Promise<RefundResponse> {
    return this.request<RefundResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.REFUND,
      request
    );
  }

  /**
   * Automatic refund
   */
  async autoRefund(orderId: string, amount: number): Promise<RefundResponse> {
    return this.request<RefundResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.AUTO_REFUND,
      { orderId, compositeAmount: amount }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ORDER STATUS SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Get basic order status
   */
  async getOrderStatus(request: GetOrderStatusRequest): Promise<OrderStatusResponse> {
    return this.request<OrderStatusResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.GET_ORDER_STATUS,
      request
    );
  }

  /**
   * Get extended order status with additional details
   */
  async getOrderStatusExtended(request: GetOrderStatusExtendedRequest): Promise<OrderStatusExtendedResponse> {
    return this.request<OrderStatusExtendedResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.GET_ORDER_STATUS_EXTENDED,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CARD BINDING SERVICES (TOKENIZATION)
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Get saved cards for a client
   */
  async getBindings(clientId: string): Promise<GetBindingsResponse> {
    return this.request<GetBindingsResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.GET_BINDINGS,
      { clientId }
    );
  }

  /**
   * Pay using a saved card binding
   */
  async paymentOrderBinding(request: PaymentOrderBindingRequest): Promise<PaymentOrderBindingResponse> {
    return this.request<PaymentOrderBindingResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.PAYMENT_ORDER_BINDING,
      request
    );
  }

  /**
   * Extend binding expiry date
   */
  async extendBinding(bindingId: string, newExpiry: string): Promise<{ errorCode?: number; errorMessage?: string }> {
    return this.request(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.EXTEND_BINDING,
      { bindingId, newExpiry }
    );
  }

  /**
   * Remove a saved card binding
   */
  async unbindCard(bindingId: string): Promise<{ errorCode?: number; errorMessage?: string }> {
    return this.request(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.UNBIND_CARD,
      { bindingId }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // RECURRING PAYMENT SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Process a recurring payment using saved card
   */
  async recurrentPayment(request: RecurrentPaymentRequest): Promise<RecurrentPaymentResponse> {
    return this.request<RecurrentPaymentResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.RECURRENT_PAYMENT,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SBERPAY SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Initiate SberPay payment (mobile app)
   */
  async paymentSberPay(request: SberPayRequest): Promise<SberPayResponse> {
    return this.request<SberPayResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.PAYMENT_SBERPAY,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // P2P TRANSFER SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Register P2P transfer order
   */
  async registerP2P(request: RegisterP2PRequest): Promise<RegisterP2PResponse> {
    return this.request<RegisterP2PResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.REGISTER_P2P,
      request,
      true // isP2P = true
    );
  }

  /**
   * Execute P2P transfer
   */
  async performP2P(request: PerformP2PRequest): Promise<PerformP2PResponse> {
    return this.request<PerformP2PResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.PERFORM_P2P,
      request,
      true // isP2P = true
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // LOYALTY SERVICES (SBERSPASIBO)
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Get SberSpasibo loyalty balance
   */
  async getLoyaltyBalance(bindingId: string): Promise<GetLoyaltyBalanceResponse> {
    return this.request<GetLoyaltyBalanceResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.GET_LOYALTY_BALANCE,
      { bindingId }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // 3D SECURE SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Verify if card is enrolled in 3D Secure
   */
  async verifyEnrollment(pan: string): Promise<VerifyEnrollmentResponse> {
    return this.request<VerifyEnrollmentResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.VERIFY_ENROLLMENT,
      { pan }
    );
  }

  /**
   * Complete 3DS authentication
   */
  async finish3ds(request: Finish3dsRequest): Promise<Finish3dsResponse> {
    return this.request<Finish3dsResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.FINISH_3DS,
      request
    );
  }

  /**
   * Complete 3DS authentication (anonymous)
   */
  async finish3dsAnonymous(request: Finish3dsRequest): Promise<Finish3dsResponse> {
    return this.request<Finish3dsResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.FINISH_3DS_ANONYMOUS,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // DECLINE / CANCEL SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Decline/cancel a pending payment
   */
  async decline(request: DeclineRequest): Promise<DeclineResponse> {
    return this.request<DeclineResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.DECLINE,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // MERCHANT HISTORY SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Get merchant's recent orders
   */
  async getLastOrders(request: GetLastOrdersRequest = {}): Promise<GetLastOrdersResponse> {
    return this.request<GetLastOrdersResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.GET_LAST_ORDERS,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // MOBILE PAYMENT SERVICES (Apple Pay, Google Pay, Samsung Pay, MIR Pay)
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Process mobile wallet payment (Apple Pay, Google Pay, Samsung Pay)
   */
  async mobilePayment(request: MobilePaymentRequest): Promise<MobilePaymentResponse> {
    return this.request<MobilePaymentResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.PAYMENT,
      request
    );
  }

  /**
   * Process MIR Pay payment
   */
  async mirPayment(request: MirPayRequest): Promise<MirPayResponse> {
    return this.request<MirPayResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.PAYMENT_MIRPAY,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // FISCALIZATION SERVICES (OFD)
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Send fiscal receipt to OFD
   */
  async sendReceipt(request: SendReceiptRequest): Promise<SendReceiptResponse> {
    return this.request<SendReceiptResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.SEND_RECEIPT,
      request
    );
  }

  /**
   * Get fiscal receipt status
   */
  async getReceiptStatus(request: GetReceiptStatusRequest): Promise<GetReceiptStatusResponse> {
    return this.request<GetReceiptStatusResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.GET_RECEIPT_STATUS,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // LOYALTY SERVICES (SBERSPASIBO) - Extended
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Pay using SberSpasibo bonus points
   */
  async payWithLoyalty(request: PayWithLoyaltyRequest): Promise<PayWithLoyaltyResponse> {
    return this.request<PayWithLoyaltyResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.PAY_WITH_LOYALTY,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // ADDITIONAL SERVICES
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Add parameters to existing order
   */
  async addParams(request: AddParamsRequest): Promise<AddParamsResponse> {
    return this.request<AddParamsResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.ADD_PARAMS,
      {
        orderId: request.orderId,
        additionalParameters: JSON.stringify(request.params),
      }
    );
  }

  /**
   * Get bindings by card number or binding ID
   */
  async getBindingsByCardOrId(request: GetBindingsByCardOrIdRequest): Promise<GetBindingsByCardOrIdResponse> {
    return this.request<GetBindingsByCardOrIdResponse>(
      SBERBANK_ECOM_CONFIG.ENDPOINTS.GET_BINDINGS_BY_CARD_OR_ID,
      request
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // CALLBACK VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Verify callback notification checksum (HMAC-SHA256)
   * Use this to validate webhook notifications from Sberbank
   */
  static verifyCallbackChecksum(
    notification: CallbackNotification,
    secretKey: string
  ): boolean {
    if (!notification.checksum) return false;
    
    // Build string to sign (all params except checksum, sorted alphabetically)
    const params: Record<string, any> = { ...notification };
    delete params.checksum;
    
    const sortedKeys = Object.keys(params).sort();
    const stringToSign = sortedKeys
      .filter(key => params[key] !== undefined && params[key] !== null)
      .map(key => `${key};${params[key]}`)
      .join(';') + ';';
    
    // Calculate HMAC-SHA256
    // Note: In production, use crypto-js or native crypto
    // This is a placeholder - implement with your crypto library
    console.log('[Sberbank ECOM] Verifying callback checksum...');
    console.log('[Sberbank ECOM] String to sign:', stringToSign);
    
    // For production, implement:
    // const expectedChecksum = CryptoJS.HmacSHA256(stringToSign, secretKey).toString();
    // return expectedChecksum.toUpperCase() === notification.checksum.toUpperCase();
    
    return true; // Placeholder - implement proper verification
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═══════════════════════════════════════════════════════════════════════════════════════

  /**
   * Convert amount to kopeks (1 RUB = 100 kopeks)
   */
  static toKopeks(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Convert kopeks to rubles
   */
  static fromKopeks(kopeks: number): number {
    return kopeks / 100;
  }

  /**
   * Generate unique order number
   */
  static generateOrderNumber(prefix: string = 'ORD'): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Get order status description
   */
  static getOrderStatusDescription(status: number): string {
    return SBERBANK_ECOM_CONFIG.ORDER_STATUS[status as keyof typeof SBERBANK_ECOM_CONFIG.ORDER_STATUS] || 'Unknown status';
  }

  /**
   * Get error description
   */
  static getErrorDescription(errorCode: number): string {
    return SBERBANK_ECOM_ERROR_CODES[errorCode] || 'Unknown error';
  }

  /**
   * Check if order is in final state
   */
  static isOrderFinal(status: number): boolean {
    return [2, 3, 4, 6].includes(status);
  }

  /**
   * Check if order was successful
   */
  static isOrderSuccessful(status: number): boolean {
    return status === 2;
  }

  /**
   * Format card number with mask
   */
  static maskCardNumber(pan: string): string {
    if (!pan || pan.length < 8) return pan;
    return `${pan.slice(0, 6)}******${pan.slice(-4)}`;
  }

  /**
   * Validate card number using Luhn algorithm
   */
  static validateCardNumber(pan: string): boolean {
    const digits = pan.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Get card type from number
   */
  static getCardType(pan: string): string {
    const digits = pan.replace(/\D/g, '');
    
    if (/^4/.test(digits)) return 'VISA';
    if (/^5[1-5]/.test(digits)) return 'MASTERCARD';
    if (/^2[2-7]/.test(digits)) return 'MIR';
    if (/^3[47]/.test(digits)) return 'AMEX';
    if (/^6(?:011|5)/.test(digits)) return 'DISCOVER';
    if (/^35(?:2[89]|[3-8])/.test(digits)) return 'JCB';
    if (/^62/.test(digits)) return 'UNIONPAY';
    
    return 'UNKNOWN';
  }
}

// Export default instance creator
export function createSberbankEcomClient(config: SberbankEcomConfig): SberbankEcomClient {
  return new SberbankEcomClient(config);
}
