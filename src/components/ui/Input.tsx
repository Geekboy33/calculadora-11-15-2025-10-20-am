/**
 * Professional Input Component
 * Inputs con estados visuales claros y feedback
 */

import { InputHTMLAttributes, useState } from 'react';
import { LucideIcon, AlertCircle, CheckCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  success,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = true,
  className = '',
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const stateStyles = error
    ? 'border-red-500/50 bg-red-500/5 focus:border-red-500 focus:ring-red-500/20'
    : success
    ? 'border-[#00ff88]/50 bg-[#00ff88]/5 focus:border-[#00ff88] focus:ring-[#00ff88]/20'
    : 'border-white/20 bg-black/40 focus:border-[#00ff88]/60 focus:ring-[#00ff88]/20';

  return (
    <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-semibold text-white/80 uppercase tracking-wider">
          {label}
          {props.required && (
            <span className="text-red-400 ml-1">*</span>
          )}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Icon Left */}
        {Icon && iconPosition === 'left' && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={`w-5 h-5 transition-colors duration-200 ${
              isFocused ? 'text-[#00ff88]' : 
              error ? 'text-red-400' :
              success ? 'text-[#00ff88]' :
              'text-white/40'
            }`} />
          </div>
        )}

        {/* Input */}
        <input
          {...props}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          className={`
            w-full
            ${Icon && iconPosition === 'left' ? 'pl-12' : 'pl-4'}
            ${Icon && iconPosition === 'right' ? 'pr-12' : error || success ? 'pr-12' : 'pr-4'}
            py-3.5
            rounded-xl border-2
            ${stateStyles}
            text-white placeholder:text-white/30
            transition-all duration-200
            focus:outline-none focus:ring-4
            ${isFocused ? 'scale-[1.01]' : ''}
            ${className}
          `}
        />

        {/* Icon Right o Indicador de Estado */}
        {Icon && iconPosition === 'right' && !error && !success && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={`w-5 h-5 transition-colors duration-200 ${
              isFocused ? 'text-[#00ff88]' : 'text-white/40'
            }`} />
          </div>
        )}

        {/* Error Icon */}
        {error && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
        )}

        {/* Success Icon */}
        {success && !error && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle className="w-5 h-5 text-[#00ff88]" />
          </div>
        )}
      </div>

      {/* Helper Text o Error */}
      {(helperText || error || success) && (
        <p className={`text-sm flex items-center gap-1 ${
          error ? 'text-red-400' : 
          success ? 'text-[#00ff88]' : 
          'text-white/50'
        }`}>
          {error || success || helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Textarea Component
 */
export interface TextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
}

export function Textarea({
  label,
  error,
  helperText,
  rows = 4,
  className = '',
  ...props
}: TextareaProps) {
  const [isFocused, setIsFocused] = useState(false);

  const stateStyles = error
    ? 'border-red-500/50 bg-red-500/5 focus:border-red-500 focus:ring-red-500/20'
    : 'border-white/20 bg-black/40 focus:border-[#00ff88]/60 focus:ring-[#00ff88]/20';

  return (
    <div className="space-y-2 w-full">
      {label && (
        <label className="block text-sm font-semibold text-white/80 uppercase tracking-wider">
          {label}
        </label>
      )}

      <textarea
        {...(props as any)}
        rows={rows}
        onFocus={(e) => {
          setIsFocused(true);
          (props as any).onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          (props as any).onBlur?.(e);
        }}
        className={`
          w-full px-4 py-3.5
          rounded-xl border-2
          ${stateStyles}
          text-white placeholder:text-white/30
          transition-all duration-200
          focus:outline-none focus:ring-4
          ${isFocused ? 'scale-[1.01]' : ''}
          resize-vertical
          ${className}
        `}
      />

      {(helperText || error) && (
        <p className={`text-sm ${error ? 'text-red-400' : 'text-white/50'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
}

export default Input;

