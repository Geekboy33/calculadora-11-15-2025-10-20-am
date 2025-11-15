import { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Notification } from '../lib/notifications-store';

export function ToastNotification() {
  const [toasts, setToasts] = useState<Notification[]>([]);

  useEffect(() => {
    const handleShowToast = (event: CustomEvent<Notification>) => {
      const notification = event.detail;
      setToasts(prev => [...prev, notification]);

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== notification.id));
      }, 5000);
    };

    window.addEventListener('show-toast', handleShowToast as EventListener);

    return () => {
      window.removeEventListener('show-toast', handleShowToast as EventListener);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-700 shadow-green-900/50';
      case 'error':
        return 'bg-red-900/90 border-red-700 shadow-red-900/50';
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-700 shadow-yellow-900/50';
      case 'info':
      default:
        return 'bg-blue-900/90 border-blue-700 shadow-blue-900/50';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className={`pointer-events-auto w-96 border rounded-lg shadow-2xl backdrop-blur-sm animate-slide-in-right ${getStyles(toast.type)}`}
          style={{
            animation: `slide-in-right 0.3s ease-out ${index * 0.1}s both`
          }}
        >
          <div className="p-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                {getIcon(toast.type)}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white mb-1">
                  {toast.title}
                </h4>
                <p className="text-sm text-gray-200 leading-relaxed">
                  {toast.message}
                </p>

                {toast.priority === 'critical' && (
                  <div className="mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-red-950/50 text-red-300 rounded">
                      <AlertTriangle className="w-3 h-3" />
                      ACCIÓN REQUERIDA
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="h-1 bg-black/20">
            <div
              className="h-full bg-white/30 animate-progress"
              style={{
                animation: 'progress 5s linear'
              }}
            />
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-progress {
          animation: progress 5s linear;
        }
      `}</style>
    </div>
  );
}
