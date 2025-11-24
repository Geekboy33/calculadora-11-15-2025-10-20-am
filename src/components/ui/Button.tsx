/**
 * Professional Button Component
 * Sistema completo de botones con variantes y estados
 */

import { ReactNode, ButtonHTMLAttributes } from 'react';
import { LucideIcon } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    // Acción principal - Verde neón brillante
    primary: `
      bg-gradient-to-r from-[#00ff88] to-[#00cc6a]
      text-black font-bold
      shadow-lg shadow-[#00ff88]/30
      hover:shadow-xl hover:shadow-[#00ff88]/50
      hover:scale-105 active:scale-95
      border-2 border-transparent
    `,
    
    // Acción secundaria - Borde con color
    secondary: `
      bg-white/5 
      border-2 border-[#00ff88]/40 
      text-[#00ff88] font-semibold
      hover:bg-[#00ff88]/10 hover:border-[#00ff88]/60
      shadow-md shadow-black/30
    `,
    
    // Acción terciaria - Minimal
    tertiary: `
      bg-transparent 
      border-2 border-white/20 
      text-white/80 font-medium
      hover:bg-white/5 hover:border-white/40
      hover:text-white
    `,
    
    // Peligro - Rojo
    danger: `
      bg-red-500/20 
      border-2 border-red-500/50 
      text-red-300 font-semibold
      hover:bg-red-500/30 hover:border-red-500/70
      shadow-md shadow-red-500/20
    `,
    
    // Éxito - Verde con borde
    success: `
      bg-[#00ff88]/20 
      border-2 border-[#00ff88]/50 
      text-[#00ff88] font-semibold
      hover:bg-[#00ff88]/30 hover:border-[#00ff88]/70
      shadow-md shadow-[#00ff88]/20
    `,
    
    // Ghost - Sin fondo
    ghost: `
      bg-transparent 
      text-white/70 font-medium
      hover:bg-white/5 hover:text-white
      border-2 border-transparent
    `,
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-lg gap-1.5',
    md: 'px-6 py-3 text-base rounded-xl gap-2',
    lg: 'px-8 py-4 text-lg rounded-xl gap-2.5',
    xl: 'px-10 py-5 text-xl rounded-2xl gap-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none
        ${loading ? 'cursor-wait' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="animate-spin">
          <div className={`rounded-full border-2 border-current border-t-transparent ${iconSizes[size]}`} />
        </div>
      )}
      
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className={iconSizes[size]} />
      )}
      
      {children}
      
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className={iconSizes[size]} />
      )}
    </button>
  );
}

export default Button;

