import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';

interface MultiStepFormProgressProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const MultiStepFormProgress: React.FC<MultiStepFormProgressProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  const { t } = useTranslation('forms');

  return (
    <nav aria-label={t('multiStepFormProgress.ariaFormProgress')} className="w-full py-4">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = !!onStepClick && index < currentStep;
          const status = isCompleted
            ? t('multiStepFormProgress.completedSuffix')
            : isCurrent
              ? t('multiStepFormProgress.currentSuffix')
              : '';

          return (
            <li key={step} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={t('multiStepFormProgress.stepAriaLabel', { number: index + 1, step, status })}
                className={[
                  'relative flex items-center justify-center w-8 h-8 rounded-full border-2 flex-none transition-colors',
                  isCompleted
                    ? 'bg-primary border-primary text-white'
                    : isCurrent
                      ? 'border-primary text-primary'
                      : 'border-stone-300 text-stone-300',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                ].join(' ')}
              >
                {isCompleted ? <Check className="w-4 h-4" aria-hidden="true" /> : <span className="text-sm font-medium">{index + 1}</span>}
              </button>

              {index < steps.length - 1 && (
                <div className="flex-1 mx-2" aria-hidden="true">
                  <div className={`h-1 rounded-full transition-colors ${index < currentStep ? 'bg-primary' : 'bg-stone-300'}`} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <ol className="flex items-center justify-between mt-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li
              key={step}
              className={`text-xs font-medium text-center ${isCompleted || isCurrent ? 'text-stone-700' : 'text-stone-400'}`}
              style={{ width: `${100 / steps.length}%` }}
            >
              {step}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default MultiStepFormProgress;
