import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export interface PasswordRequirement {
  regex: RegExp;
  text: string;
  met: boolean;
}

const REQUIREMENTS: Array<{ regex: RegExp; textKey: string }> = [
  { regex: /.{8,}/, textKey: 'auth.passwordReqLength' },
  { regex: /[A-Z]/, textKey: 'auth.passwordReqUppercase' },
  { regex: /[a-z]/, textKey: 'auth.passwordReqLowercase' },
  { regex: /[0-9]/, textKey: 'auth.passwordReqNumber' },
  { regex: /[!@#$%^&*]/, textKey: 'auth.passwordReqSpecial' },
];

/** Shared password-complexity rules, used by signup, the forgot-password reset page, and in-app change-password. */
export function usePasswordStrength(password: string) {
  const { t } = useTranslation();
  return useMemo(() => {
    const requirements: PasswordRequirement[] = REQUIREMENTS.map((req) => ({
      regex: req.regex,
      text: t(req.textKey),
      met: req.regex.test(password),
    }));
    const metCount = requirements.filter((req) => req.met).length;
    const strength = Math.round((metCount / requirements.length) * 100);
    return { requirements, strength, isValid: metCount === requirements.length };
  }, [password, t]);
}
