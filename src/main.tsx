import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './responsive.css';
import { LanguageProvider } from './lib/i18n.tsx';
import { AuthProvider } from './lib/auth.tsx';
import { ToastProvider, useToast } from './components/ui/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';

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

// Captura de errores global
window.onerror = function(message, source, lineno, colno, error) {
  console.error('❌ Error global capturado:', { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('❌ Promise rechazada sin capturar:', event.reason);
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
