/**
 * Empty State Component
 * Estados vacíos diseñados con ilustraciones
 */

import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon | ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className = '' 
}: EmptyStateProps) {
  const IconComponent = typeof Icon === 'function' ? Icon : null;
  const IconNode = typeof Icon !== 'function' ? Icon : null;

  return (
    <div className={`flex flex-col items-center justify-center p-section text-center ${className}`}>
      <div className="mb-6 flex items-center justify-center w-20 h-20 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        {IconComponent ? (
          <IconComponent className="w-10 h-10 text-[var(--text-muted)]" />
        ) : (
          <div className="text-4xl">{IconNode}</div>
        )}
      </div>
      
      <h3 className="text-heading-sm mb-2 text-[var(--text-primary)]">
        {title}
      </h3>
      
      {description && (
        <p className="text-body text-[var(--text-secondary)] max-w-md mb-6">
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}

