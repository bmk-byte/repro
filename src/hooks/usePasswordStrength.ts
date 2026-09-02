import { useMemo } from 'react';

export interface PasswordRequirement {
  regex: RegExp;
  text: string;
  met: boolean;
}

const REQUIREMENTS: Array<{ regex: RegExp; text: string }> = [
  { regex: /.{8,}/, text: 'At least 8 characters' },
  { regex: /[A-Z]/, text: 'At least 1 uppercase letter' },
  { regex: /[a-z]/, text: 'At least 1 lowercase letter' },
  { regex: /[0-9]/, text: 'At least 1 number' },
  { regex: /[!@#$%^&*]/, text: 'At least 1 special character (!@#$%^&*)' },
];

/** Shared password-complexity rules, used by signup, the forgot-password reset page, and in-app change-password. */
export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const requirements: PasswordRequirement[] = REQUIREMENTS.map((req) => ({
      ...req,
      met: req.regex.test(password),
    }));
    const metCount = requirements.filter((req) => req.met).length;
    const strength = Math.round((metCount / requirements.length) * 100);
    return { requirements, strength, isValid: metCount === requirements.length };
  }, [password]);
}
