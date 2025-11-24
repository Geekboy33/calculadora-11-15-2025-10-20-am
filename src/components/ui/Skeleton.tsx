/**
 * Professional Skeleton Loading Components
 * Loading states elegantes mientras cargan los datos
 */

import { ReactNode } from 'react';

export interface SkeletonProps {
  variant?: 'default' | 'text' | 'title' | 'card' | 'circle' | 'button';
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({
  variant = 'default',
  className = '',
  width,
  height,
}: SkeletonProps) {
  const variants = {
    default: 'h-4 bg-white/10 rounded',
    text: 'h-4 bg-white/10 rounded-lg',
    title: 'h-8 bg-white/15 rounded-lg',
    card: 'h-32 bg-white/5 rounded-2xl border border-white/10',
    circle: 'w-12 h-12 bg-white/10 rounded-full',
    button: 'h-12 bg-white/10 rounded-xl',
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      className={`${variants[variant]} ${className} animate-pulse-glow`}
      style={style}
    />
  );
}

/**
 * Skeleton para Card de Cuenta
 */
export function AccountCardSkeleton() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton variant="circle" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="title" className="w-1/2" />
          <Skeleton variant="text" className="w-1/3" />
        </div>
      </div>
      
      {/* Content */}
      <div className="space-y-3">
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-5/6" />
      </div>
      
      {/* Footer */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
        <Skeleton variant="button" />
        <Skeleton variant="button" />
      </div>
    </div>
  );
}

/**
 * Skeleton para Tabla
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-white/10">
        <Skeleton variant="text" className="flex-1" />
        <Skeleton variant="text" className="flex-1" />
        <Skeleton variant="text" className="flex-1" />
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="flex gap-4" style={{ animationDelay: `${idx * 50}ms` }}>
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="flex-1" />
          <Skeleton variant="text" className="flex-1" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para Dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="title" className="w-1/4" />
        <Skeleton variant="text" className="w-1/3" />
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Skeleton key={idx} variant="card" style={{ animationDelay: `${idx * 100}ms` }} />
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Skeleton className="h-96" />
        </div>
        <div>
          <Skeleton className="h-96" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton para Lista
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, idx) => (
        <div 
          key={idx} 
          className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10"
          style={{ animationDelay: `${idx * 50}ms` }}
        >
          <Skeleton variant="circle" className="w-10 h-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="w-3/4" />
            <Skeleton variant="text" className="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
