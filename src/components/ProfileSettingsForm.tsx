import React, { useState, useEffect } from 'react';
import { Camera, Bell, Pencil } from 'lucide-react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sanitizeURL, sanitizeText, sanitizePhone } from '../lib/sanitize';
import { Badge, Spinner, Button, Input } from './ui';

interface ProfileSettingsFormProps {
  user: any;
}

interface EditableFields {
  full_name: string;
  profession: string;
  organization: string;
  phone_number: string;
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

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editFields, setEditFields] = useState<EditableFields>({
    full_name: '', profession: '', organization: '', phone_number: '',
  });
  const [editErrors, setEditErrors] = useState<Partial<Record<keyof EditableFields, string>>>({});

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
      setReceiveNotifications(!enabled);
    } finally {
      setSavingNotifications(false);
    }
  };

  const startEditingProfile = () => {
    setEditFields({
      full_name: fullName,
      profession: profession,
      organization: organization,
      phone_number: phoneNumber,
    });
    setEditErrors({});
    setIsEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setEditErrors({});
  };

  const handleEditFieldChange = (field: keyof EditableFields) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'phone_number' ? sanitizePhone(e.target.value) : sanitizeText(e.target.value);
    setEditFields((prev) => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateEditFields = (): boolean => {
    const errors: Partial<Record<keyof EditableFields, string>> = {};
    if (!editFields.full_name.trim()) {
      errors.full_name = 'Full name is required.';
    }
    if (editFields.phone_number && !/^[+()\d\s-]{6,}$/.test(editFields.phone_number)) {
      errors.phone_number = 'Enter a valid phone number.';
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEditFields()) return;

    setSavingProfile(true);
    try {
      const updates = {
        full_name: editFields.full_name.trim(),
        profession: editFields.profession.trim(),
        organization: editFields.organization.trim(),
        phone_number: editFields.phone_number.trim(),
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Keep auth user_metadata in sync — some parts of the app (e.g. the
      // signup flow) read profile fields from here rather than the table.
      const { error: authError } = await supabase.auth.updateUser({ data: updates });
      if (authError) throw authError;

      setFullName(updates.full_name);
      setProfession(updates.profession);
      setOrganization(updates.organization);
      setPhoneNumber(updates.phone_number);
      setIsEditingProfile(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(handleSupabaseError(error));
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Avatar Display */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
            {avatarUrl && sanitizeURL(avatarUrl) ? (
              <img src={sanitizeURL(avatarUrl)} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-stone-400" aria-hidden="true" />
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl shadow-card border border-stone-100 p-6">
        <h3 className="text-lg font-medium text-stone-900 mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-primary" aria-hidden="true" />
          Notification Preferences
        </h3>

        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <label htmlFor="rapid-response-notifications" className="text-sm font-medium text-stone-700">
                  Rapid Response Alerts
                </label>
                {isModerator && <Badge tone="primary">Moderator</Badge>}
              </div>
              <p className="mt-1 text-sm text-stone-500">
                Receive notifications for urgent rapid response cases and approaching deadlines
              </p>
              {isModerator && (
                <p className="mt-1 text-xs text-info">
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
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed ${
                  receiveNotifications ? 'bg-primary' : 'bg-stone-200'
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
            <div className="ml-4 pl-4 border-l-2 border-stone-200">
              <div className="space-y-3">
                <div className="flex items-center text-sm text-stone-600">
                  <div className="w-2 h-2 bg-danger rounded-full mr-2" aria-hidden="true"></div>
                  <span>Urgent priority cases (immediate alerts)</span>
                </div>
                <div className="flex items-center text-sm text-stone-600">
                  <div className="w-2 h-2 bg-warning rounded-full mr-2" aria-hidden="true"></div>
                  <span>High priority cases (daily digest)</span>
                </div>
                <div className="flex items-center text-sm text-stone-600">
                  <div className="w-2 h-2 bg-warning/60 rounded-full mr-2" aria-hidden="true"></div>
                  <span>Deadline reminders (24-72 hours before)</span>
                </div>
                <div className="flex items-center text-sm text-stone-600">
                  <div className="w-2 h-2 bg-info rounded-full mr-2" aria-hidden="true"></div>
                  <span>Case status updates</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-info-light border border-info/20 rounded-md p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <Bell className="h-5 w-5 text-info" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-info-dark">
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
      <div className="bg-white rounded-xl shadow-card border border-stone-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-stone-900">Personal Information</h3>
          {!isEditingProfile && (
            <Button variant="ghost" size="sm" onClick={startEditingProfile} icon={<Pencil className="h-3.5 w-3.5" />}>
              Edit
            </Button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Full Name"
              required
              value={editFields.full_name}
              onChange={handleEditFieldChange('full_name')}
              error={editErrors.full_name}
              autoFocus
            />
            <div>
              <span className="block text-sm font-medium text-stone-700 mb-1.5">Email Address</span>
              <div className="p-2 bg-stone-50 rounded-md border border-stone-200 text-stone-500 text-sm">
                {email || 'Not provided'}
              </div>
              <p className="mt-1 text-xs text-stone-500">Contact support to change the email on your account.</p>
            </div>
            <Input
              label="Profession"
              value={editFields.profession}
              onChange={handleEditFieldChange('profession')}
              placeholder="e.g. Lawyer, Researcher, Advocate"
            />
            <Input
              label="Organization"
              value={editFields.organization}
              onChange={handleEditFieldChange('organization')}
            />
            <Input
              label="Phone Number"
              type="tel"
              value={editFields.phone_number}
              onChange={handleEditFieldChange('phone_number')}
              error={editErrors.phone_number}
              placeholder="+1234567890"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={cancelEditingProfile} disabled={savingProfile}>
                Cancel
              </Button>
              <Button type="submit" loading={savingProfile}>
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {[
              { label: 'Full Name', value: fullName },
              { label: 'Email Address', value: email },
              { label: 'Profession', value: profession },
              { label: 'Organization', value: organization },
              { label: 'Phone Number', value: phoneNumber },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="block text-sm font-medium text-stone-700">{label}</span>
                <div className="mt-1 p-2 bg-stone-50 rounded-md border border-stone-200 text-stone-900">
                  {value || <span className="text-stone-400">Not provided</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-xl shadow-card border border-stone-100 p-6">
        <h3 className="text-lg font-medium text-stone-900 mb-4">Account Status</h3>

        <div>
          <span className="block text-sm font-medium text-stone-700">Moderator Status</span>
          <div className="mt-1">
            {isModerator ? (
              <Badge tone="success" icon={<Bell className="h-3.5 w-3.5" />}>Moderator Access Enabled</Badge>
            ) : (
              <Badge>Standard User</Badge>
            )}
            {isModerator && (
              <p className="mt-2 text-sm text-stone-500">
                As a moderator, you have access to rapid response coordination features and will receive
                priority notifications for urgent cases.
              </p>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center">
          <Spinner label="Loading profile…" />
        </div>
      )}

      {savingNotifications && (
        <div className="fixed bottom-4 right-4 bg-white border border-stone-200 rounded-lg shadow-raised p-4 flex items-center gap-2">
          <Spinner size="sm" label="" />
          <span className="text-sm text-stone-700">Saving notification preferences…</span>
        </div>
      )}
    </div>
  );
};

export default ProfileSettingsForm;
