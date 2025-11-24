/**
 * Professional Empty State Component
 * Estados vacíos atractivos con call-to-action
 */

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionLabel,
  actionIcon: ActionIcon,
  secondaryAction,
  secondaryActionLabel,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 animate-fade-in">
      {/* Icono con glow animado */}
      <div className="relative mb-8">
        {/* Glow effect de fondo */}
        <div className="absolute inset-0 bg-[#00ff88]/20 rounded-full blur-3xl animate-pulse-slow" />
        
        {/* Container del icono */}
        <div className="relative p-8 rounded-full bg-gradient-to-br from-[#00ff88]/20 to-[#00cc6a]/10 border-2 border-[#00ff88]/30 shadow-xl shadow-[#00ff88]/20">
          <Icon className="w-20 h-20 text-[#00ff88]" strokeWidth={1.5} />
        </div>
      </div>

      {/* Texto */}
      <h3 className="text-2xl font-bold text-white mb-3 text-center">
        {title}
      </h3>
      <p className="text-white/60 text-center max-w-md mb-8 leading-relaxed">
        {description}
      </p>

      {/* Acciones */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button 
              variant="primary" 
              size="lg" 
              onClick={action}
              icon={ActionIcon}
            >
              {actionLabel || 'Comenzar'}
            </Button>
          )}
          
          {secondaryAction && (
            <Button 
              variant="tertiary" 
              size="lg" 
              onClick={secondaryAction}
            >
              {secondaryActionLabel || 'Cancelar'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default EmptyState;

