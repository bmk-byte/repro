import React from 'react';
import { Check, Circle } from 'lucide-react';

interface MultiStepFormProgressProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const MultiStepFormProgress: React.FC<MultiStepFormProgressProps> = ({ 
  steps, 
  currentStep,
  onStepClick 
}) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && index < currentStep;
          
          return (
            <React.Fragment key={index}>
              {/* Step circle */}
              <div 
                className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 
                  ${isCompleted 
                    ? 'bg-primary border-primary text-white' 
                    : isCurrent 
                      ? 'border-primary text-primary' 
                      : 'border-gray-300 text-gray-300'
                  }
                  ${isClickable ? 'cursor-pointer' : ''}
                `}
                onClick={() => isClickable ? onStepClick(index) : null}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div 
                    className={`h-1 ${
                      index < currentStep ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Step labels */}
      <div className="flex items-center justify-between mt-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div 
              key={index} 
              className={`text-xs font-medium text-center ${
                isCompleted || isCurrent ? 'text-gray-700' : 'text-gray-400'
              }`}
              style={{ width: `${100 / steps.length}%` }}
            >
              {step}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MultiStepFormProgress;