import React, { useState, useEffect } from 'react';
import { Camera, Bell, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sanitizeURL } from '../lib/sanitize';

interface ProfileSettingsFormProps {
  user: any;
}

const ProfileSettingsForm: React.FC<ProfileSettingsFormProps> = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [profession, setProfession] = useState(user?.user_metadata?.profession || '');
  const [organization, setOrganization] = useState(user?.user_metadata?.organization || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.user_metadata?.phone_number || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [isModerator, setIsModerator] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [savingNotifications, setSavingNotifications] = useState(false);

  useEffect(() => {
    const checkModeratorStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_moderator, profession, organization, phone_number, email, receive_notifications')
          .eq('id', user.id)
          .single();
        
        if (error) throw error;
        setIsModerator(data?.is_moderator || false);
        setReceiveNotifications(data?.receive_notifications ?? true);
        
        // Set profession and organization from profile if not in user metadata
        if (!user?.user_metadata?.profession && data?.profession) {
          setProfession(data.profession);
        }
        
        if (!user?.user_metadata?.organization && data?.organization) {
          setOrganization(data.organization);
        }

        if (!user?.user_metadata?.phone_number && data?.phone_number) {
          setPhoneNumber(data.phone_number);
        }

        if (data?.email) {
          setEmail(data.email);
        }
      } catch (error) {
        console.error('Error checking moderator status:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      setLoading(true);
      checkModeratorStatus();
    }
  }, [user]);

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      setSavingNotifications(true);
      setReceiveNotifications(enabled);
      
      const { error } = await supabase
        .from('profiles')
        .update({ receive_notifications: enabled })
        .eq('id', user.id);
      
      if (error) throw error;
      
      toast.success(
        enabled 
          ? 'Notifications enabled successfully' 
          : 'Notifications disabled successfully'
      );
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error('Failed to update notification preferences');
      // Revert the state if the update failed
      setReceiveNotifications(!enabled);
    } finally {
      setSavingNotifications(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar Display */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {avatarUrl && sanitizeURL(avatarUrl) ? (
              <img src={sanitizeURL(avatarUrl)} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-primary" />
          Notification Preferences
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center">
                <label htmlFor="rapid-response-notifications" className="text-sm font-medium text-gray-700">
                  Rapid Response Alerts
                </label>
                {isModerator && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    Moderator
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Receive notifications for urgent rapid response cases and approaching deadlines
              </p>
              {isModerator && (
                <p className="mt-1 text-xs text-blue-600">
                  As a moderator, you'll receive alerts for all urgent cases and deadline reminders
                </p>
              )}
            </div>
            <div className="ml-4">
              <button
                type="button"
                id="rapid-response-notifications"
                onClick={() => handleNotificationToggle(!receiveNotifications)}
                disabled={savingNotifications}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  receiveNotifications ? 'bg-primary' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={receiveNotifications}
                aria-labelledby="rapid-response-notifications"
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    receiveNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          
          {receiveNotifications && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200">
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <span>Urgent priority cases (immediate alerts)</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                  <span>High priority cases (daily digest)</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span>Deadline reminders (24-72 hours before)</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  <span>Case status updates</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <Bell className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>How it works:</strong> When enabled, you'll receive real-time notifications in the application 
                  for urgent rapid response cases and approaching deadlines. Notifications appear in the bell icon 
                  in the top navigation bar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        
        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
              {fullName || 'Not provided'}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
              {email || 'Not provided'}
            </div>
          </div>

          {/* Profession */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Profession
            </label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
              {profession || 'Not provided'}
            </div>
          </div>

          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Organization
            </label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
              {organization || 'Not provided'}
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="mt-1 p-2 bg-gray-50 rounded-md border border-gray-200">
              {phoneNumber || 'Not provided'}
            </div>
          </div>
        </div>
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Moderator Status
          </label>
          <div className="mt-1">
            {isModerator ? (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <Bell className="h-4 w-4 mr-1" />
                Moderator Access Enabled
              </div>
            ) : (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Standard User
              </div>
            )}
            {isModerator && (
              <p className="mt-2 text-sm text-gray-500">
                As a moderator, you have access to rapid response coordination features and will receive 
                priority notifications for urgent cases.
              </p>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
      
      {savingNotifications && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-gray-700">Saving notification preferences...</span>
        </div>
      )}
    </div>
  );
};

export default ProfileSettingsForm;