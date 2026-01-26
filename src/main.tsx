import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './responsive.css';
import './styles/design-system.css';
import { LanguageProvider } from './lib/i18n.tsx';
import { AuthProvider } from './lib/auth.tsx';
import { ToastProvider, useToast } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SecurityService } from './lib/security-service';

// Initialize security service on app start
SecurityService.initialize().catch(() => {
  // Security initialization failed - continue but log warning
});

function AppWithToast() {
  const { addToast } = useToast();

  useEffect(() => {
    const handleAddToast = (event: CustomEvent) => {
      addToast(event.detail);
    };

    window.addEventListener('add-toast' as any, handleAddToast);
    return () => window.removeEventListener('add-toast' as any, handleAddToast);
  }, [addToast]);

  return <App />;
}

// Secure error handling - no sensitive data in production logs
const isProduction = !import.meta.env.DEV;

window.onerror = function(message, source, lineno, colno, error) {
  if (!isProduction) {
    SecurityService.log.error('Global error', { message: String(message), source, lineno, colno });
  }
  return false;
};

window.onunhandledrejection = function(event) {
  if (!isProduction) {
    SecurityService.log.error('Unhandled promise rejection', { reason: String(event.reason) });
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <ToastProvider>
            <AppWithToast />
          </ToastProvider>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
