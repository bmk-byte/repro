import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ProfileSettingsForm from './ProfileSettingsForm';
import { User, Bell, Lock, Shield } from 'lucide-react';
import { toast } from '../lib/toast';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import { usePasswordStrength } from '../hooks/usePasswordStrength';
import { getToastsEnabled, setToastsEnabled } from '../lib/toastPreference';
import { LoadingState, Input, Button, PasswordStrengthMeter } from './ui';

const SettingsPage: React.FC = () => {
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
      toast.error('Your new password does not meet all the requirements below.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('The passwords do not match.');
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error(error.message || 'Unable to update your password.');
      return;
    }
    toast.success('Password updated.');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleToggleToasts = (enabled: boolean) => {
    setToastsEnabledState(enabled);
    setToastsEnabled(enabled);
    if (enabled) toast.success('Pop-up notifications enabled.');
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
        toast.error('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, []);

  // Show loading if either user data or moderator status is loading
  if (loading || moderatorLoading) {
    return <LoadingState label="Loading settings…" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-stone-900">Settings</h2>
              <p className="mt-1 text-sm text-stone-500">View your account settings</p>
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
                Profile
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
                Security
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
                Notifications
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
                  Moderation
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
                <h2 className="text-lg font-medium text-stone-900 mb-6">Profile Information</h2>
                <ProfileSettingsForm user={user} />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-6">Security Settings</h2>

                <div className="space-y-4">
                  <div className="bg-stone-50 p-4 rounded-lg">
                    <h3 className="text-md font-medium text-stone-900">Password</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      Your password was last changed on {new Date(user?.updated_at || Date.now()).toLocaleDateString()}.
                    </p>
                  </div>

                  <form onSubmit={handleChangePassword} className="bg-stone-50 p-4 rounded-lg space-y-4">
                    <h3 className="text-md font-medium text-stone-900">Change Password</h3>
                    <Input
                      type="password"
                      label="New password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    {newPassword && <PasswordStrengthMeter strength={passwordStrength} requirements={passwordRequirements} />}
                    <Input
                      type="password"
                      label="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <Button type="submit" loading={changingPassword}>
                      Update Password
                    </Button>
                  </form>

                  <div className="bg-stone-50 p-4 rounded-lg">
                    <h3 className="text-md font-medium text-stone-900">Login History</h3>
                    <p className="mt-1 text-sm text-stone-500">
                      Last login: {new Date(user?.last_sign_in_at || Date.now()).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-stone-900 mb-6">Notification Preferences</h2>
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
                        Show pop-up notifications on screen
                      </label>
                      <p className="text-stone-500">Toggle the pop-up messages that appear after actions like saving or submitting. This only affects this device/browser.</p>
                    </div>
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