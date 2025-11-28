/**
 * Page Transition Component
 * Wrapper para transiciones suaves entre módulos
 */

import { ReactNode, useEffect, useState } from 'react';

interface PageTransitionProps {
  children: ReactNode;
  key: string | number;
  className?: string;
}

export function PageTransition({ children, key: transitionKey, className = '' }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Reset animation on key change
    setIsVisible(false);
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, [transitionKey]);

  return (
    <div
      className={`page-transition-enter ${isVisible ? 'page-transition-enter-active' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

