import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { toast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { PasswordStrengthMeter } from './ui';

export default function ResetPassword() {
  const { t } = useTranslation('misc');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { requirements, strength, isValid } = usePasswordStrength(password);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValid) {
      toast.error(t('resetPassword.passwordDoesNotMeetRequirements'));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t('resetPassword.passwordsDoNotMatch'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message || t('resetPassword.unableToUpdatePassword'));
      return;
    }
    toast.success(t('resetPassword.passwordUpdatedSignIn'));
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg border border-stone-100">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="text-center text-2xl font-semibold text-stone-900">{t('resetPassword.title')}</h1>
        <p className="mt-2 text-center text-sm leading-6 text-stone-600">
          {t('resetPassword.subtitle')}
        </p>
        {ready ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-medium text-stone-700">
              {t('resetPassword.newPassword')}
              <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </label>
            {password && <PasswordStrengthMeter strength={strength} requirements={requirements} />}
            <label className="block text-sm font-medium text-stone-700">
              {t('resetPassword.confirmNewPassword')}
              <input required type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 block w-full rounded-md border border-stone-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </label>
            <button disabled={loading} className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-60">
              {loading ? t('resetPassword.updatingPassword') : t('resetPassword.updatePassword')}
            </button>
          </form>
        ) : (
          <p className="mt-8 rounded-md bg-danger-light p-4 text-sm text-danger-dark">
            {t('resetPassword.invalidOrExpiredLink')}
          </p>
        )}
      </div>
    </div>
  );
}
