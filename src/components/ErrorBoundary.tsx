/**
 * Error Boundary Component
 * Captura errores de React y muestra pantalla de error en lugar de pantalla negra
 */

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('❌ Error Boundary capturó error:', error);
    console.error('📊 Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleReset = () => {
    // Limpiar localStorage si es necesario
    const clearCache = window.confirm(
      '¿Deseas limpiar la caché del navegador?\n\n' +
      'Esto puede resolver problemas de carga pero perderás los datos guardados localmente.'
    );
    
    if (clearCache) {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-[#0d0d0d] border-2 border-red-500 rounded-xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-4 bg-red-500/20 rounded-full">
                  <AlertCircle className="w-12 h-12 text-red-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-red-400 mb-2">
                    Error del Sistema
                  </h1>
                  <p className="text-red-300/80">
                    DAES CoreBanking encontró un error inesperado
                  </p>
                </div>
              </div>

              {this.state.error && (
                <div className="bg-black/50 border border-red-500/30 rounded-lg p-4 mb-6">
                  <div className="text-sm font-bold text-red-300 mb-2">
                    Mensaje de Error:
                  </div>
                  <div className="text-red-400 font-mono text-sm break-words">
                    {this.state.error.toString()}
                  </div>
                  {this.state.error.stack && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-red-300/60 text-xs hover:text-red-300">
                        Ver stack trace
                      </summary>
                      <pre className="text-red-400/60 font-mono text-xs mt-2 overflow-x-auto">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <div className="text-sm font-bold text-yellow-300 mb-2">
                  💡 Soluciones Recomendadas:
                </div>
                <ul className="text-yellow-300/80 text-sm space-y-2">
                  <li>1. Click en "Reiniciar Aplicación" abajo</li>
                  <li>2. Actualiza la página con Ctrl + Shift + R</li>
                  <li>3. Limpia la caché del navegador (Ctrl + F5)</li>
                  <li>4. Abre en modo incógnito</li>
                  <li>5. Verifica que todos los módulos estén cargados</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-[#00ff88] to-[#00cc6a] text-black rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(0,255,136,0.6)] transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reiniciar Aplicación
                </button>
                <a
                  href="/clear-cache.html"
                  className="flex-1 px-6 py-4 bg-red-500/20 border border-red-500 text-red-300 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-red-500/30 transition-all"
                >
                  <AlertCircle className="w-5 h-5" />
                  Limpiar Caché
                </a>
              </div>

              <div className="mt-6 text-center text-[#4d7c4d] text-sm">
                <p>Si el problema persiste, contacta al administrador del sistema.</p>
                <p className="mt-2 font-mono text-xs">
                  Error ID: {Date.now().toString(36).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

