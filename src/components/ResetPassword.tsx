import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)));
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password.length < 8) {
      toast.error('Your password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('The passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message || 'Unable to update your password.');
      return;
    }
    toast.success('Password updated. You can now sign in.');
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg border border-gray-100">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-primary">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="text-center text-2xl font-semibold text-gray-900">Create a new password</h1>
        <p className="mt-2 text-center text-sm leading-6 text-gray-600">
          Choose a new password for your ReproPulse account.
        </p>
        {ready ? (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <label className="block text-sm font-medium text-gray-700">
              New password
              <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Confirm new password
              <input required type="password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </label>
            <button disabled={loading} className="w-full rounded-md bg-primary px-4 py-2.5 font-medium text-white transition hover:bg-primary-dark disabled:opacity-60">
              {loading ? 'Updating password...' : 'Update password'}
            </button>
          </form>
        ) : (
          <p className="mt-8 rounded-md bg-red-50 p-4 text-sm text-red-700">
            This reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
        )}
      </div>
    </div>
  );
}
