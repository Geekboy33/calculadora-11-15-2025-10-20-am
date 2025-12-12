import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { LayoutDashboard, FileText, Send, Key, Shield, Wallet, Binary, Eye, Database, Building2, BookOpen, LogOut, FileCheck, Menu, FileSearch, ArrowRightLeft, Lock, TrendingUp, User, Globe, Zap, Activity, CreditCard, Webhook, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  CentralPanelIcon, 
  PrivateCentralBankIcon, 
  SourceOfFundsIcon, 
  TheKingdomBankIcon, 
  DAESPartnerAPIIcon,
  ModuleIconWidget,
  getModuleIcon
} from './components/ui/ModuleIcons';
import { LanguageSelector } from './components/LanguageSelector';
import { Login } from './components/Login';
import { PublicVerificationPage } from './components/PublicVerificationPage';
import { useLanguage } from './lib/i18n.tsx';
import { useAuth } from './lib/auth.tsx';
import { MobileMenu } from './components/ui/MobileMenu';
import { PageTransition } from './components/ui/PageTransition';
import { GlobalProcessingIndicator } from './components/GlobalProcessingIndicator';
import { NotificationCenter } from './components/NotificationCenter';
import { ToastProvider } from './components/ui/ToastNotification';
import { ToastNotification } from './components/ToastNotification';
import { processingStore } from './lib/processing-store';

const CentralBankingDashboard = lazy(() => import(/* webpackPrefetch: true */ './components/CentralBankingDashboard').then(m => ({ default: m.CentralBankingDashboard })));
const BancoCentralPrivadoModule = lazy(() => import('./components/BancoCentralPrivadoModule').then(m => ({ default: m.BancoCentralPrivadoModule })));
const OrigenDeFondosModule = lazy(() => import('./components/OrigenDeFondosModule').then(m => ({ default: m.OrigenDeFondosModule })));
const TheKingdomBankModule = lazy(() => import('./components/TheKingdomBankModule').then(m => ({ default: m.TheKingdomBankModule })));
const DAESPartnerAPIModule = lazy(() => import('./components/DAESPartnerAPIModule').then(m => ({ default: m.DAESPartnerAPIModule })));
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
const MGWebhookModule = lazy(() => import('./components/MGWebhookModule').then(m => ({ default: m.MGWebhookModule })));
const APIVUSDModule = lazy(() => import('./components/APIVUSDModule').then(m => ({ default: m.APIVUSDModule })));
const APIDAESPledgeModule = lazy(() => import('./components/APIDAESPledgeModule').then(m => ({ default: m.APIDAESPledgeModule })));
const APIVUSD1Module = lazy(() => import('./components/APIVUSD1Module').then(m => ({ default: m.default })));
const APIGlobalModule = lazy(() => import('./components/APIGlobalModule').then(m => ({ default: m.default })));
const APIDigitalModule = lazy(() => import('./components/APIDigitalModule').then(m => ({ default: m.APIDigitalModule })));
const ProofOfReservesAPIModule = lazy(() => import('./components/ProofOfReservesAPIModule').then(m => ({ default: m.ProofOfReservesAPIModule })));
const ProofOfReservesAPI1Module = lazy(() => import('./components/ProofOfReservesAPI1Module').then(m => ({ default: m.ProofOfReservesAPI1Module })));
const TransactionEventsModule = lazy(() => import('./components/TransactionEventsModule').then(m => ({ default: m.TransactionEventsModule })));
const ProfilesModule = lazy(() => 
  import('./components/ProfilesModule')
    .then(m => {
      // Try default export first, then named export
      const component = m.default || m.ProfilesModule;
      if (!component) {
        throw new Error('ProfilesModule export not found');
      }
      return { default: component };
    })
    .catch(error => {
      console.error('Error loading ProfilesModule:', error);
      // Return a fallback component
      return { 
        default: () => (
          <div className="p-6 text-white">
            <h2 className="text-xl font-bold mb-4">Error loading Profiles Module</h2>
            <p className="text-white/70">Please refresh the page or contact support.</p>
            <p className="text-xs text-white/50 mt-2">Error: {error.message}</p>
          </div>
        )
      };
    })
);
const BankSettlementModule = lazy(() => import('./components/BankSettlementModule').then(m => ({ default: m.BankSettlementModule })));
const IbanManagerModule = lazy(() => import('./components/IbanManagerModule').then(m => ({ default: m.IbanManagerModule })));
const DownloadsModule = lazy(() => import('./components/DownloadsModule').then(m => ({ default: m.DownloadsModule })));

type Tab = 'central-dashboard' | 'banco-central-privado' | 'origen-fondos' | 'the-kingdom-bank' | 'daes-partner-api' | 'dashboard' | 'analytics' | 'processor' | 'transfer' | 'api-keys' | 'audit' | 'binary-reader' | 'hex-viewer' | 'large-file-analyzer' | 'xcp-b2b' | 'ledger' | 'blackscreen' | 'audit-bank' | 'corebanking-api' | 'custody' | 'profiles' | 'api-daes' | 'mg-webhook' | 'api-vusd' | 'api-daes-pledge' | 'api-vusd1' | 'api-global' | 'api-digital' | 'proof-of-reserves' | 'proof-of-reserves-api1' | 'transactions-events' | 'bank-settlement' | 'iban-manager' | 'downloads';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('central-dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, language } = useLanguage();
  const isSpanish = language === 'es';
  const { isAuthenticated, user, login, logout } = useAuth();
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // Scroll horizontal para tabs
  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      const scrollAmount = 400;
      const currentScroll = tabsScrollRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      tabsScrollRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

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
    { id: 'central-dashboard' as Tab, name: isSpanish ? 'Panel Central' : 'Central Panel', icon: Building2 },
    { id: 'banco-central-privado' as Tab, name: 'Treasury Reserve', icon: Shield },
    { id: 'origen-fondos' as Tab, name: isSpanish ? 'Origen de Fondos' : 'Source of Funds', icon: FileSearch },
    { id: 'the-kingdom-bank' as Tab, name: 'The Kingdom Bank', icon: Key },
    { id: 'daes-partner-api' as Tab, name: isSpanish ? 'APIs Partner DAES' : 'DAES Partner APIs', icon: Globe },
    { id: 'dashboard' as Tab, name: t.navDashboard, icon: LayoutDashboard },
    { id: 'analytics' as Tab, name: 'Analytics', icon: TrendingUp },
    { id: 'ledger' as Tab, name: t.navLedger, icon: BookOpen },
    { id: 'blackscreen' as Tab, name: t.navBlackScreen, icon: FileCheck },
    { id: 'custody' as Tab, name: t.navCustody, icon: Lock },
    { id: 'profiles' as Tab, name: isSpanish ? 'Perfiles' : 'Profiles', icon: User },
    { id: 'api-daes' as Tab, name: 'API DAES', icon: Key },
    { id: 'mg-webhook' as Tab, name: isSpanish ? 'MG Webhook' : 'MG Webhook', icon: Webhook },
    { id: 'api-global' as Tab, name: 'API GLOBAL', icon: Globe },
    { id: 'api-digital' as Tab, name: 'API DIGITAL', icon: Building2 },
    { id: 'api-vusd' as Tab, name: 'API VUSD', icon: TrendingUp },
    { id: 'api-vusd1' as Tab, name: 'API VUSD1', icon: Database },
    { id: 'proof-of-reserves' as Tab, name: 'Proof of Reserves API', icon: Shield },
    { id: 'proof-of-reserves-api1' as Tab, name: 'PoR API1 - Anchor VUSD', icon: Zap },
    { id: 'transactions-events' as Tab, name: isSpanish ? 'Transacciones y Eventos' : 'Transactions & Events', icon: Activity },
    { id: 'bank-settlement' as Tab, name: isSpanish ? 'Liquidación Bancaria' : 'Bank Settlement', icon: Building2 },
    { id: 'iban-manager' as Tab, name: isSpanish ? 'Gestor de IBANs' : 'IBAN Manager', icon: CreditCard },
    { id: 'downloads' as Tab, name: isSpanish ? 'Descargas' : 'Downloads', icon: FileText },
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
    <div className="h-screen flex flex-col bg-[var(--bg-main)]">
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as Tab)}
      />

      <header className="bg-[var(--bg-card)] border-b border-[var(--border-medium)] shadow-[var(--shadow-card)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Hamburger button for mobile */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-all"
                title="Abrir menú de navegación"
                aria-label="Abrir menú de navegación"
              >
                <Menu className="w-6 h-6 text-[var(--text-primary)]" />
              </button>
              <div className="p-3 bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] rounded-xl shadow-[var(--shadow-glow-cyan)]">
                <Wallet className="w-6 h-6 text-[var(--bg-main)]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">{t.headerTitle}</h1>
                <p className="text-sm text-[var(--text-secondary)] font-semibold">{t.headerSubtitle}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">AES-256-GCM • Digital Commercial Bank Ltd • HMAC-SHA256</p>
              </div>
            </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
            <LanguageSelector />
            <div className="text-right">
              <div className="text-xs text-[var(--text-muted)]">{t.productionEnvironment}</div>
              <div className="text-sm font-semibold text-[var(--accent-emerald)] flex items-center justify-end gap-1">
                <span className="w-2 h-2 bg-[var(--accent-emerald)] rounded-full animate-pulse-glow"></span>
                {t.allSystemsOperational}
              </div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{t.dtcAnalysisReady}</div>
              <div className="flex items-center justify-end gap-2 text-xs text-[var(--text-secondary)] mt-2 font-mono">
                <User className="w-3 h-3" />
                <span>{user}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-medium)] rounded-xl text-[var(--text-primary)] hover:border-[var(--accent-cyan)] hover:bg-[var(--bg-hover)] transition-all hover-lift"
              title={t.logoutTitle}
              aria-label={t.logoutTitle}
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-semibold">{t.logout}</span>
            </button>
          </div>
          </div>
        </div>

        <nav className="px-card bg-[var(--bg-card)] border-t border-[var(--border-subtle)] hidden lg:block relative group">
          {/* Botón scroll izquierda */}
          <button
            onClick={() => scrollTabs('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] rounded-xl p-2 shadow-lg transition-all hover:scale-110 hover-glow"
            aria-label="Scroll tabs left"
            title={isSpanish ? 'Ver módulos anteriores' : 'View previous modules'}
          >
            <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
          </button>

          {/* Contenedor de tabs con scroll */}
          <div 
            ref={tabsScrollRef}
            className="flex gap-1 overflow-x-auto scroll-smooth modules-scroll-container mx-12 py-2"
          >
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const CustomIcon = getModuleIcon(tab.id, 18, isActive);

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 font-medium transition-all relative min-w-fit rounded-lg ${
                    isActive
                      ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan-muted)] border border-[var(--accent-cyan)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                  }`}
                  aria-label={`${tab.name} ${isActive ? '(current)' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="flex items-center justify-center w-4 h-4 flex-shrink-0" aria-hidden="true">
                    {CustomIcon}
                  </span>
                  <span className="whitespace-nowrap text-sm font-semibold">{tab.name}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent-cyan)] shadow-[0_0_10px_var(--accent-cyan)]" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Botón scroll derecha */}
          <button
            onClick={() => scrollTabs('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] hover:border-[var(--accent-cyan)] rounded-xl p-2 shadow-lg transition-all hover:scale-110 hover-glow"
            aria-label="Scroll tabs right"
            title={isSpanish ? 'Ver más módulos' : 'View more modules'}
          >
            <ChevronRight className="w-5 h-5 text-[var(--text-primary)]" />
          </button>
        </nav>
      </header>

      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={
          <div className="h-full flex items-center justify-center bg-[var(--bg-main)]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-card"></div>
              <p className="text-[var(--text-primary)] text-heading-sm">Cargando módulo...</p>
            </div>
          </div>
        }>
          {activeTab === 'central-dashboard' && (
            <PageTransition key="central-dashboard">
              <CentralBankingDashboard />
            </PageTransition>
          )}
          {activeTab === 'banco-central-privado' && (
            <PageTransition key="banco-central-privado">
              <BancoCentralPrivadoModule />
            </PageTransition>
          )}
          {activeTab === 'origen-fondos' && (
            <PageTransition key="origen-fondos">
              <OrigenDeFondosModule />
            </PageTransition>
          )}
          {activeTab === 'the-kingdom-bank' && (
            <PageTransition key="the-kingdom-bank">
              <TheKingdomBankModule />
            </PageTransition>
          )}
          {activeTab === 'daes-partner-api' && (
            <PageTransition key="daes-partner-api">
              <DAESPartnerAPIModule />
            </PageTransition>
          )}
          {activeTab === 'dashboard' && (
            <PageTransition key="dashboard">
              <AdvancedBankingDashboard />
            </PageTransition>
          )}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'ledger' && <AccountLedger />}
          {activeTab === 'blackscreen' && <BankBlackScreen />}
          {activeTab === 'custody' && <CustodyAccountsModule />}
          {activeTab === 'profiles' && <ProfilesModule />}
          {activeTab === 'api-daes' && <APIDAESModule />}
          {activeTab === 'mg-webhook' && <MGWebhookModule />}
          {activeTab === 'api-global' && <APIGlobalModule />}
          {activeTab === 'api-digital' && <APIDigitalModule />}
          {activeTab === 'api-vusd' && <APIVUSDModule />}
          {activeTab === 'api-vusd1' && <APIVUSD1Module />}
          {activeTab === 'proof-of-reserves' && <ProofOfReservesAPIModule />}
          {activeTab === 'proof-of-reserves-api1' && <ProofOfReservesAPI1Module />}
          {activeTab === 'transactions-events' && <TransactionEventsModule />}
          {activeTab === 'bank-settlement' && <BankSettlementModule />}
          {activeTab === 'iban-manager' && <IbanManagerModule />}
          {activeTab === 'downloads' && <DownloadsModule />}
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

      <footer className="bg-[var(--bg-card)] border-t border-[var(--border-subtle)] px-6 py-3 shadow-[var(--shadow-sm)]">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-6">
            <span className="hover:text-[var(--text-primary)] transition-colors font-medium">{t.footerVersion}</span>
            <span className="hover:text-[var(--text-primary)] transition-colors">{t.footerIsoCompliant}</span>
            <span className="hover:text-[var(--text-primary)] transition-colors">{t.footerPciReady}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-[var(--text-primary)] transition-colors">{t.footerMultiCurrency}</span>
            <span className="hover:text-[var(--text-primary)] transition-colors">{t.footerEncryption}</span>
            <span className="text-[var(--accent-cyan)] font-semibold">{t.footerForensicAnalysis}</span>
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
