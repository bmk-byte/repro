import React from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PasswordRequirement } from '../../hooks/usePasswordStrength';

export interface PasswordStrengthMeterProps {
  strength: number;
  requirements: PasswordRequirement[];
}

const strengthColor = (strength: number) => {
  if (strength < 40) return 'bg-danger';
  if (strength < 70) return 'bg-warning';
  return 'bg-success';
};

const strengthLabel = (strength: number) => {
  if (strength < 40) return 'Weak';
  if (strength < 70) return 'Medium';
  return 'Strong';
};

/** Shared password-strength meter + requirement checklist, used by signup, password reset, and change-password. */
export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ strength, requirements }) => (
  <div className="mt-2">
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-medium text-stone-700">Password strength</span>
      <span className="text-xs font-medium">{strengthLabel(strength)}</span>
    </div>
    <div className="w-full bg-stone-200 rounded-full h-2.5">
      <motion.div
        className={`h-2.5 rounded-full ${strengthColor(strength)}`}
        style={{ width: `${strength}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${strength}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
    <div className="mt-3 space-y-2">
      {requirements.map((req, index) => (
        <div key={index} className="flex items-center">
          {req.met ? (
            <Check className="h-4 w-4 text-success mr-2" />
          ) : (
            <X className="h-4 w-4 text-stone-400 mr-2" />
          )}
          <span className={`text-xs ${req.met ? 'text-success' : 'text-stone-500'}`}>{req.text}</span>
        </div>
      ))}
    </div>
  </div>
);
