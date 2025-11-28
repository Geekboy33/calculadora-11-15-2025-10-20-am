/**
 * Success Modal Component
 * Modal de éxito con animación y confetti opcional
 */

import { CheckCircle, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SuccessModalProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  onClose: () => void;
  showConfetti?: boolean;
  autoClose?: number; // ms
}

export function SuccessModal({
  icon,
  title,
  message,
  onClose,
  showConfetti = false,
  autoClose = 3000
}: SuccessModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfettiState, setShowConfettiState] = useState(false);

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10);
    
    if (showConfetti) {
      setTimeout(() => setShowConfettiState(true), 100);
    }

    // Auto close
    if (autoClose > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, showConfetti]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Confetti Effect */}
      {showConfetti && showConfettiState && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                backgroundColor: ['#00ff88', '#1A4DB3', '#C8A56A', '#E85C5C'][Math.floor(Math.random() * 4)],
                animation: `confetti-fall ${1 + Math.random() * 2}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <div 
        className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none`}
      >
        <div 
          className={`glass-card rounded-2xl p-8 max-w-md w-full pointer-events-auto transform transition-all duration-300 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500/50">
              {icon || <CheckCircle className="w-10 h-10 text-green-400" />}
            </div>

            <h3 className="text-heading mb-2 text-[var(--text-primary)]">
              {title}
            </h3>

            <p className="text-body text-[var(--text-secondary)]">
              {message}
            </p>

            <button
              onClick={handleClose}
              className="mt-6 px-6 py-3 bg-gradient-to-r from-white to-white text-black font-semibold rounded-lg shadow-lg hover:shadow-white/20 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}

