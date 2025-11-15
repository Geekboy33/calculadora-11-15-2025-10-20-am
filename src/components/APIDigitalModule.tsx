import React, { useState, useEffect } from 'react';
import {
  Send,
  Globe,
  Calendar,
  Users,
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  AlertCircle,
  CreditCard,
  Building2,
  Lock,
  Unlock,
  Server,
  Wifi,
  WifiOff
} from 'lucide-react';

// Types
interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: number;
    email: string;
    role: string;
  };
  token: string;
}

interface DomesticTransfer {
  from_account_number: string;
  to_account_number: string;
  amount: number;
  currency: string;
  description: string;
}

interface DomesticTransferResponse {
  id: number;
  from_account_number: string;
  to_account_number: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  description: string;
  created_at: string;
  approval_required: boolean;
  approval_levels_required: number;
}

interface CreditTransfer {
  amount: number;
  currency: string;
  creditorName: string;
  creditorIban: string;
  creditorBic: string;
  creditorBankName?: string;
  creditorCountry: string;
  creditorAddress?: string;
  purposeCode: string;
  remittanceInfo: string;
}

interface ISO20022Payment {
  debtorAccountId: number;
  requestedExecutionDate: string;
  chargeBearer: 'SHAR' | 'DEBT' | 'CRED' | 'SLEV';
  creditTransfers: CreditTransfer[];
}

interface ISO20022PaymentResponse {
  paymentInstruction: {
    id: number;
    messageId: string;
    status: string;
    debtorAccountId: number;
    requestedExecutionDate: string;
    totalAmount: number;
    currency: string;
    numberOfTransactions: number;
    chargeBearer: string;
    created_at: string;
  };
  creditTransfers: Array<{
    id: number;
    instructionId: string;
    endToEndId: string;
    amount: number;
    creditorName: string;
    creditorIban: string;
    status: string;
  }>;
  xmlDownloadUrl: string;
}

interface ScheduledPayment {
  from_account_id: number;
  to_beneficiary_id: number;
  amount: number;
  currency: string;
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY';
  start_date: string;
  end_date?: string;
  description: string;
}

interface Beneficiary {
  name: string;
  account_number?: string;
  routing_number?: string;
  iban?: string;
  swift_code?: string;
  bank_name: string;
  beneficiary_type: 'DOMESTIC' | 'INTERNATIONAL';
  country: string;
  currency?: string;
  address?: string;
}

interface FXRate {
  base: string;
  rates: Record<string, number>;
  last_updated: string;
  source: string;
}

interface FXConversion {
  amount: number;
  from_currency: string;
  to_currency: string;
  include_spread: boolean;
}

export function APIDigitalModule() {
  const [activeTab, setActiveTab] = useState<'auth' | 'domestic' | 'international' | 'scheduled' | 'beneficiaries' | 'fx' | 'server'>('auth');

  // Banking Server Connection state
  const [bankingServerStatus, setBankingServerStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [serverHost, setServerHost] = useState('sandbox.creditpopulaire.net');
  const [serverPort, setServerPort] = useState('443');
  const [securitySignature, setSecuritySignature] = useState('');
  const [lastPingTime, setLastPingTime] = useState<number | null>(null);

  // Authentication state
  const [authCredentials, setAuthCredentials] = useState<AuthCredentials>({
    email: '',
    password: ''
  });
  const [authToken, setAuthToken] = useState<string>('');
  const [authUser, setAuthUser] = useState<AuthResponse['user'] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Domestic Transfer state
  const [domesticTransfer, setDomesticTransfer] = useState<DomesticTransfer>({
    from_account_number: '',
    to_account_number: '',
    amount: 0,
    currency: 'USD',
    description: ''
  });
  const [domesticTransfers, setDomesticTransfers] = useState<DomesticTransferResponse[]>([]);

  // International Payment state
  const [iso20022Payment, setISO20022Payment] = useState<ISO20022Payment>({
    debtorAccountId: 0,
    requestedExecutionDate: new Date().toISOString().split('T')[0],
    chargeBearer: 'SHAR',
    creditTransfers: []
  });
  const [newCreditTransfer, setNewCreditTransfer] = useState<CreditTransfer>({
    amount: 0,
    currency: 'EUR',
    creditorName: '',
    creditorIban: '',
    creditorBic: '',
    creditorBankName: '',
    creditorCountry: '',
    creditorAddress: '',
    purposeCode: 'SUPP',
    remittanceInfo: ''
  });
  const [internationalPayments, setInternationalPayments] = useState<ISO20022PaymentResponse[]>([]);

  // Scheduled Payment state
  const [scheduledPayment, setScheduledPayment] = useState<ScheduledPayment>({
    from_account_id: 0,
    to_beneficiary_id: 0,
    amount: 0,
    currency: 'USD',
    frequency: 'MONTHLY',
    start_date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [scheduledPayments, setScheduledPayments] = useState<any[]>([]);

  // Beneficiary state
  const [newBeneficiary, setNewBeneficiary] = useState<Beneficiary>({
    name: '',
    bank_name: '',
    beneficiary_type: 'DOMESTIC',
    country: 'US'
  });
  const [beneficiaries, setBeneficiaries] = useState<any[]>([]);

  // FX state
  const [fxRates, setFxRates] = useState<FXRate | null>(null);
  const [fxConversion, setFxConversion] = useState<FXConversion>({
    amount: 0,
    from_currency: 'USD',
    to_currency: 'EUR',
    include_spread: true
  });
  const [fxConversionResult, setFxConversionResult] = useState<any>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API Base URL (sandbox)
  const API_BASE_URL = 'https://sandbox.creditpopulaire.net/api';

  // Load saved data
  useEffect(() => {
    const savedToken = localStorage.getItem('api_digital_token');
    const savedUser = localStorage.getItem('api_digital_user');

    if (savedToken && savedUser) {
      setAuthToken(savedToken);
      setAuthUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }

    loadDomesticTransfers();
    loadInternationalPayments();
    loadScheduledPayments();
    loadBeneficiaries();
  }, []);

  // ========================================
  // AUTHENTICATION
  // ========================================

  const handleLogin = async () => {
    if (!authCredentials.email || !authCredentials.password) {
      setError('Email and password are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[API DIGITAL] 🔐 Logging in:', authCredentials.email);

      // Simulate API call (replace with actual API)
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authCredentials)
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const data: AuthResponse = await response.json();

      // Save token and user
      setAuthToken(data.token);
      setAuthUser(data.user);
      setIsAuthenticated(true);

      localStorage.setItem('api_digital_token', data.token);
      localStorage.setItem('api_digital_user', JSON.stringify(data.user));

      setSuccess(`✅ Logged in successfully as ${data.user.email}`);
      console.log('[API DIGITAL] ✅ Login successful:', data);

      // Switch to domestic transfers tab
      setActiveTab('domestic');
    } catch (err: any) {
      console.error('[API DIGITAL] ❌ Login error:', err);

      // Mock successful login for demo
      const mockUser = {
        id: 12345,
        email: authCredentials.email,
        role: 'PARTNER'
      };
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.MOCK_TOKEN';

      setAuthToken(mockToken);
      setAuthUser(mockUser);
      setIsAuthenticated(true);

      localStorage.setItem('api_digital_token', mockToken);
      localStorage.setItem('api_digital_user', JSON.stringify(mockUser));

      setSuccess(`✅ Logged in successfully as ${mockUser.email} (DEMO MODE)`);
      setActiveTab('domestic');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setAuthUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('api_digital_token');
    localStorage.removeItem('api_digital_user');
    setSuccess('✅ Logged out successfully');
    setActiveTab('auth');
  };

  // ========================================
  // DOMESTIC TRANSFERS
  // ========================================

  const loadDomesticTransfers = () => {
    const saved = localStorage.getItem('api_digital_domestic_transfers');
    if (saved) {
      setDomesticTransfers(JSON.parse(saved));
    }
  };

  const handleCreateDomesticTransfer = async () => {
    if (!isAuthenticated) {
      setError('Please login first');
      return;
    }

    if (!domesticTransfer.from_account_number || !domesticTransfer.to_account_number || domesticTransfer.amount <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[API DIGITAL] 💸 Creating domestic transfer:', domesticTransfer);

      const response: DomesticTransferResponse = {
        id: Date.now(),
        ...domesticTransfer,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        approval_required: true,
        approval_levels_required: 1
      };

      const updated = [response, ...domesticTransfers];
      setDomesticTransfers(updated);
      localStorage.setItem('api_digital_domestic_transfers', JSON.stringify(updated));

      setSuccess(`✅ Domestic transfer created successfully! ID: ${response.id}`);

      // Reset form
      setDomesticTransfer({
        from_account_number: '',
        to_account_number: '',
        amount: 0,
        currency: 'USD',
        description: ''
      });

      console.log('[API DIGITAL] ✅ Transfer created:', response);
    } catch (err: any) {
      console.error('[API DIGITAL] ❌ Error creating transfer:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // INTERNATIONAL PAYMENTS (ISO 20022)
  // ========================================

  const loadInternationalPayments = () => {
    const saved = localStorage.getItem('api_digital_international_payments');
    if (saved) {
      setInternationalPayments(JSON.parse(saved));
    }
  };

  const handleAddCreditTransfer = () => {
    if (newCreditTransfer.amount <= 0 || !newCreditTransfer.creditorName || !newCreditTransfer.creditorIban) {
      setError('Please fill in all required credit transfer fields');
      return;
    }

    setISO20022Payment({
      ...iso20022Payment,
      creditTransfers: [...iso20022Payment.creditTransfers, { ...newCreditTransfer }]
    });

    // Reset form
    setNewCreditTransfer({
      amount: 0,
      currency: 'EUR',
      creditorName: '',
      creditorIban: '',
      creditorBic: '',
      creditorBankName: '',
      creditorCountry: '',
      creditorAddress: '',
      purposeCode: 'SUPP',
      remittanceInfo: ''
    });

    setSuccess('✅ Credit transfer added to batch');
  };

  const handleRemoveCreditTransfer = (index: number) => {
    const updated = iso20022Payment.creditTransfers.filter((_, i) => i !== index);
    setISO20022Payment({
      ...iso20022Payment,
      creditTransfers: updated
    });
  };

  const handleCreateISO20022Payment = async () => {
    if (!isAuthenticated) {
      setError('Please login first');
      return;
    }

    if (iso20022Payment.debtorAccountId === 0 || iso20022Payment.creditTransfers.length === 0) {
      setError('Please add at least one credit transfer and select debtor account');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[API DIGITAL] 🌍 Creating ISO 20022 payment:', iso20022Payment);

      const totalAmount = iso20022Payment.creditTransfers.reduce((sum, ct) => sum + ct.amount, 0);
      const paymentId = Date.now();
      const messageId = `CRPOP-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${paymentId}`;

      const response: ISO20022PaymentResponse = {
        paymentInstruction: {
          id: paymentId,
          messageId,
          status: 'PENDING',
          debtorAccountId: iso20022Payment.debtorAccountId,
          requestedExecutionDate: iso20022Payment.requestedExecutionDate,
          totalAmount,
          currency: iso20022Payment.creditTransfers[0].currency,
          numberOfTransactions: iso20022Payment.creditTransfers.length,
          chargeBearer: iso20022Payment.chargeBearer,
          created_at: new Date().toISOString()
        },
        creditTransfers: iso20022Payment.creditTransfers.map((ct, index) => ({
          id: paymentId + index + 1,
          instructionId: `CRPOP-CT-${paymentId + index + 1}`,
          endToEndId: ct.remittanceInfo,
          amount: ct.amount,
          creditorName: ct.creditorName,
          creditorIban: ct.creditorIban,
          status: 'PENDING'
        })),
        xmlDownloadUrl: `/api/iso20022/payments/${paymentId}/xml`
      };

      const updated = [response, ...internationalPayments];
      setInternationalPayments(updated);
      localStorage.setItem('api_digital_international_payments', JSON.stringify(updated));

      setSuccess(`✅ ISO 20022 payment created! Message ID: ${messageId}`);

      // Reset form
      setISO20022Payment({
        debtorAccountId: 0,
        requestedExecutionDate: new Date().toISOString().split('T')[0],
        chargeBearer: 'SHAR',
        creditTransfers: []
      });

      console.log('[API DIGITAL] ✅ Payment created:', response);
    } catch (err: any) {
      console.error('[API DIGITAL] ❌ Error creating payment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // SCHEDULED PAYMENTS
  // ========================================

  const loadScheduledPayments = () => {
    const saved = localStorage.getItem('api_digital_scheduled_payments');
    if (saved) {
      setScheduledPayments(JSON.parse(saved));
    }
  };

  const handleCreateScheduledPayment = async () => {
    if (!isAuthenticated) {
      setError('Please login first');
      return;
    }

    if (scheduledPayment.from_account_id === 0 || scheduledPayment.to_beneficiary_id === 0 || scheduledPayment.amount <= 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[API DIGITAL] 📅 Creating scheduled payment:', scheduledPayment);

      const response = {
        id: Date.now(),
        ...scheduledPayment,
        status: 'ACTIVE',
        next_execution_date: scheduledPayment.start_date,
        total_executions_planned: 12,
        executions_completed: 0,
        created_at: new Date().toISOString()
      };

      const updated = [response, ...scheduledPayments];
      setScheduledPayments(updated);
      localStorage.setItem('api_digital_scheduled_payments', JSON.stringify(updated));

      setSuccess(`✅ Scheduled payment created successfully! ID: ${response.id}`);

      // Reset form
      setScheduledPayment({
        from_account_id: 0,
        to_beneficiary_id: 0,
        amount: 0,
        currency: 'USD',
        frequency: 'MONTHLY',
        start_date: new Date().toISOString().split('T')[0],
        description: ''
      });

      console.log('[API DIGITAL] ✅ Scheduled payment created:', response);
    } catch (err: any) {
      console.error('[API DIGITAL] ❌ Error creating scheduled payment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // BENEFICIARIES
  // ========================================

  const loadBeneficiaries = () => {
    const saved = localStorage.getItem('api_digital_beneficiaries');
    if (saved) {
      setBeneficiaries(JSON.parse(saved));
    }
  };

  const handleCreateBeneficiary = async () => {
    if (!isAuthenticated) {
      setError('Please login first');
      return;
    }

    if (!newBeneficiary.name || !newBeneficiary.bank_name) {
      setError('Please fill in all required fields');
      return;
    }

    if (newBeneficiary.beneficiary_type === 'DOMESTIC' && !newBeneficiary.account_number) {
      setError('Account number is required for domestic beneficiaries');
      return;
    }

    if (newBeneficiary.beneficiary_type === 'INTERNATIONAL' && !newBeneficiary.iban) {
      setError('IBAN is required for international beneficiaries');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[API DIGITAL] 👤 Creating beneficiary:', newBeneficiary);

      const response = {
        id: Date.now(),
        ...newBeneficiary,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      };

      const updated = [response, ...beneficiaries];
      setBeneficiaries(updated);
      localStorage.setItem('api_digital_beneficiaries', JSON.stringify(updated));

      setSuccess(`✅ Beneficiary created successfully! ID: ${response.id}`);

      // Reset form
      setNewBeneficiary({
        name: '',
        bank_name: '',
        beneficiary_type: 'DOMESTIC',
        country: 'US'
      });

      console.log('[API DIGITAL] ✅ Beneficiary created:', response);
    } catch (err: any) {
      console.error('[API DIGITAL] ❌ Error creating beneficiary:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // FOREIGN EXCHANGE
  // ========================================

  const handleGetFXRates = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[API DIGITAL] 💱 Fetching FX rates...');

      // Mock FX rates
      const mockRates: FXRate = {
        base: 'EUR',
        rates: {
          USD: 1.0875,
          GBP: 0.8592,
          JPY: 162.45,
          CHF: 0.9456,
          CAD: 1.4523,
          AUD: 1.6234,
          CNY: 7.8912
        },
        last_updated: new Date().toISOString(),
        source: 'ECB'
      };

      setFxRates(mockRates);
      setSuccess('✅ FX rates loaded successfully');

      console.log('[API DIGITAL] ✅ FX rates:', mockRates);
    } catch (err: any) {
      console.error('[API DIGITAL] ❌ Error fetching FX rates:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertCurrency = async () => {
    if (fxConversion.amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('[API DIGITAL] 💱 Converting currency:', fxConversion);

      // Mock conversion
      const midMarketRate = 0.9192;
      const spreadPercentage = 0.7;
      const exchangeRate = midMarketRate * (1 - spreadPercentage / 100);
      const toAmount = fxConversion.amount * exchangeRate;
      const spreadCost = fxConversion.amount * midMarketRate - toAmount;

      const result = {
        from_amount: fxConversion.amount,
        from_currency: fxConversion.from_currency,
        to_amount: parseFloat(toAmount.toFixed(2)),
        to_currency: fxConversion.to_currency,
        exchange_rate: exchangeRate,
        mid_market_rate: midMarketRate,
        spread_percentage: spreadPercentage,
        spread_cost: parseFloat(spreadCost.toFixed(2)),
        tier: 'RETAIL',
        valid_until: new Date(Date.now() + 30 * 60000).toISOString()
      };

      setFxConversionResult(result);
      setSuccess('✅ Currency converted successfully');

      console.log('[API DIGITAL] ✅ Conversion result:', result);
    } catch (err: any) {
      console.error('[API DIGITAL] ❌ Error converting currency:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // BANKING SERVER CONNECTION
  // ========================================

  const handleConnectToServer = async () => {
    // Validate security signature
    if (!securitySignature || securitySignature.trim().length === 0) {
      setError('Security signature is required to connect to the banking server');
      return;
    }

    if (securitySignature.length < 32) {
      setError('Security signature must be at least 32 characters long');
      return;
    }

    try {
      setBankingServerStatus('connecting');
      setError(null);

      console.log('[API DIGITAL] 🔌 Connecting to banking server:', serverHost);
      console.log('[API DIGITAL] 🔐 Security signature provided:', securitySignature.substring(0, 16) + '...');

      const startTime = Date.now();

      // Attempt connection to server with security signature
      const response = await fetch(`https://${serverHost}:${serverPort}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Security-Signature': securitySignature,
          'Authorization': `Bearer ${authToken}`
        },
        signal: AbortSignal.timeout(5000)
      });

      const pingTime = Date.now() - startTime;

      if (response.ok) {
        setBankingServerStatus('connected');
        setLastPingTime(pingTime);
        setSuccess(`✅ Connected to banking server successfully! (${pingTime}ms)\n🔐 Security signature validated`);
        console.log('[API DIGITAL] ✅ Server connected:', serverHost, 'Ping:', pingTime + 'ms');
        console.log('[API DIGITAL] 🔐 Security signature validated');
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (err: any) {
      console.error('[API DIGITAL] ❌ Server connection failed:', err);

      // Mock successful connection for demo
      setBankingServerStatus('disconnected');
      setError('Banking server is currently unavailable. Demo mode active.\nPlease verify your security signature and try again.');
      setLastPingTime(null);
    }
  };

  const handleDisconnectFromServer = () => {
    setBankingServerStatus('disconnected');
    setLastPingTime(null);
    setSuccess('✅ Disconnected from banking server');
    console.log('[API DIGITAL] 🔌 Disconnected from server');
  };

  // ========================================
  // UI HELPERS
  // ========================================

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'APPROVED':
      case 'ACSC':
      case 'ACTIVE':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'PENDING':
      case 'ACCP':
      case 'ACTC':
      case 'ACSP':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'REJECTED':
      case 'FAILED':
      case 'RJCT':
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-neon mb-2">
              API DIGITAL
            </h1>
            <p className="text-gray-400">
              Charter One / Credit Populaire Payment API - Partner Integration
            </p>
          </div>

          {isAuthenticated && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Logged in as</div>
                <div className="text-neon font-semibold">{authUser?.email}</div>
                <div className="text-xs text-gray-500">Role: {authUser?.role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-gray-400">
              Status: {isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
            </span>
          </div>
          <div className="text-gray-600">|</div>
          <div className="text-gray-400">
            API Version: 2.0
          </div>
          <div className="text-gray-600">|</div>
          <div className="text-gray-400">
            Environment: Sandbox
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-red-400">Error</div>
            <div className="text-red-300 text-sm whitespace-pre-wrap">{error}</div>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-green-400">Success</div>
            <div className="text-green-300 text-sm whitespace-pre-wrap">{success}</div>
          </div>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('auth')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'auth'
              ? 'bg-[#00ff88] text-black font-semibold'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Lock className="w-4 h-4" />
          Authentication
        </button>
        <button
          onClick={() => setActiveTab('domestic')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'domestic'
              ? 'bg-[#00ff88] text-black font-semibold'
              : isAuthenticated
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Send className="w-4 h-4" />
          Domestic Transfers
        </button>
        <button
          onClick={() => setActiveTab('international')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'international'
              ? 'bg-[#00ff88] text-black font-semibold'
              : isAuthenticated
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Globe className="w-4 h-4" />
          International (ISO 20022)
        </button>
        <button
          onClick={() => setActiveTab('scheduled')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'scheduled'
              ? 'bg-[#00ff88] text-black font-semibold'
              : isAuthenticated
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Scheduled Payments
        </button>
        <button
          onClick={() => setActiveTab('beneficiaries')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'beneficiaries'
              ? 'bg-[#00ff88] text-black font-semibold'
              : isAuthenticated
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Users className="w-4 h-4" />
          Beneficiaries
        </button>
        <button
          onClick={() => setActiveTab('fx')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'fx'
              ? 'bg-[#00ff88] text-black font-semibold'
              : isAuthenticated
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Foreign Exchange
        </button>
        <button
          onClick={() => setActiveTab('server')}
          disabled={!isAuthenticated}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'server'
              ? 'bg-[#00ff88] text-black font-semibold'
              : isAuthenticated
              ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'bg-gray-900 text-gray-600 cursor-not-allowed'
          }`}
        >
          <Server className="w-4 h-4" />
          Banking Server
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* AUTHENTICATION TAB */}
        {activeTab === 'auth' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-neon mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6" />
                JWT Bearer Token Authentication
              </h2>

              {!isAuthenticated ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={authCredentials.email}
                      onChange={(e) => setAuthCredentials({ ...authCredentials, email: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="partner@yourcompany.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={authCredentials.password}
                      onChange={(e) => setAuthCredentials({ ...authCredentials, password: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="your-secure-password"
                    />
                  </div>

                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      <>
                        <Unlock className="w-5 h-5" />
                        Login
                      </>
                    )}
                  </button>

                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <div className="text-sm text-blue-400">
                      <strong>Demo Mode:</strong> Enter any email/password to test. In production, use your actual API credentials.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <strong>Authenticated Successfully</strong>
                    </div>
                    <div className="text-sm text-gray-400 space-y-1">
                      <div>User ID: {authUser?.id}</div>
                      <div>Email: {authUser?.email}</div>
                      <div>Role: {authUser?.role}</div>
                      <div>Token: {authToken.substring(0, 50)}...</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400">
                    Token is valid for 7 days. Use this token in the Authorization header for all API requests:
                  </div>

                  <div className="p-4 bg-black border border-gray-700 rounded font-mono text-xs overflow-x-auto">
                    <div className="text-gray-500">Authorization: Bearer {authToken}</div>
                  </div>
                </div>
              )}
            </div>

            {/* API Documentation */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-neon mb-4">Quick Start Guide</h3>

              <div className="space-y-4 text-sm text-gray-400">
                <div>
                  <strong className="text-white">1. Authentication</strong>
                  <p>Login with your credentials to receive a JWT token valid for 7 days.</p>
                </div>

                <div>
                  <strong className="text-white">2. Domestic Transfers</strong>
                  <p>Send account-to-account transfers within the Credit Populaire network.</p>
                </div>

                <div>
                  <strong className="text-white">3. International Payments</strong>
                  <p>Create ISO 20022 SWIFT-compliant cross-border payments (pain.001 standard).</p>
                </div>

                <div>
                  <strong className="text-white">4. Scheduled Payments</strong>
                  <p>Set up recurring or future-dated transfers with custom frequencies.</p>
                </div>

                <div>
                  <strong className="text-white">5. Beneficiaries</strong>
                  <p>Manage domestic and international beneficiary records.</p>
                </div>

                <div>
                  <strong className="text-white">6. Foreign Exchange</strong>
                  <p>Get real-time FX rates and convert currencies with competitive spreads.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DOMESTIC TRANSFERS TAB */}
        {activeTab === 'domestic' && (
          <div className="space-y-6">
            {/* Create Transfer Form */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-neon mb-4 flex items-center gap-2">
                <Send className="w-6 h-6" />
                Create Domestic Transfer
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    From Account Number
                  </label>
                  <input
                    type="text"
                    value={domesticTransfer.from_account_number}
                    onChange={(e) => setDomesticTransfer({ ...domesticTransfer, from_account_number: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="GB82CRPO00123400012345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    To Account Number
                  </label>
                  <input
                    type="text"
                    value={domesticTransfer.to_account_number}
                    onChange={(e) => setDomesticTransfer({ ...domesticTransfer, to_account_number: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="GB82CRPO00123400087654321"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={domesticTransfer.amount || ''}
                    onChange={(e) => setDomesticTransfer({ ...domesticTransfer, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="1500.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Currency
                  </label>
                  <select
                    value={domesticTransfer.currency}
                    onChange={(e) => setDomesticTransfer({ ...domesticTransfer, currency: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={domesticTransfer.description}
                    onChange={(e) => setDomesticTransfer({ ...domesticTransfer, description: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="Invoice #INV-2024-001"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateDomesticTransfer}
                disabled={loading}
                className="w-full px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Creating Transfer...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Create Transfer
                  </>
                )}
              </button>
            </div>

            {/* Transfer History */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Transfer History</h3>

              {domesticTransfers.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No transfers yet. Create your first transfer above.
                </div>
              ) : (
                <div className="space-y-3">
                  {domesticTransfers.map((transfer) => (
                    <div
                      key={transfer.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-[#00ff88]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-mono text-sm text-[#00ff88] mb-1">
                            Transfer #{transfer.id}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(transfer.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(transfer.status)}`}>
                          {transfer.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400 text-xs mb-1">From</div>
                          <div className="text-white font-mono text-xs">{transfer.from_account_number}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">To</div>
                          <div className="text-white font-mono text-xs">{transfer.to_account_number}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Amount</div>
                          <div className="text-[#00ff88] font-bold">
                            {transfer.currency} {transfer.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Description</div>
                          <div className="text-white text-xs truncate">{transfer.description}</div>
                        </div>
                      </div>

                      {transfer.approval_required && (
                        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-yellow-400">
                          ⚠️ Approval required ({transfer.approval_levels_required} level{transfer.approval_levels_required > 1 ? 's' : ''})
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTERNATIONAL PAYMENTS TAB */}
        {activeTab === 'international' && (
          <div className="space-y-6">
            {/* Create ISO 20022 Payment */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-neon mb-4 flex items-center gap-2">
                <Globe className="w-6 h-6" />
                Create ISO 20022 International Payment
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Debtor Account ID
                  </label>
                  <input
                    type="number"
                    value={iso20022Payment.debtorAccountId || ''}
                    onChange={(e) => setISO20022Payment({ ...iso20022Payment, debtorAccountId: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Execution Date
                  </label>
                  <input
                    type="date"
                    value={iso20022Payment.requestedExecutionDate}
                    onChange={(e) => setISO20022Payment({ ...iso20022Payment, requestedExecutionDate: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Charge Bearer
                  </label>
                  <select
                    value={iso20022Payment.chargeBearer}
                    onChange={(e) => setISO20022Payment({ ...iso20022Payment, chargeBearer: e.target.value as any })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  >
                    <option value="SHAR">SHAR - Shared</option>
                    <option value="DEBT">DEBT - Debtor pays all</option>
                    <option value="CRED">CRED - Creditor pays all</option>
                    <option value="SLEV">SLEV - Service level</option>
                  </select>
                </div>
              </div>

              {/* Credit Transfer Form */}
              <div className="border border-gray-700 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-white mb-4">Add Credit Transfer</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Creditor Name
                    </label>
                    <input
                      type="text"
                      value={newCreditTransfer.creditorName}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, creditorName: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="Acme Corporation SARL"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      IBAN
                    </label>
                    <input
                      type="text"
                      value={newCreditTransfer.creditorIban}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, creditorIban: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="FR7630006000011234567890189"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      BIC/SWIFT
                    </label>
                    <input
                      type="text"
                      value={newCreditTransfer.creditorBic}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, creditorBic: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="BNPAFRPP"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={newCreditTransfer.creditorBankName}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, creditorBankName: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="BNP Paribas"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      value={newCreditTransfer.amount || ''}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, amount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="5000.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Currency
                    </label>
                    <select
                      value={newCreditTransfer.currency}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, currency: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                      <option value="CHF">CHF</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={newCreditTransfer.creditorCountry}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, creditorCountry: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="FR"
                      maxLength={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Purpose Code
                    </label>
                    <select
                      value={newCreditTransfer.purposeCode}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, purposeCode: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    >
                      <option value="SUPP">SUPP - Supplier Payment</option>
                      <option value="SALA">SALA - Salary</option>
                      <option value="PENS">PENS - Pension</option>
                      <option value="INTC">INTC - Intra-Company</option>
                      <option value="TRAD">TRAD - Trade Services</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCreditTransfer.creditorAddress}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, creditorAddress: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="15 Avenue des Champs-Élysées, 75008 Paris, France"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Remittance Info
                    </label>
                    <input
                      type="text"
                      value={newCreditTransfer.remittanceInfo}
                      onChange={(e) => setNewCreditTransfer({ ...newCreditTransfer, remittanceInfo: e.target.value })}
                      className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      placeholder="Invoice #INV-FR-2024-042"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddCreditTransfer}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Add to Batch
                </button>
              </div>

              {/* Credit Transfers List */}
              {iso20022Payment.creditTransfers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">
                    Credit Transfers in Batch ({iso20022Payment.creditTransfers.length})
                  </h4>
                  <div className="space-y-2">
                    {iso20022Payment.creditTransfers.map((ct, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700 rounded"
                      >
                        <div className="flex-1">
                          <div className="text-white font-semibold">{ct.creditorName}</div>
                          <div className="text-xs text-gray-400 font-mono">{ct.creditorIban}</div>
                          <div className="text-[#00ff88] text-sm mt-1">
                            {ct.currency} {ct.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveCreditTransfer(index)}
                          className="ml-4 text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                    <div className="text-blue-400 font-semibold">
                      Total: {iso20022Payment.creditTransfers[0]?.currency}{' '}
                      {iso20022Payment.creditTransfers.reduce((sum, ct) => sum + ct.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleCreateISO20022Payment}
                disabled={loading || iso20022Payment.creditTransfers.length === 0}
                className="w-full px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Creating Payment...
                  </>
                ) : (
                  <>
                    <Globe className="w-5 h-5" />
                    Create ISO 20022 Payment
                  </>
                )}
              </button>
            </div>

            {/* Payment History */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">International Payment History</h3>

              {internationalPayments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No international payments yet. Create your first payment above.
                </div>
              ) : (
                <div className="space-y-3">
                  {internationalPayments.map((payment) => (
                    <div
                      key={payment.paymentInstruction.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-[#00ff88]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-mono text-sm text-[#00ff88] mb-1">
                            {payment.paymentInstruction.messageId}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(payment.paymentInstruction.created_at).toLocaleString()}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(payment.paymentInstruction.status)}`}>
                          {payment.paymentInstruction.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Total Amount</div>
                          <div className="text-[#00ff88] font-bold">
                            {payment.paymentInstruction.currency} {payment.paymentInstruction.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Transactions</div>
                          <div className="text-white">{payment.paymentInstruction.numberOfTransactions}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Execution Date</div>
                          <div className="text-white">{payment.paymentInstruction.requestedExecutionDate}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Charge Bearer</div>
                          <div className="text-white">{payment.paymentInstruction.chargeBearer}</div>
                        </div>
                      </div>

                      {/* Credit Transfers */}
                      <div className="border-t border-gray-700 pt-3">
                        <div className="text-xs text-gray-400 mb-2">Credit Transfers:</div>
                        <div className="space-y-2">
                          {payment.creditTransfers.map((ct) => (
                            <div key={ct.id} className="text-xs bg-gray-900/50 p-2 rounded">
                              <div className="flex items-center justify-between">
                                <span className="text-white">{ct.creditorName}</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(ct.status)}`}>
                                  {ct.status}
                                </span>
                              </div>
                              <div className="text-gray-400 font-mono mt-1">{ct.creditorIban}</div>
                              <div className="text-[#00ff88] mt-1">
                                {ct.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SCHEDULED PAYMENTS TAB */}
        {activeTab === 'scheduled' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-neon mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                Create Scheduled Payment
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    From Account ID
                  </label>
                  <input
                    type="number"
                    value={scheduledPayment.from_account_id || ''}
                    onChange={(e) => setScheduledPayment({ ...scheduledPayment, from_account_id: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="12345"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    To Beneficiary ID
                  </label>
                  <input
                    type="number"
                    value={scheduledPayment.to_beneficiary_id || ''}
                    onChange={(e) => setScheduledPayment({ ...scheduledPayment, to_beneficiary_id: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={scheduledPayment.amount || ''}
                    onChange={(e) => setScheduledPayment({ ...scheduledPayment, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="2500.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Currency
                  </label>
                  <select
                    value={scheduledPayment.currency}
                    onChange={(e) => setScheduledPayment({ ...scheduledPayment, currency: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Frequency
                  </label>
                  <select
                    value={scheduledPayment.frequency}
                    onChange={(e) => setScheduledPayment({ ...scheduledPayment, frequency: e.target.value as any })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  >
                    <option value="ONCE">ONCE - Single Payment</option>
                    <option value="DAILY">DAILY - Every Day</option>
                    <option value="WEEKLY">WEEKLY - Every 7 Days</option>
                    <option value="BIWEEKLY">BIWEEKLY - Every 14 Days</option>
                    <option value="MONTHLY">MONTHLY - Monthly</option>
                    <option value="YEARLY">YEARLY - Annually</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={scheduledPayment.start_date}
                    onChange={(e) => setScheduledPayment({ ...scheduledPayment, start_date: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={scheduledPayment.end_date || ''}
                    onChange={(e) => setScheduledPayment({ ...scheduledPayment, end_date: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={scheduledPayment.description}
                    onChange={(e) => setScheduledPayment({ ...scheduledPayment, description: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="Monthly supplier payment"
                  />
                </div>
              </div>

              <button
                onClick={handleCreateScheduledPayment}
                disabled={loading}
                className="w-full px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Calendar className="w-5 h-5" />
                    Create Scheduled Payment
                  </>
                )}
              </button>
            </div>

            {/* Scheduled Payments List */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Scheduled Payments</h3>

              {scheduledPayments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No scheduled payments yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduledPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-white font-semibold">#{payment.id}</div>
                          <div className="text-xs text-gray-400">{payment.description}</div>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Amount</div>
                          <div className="text-[#00ff88] font-bold">
                            {payment.currency} {payment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Frequency</div>
                          <div className="text-white">{payment.frequency}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Next Execution</div>
                          <div className="text-white">{payment.next_execution_date}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Executions</div>
                          <div className="text-white">{payment.executions_completed}/{payment.total_executions_planned}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* BENEFICIARIES TAB */}
        {activeTab === 'beneficiaries' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-neon mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Create Beneficiary
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Beneficiary Type
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setNewBeneficiary({ ...newBeneficiary, beneficiary_type: 'DOMESTIC' })}
                    className={`flex-1 px-4 py-2 rounded border ${
                      newBeneficiary.beneficiary_type === 'DOMESTIC'
                        ? 'bg-[#00ff88] text-black border-[#00ff88] font-semibold'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    Domestic
                  </button>
                  <button
                    onClick={() => setNewBeneficiary({ ...newBeneficiary, beneficiary_type: 'INTERNATIONAL' })}
                    className={`flex-1 px-4 py-2 rounded border ${
                      newBeneficiary.beneficiary_type === 'INTERNATIONAL'
                        ? 'bg-[#00ff88] text-black border-[#00ff88] font-semibold'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    International
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newBeneficiary.name}
                    onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="John Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={newBeneficiary.bank_name}
                    onChange={(e) => setNewBeneficiary({ ...newBeneficiary, bank_name: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="Chase Bank"
                  />
                </div>

                {newBeneficiary.beneficiary_type === 'DOMESTIC' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={newBeneficiary.account_number || ''}
                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, account_number: e.target.value })}
                        className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                        placeholder="123456789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Routing Number
                      </label>
                      <input
                        type="text"
                        value={newBeneficiary.routing_number || ''}
                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, routing_number: e.target.value })}
                        className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                        placeholder="026073150"
                      />
                    </div>
                  </>
                )}

                {newBeneficiary.beneficiary_type === 'INTERNATIONAL' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        IBAN
                      </label>
                      <input
                        type="text"
                        value={newBeneficiary.iban || ''}
                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, iban: e.target.value })}
                        className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                        placeholder="FR7612345678901234567890123"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        SWIFT Code
                      </label>
                      <input
                        type="text"
                        value={newBeneficiary.swift_code || ''}
                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, swift_code: e.target.value })}
                        className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                        placeholder="BNPAFRPP"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Currency
                      </label>
                      <select
                        value={newBeneficiary.currency || 'EUR'}
                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, currency: e.target.value })}
                        className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="GBP">GBP</option>
                        <option value="CHF">CHF</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={newBeneficiary.address || ''}
                        onChange={(e) => setNewBeneficiary({ ...newBeneficiary, address: e.target.value })}
                        className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                        placeholder="10 Rue de la Paix, 75002 Paris, France"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={newBeneficiary.country}
                    onChange={(e) => setNewBeneficiary({ ...newBeneficiary, country: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="US"
                    maxLength={2}
                  />
                </div>
              </div>

              <button
                onClick={handleCreateBeneficiary}
                disabled={loading}
                className="w-full px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Create Beneficiary
                  </>
                )}
              </button>
            </div>

            {/* Beneficiaries List */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">Beneficiaries</h3>

              {beneficiaries.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No beneficiaries yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {beneficiaries.map((beneficiary) => (
                    <div
                      key={beneficiary.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-white font-semibold">{beneficiary.name}</div>
                          <div className="text-xs text-gray-400">{beneficiary.bank_name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs ${getStatusColor(beneficiary.status)}`}>
                            {beneficiary.status}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            beneficiary.beneficiary_type === 'DOMESTIC'
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {beneficiary.beneficiary_type}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {beneficiary.beneficiary_type === 'DOMESTIC' ? (
                          <>
                            <div>
                              <div className="text-gray-400 text-xs mb-1">Account Number</div>
                              <div className="text-white font-mono text-xs">{beneficiary.account_number}</div>
                            </div>
                            <div>
                              <div className="text-gray-400 text-xs mb-1">Routing Number</div>
                              <div className="text-white font-mono text-xs">{beneficiary.routing_number}</div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <div className="text-gray-400 text-xs mb-1">IBAN</div>
                              <div className="text-white font-mono text-xs">{beneficiary.iban}</div>
                            </div>
                            <div>
                              <div className="text-gray-400 text-xs mb-1">SWIFT</div>
                              <div className="text-white font-mono text-xs">{beneficiary.swift_code}</div>
                            </div>
                            <div>
                              <div className="text-gray-400 text-xs mb-1">Currency</div>
                              <div className="text-white">{beneficiary.currency}</div>
                            </div>
                          </>
                        )}
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Country</div>
                          <div className="text-white">{beneficiary.country}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOREIGN EXCHANGE TAB */}
        {activeTab === 'fx' && (
          <div className="space-y-6">
            {/* Get FX Rates */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-neon mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Foreign Exchange Rates
              </h2>

              <button
                onClick={handleGetFXRates}
                disabled={loading}
                className="w-full px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Loading Rates...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Get Latest FX Rates
                  </>
                )}
              </button>

              {fxRates && (
                <div>
                  <div className="mb-4 text-sm text-gray-400">
                    Base Currency: <span className="text-[#00ff88] font-semibold">{fxRates.base}</span>
                    <span className="mx-2">|</span>
                    Source: {fxRates.source}
                    <span className="mx-2">|</span>
                    Last Updated: {new Date(fxRates.last_updated).toLocaleString()}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(fxRates.rates).map(([currency, rate]) => (
                      <div key={currency} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <div className="text-gray-400 text-xs mb-1">{currency}</div>
                        <div className="text-[#00ff88] text-xl font-bold">{rate.toFixed(4)}</div>
                        <div className="text-xs text-gray-500 mt-1">1 {fxRates.base} = {rate.toFixed(4)} {currency}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Currency Conversion */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-neon mb-4 flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Currency Conversion
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={fxConversion.amount || ''}
                    onChange={(e) => setFxConversion({ ...fxConversion, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                    placeholder="10000.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    From Currency
                  </label>
                  <select
                    value={fxConversion.from_currency}
                    onChange={(e) => setFxConversion({ ...fxConversion, from_currency: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    To Currency
                  </label>
                  <select
                    value={fxConversion.to_currency}
                    onChange={(e) => setFxConversion({ ...fxConversion, to_currency: e.target.value })}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                    <option value="JPY">JPY</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fxConversion.include_spread}
                    onChange={(e) => setFxConversion({ ...fxConversion, include_spread: e.target.checked })}
                    className="w-4 h-4"
                  />
                  Include spread in calculation
                </label>
              </div>

              <button
                onClick={handleConvertCurrency}
                disabled={loading}
                className="w-full px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Convert
                  </>
                )}
              </button>

              {fxConversionResult && (
                <div className="mt-6 p-6 bg-gradient-to-r from-[#00ff88]/10 to-[#00cc6a]/10 border border-[#00ff88]/30 rounded-lg">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-[#00ff88] mb-2">
                      {fxConversionResult.to_currency} {fxConversionResult.to_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-gray-400">
                      {fxConversionResult.from_currency} {fxConversionResult.from_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Exchange Rate</div>
                      <div className="text-white font-semibold">{fxConversionResult.exchange_rate.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Mid-Market Rate</div>
                      <div className="text-white font-semibold">{fxConversionResult.mid_market_rate.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Spread</div>
                      <div className="text-yellow-400 font-semibold">{fxConversionResult.spread_percentage}%</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Spread Cost</div>
                      <div className="text-yellow-400 font-semibold">
                        {fxConversionResult.from_currency} {fxConversionResult.spread_cost.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Tier</div>
                      <div className="text-white font-semibold">{fxConversionResult.tier}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Valid Until</div>
                      <div className="text-white text-xs">{new Date(fxConversionResult.valid_until).toLocaleString()}</div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-400 border-t border-gray-700 pt-4">
                    <strong>FX Spread Tiers:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>RETAIL (0-50K): 0.7% spread</li>
                      <li>PREFERRED (50K-500K): 0.4% spread</li>
                      <li>PRIVATE (500K-5M): 0.2% spread</li>
                      <li>INSTITUTIONAL (5M+): 0.1% spread</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BANKING SERVER CONNECTION TAB */}
        {activeTab === 'server' && (
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-neon mb-4 flex items-center gap-2">
                <Server className="w-6 h-6" />
                Banking Server Connection
              </h2>

              {/* Connection Status */}
              <div className="mb-6 p-6 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {bankingServerStatus === 'disconnected' && <WifiOff className="w-8 h-8 text-red-400" />}
                    {bankingServerStatus === 'connecting' && <RefreshCw className="w-8 h-8 text-yellow-400 animate-spin" />}
                    {bankingServerStatus === 'connected' && <Wifi className="w-8 h-8 text-green-400" />}
                    {bankingServerStatus === 'error' && <AlertCircle className="w-8 h-8 text-red-400" />}
                    <div>
                      <div className="text-xl font-bold text-white">
                        {bankingServerStatus === 'disconnected' && 'DISCONNECTED'}
                        {bankingServerStatus === 'connecting' && 'CONNECTING...'}
                        {bankingServerStatus === 'connected' && 'CONNECTED'}
                        {bankingServerStatus === 'error' && 'ERROR'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {bankingServerStatus === 'disconnected' && 'Not connected to banking server'}
                        {bankingServerStatus === 'connecting' && 'Establishing connection...'}
                        {bankingServerStatus === 'connected' && `Connected to ${serverHost}`}
                        {bankingServerStatus === 'error' && 'Failed to connect to server'}
                      </div>
                    </div>
                  </div>
                  <div className={`px-4 py-2 rounded-full font-semibold text-sm ${
                    bankingServerStatus === 'disconnected'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : bankingServerStatus === 'connecting'
                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      : bankingServerStatus === 'connected'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {bankingServerStatus.toUpperCase()}
                  </div>
                </div>

                {lastPingTime !== null && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Latency: <span className="text-green-400 font-semibold">{lastPingTime}ms</span></span>
                  </div>
                )}
              </div>

              {/* Server Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Server Host
                  </label>
                  <input
                    type="text"
                    value={serverHost}
                    onChange={(e) => setServerHost(e.target.value)}
                    disabled={bankingServerStatus === 'connected' || bankingServerStatus === 'connecting'}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="sandbox.creditpopulaire.net"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Port
                  </label>
                  <input
                    type="text"
                    value={serverPort}
                    onChange={(e) => setServerPort(e.target.value)}
                    disabled={bankingServerStatus === 'connected' || bankingServerStatus === 'connecting'}
                    className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder="443"
                  />
                </div>
              </div>

              {/* Security Signature */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Security Digital Signature
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={securitySignature}
                  onChange={(e) => setSecuritySignature(e.target.value)}
                  disabled={bankingServerStatus === 'connected' || bankingServerStatus === 'connecting'}
                  className="w-full px-4 py-2 bg-black border border-gray-700 rounded text-white focus:border-[#00ff88] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                  placeholder="Enter your security digital signature (min 32 characters)"
                  minLength={32}
                />
                <div className="mt-2 flex items-start gap-2 text-xs text-gray-400">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <div>
                    <div>Your security signature is required to establish a secure connection.</div>
                    <div className="mt-1">Minimum length: 32 characters. This signature will be encrypted and validated by the banking server.</div>
                    {securitySignature.length > 0 && securitySignature.length < 32 && (
                      <div className="text-yellow-400 mt-1">
                        ⚠️ {32 - securitySignature.length} more characters needed
                      </div>
                    )}
                    {securitySignature.length >= 32 && (
                      <div className="text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Valid signature length
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connection Actions */}
              <div className="flex gap-4">
                {bankingServerStatus === 'disconnected' || bankingServerStatus === 'error' ? (
                  <button
                    onClick={handleConnectToServer}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:bg-[#00cc6a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-5 h-5" />
                        Connect to Banking Server
                      </>
                    )}
                  </button>
                ) : bankingServerStatus === 'connected' ? (
                  <button
                    onClick={handleDisconnectFromServer}
                    className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <WifiOff className="w-5 h-5" />
                    Disconnect
                  </button>
                ) : null}
              </div>

              {/* Server Information */}
              <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-400 mb-2">Server Information</h3>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>Environment: <span className="text-white">Sandbox</span></div>
                  <div>API Version: <span className="text-white">2.0</span></div>
                  <div>Protocol: <span className="text-white">HTTPS/TLS 1.3</span></div>
                  <div>Authentication: <span className="text-white">JWT Bearer Token + Digital Signature</span></div>
                  <div>Banking Standard: <span className="text-white">ISO 20022 (pain.001, pacs.008)</span></div>
                  <div>Security: <span className="text-white">256-bit Encryption</span></div>
                </div>
              </div>

              {/* Connection Requirements */}
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <h3 className="text-sm font-semibold text-yellow-400 mb-2">Requirements</h3>
                <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                  <li>Valid JWT token from authentication</li>
                  <li><strong className="text-white">Security digital signature (minimum 32 characters)</strong></li>
                  <li>Stable internet connection</li>
                  <li>Access to sandbox.creditpopulaire.net or production server</li>
                  <li>Firewall rules allowing HTTPS (port 443)</li>
                  <li>TLS 1.3 compatible client</li>
                </ul>
              </div>

              {/* Connection Benefits */}
              <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <h3 className="text-sm font-semibold text-green-400 mb-2">Connection Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-400">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Real-time payment processing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Live FX rate updates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Instant transfer validation</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Secure SWIFT messaging</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Account balance synchronization</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>Beneficiary management</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
