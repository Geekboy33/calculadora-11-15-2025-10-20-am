import { useState, useEffect, lazy, Suspense } from 'react';
import { LayoutDashboard, FileText, Send, Key, Shield, Wallet, Binary, Eye, Database, Building2, BookOpen, LogOut, FileCheck, Menu, FileSearch, ArrowRightLeft, Lock, TrendingUp, User, Globe, Zap, Activity, CreditCard } from 'lucide-react';
import { LanguageSelector } from './components/LanguageSelector';
import { Login } from './components/Login';
import { useLanguage } from './lib/i18n.tsx';
import { useAuth } from './lib/auth.tsx';

// ✅ Lazy loading de componentes no críticos
const PublicVerificationPage = lazy(() => import('./components/PublicVerificationPage').then(m => ({ default: m.PublicVerificationPage })));
const MobileMenu = lazy(() => import('./components/ui/MobileMenu').then(m => ({ default: m.MobileMenu })));
const GlobalProcessingIndicator = lazy(() => import('./components/GlobalProcessingIndicator').then(m => ({ default: m.GlobalProcessingIndicator })));
const NotificationCenter = lazy(() => import('./components/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const ToastNotification = lazy(() => import('./components/ToastNotification').then(m => ({ default: m.ToastNotification })));
import { processingStore } from './lib/processing-store';

const AdvancedBankingDashboard = lazy(() => import(/* webpackPrefetch: true */ './components/AdvancedBankingDashboard').then(m => ({ default: m.AdvancedBankingDashboard })));
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));
const DTC1BProcessor = lazy(() => import(/* webpackPrefetch: true */ './components/DTC1BProcessor').then(m => ({ default: m.DTC1BProcessor })));
const TransferInterface = lazy(() => import('./components/TransferInterface').then(m => ({ default: m.TransferInterface })));
const APIKeyManager = lazy(() => import('./components/APIKeyManager').then(m => ({ default: m.APIKeyManager })));
const AuditLogViewer = lazy(() => import('./components/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const AdvancedBinaryReader = lazy(() => import('./components/AdvancedBinaryReader').then(m => ({ default: m.AdvancedBinaryReader })));
const EnhancedBinaryViewer = lazy(() => import('./components/EnhancedBinaryViewer').then(m => ({ default: m.EnhancedBinaryViewer })));
const LargeFileDTC1BAnalyzer = lazy(() => import('./components/LargeFileDTC1BAnalyzer').then(m => ({ default: m.LargeFileDTC1BAnalyzer })));
const XcpB2BInterface = lazy(() => import('./components/XcpB2BInterface').then(m => ({ default: m.XcpB2BInterface })));
const AccountLedger = lazy(() => import('./components/AccountLedger').then(m => ({ default: m.AccountLedger })));
const BankBlackScreen = lazy(() => import('./components/BankBlackScreen').then(m => ({ default: m.BankBlackScreen })));
const AuditBankWindow = lazy(() => import('./components/AuditBankWindow').then(m => ({ default: m.AuditBankWindow })));
const CoreBankingAPIModule = lazy(() => import('./components/CoreBankingAPIModule').then(m => ({ default: m.CoreBankingAPIModule })));
const CustodyAccountsModule = lazy(() => import('./components/CustodyAccountsModule').then(m => ({ default: m.CustodyAccountsModule })));
const APIDAESModule = lazy(() => import('./components/APIDAESModule').then(m => ({ default: m.APIDAESModule })));
const APIVUSDModule = lazy(() => import('./components/APIVUSDModule').then(m => ({ default: m.APIVUSDModule })));
const APIDAESPledgeModule = lazy(() => import('./components/APIDAESPledgeModule').then(m => ({ default: m.APIDAESPledgeModule })));
const APIVUSD1Module = lazy(() => import('./components/APIVUSD1Module').then(m => ({ default: m.default })));
const APIGlobalModule = lazy(() => import('./components/APIGlobalModule').then(m => ({ default: m.default })));
const APIDigitalModule = lazy(() => import('./components/APIDigitalModule').then(m => ({ default: m.APIDigitalModule })));
const ProofOfReservesAPIModule = lazy(() => import('./components/ProofOfReservesAPIModule').then(m => ({ default: m.ProofOfReservesAPIModule })));
const ProofOfReservesAPI1Module = lazy(() => import('./components/ProofOfReservesAPI1Module').then(m => ({ default: m.ProofOfReservesAPI1Module })));
const TransactionEventsModule = lazy(() => import('./components/TransactionEventsModule').then(m => ({ default: m.TransactionEventsModule })));
const ProfilesModule = lazy(() => import('./components/ProfilesModule').then(m => ({ default: m.ProfilesModule })));
const BankSettlementModule = lazy(() => import('./components/BankSettlementModule').then(m => ({ default: m.BankSettlementModule })));
const IbanManagerModule = lazy(() => import('./components/IbanManagerModule').then(m => ({ default: m.IbanManagerModule })));

type Tab = 'dashboard' | 'analytics' | 'processor' | 'transfer' | 'api-keys' | 'audit' | 'binary-reader' | 'hex-viewer' | 'large-file-analyzer' | 'xcp-b2b' | 'ledger' | 'blackscreen' | 'audit-bank' | 'corebanking-api' | 'custody' | 'profiles' | 'api-daes' | 'api-vusd' | 'api-daes-pledge' | 'api-vusd1' | 'api-global' | 'api-digital' | 'proof-of-reserves' | 'proof-of-reserves-api1' | 'transactions-events' | 'bank-settlement' | 'iban-manager';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, language } = useLanguage();
  const isSpanish = language === 'es';
  const { isAuthenticated, user, login, logout } = useAuth();

  // Detectar si es una URL de verificación pública
  const checkPublicVerificationUrl = (): string | null => {
    const path = window.location.pathname;
    // Detectar patrones: /blockchain/verify/{ID} o /banking/verify/{ID}
    const match = path.match(/\/(blockchain|banking)\/verify\/(.+)/);
    return match ? match[2] : null;
  };

  const verificationAccountId = checkPublicVerificationUrl();

  // Efecto para mantener procesamiento global activo al cambiar de módulo
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const initializeProcessing = async () => {
      // Cargar estado desde Supabase
      const state = await processingStore.loadState();
      if (!mounted) return;

      if (state && (state.status === 'processing' || state.status === 'paused')) {
        console.log('[App] Proceso pendiente detectado:', state.fileName, state.progress.toFixed(2) + '%');
      }

      // Suscribirse a cambios para logging
      unsubscribe = processingStore.subscribe((state) => {
        if (state && state.status === 'processing') {
          // El procesamiento continúa independientemente del módulo activo
        }
      });
    };

    // Manejar evento de navegación desde GlobalProcessingIndicator
    const handleNavigateToAnalyzer = () => {
      setActiveTab('large-file-analyzer');
    };

    initializeProcessing();
    window.addEventListener('navigate-to-analyzer', handleNavigateToAnalyzer);

    return () => {
      mounted = false;
      unsubscribe?.();
      window.removeEventListener('navigate-to-analyzer', handleNavigateToAnalyzer);
    };
  }, []);

  // Si es una URL de verificación pública, mostrar la página de verificación
  if (verificationAccountId) {
    return <PublicVerificationPage accountId={verificationAccountId} />;
  }

  // Mostrar login si no está autenticado
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  const tabs = [
    { id: 'dashboard' as Tab, name: t.navDashboard, icon: LayoutDashboard },
    { id: 'analytics' as Tab, name: 'Analytics', icon: TrendingUp },
    { id: 'ledger' as Tab, name: t.navLedger, icon: BookOpen },
    { id: 'blackscreen' as Tab, name: t.navBlackScreen, icon: FileCheck },
    { id: 'custody' as Tab, name: t.navCustody, icon: Lock },
    { id: 'profiles' as Tab, name: isSpanish ? 'Perfiles' : 'Profiles', icon: User },
    { id: 'api-daes' as Tab, name: 'API DAES', icon: Key },
    { id: 'api-global' as Tab, name: 'API GLOBAL', icon: Globe },
    { id: 'api-digital' as Tab, name: 'API DIGITAL', icon: Building2 },
    { id: 'api-vusd' as Tab, name: 'API VUSD', icon: TrendingUp },
    { id: 'api-vusd1' as Tab, name: 'API VUSD1', icon: Database },
    { id: 'proof-of-reserves' as Tab, name: 'Proof of Reserves API', icon: Shield },
    { id: 'proof-of-reserves-api1' as Tab, name: 'PoR API1 - Anchor VUSD', icon: Zap },
    { id: 'transactions-events' as Tab, name: isSpanish ? 'Transacciones y Eventos' : 'Transactions & Events', icon: Activity },
    { id: 'bank-settlement' as Tab, name: isSpanish ? 'Liquidación Bancaria' : 'Bank Settlement', icon: Building2 },
    { id: 'iban-manager' as Tab, name: isSpanish ? 'Gestor de IBANs' : 'IBAN Manager', icon: CreditCard },
    { id: 'api-daes-pledge' as Tab, name: 'DAES Pledge/Escrow', icon: TrendingUp },
    { id: 'audit-bank' as Tab, name: t.navAuditBank, icon: FileSearch },
    { id: 'corebanking-api' as Tab, name: 'CoreBanking API', icon: ArrowRightLeft },
    { id: 'xcp-b2b' as Tab, name: t.navXcpB2B, icon: Building2 },
    { id: 'processor' as Tab, name: t.navProcessor, icon: FileText },
    { id: 'binary-reader' as Tab, name: t.navBinaryReader, icon: Binary },
    { id: 'hex-viewer' as Tab, name: t.navAnalyzerPro, icon: Eye },
    { id: 'large-file-analyzer' as Tab, name: t.navLargeFileAnalyzer, icon: Database },
    { id: 'transfer' as Tab, name: t.navTransfers, icon: Send },
    { id: 'api-keys' as Tab, name: t.navApiKeys, icon: Key },
    { id: 'audit' as Tab, name: t.navAuditLogs, icon: Shield }
  ];

  return (
    <div className="h-screen flex flex-col bg-black">
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
      />

      <header className="bg-black border-b border-[#1a1a1a] shadow-[0_2px_20px_rgba(0,255,136,0.1)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger button for mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                title="Abrir menú de navegación"
                aria-label="Abrir menú de navegación"
              >
                <Menu className="w-6 h-6 text-[#00ff88]" />
              </button>
              <div className="p-2 bg-gradient-to-br from-[#00ff88] to-[#00cc6a] rounded-lg glow-green">
                <Wallet className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#e0ffe0]">{t.headerTitle}</h1>
                <p className="text-sm text-neon font-bold">{t.headerSubtitle}</p>
                <p className="text-xs text-[#4d7c4d]">AES-256-GCM • Digital Commercial Bank Ltd • HMAC-SHA256</p>
              </div>
            </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
            <LanguageSelector />
            <div className="text-right">
              <div className="text-xs text-[#4d7c4d]">{t.productionEnvironment}</div>
              <div className="text-sm font-semibold text-neon pulse-green">{t.allSystemsOperational}</div>
              <div className="text-xs text-cyber mt-1 blink-matrix">{t.dtcAnalysisReady}</div>
              <div className="flex items-center gap-1 text-xs text-[#80ff80] mt-1 font-mono">
                <User className="w-3 h-3" />
                <span>{user}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg text-[#4d7c4d] hover:text-[#00ff88] hover:border-[#00ff88] hover:shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all"
              title={t.logoutTitle}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-semibold">{t.logout}</span>
            </button>
          </div>
          </div>
        </div>

        <nav className="px-6 bg-[#0a0a0a] border-t border-[#1a1a1a] hidden lg:block">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium transition-all relative ${
                    isActive
                      ? 'text-[#00ffaa] text-shadow-[0_0_10px_rgba(0,255,136,0.8)]'
                      : 'text-[#4d7c4d] hover:text-[#80ff80]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.8)]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="flex-1 overflow-hidden">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00ff88] mb-4"></div>
              <p className="text-[#00ff88] text-lg font-semibold">Cargando módulo...</p>
            </div>
          </div>
        }>
          {activeTab === 'dashboard' && <AdvancedBankingDashboard />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'ledger' && <AccountLedger />}
          {activeTab === 'blackscreen' && <BankBlackScreen />}
          {activeTab === 'custody' && <CustodyAccountsModule />}
          {activeTab === 'profiles' && <ProfilesModule />}
          {activeTab === 'api-daes' && <APIDAESModule />}
          {activeTab === 'api-global' && <APIGlobalModule />}
          {activeTab === 'api-digital' && <APIDigitalModule />}
          {activeTab === 'api-vusd' && <APIVUSDModule />}
          {activeTab === 'api-vusd1' && <APIVUSD1Module />}
          {activeTab === 'proof-of-reserves' && <ProofOfReservesAPIModule />}
          {activeTab === 'proof-of-reserves-api1' && <ProofOfReservesAPI1Module />}
          {activeTab === 'transactions-events' && <TransactionEventsModule />}
          {activeTab === 'bank-settlement' && <BankSettlementModule />}
          {activeTab === 'iban-manager' && <IbanManagerModule />}
          {activeTab === 'api-daes-pledge' && <APIDAESPledgeModule />}
          {activeTab === 'audit-bank' && <AuditBankWindow />}
          {activeTab === 'corebanking-api' && <CoreBankingAPIModule />}
          {activeTab === 'xcp-b2b' && <XcpB2BInterface />}
          {activeTab === 'processor' && <DTC1BProcessor />}
          {activeTab === 'binary-reader' && <AdvancedBinaryReader />}
          {activeTab === 'hex-viewer' && <EnhancedBinaryViewer />}
          {activeTab === 'large-file-analyzer' && <LargeFileDTC1BAnalyzer />}
          {activeTab === 'transfer' && <TransferInterface />}
          {activeTab === 'api-keys' && <APIKeyManager />}
          {activeTab === 'audit' && <AuditLogViewer />}
        </Suspense>
      </main>

      <footer className="bg-black border-t border-[#1a1a1a] px-6 py-3 shadow-[0_-2px_20px_rgba(0,255,136,0.1)]">
        <div className="flex items-center justify-between text-xs text-[#4d7c4d]">
          <div className="flex items-center gap-6">
            <span className="hover:text-[#80ff80] transition-colors">{t.footerVersion}</span>
            <span className="hover:text-[#80ff80] transition-colors">{t.footerIsoCompliant}</span>
            <span className="hover:text-[#80ff80] transition-colors">{t.footerPciReady}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-[#80ff80] transition-colors">{t.footerMultiCurrency}</span>
            <span className="hover:text-[#80ff80] transition-colors">{t.footerEncryption}</span>
            <span className="text-cyber font-bold pulse-green">{t.footerForensicAnalysis}</span>
          </div>
        </div>
      </footer>
      
      {/* Indicador global de procesamiento */}
      <GlobalProcessingIndicator />

      {/* Sistema de notificaciones toast */}
      <ToastNotification />
    </div>
  );
}

export default App;
