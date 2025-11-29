/**
 * Skeleton Loader - Estados de Carga Profesionales
 * Nivel: JP Morgan Wealth | Goldman Sachs
 */

import React from 'react';
import { cn } from '../../lib/design-system';

interface SkeletonLoaderProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'balance';
  lines?: number;
  width?: string;
  height?: string;
  className?: string;
  showImage?: boolean;
}

export function SkeletonLoader({
  variant = 'text',
  lines = 1,
  width,
  height,
  className,
  showImage = false
}: SkeletonLoaderProps) {
  const baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] animate-shimmer';

  if (variant === 'circular') {
    return (
      <div
        className={cn('rounded-full', baseClasses, className)}
        style={{ width: width || '40px', height: height || '40px' }}
        aria-label="Loading..."
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn('rounded-lg', baseClasses, className)}
        style={{ width: width || '100%', height: height || '20px' }}
        aria-label="Loading..."
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('rounded-xl p-6 space-y-4', className)}>
        {showImage && (
          <div className={cn('rounded-lg', baseClasses)} style={{ width: '100%', height: '200px' }} />
        )}
        <div className="space-y-3">
          <div className={cn('rounded', baseClasses)} style={{ width: '60%', height: '24px' }} />
          <div className={cn('rounded', baseClasses)} style={{ width: '80%', height: '16px' }} />
          <div className={cn('rounded', baseClasses)} style={{ width: '40%', height: '16px' }} />
        </div>
      </div>
    );
  }

  if (variant === 'balance') {
    return (
      <div className={cn('space-y-4', className)}>
        <div className={cn('rounded', baseClasses)} style={{ width: '100%', height: '64px' }} />
        <div className={cn('rounded', baseClasses)} style={{ width: '70%', height: '24px', margin: '0 auto' }} />
        <div className={cn('rounded', baseClasses)} style={{ width: '50%', height: '18px', margin: '0 auto' }} />
      </div>
    );
  }

  // Text variant (default)
  return (
    <div className={cn('space-y-2', className)} aria-label="Loading...">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn('rounded', baseClasses)}
          style={{
            width: i === lines - 1 ? '60%' : '100%',
            height: height || '16px'
          }}
        />
      ))}
    </div>
  );
}

interface BalanceSkeletonProps {
  variant?: 'large' | 'medium' | 'small';
  lines?: number;
  className?: string;
}

export function BalanceSkeleton({ variant = 'large', lines = 3, className }: BalanceSkeletonProps) {
  const heightMap = {
    large: '64px',
    medium: '48px',
    small: '32px'
  };

  return <SkeletonLoader variant="balance" height={heightMap[variant]} lines={lines} className={className} />;
}

interface CardSkeletonProps {
  variant?: 'default' | 'elevated';
  showImage?: boolean;
  className?: string;
}

export function CardSkeleton({ variant = 'default', showImage = false, className }: CardSkeletonProps) {
  return (
    <div className={cn(
      'bg-white rounded-2xl',
      variant === 'elevated' ? 'elevation-3' : 'elevation-1',
      className
    )}>
      <SkeletonLoader variant="card" showImage={showImage} />
    </div>
  );
}

