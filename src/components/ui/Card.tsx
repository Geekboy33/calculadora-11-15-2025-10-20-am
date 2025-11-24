/**
 * Professional Card Component
 * Cards con glassmorphism, elevación y efectos interactivos
 */

import { ReactNode, HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'dark' | 'glass' | 'gradient';
  elevated?: boolean;
  interactive?: boolean;
  glowOnHover?: boolean;
  noPadding?: boolean;
  children: ReactNode;
}

export function Card({
  variant = 'default',
  elevated = false,
  interactive = false,
  glowOnHover = false,
  noPadding = false,
  children,
  className = '',
  ...props
}: CardProps) {
  const baseStyles = 'rounded-2xl border backdrop-blur-xl transition-all duration-300 relative overflow-hidden';

  const variants = {
    default: 'bg-white/5 border-white/10 hover:border-white/20',
    
    primary: 'bg-[#00ff88]/5 border-[#00ff88]/20 hover:border-[#00ff88]/40',
    
    dark: 'bg-black/60 border-white/5 hover:border-white/10',
    
    glass: `
      bg-gradient-to-br from-white/10 to-white/5
      border-white/20 hover:border-white/30
    `,
    
    gradient: `
      bg-gradient-to-br from-[#0a0f1c] via-[#050b1c] to-[#000]
      border-[#00ff88]/30 hover:border-[#00ff88]/50
    `,
  };

  const elevation = elevated
    ? 'shadow-2xl shadow-black/50'
    : 'shadow-lg shadow-black/30';

  const interactiveStyles = interactive
    ? 'cursor-pointer hover:scale-[1.02] hover:-translate-y-1 active:scale-[0.98]'
    : '';

  const glowStyles = glowOnHover
    ? 'hover:shadow-[#00ff88]/20'
    : '';

  const padding = noPadding ? '' : 'p-6';

  return (
    <div
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${elevation}
        ${interactiveStyles}
        ${glowStyles}
        ${padding}
        ${className}
        group
      `}
      {...props}
    >
      {/* Efecto de brillo al hover */}
      {interactive && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00ff88]/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
      )}
      
      {/* Contenido */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

/**
 * Card Header Component
 */
export function CardHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  className = '',
}: {
  title: string;
  subtitle?: string;
  icon?: any;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-3 rounded-xl bg-[#00ff88]/10 border border-[#00ff88]/30">
            <Icon className="w-6 h-6 text-[#00ff88]" />
          </div>
        )}
        <div>
          <h3 className="text-xl font-bold text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-white/60 mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * Card Body Component
 */
export function CardBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

/**
 * Card Footer Component
 */
export function CardFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mt-6 pt-6 border-t border-white/10 ${className}`}>
      {children}
    </div>
  );
}

export default Card;

