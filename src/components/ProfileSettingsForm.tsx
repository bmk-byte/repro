import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Bell, Pencil } from 'lucide-react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { toast } from '../lib/toast';
import { sanitizeURL, sanitizeText, sanitizePhone, safeFileExtension } from '../lib/sanitize';
import { Badge, Spinner, Button, Input } from './ui';
import { useModeratorStatus } from '../hooks/useModeratorStatus';

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
  const { t } = useTranslation('misc');
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [profession, setProfession] = useState(user?.user_metadata?.profession || '');
  const [organization, setOrganization] = useState(user?.user_metadata?.organization || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.user_metadata?.phone_number || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);
  // Moderator status is sourced from the shared hook (single source of
  // truth for the DB-trigger-enforced `is_moderator` check) rather than
  // this form's own profile fetch, so this component can't drift from how
  // every other page determines moderator status.
  const { isModerator, isAdmin } = useModeratorStatus();
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
    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('profession, organization, phone_number, email, receive_notifications')
          .eq('id', user.id)
          .single();

        if (error) throw error;
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
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      setLoading(true);
      loadProfile();
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
          ? t('profileSettingsForm.notificationsEnabled')
          : t('profileSettingsForm.notificationsDisabled')
      );
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast.error(t('profileSettingsForm.failedToUpdateNotifications'));
      setReceiveNotifications(!enabled);
    } finally {
      setSavingNotifications(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('profileSettingsForm.chooseImageFile'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profileSettingsForm.imageTooLarge'));
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = safeFileExtension(file.name);
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });
      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success(t('profileSettingsForm.photoUpdated'));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error(handleSupabaseError(error));
    } finally {
      setUploadingAvatar(false);
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
      errors.full_name = t('profileSettingsForm.fullNameRequired');
    }
    if (editFields.phone_number && !/^[+()\d\s-]{6,}$/.test(editFields.phone_number)) {
      errors.phone_number = t('profileSettingsForm.validPhoneRequired');
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
      toast.success(t('profileSettingsForm.profileUpdated'));
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
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
            {avatarUrl && sanitizeURL(avatarUrl) ? (
              <img src={sanitizeURL(avatarUrl)} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-8 w-8 text-stone-400" aria-hidden="true" />
            )}
          </div>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            aria-label={t('profileSettingsForm.changePhoto')}
            className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-card hover:bg-primary-dark disabled:opacity-50"
          >
            {uploadingAvatar ? <Spinner size="sm" label="" /> : <Camera className="h-4 w-4" aria-hidden="true" />}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="sr-only"
          />
        </div>
        <p className="text-xs text-stone-500">{t('profileSettingsForm.clickToChangePhoto')}</p>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl shadow-card border border-stone-100 p-6">
        <h3 className="text-lg font-medium text-stone-900 mb-4 flex items-center">
          <Bell className="h-5 w-5 mr-2 text-primary" aria-hidden="true" />
          {t('profileSettingsForm.notificationPreferences')}
        </h3>

        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <label htmlFor="rapid-response-notifications" className="text-sm font-medium text-stone-700">
                  {t('profileSettingsForm.rapidResponseAlerts')}
                </label>
                {isModerator && <Badge tone="primary">{t('profileSettingsForm.moderator')}</Badge>}
              </div>
              <p className="mt-1 text-sm text-stone-500">
                {t('profileSettingsForm.rapidResponseAlertsDescription')}
              </p>
              {isModerator && (
                <p className="mt-1 text-xs text-info">
                  {t('profileSettingsForm.moderatorAlertsNote')}
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
                  <span>{t('profileSettingsForm.urgentCases')}</span>
                </div>
                <div className="flex items-center text-sm text-stone-600">
                  <div className="w-2 h-2 bg-warning rounded-full mr-2" aria-hidden="true"></div>
                  <span>{t('profileSettingsForm.highPriorityCases')}</span>
                </div>
                <div className="flex items-center text-sm text-stone-600">
                  <div className="w-2 h-2 bg-warning/60 rounded-full mr-2" aria-hidden="true"></div>
                  <span>{t('profileSettingsForm.deadlineReminders')}</span>
                </div>
                <div className="flex items-center text-sm text-stone-600">
                  <div className="w-2 h-2 bg-info rounded-full mr-2" aria-hidden="true"></div>
                  <span>{t('profileSettingsForm.caseStatusUpdates')}</span>
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
                  <strong>{t('profileSettingsForm.howItWorks')}</strong> {t('profileSettingsForm.howItWorksDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-xl shadow-card border border-stone-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-stone-900">{t('profileSettingsForm.personalInformation')}</h3>
          {!isEditingProfile && (
            <Button variant="ghost" size="sm" onClick={startEditingProfile} icon={<Pencil className="h-3.5 w-3.5" />}>
              {t('profileSettingsForm.edit')}
            </Button>
          )}
        </div>

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label={t('profileSettingsForm.fullName')}
              required
              value={editFields.full_name}
              onChange={handleEditFieldChange('full_name')}
              error={editErrors.full_name}
              autoFocus
            />
            <div>
              <span className="block text-sm font-medium text-stone-700 mb-1.5">{t('profileSettingsForm.emailAddress')}</span>
              <div className="p-2 bg-stone-50 rounded-md border border-stone-200 text-stone-500 text-sm">
                {email || t('profileSettingsForm.notProvided')}
              </div>
              <p className="mt-1 text-xs text-stone-500">{t('profileSettingsForm.changeEmailNote')}</p>
            </div>
            <Input
              label={t('profileSettingsForm.profession')}
              value={editFields.profession}
              onChange={handleEditFieldChange('profession')}
              placeholder={t('profileSettingsForm.professionPlaceholder')}
            />
            <Input
              label={t('profileSettingsForm.organization')}
              value={editFields.organization}
              onChange={handleEditFieldChange('organization')}
            />
            <Input
              label={t('profileSettingsForm.phoneNumber')}
              type="tel"
              value={editFields.phone_number}
              onChange={handleEditFieldChange('phone_number')}
              error={editErrors.phone_number}
              placeholder="+1234567890"
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={cancelEditingProfile} disabled={savingProfile}>
                {t('profileSettingsForm.cancel')}
              </Button>
              <Button type="submit" loading={savingProfile}>
                {savingProfile ? t('profileSettingsForm.saving') : t('profileSettingsForm.saveChanges')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {[
              { label: t('profileSettingsForm.fullName'), value: fullName },
              { label: t('profileSettingsForm.emailAddress'), value: email },
              { label: t('profileSettingsForm.profession'), value: profession },
              { label: t('profileSettingsForm.organization'), value: organization },
              { label: t('profileSettingsForm.phoneNumber'), value: phoneNumber },
            ].map(({ label, value }) => (
              <div key={label}>
                <span className="block text-sm font-medium text-stone-700">{label}</span>
                <div className="mt-1 p-2 bg-stone-50 rounded-md border border-stone-200 text-stone-900">
                  {value || <span className="text-stone-400">{t('profileSettingsForm.notProvided')}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account Status */}
      <div className="bg-white rounded-xl shadow-card border border-stone-100 p-6">
        <h3 className="text-lg font-medium text-stone-900 mb-4">{t('profileSettingsForm.accountStatus')}</h3>

        {isAdmin && (
          <div className="mb-4">
            <span className="block text-sm font-medium text-stone-700">{t('profileSettingsForm.adminStatus')}</span>
            <div className="mt-1">
              <Badge tone="primary">{t('profileSettingsForm.fullSystemAdmin')}</Badge>
              <p className="mt-2 text-sm text-stone-500">
                {t('profileSettingsForm.adminStatusDescription')}
              </p>
            </div>
          </div>
        )}

        <div>
          <span className="block text-sm font-medium text-stone-700">{t('profileSettingsForm.moderatorStatus')}</span>
          <div className="mt-1">
            {isModerator ? (
              <Badge tone="success" icon={<Bell className="h-3.5 w-3.5" />}>{t('profileSettingsForm.moderatorAccessEnabled')}</Badge>
            ) : (
              <Badge>{t('profileSettingsForm.standardUser')}</Badge>
            )}
            {isModerator && (
              <p className="mt-2 text-sm text-stone-500">
                {t('profileSettingsForm.moderatorStatusDescription')}
              </p>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center">
          <Spinner label={t('profileSettingsForm.loadingProfile')} />
        </div>
      )}

      {savingNotifications && (
        <div className="fixed bottom-4 right-4 bg-white border border-stone-200 rounded-lg shadow-raised p-4 flex items-center gap-2">
          <Spinner size="sm" label="" />
          <span className="text-sm text-stone-700">{t('profileSettingsForm.savingNotificationPreferences')}</span>
        </div>
      )}
    </div>
  );
};

export default ProfileSettingsForm;
