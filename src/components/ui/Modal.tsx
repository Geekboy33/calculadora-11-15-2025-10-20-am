/**
 * Professional Modal Component
 * Modales con backdrop blur y animaciones suaves
 */

import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
  closeOnBackdrop = true,
}: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  // Prevenir scroll del body cuando modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Cerrar con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {/* Backdrop con blur profesional */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

      {/* Modal content */}
      <div
        className={`
          relative ${sizes[size]} w-full
          bg-gradient-to-br from-[#0a0f1c] via-[#050b1c] to-[#000]
          border-2 border-[#00ff88]/30
          rounded-3xl
          shadow-2xl shadow-[#00ff88]/20
          transform transition-all duration-300
          animate-scale-in
          max-h-[90vh]
          flex flex-col
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="relative overflow-hidden rounded-t-3xl flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88]/20 to-[#00cc6a]/20" />
          <div className="relative p-6 border-b border-[#00ff88]/20">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-8">
                <h2 className="text-2xl font-bold text-white mb-1">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-sm text-white/60">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Cerrar modal"
              >
                <X className="w-6 h-6 text-white/70 hover:text-white" />
              </button>
            </div>
          </div>
        </div>

        {/* Body con scroll */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>

        {/* Footer (opcional) */}
        {footer && (
          <div className="flex-shrink-0 p-6 border-t border-white/10 bg-black/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;

