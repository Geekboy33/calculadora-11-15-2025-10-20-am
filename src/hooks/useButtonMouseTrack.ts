/**
 * useButtonMouseTrack Hook
 * Hook para trackear posición del mouse en botones para efectos visuales
 */

import { useRef, MouseEvent } from 'react';

export function useButtonMouseTrack() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    button.style.setProperty('--mouse-x', `${x}%`);
    button.style.setProperty('--mouse-y', `${y}%`);
  };

  return {
    buttonRef,
    onMouseMove: handleMouseMove,
  };
}

