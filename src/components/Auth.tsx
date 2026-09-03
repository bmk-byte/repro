import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { validateModeratorOrganization } from '../lib/moderatorService';
import { toast } from '../lib/toast';
import { Scale, ArrowLeft, CircleHelp as HelpCircle, Eye, EyeOff } from 'lucide-react';
import { PARTNER_ORGANIZATIONS, OTHER_ORGANIZATION_VALUE } from '../constants/organizations';
import { Input, Select, Button, Card, PasswordStrengthMeter } from './ui';
import { usePasswordStrength } from '../hooks/usePasswordStrength';

interface AuthProps {
  onSuccess?: () => void;
  onBack?: () => void;
  initialMode?: 'signIn' | 'signUp';
}

interface ValidationState {
  email: string;
  password: string;
  organization: string;
}

const Auth: React.FC<AuthProps> = ({ onSuccess, onBack, initialMode = 'signIn' }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profession, setProfession] = useState('');
  const [organization, setOrganization] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [customOrganization, setCustomOrganization] = useState('');
  const [showCustomOrganization, setShowCustomOrganization] = useState(false);
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signUp');
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationState>({ email: '', password: '', organization: '' });
  const [shakeAnimation, setShakeAnimation] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const { requirements: passwordRequirements, strength: passwordStrength } = usePasswordStrength(password);

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Validate email field
  const handleEmailValidation = () => {
    if (!email) {
      setValidationErrors(prev => ({ ...prev, email: t('auth.pleaseEnterEmail') }));
      return false;
    } else if (!validateEmail(email)) {
      setValidationErrors(prev => ({ ...prev, email: t('auth.pleaseEnterValidEmail') }));
      return false;
    } else {
      setValidationErrors(prev => ({ ...prev, email: '' }));
      return true;
    }
  };

  // Validate password field
  const handlePasswordValidation = () => {
    if (!password) {
      setValidationErrors(prev => ({ ...prev, password: t('auth.pleaseEnterPassword') }));
      return false;
    } else if (isSignUp && passwordStrength < 100) {
      setValidationErrors(prev => ({ ...prev, password: t('auth.passwordRequirementsNotMet') }));
      return false;
    } else {
      setValidationErrors(prev => ({ ...prev, password: '' }));
      return true;
    }
  };

  const handleOrganizationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedOrganization(value);

    if (value === OTHER_ORGANIZATION_VALUE) {
      setShowCustomOrganization(true);
      setOrganization(customOrganization.trim());
    } else {
      setShowCustomOrganization(false);
      setOrganization(value);
    }
  };

  const handleCustomOrganizationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomOrganization(value);
    setOrganization(value.trim());
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    const isEmailValid = handleEmailValidation();

    if (isForgotPassword) {
      if (!isEmailValid) return;
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success(t('auth.resetInstructionsSent'));
      } catch (error: any) {
        console.error('Password reset error:', error);
        if (error?.status >= 500) {
          toast.error(
            t('auth.resetServiceUnavailable'),
            { duration: 8000 }
          );
        } else {
          toast.error(handleSupabaseError(error));
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    const isPasswordValid = handlePasswordValidation();

    // Validate organization is required during signup
    if (isSignUp && !selectedOrganization) {
      toast.error(t('auth.pleaseSelectOrganization'));
      setShakeAnimation(true);
      setTimeout(() => setShakeAnimation(false), 500);
      return;
    }

    // Validate custom organization if "Other" is selected
    if (isSignUp && selectedOrganization === OTHER_ORGANIZATION_VALUE && !customOrganization.trim()) {
      toast.error(t('auth.pleaseEnterOrganizationName'));
      setShakeAnimation(true);
      setTimeout(() => setShakeAnimation(false), 500);
      return;
    }

    if (!isEmailValid || !isPasswordValid) {
      // Trigger shake animation for invalid form
      setShakeAnimation(true);
      setTimeout(() => setShakeAnimation(false), 500);
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const orgValidation = validateModeratorOrganization(email, organization.trim());

        if (!orgValidation.isValid && orgValidation.expectedOrganization) {
          const expectedOrg = orgValidation.expectedOrganization;
          const isListed = PARTNER_ORGANIZATIONS.some(
            (org) => org.toLowerCase() === expectedOrg.toLowerCase()
          );
          const actionableMessage = isListed
            ? t('auth.emailRegisteredListed', { org: expectedOrg })
            : t('auth.emailRegisteredOther', { org: expectedOrg });

          toast.error(actionableMessage);
          setValidationErrors(prev => ({
            ...prev,
            organization: actionableMessage,
            password: ''
          }));

          if (isListed) {
            setSelectedOrganization(expectedOrg);
            setShowCustomOrganization(false);
            setOrganization(expectedOrg);
          } else {
            setSelectedOrganization(OTHER_ORGANIZATION_VALUE);
            setShowCustomOrganization(true);
            setCustomOrganization(expectedOrg);
            setOrganization(expectedOrg);
          }

          setShakeAnimation(true);
          setTimeout(() => setShakeAnimation(false), 500);
          setLoading(false);
          return;
        }

        // Fail open: only an explicit `false` blocks — an RPC error (e.g.
        // offline) shouldn't itself lock the user out of signing up.
        const { data: signUpAllowed, error: signUpRateLimitError } = await supabase.rpc('check_rate_limit', {
          p_key: `signup:${email.toLowerCase()}`,
          p_max_count: 3,
          p_window_seconds: 3600,
        });
        if (!signUpRateLimitError && signUpAllowed === false) {
          toast.error(t('auth.rateLimitedSignup'));
          setLoading(false);
          return;
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              phone_number: phoneNumber.trim(),
              profession: profession.trim(),
              organization: organization.trim()
            }
          }
        });

        if (signUpError) {
          console.error('Sign up error:', signUpError);
          throw signUpError;
        }

        if (!authData.user) {
          toast.error(t('auth.registrationFailed'));
          setLoading(false);
          return;
        }

        // is_moderator/role are decided server-side by a trigger on INSERT
        // (see supabase/migrations/*_lock_is_moderator_column.sql) — do not
        // send them from the client.
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: fullName.trim(),
            email: email,
            phone_number: phoneNumber.trim(),
            profession: profession.trim(),
            organization: organization.trim(),
            role: 'user'
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }

        // Moderator status is decided server-side (see the trigger comment
        // above) and isn't known client-side at this point — this component
        // has no `isModerator` state, so the message is generic regardless
        // of what the account ends up granted.
        toast.success(t('auth.registrationSuccess'));
        setIsSignUp(false);
      } else {
        // Fail open: only an explicit `false` blocks — an RPC error (e.g.
        // offline) shouldn't itself lock the user out of signing in.
        const { data: loginAllowed, error: loginRateLimitError } = await supabase.rpc('check_rate_limit', {
          p_key: `login:${email.toLowerCase()}`,
          p_max_count: 5,
          p_window_seconds: 300,
        });
        if (!loginRateLimitError && loginAllowed === false) {
          toast.error(t('auth.rateLimitedLogin'));
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Directly show toast for invalid credentials without throwing
          if (error.message === 'Invalid login credentials') {
            setValidationErrors(prev => ({ ...prev, password: t('auth.invalidCredentials') }));
            // Trigger shake animation
            setShakeAnimation(true);
            setTimeout(() => setShakeAnimation(false), 500);
            setLoading(false);
            return;
          }
          // For other errors, throw to be caught by the catch block
          throw error;
        }
        
        if (data.user) {
          toast.success(t('auth.welcomeBack'));
          if (onSuccess) onSuccess();
        } else {
          toast.error(t('auth.signInFailed'));
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(handleSupabaseError(error));
      // Trigger shake animation
      setShakeAnimation(true);
      setTimeout(() => setShakeAnimation(false), 500);
    } finally {
      setLoading(false);
    }
  };

  // Clear form when switching between sign up and sign in
  const toggleAuthMode = () => {
    setIsForgotPassword(false);
    setEmail('');
    setPassword('');
    setFullName('');
    setPhoneNumber('');
    setProfession('');
    setOrganization('');
    setSelectedOrganization('');
    setCustomOrganization('');
    setShowCustomOrganization(false);
    setValidationErrors({ email: '', password: '', organization: '' });
    setIsSignUp(!isSignUp);
    setPasswordTouched(false);
  };

  return (
    <div className="min-h-screen w-full bg-stone-100 flex flex-col">
      <div className="flex-grow flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex flex-col items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="self-start mb-4 flex items-center text-sm text-stone-600 hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span>{t('auth.backToHome')}</span>
              </button>
            )}
            <div className="flex items-center justify-center gap-2.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Scale className="h-6 w-6 text-primary" />
              </span>
              <span className="font-serif text-3xl font-semibold text-primary">ReproPulse</span>
            </div>
            <h2 className="mt-7 text-center text-2xl sm:text-3xl font-serif font-semibold text-stone-900">
              {isForgotPassword ? t('auth.forgotPasswordTitle') : isSignUp ? t('auth.signUpTitle') : t('auth.signInTitle')}
            </h2>
          </div>

          <motion.div
            className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Card padding="none" className="p-6 sm:p-10">
                <motion.form
                    className="space-y-6"
                    onSubmit={handleAuth}
                    animate={shakeAnimation ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {!isForgotPassword && isSignUp && (
                      <Input
                        label={t('auth.fullName')}
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('auth.fullNamePlaceholder')}
                        rightElement={
                          <HelpCircle
                            className="h-5 w-5 text-stone-400 hover:text-stone-500 cursor-help"
                            title={t('auth.fullNameHelp')}
                          />
                        }
                      />
                  )}

                  {!isForgotPassword && isSignUp && (
                    <Input
                      label={t('auth.profession')}
                      id="profession"
                      name="profession"
                      type="text"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      placeholder={t('auth.professionPlaceholder')}
                    />
                  )}

                  {!isForgotPassword && isSignUp && (
                    <div className="space-y-4">
                      <Select
                        label={t('auth.organization')}
                        id="organization"
                        name="organization"
                        required
                        value={selectedOrganization}
                        onChange={handleOrganizationChange}
                        error={validationErrors.organization}
                      >
                        <option value="">{t('auth.organizationSelectPlaceholder')}</option>
                        {PARTNER_ORGANIZATIONS.map((org) => (
                          <option key={org} value={org}>
                            {org}
                          </option>
                        ))}
                        <option value={OTHER_ORGANIZATION_VALUE}>{t('auth.organizationOtherOption', { other: OTHER_ORGANIZATION_VALUE })}</option>
                      </Select>

                      {showCustomOrganization && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Input
                            label={t('auth.organizationName')}
                            id="customOrganization"
                            name="customOrganization"
                            type="text"
                            required
                            value={customOrganization}
                            onChange={handleCustomOrganizationChange}
                            placeholder={t('auth.organizationNamePlaceholder')}
                            rightElement={
                              <HelpCircle
                                className="h-5 w-5 text-stone-400"
                                title={t('auth.organizationNameHelp')}
                              />
                            }
                          />
                        </motion.div>
                      )}
                    </div>
                  )}

                  {!isForgotPassword && isSignUp && (
                    <Input
                      label={t('auth.phoneNumber')}
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1234567890"
                    />
                  )}

                  <Input
                    label={t('auth.email')}
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (validationErrors.email) handleEmailValidation();
                    }}
                    onBlur={handleEmailValidation}
                    error={validationErrors.email}
                    placeholder={t('auth.emailPlaceholder')}
                    rightElement={
                      <HelpCircle
                        className="h-5 w-5 text-stone-400 hover:text-stone-500 cursor-help"
                        title={isSignUp ? t('auth.emailHelpSignUp') : t('auth.emailHelpSignIn')}
                      />
                    }
                  />

                  {!isForgotPassword && (
                    <div>
                      <Input
                        label={t('auth.password')}
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete={isSignUp ? 'new-password' : 'current-password'}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (isSignUp) setPasswordTouched(true);
                          if (validationErrors.password) handlePasswordValidation();
                        }}
                        onBlur={() => {
                          if (isSignUp) setPasswordTouched(true);
                          handlePasswordValidation();
                        }}
                        error={validationErrors.password}
                        placeholder={isSignUp ? t('auth.passwordPlaceholderSignUp') : t('auth.passwordPlaceholderSignIn')}
                        rightElement={
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-stone-400 hover:text-stone-500"
                              aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                            <HelpCircle
                              className="h-5 w-5 text-stone-400 hover:text-stone-500 cursor-help"
                              title={isSignUp
                                ? t('auth.passwordHelpSignUp')
                                : t('auth.passwordHelpSignIn')}
                            />
                          </div>
                        }
                      />

                    {/* Password strength meter (only for signup) */}
                    {isSignUp && passwordTouched && (
                      <PasswordStrengthMeter strength={passwordStrength} requirements={passwordRequirements} />
                    )}
                    </div>
                  )}

                  {!isForgotPassword && !isSignUp && (
                    <div className="flex items-center justify-end gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setValidationErrors({ email: '', password: '', organization: '' });
                          setPassword('');
                        }}
                        className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                      >
                        {t('auth.forgotPassword')}
                      </button>
                    </div>
                  )}

                  <Button type="submit" loading={loading} size="lg" className="w-full">
                    {loading ? t('auth.processing') : isForgotPassword ? t('auth.sendResetInstructions') : isSignUp ? t('auth.signUp') : t('auth.signIn')}
                  </Button>
                </motion.form>

              <div className="mt-6 text-center">
                  <button
                    onClick={isForgotPassword ? () => setIsForgotPassword(false) : toggleAuthMode}
                    className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                  >
                    {isForgotPassword ? t('auth.backToSignIn') : isSignUp ? t('auth.haveAccountSignIn') : t('auth.noAccountSignUp')}
                  </button>
                </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;