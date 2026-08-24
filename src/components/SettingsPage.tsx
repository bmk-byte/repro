import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ProfileSettingsForm from './ProfileSettingsForm';
import { User, Bell, Lock, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { useModeratorStatus } from '../hooks/useModeratorStatus';

const SettingsPage: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  
  // Use the moderator status hook
  const { isModerator, loading: moderatorLoading, error: moderatorError } = useModeratorStatus();

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
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if user is not a moderator
  if (!isModerator) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Access Denied</h3>
          <p className="mt-1 text-sm text-gray-500">
            You do not have permission to access the settings page. Only moderators can view and modify system settings.
          </p>
          {moderatorError && (
            <p className="mt-4 text-sm text-red-500">
              Error: {moderatorError}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">Settings</h2>
              <p className="mt-1 text-sm text-gray-500">View your account settings</p>
            </div>
            <nav className="p-4 space-y-1">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === 'profile'
                    ? 'bg-primary text-white'
                    : 'text-gray-700 hover:bg-gray-100'
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
                    : 'text-gray-700 hover:bg-gray-100'
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
                    : 'text-gray-700 hover:bg-gray-100'
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
                      : 'text-gray-700 hover:bg-gray-100'
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
                <h2 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h2>
                <ProfileSettingsForm user={user} />
              </div>
            )}

            {activeTab === 'security' && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h2>
                <p className="text-gray-500">
                  Security settings are managed through your profile. You can change your password and enable two-factor authentication there.
                </p>
                
                <div className="mt-6 space-y-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-medium text-gray-900">Password</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your password was last changed on {new Date(user?.updated_at || Date.now()).toLocaleDateString()}.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-medium text-gray-900">Login History</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Last login: {new Date(user?.last_sign_in_at || Date.now()).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email-notifications"
                        name="email-notifications"
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="email-notifications" className="font-medium text-gray-700">
                        Email Notifications
                      </label>
                      <p className="text-gray-500">Receive email notifications about case updates and system announcements.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="case-updates"
                        name="case-updates"
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="case-updates" className="font-medium text-gray-700">
                        Case Updates
                      </label>
                      <p className="text-gray-500">Receive notifications when cases are updated or new documents are added.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="system-announcements"
                        name="system-announcements"
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="system-announcements" className="font-medium text-gray-700">
                        System Announcements
                      </label>
                      <p className="text-gray-500">Receive notifications about system updates and new features.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-yellow-50 border border-yellow-100 rounded-md p-4">
                  <p className="text-sm text-yellow-700">
                    Notification preferences are currently view-only. Contact an administrator to change these settings.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'moderation' && isModerator && (
              <div className="p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-6">Moderation Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="auto-approve"
                        name="auto-approve"
                        type="checkbox"
                        defaultChecked
                        disabled
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="auto-approve" className="font-medium text-gray-700">
                        Auto-approve from trusted domains
                      </label>
                      <p className="text-gray-500">Automatically approve submissions from trusted email domains.</p>
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
                        className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary cursor-not-allowed opacity-60"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notification-new-submissions" className="font-medium text-gray-700">
                        New submission notifications
                      </label>
                      <p className="text-gray-500">Receive notifications when new submissions require moderation.</p>
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="trusted-domains" className="block text-sm font-medium text-gray-700">
                      Trusted Email Domains
                    </label>
                    <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
                      afyanahaki.org
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
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