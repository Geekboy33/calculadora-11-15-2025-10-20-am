/**
 * useSwipeable Hook
 * Hook para detectar gestos de swipe (touch gestures)
 */

import { useRef, useEffect } from 'react';

interface SwipeableHandlers {
  onSwipedLeft?: () => void;
  onSwipedRight?: () => void;
  onSwipedUp?: () => void;
  onSwipedDown?: () => void;
  trackMouse?: boolean;
}

export function useSwipeable(handlers: SwipeableHandlers) {
  const {
    onSwipedLeft,
    onSwipedRight,
    onSwipedUp,
    onSwipedDown,
    trackMouse = false,
  } = handlers;

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const touchEnd = useRef<{ x: number; y: number } | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: TouchEvent | MouseEvent) => {
    const point = 'touches' in e ? e.touches[0] : e;
    touchEnd.current = null;
    touchStart.current = { x: point.clientX, y: point.clientY };
  };

  const onTouchMove = (e: TouchEvent | MouseEvent) => {
    const point = 'touches' in e ? e.touches[0] : e;
    touchEnd.current = { x: point.clientX, y: point.clientY };
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const distanceX = touchStart.current.x - touchEnd.current.x;
    const distanceY = touchStart.current.y - touchEnd.current.y;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (isLeftSwipe && onSwipedLeft) {
      onSwipedLeft();
    }
    if (isRightSwipe && onSwipedRight) {
      onSwipedRight();
    }
    if (isUpSwipe && onSwipedUp) {
      onSwipedUp();
    }
    if (isDownSwipe && onSwipedDown) {
      onSwipedDown();
    }
  };

  return {
    onTouchStart: onTouchStart as any,
    onTouchMove: onTouchMove as any,
    onTouchEnd: onTouchEnd as any,
    onMouseDown: trackMouse ? (onTouchStart as any) : undefined,
    onMouseMove: trackMouse ? (onTouchMove as any) : undefined,
    onMouseUp: trackMouse ? (onTouchEnd as any) : undefined,
  };
}

