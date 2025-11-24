/**
 * Professional Progress Bar Component
 * Progress bars cinematográficos con animaciones
 */

import { ReactNode } from 'react';

export interface ProgressProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'striped';
  showMilestones?: boolean;
  color?: string;
}

export function Progress({
  value,
  label,
  showPercentage = true,
  size = 'md',
  variant = 'gradient',
  showMilestones = false,
  color = '#00ff88',
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const sizes = {
    sm: 'h-2',
    md: 'h-4',
    lg: 'h-8',
  };

  const variants = {
    default: `bg-[${color}]`,
    
    gradient: `
      bg-gradient-to-r from-[#00ff88] via-[#00cc6a] to-[#00aa55]
    `,
    
    striped: `
      bg-gradient-to-r from-[#00ff88] via-[#00cc6a] to-[#00aa55]
      bg-[length:20px_20px]
      animate-progress-stripes
    `,
  };

  return (
    <div className="space-y-2">
      {/* Label y porcentaje */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && (
            <span className="font-semibold text-white/80">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="font-bold text-[#00ff88] font-mono">
              {clampedValue.toFixed(2)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className={`
        relative ${sizes[size]} 
        bg-black/40 rounded-full overflow-hidden 
        border-2 border-[#00ff88]/20
      `}>
        {/* Pattern de fondo */}
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,255,136,0.05) 10px, rgba(0,255,136,0.05) 20px)',
          }} 
        />

        {/* Barra de progreso */}
        <div
          className={`
            relative h-full
            ${variants[variant]}
            transition-all duration-500 ease-out
          `}
          style={{ width: `${clampedValue}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />

          {/* Porcentaje dentro de la barra (solo si es grande) */}
          {size === 'lg' && clampedValue > 10 && (
            <div className="absolute inset-0 flex items-center justify-end pr-4">
              <span className="text-black font-bold text-sm drop-shadow-lg">
                {clampedValue.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Milestone markers */}
        {showMilestones && [25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className="absolute top-0 bottom-0 w-0.5 bg-white/20"
            style={{ left: `${milestone}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Progress Circle (para dashboards)
 */
export function ProgressCircle({
  value,
  size = 120,
  strokeWidth = 8,
  label,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
        
        {/* Gradiente */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00ff88" />
            <stop offset="50%" stopColor="#00cc6a" />
            <stop offset="100%" stopColor="#00aa55" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Texto central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-[#00ff88] font-mono">
          {clampedValue.toFixed(0)}%
        </span>
        {label && (
          <span className="text-xs text-white/50 uppercase tracking-wider mt-1">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

export default EmptyState;

