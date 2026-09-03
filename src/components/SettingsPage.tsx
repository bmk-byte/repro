import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import ProfileSettingsForm from './ProfileSettingsForm';
import { User, Bell, Lock, Shield } from 'lucide-react';
import { toast } from '../lib/toast';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { getToastsEnabled, setToastsEnabled } from '../lib/toastPreference';
import { LoadingState, Input, Button, PasswordStrengthMeter, LanguageSwitcher } from './ui';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [toastsEnabled, setToastsEnabledState] = useState(getToastsEnabled());
  const { requirements: passwordRequirements, strength: passwordStrength, isValid: passwordIsValid } = usePasswordStrength(newPassword);

  // Use the moderator status hook
  const { isModerator, loading: moderatorLoading } = useModeratorStatus();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordIsValid) {
      toast.error(t('settings.passwordDoesNotMeetRequirements'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordsDoNotMatch'));
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message || t('settings.unableToUpdatePassword'));
      return;
    }
    toast.success(t('settings.passwordUpdated'));
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleToggleToasts = (enabled: boolean) => {
    setToastsEnabledState(enabled);
    setToastsEnabled(enabled);
    if (enabled) toast.success(t('settings.popupNotificationsEnabled'));
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Get current user
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        if (userError) throw userError;
        if (!currentUser) throw new Error('No authenticated user found');
        
        setUser(currentUser);
        
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error(t('settings.failedToLoadUserData'));
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Show loading if either user data or moderator status is loading
  if (loading || moderatorLoading) {
    return <LoadingState label={t('settings.loadingSettings')} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-stone-900">{t('settings.title')}</h2>
              <p className="mt-1 text-sm text-stone-500">{t('settings.subtitle')}</p>
            </div>
            <nav className="p-4 space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'profile'
                    ? 'bg-primary text-white'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <User className="mr-3 h-5 w-5" />
                {t('settings.profile')}
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'security'
                    ? 'bg-primary text-white'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Lock className="mr-3 h-5 w-5" />
                {t('settings.security')}
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'notifications'
                    ? 'bg-primary text-white'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Bell className="mr-3 h-5 w-5" />
                {t('settings.notifications')}
              </button>
              {isModerator && (
                <button
                  onClick={() => setActiveTab('moderation')}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'moderation'
                      ? 'bg-primary text-white'
                      : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Shield className="mr-3 h-5 w-5" />
                  {t('settings.moderation')}
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-md">
            {activeTab === 'profile' && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-6">{t('settings.profileInformation')}</h2>
                <ProfileSettingsForm user={user} />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-6">{t('settings.securitySettings')}</h2>

                <div className="space-y-4">
                  <div className="bg-stone-50 p-4 rounded-lg">
                    <h3 className="text-md font-medium text-stone-900">{t('settings.password')}</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {t('settings.passwordLastChanged', { date: new Date(user?.updated_at || Date.now()).toLocaleDateString() })}
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="bg-stone-50 p-4 rounded-lg space-y-4">
                    <h3 className="text-md font-medium text-stone-900">{t('settings.changePassword')}</h3>
                    <Input
                      type="password"
                      label={t('settings.newPassword')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    {newPassword && <PasswordStrengthMeter strength={passwordStrength} requirements={passwordRequirements} />}
                    <Input
                      type="password"
                      label={t('settings.confirmNewPassword')}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <Button type="submit" loading={changingPassword}>
                      {t('settings.updatePassword')}
                    </Button>
                  </form>

                  <div className="bg-stone-50 p-4 rounded-lg">
                    <h3 className="text-md font-medium text-stone-900">{t('settings.loginHistory')}</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      {t('settings.lastLogin', { date: new Date(user?.last_sign_in_at || Date.now()).toLocaleString() })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-6">{t('settings.notificationPreferences')}</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="toast-notifications"
                        name="toast-notifications"
                        type="checkbox"
                        checked={toastsEnabled}
                        onChange={(e) => handleToggleToasts(e.target.checked)}
                        className="h-4 w-4 text-primary border-stone-300 rounded focus:ring-primary"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="toast-notifications" className="font-medium text-stone-700">
                        {t('settings.showPopupNotifications')}
                      </label>
                      <p className="text-stone-500">{t('settings.showPopupNotificationsHelp')}</p>
                    </div>
                  </div>

                  <div className="border-t border-stone-100 pt-4">
                    <span className="text-sm font-medium text-stone-700">{t('settings.language')}</span>
                    <p className="text-sm text-stone-500 mb-3">{t('settings.languageHelp')}</p>
                    <LanguageSwitcher />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'moderation' && isModerator && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-6">Moderation Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="auto-approve"
                        name="auto-approve"
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="h-4 w-4 text-primary border-stone-300 rounded focus:ring-primary cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="auto-approve" className="font-medium text-stone-700">
                        Auto-approve from trusted domains
                      </label>
                      <p className="text-stone-500">Automatically approve submissions from trusted email domains.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="notification-new-submissions"
                        name="notification-new-submissions"
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="h-4 w-4 text-primary border-stone-300 rounded focus:ring-primary cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notification-new-submissions" className="font-medium text-stone-700">
                        New submission notifications
                      </label>
                      <p className="text-stone-500">Receive notifications when new submissions require moderation.</p>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="trusted-domains" className="block text-sm font-medium text-stone-700">
                      Trusted Email Domains
                    </label>
                    <div className="mt-1 p-2 bg-stone-50 rounded-md border border-stone-200">
                      afyanahaki.org
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      Submissions from these domains will be automatically approved.
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 bg-yellow-50 border border-yellow-100 rounded-md p-4">
                  <p className="text-sm text-yellow-700">
                    Moderation settings are currently view-only. Contact a system administrator to change these settings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;