/**
 * Progress Stepper Component
 * Indicador de progreso con múltiples etapas
 */

import { Check } from 'lucide-react';

interface ProgressStep {
  label: string;
  status: 'completed' | 'active' | 'pending';
  progress?: number; // 0-100 para estado activo
}

interface ProgressStepperProps {
  steps: ProgressStep[];
  className?: string;
}

export function ProgressStepper({ steps, className = '' }: ProgressStepperProps) {
  return (
    <div className={`progress-stepper ${className}`}>
      {steps.map((step, index) => (
        <div
          key={index}
          className={`progress-step ${step.status}`}
        >
          <div className="progress-step-indicator">
            {step.status === 'completed' ? (
              <Check className="w-4 h-4" />
            ) : step.status === 'active' ? (
              <span className="text-sm font-semibold">{step.progress || 0}%</span>
            ) : (
              <span className="text-xs">{index + 1}</span>
            )}
          </div>
          <div className="progress-step-label">{step.label}</div>
        </div>
      ))}
    </div>
  );
}

