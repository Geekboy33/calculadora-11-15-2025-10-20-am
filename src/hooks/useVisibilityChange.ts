/**
 * Hook para detectar cuando la página está visible
 * Útil para pausar auto-refresh cuando el usuario no está viendo
 */

import { useEffect, useState } from 'react';

export function useVisibilityChange() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

export default useVisibilityChange;

