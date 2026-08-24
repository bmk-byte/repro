import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { validateModeratorOrganization } from '../lib/moderatorService';
import toast from 'react-hot-toast';
import { Scale, ArrowLeft, CircleHelp as HelpCircle, Eye, EyeOff, Check, X, CircleAlert as AlertCircle, Home } from 'lucide-react';
import { PARTNER_ORGANIZATIONS, OTHER_ORGANIZATION_VALUE } from '../constants/organizations';

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

interface PasswordRequirement {
  regex: RegExp;
  text: string;
  met: boolean;
}

const Auth: React.FC<AuthProps> = ({ onSuccess, onBack, initialMode = 'signIn' }) => {
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
  
  // Password strength requirements
  const [passwordRequirements, setPasswordRequirements] = useState<PasswordRequirement[]>([
    { regex: /.{8,}/, text: 'At least 8 characters', met: false },
    { regex: /[A-Z]/, text: 'At least 1 uppercase letter', met: false },
    { regex: /[a-z]/, text: 'At least 1 lowercase letter', met: false },
    { regex: /[0-9]/, text: 'At least 1 number', met: false },
    { regex: /[!@#$%^&*]/, text: 'At least 1 special character (!@#$%^&*)', met: false }
  ]);

  // Calculate password strength (0-100)
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Update password strength when password changes
  useEffect(() => {
    if (isSignUp) {
      const updatedRequirements = passwordRequirements.map(req => ({
        ...req,
        met: req.regex.test(password)
      }));
      
      setPasswordRequirements(updatedRequirements);
      
      // Calculate strength as percentage of requirements met
      const metCount = updatedRequirements.filter(req => req.met).length;
      const newStrength = Math.round((metCount / updatedRequirements.length) * 100);
      setPasswordStrength(newStrength);
    }
  }, [password, isSignUp]);

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  // Validate email field
  const handleEmailValidation = () => {
    if (!email) {
      setValidationErrors(prev => ({ ...prev, email: 'Please enter your email address' }));
      return false;
    } else if (!validateEmail(email)) {
      setValidationErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return false;
    } else {
      setValidationErrors(prev => ({ ...prev, email: '' }));
      return true;
    }
  };

  // Validate password field
  const handlePasswordValidation = () => {
    if (!password) {
      setValidationErrors(prev => ({ ...prev, password: 'Please enter your password' }));
      return false;
    } else if (isSignUp && passwordStrength < 100) {
      setValidationErrors(prev => ({ ...prev, password: 'Password does not meet all requirements' }));
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
        toast.success('Reset instructions sent. Check your email.');
      } catch (error: any) {
        console.error('Password reset error:', error);
        if (error?.status >= 500) {
          toast.error(
            'The password reset service is temporarily unavailable. Please try again later, or contact your administrator to reset your password manually.',
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
      toast.error('Please select your organization');
      setShakeAnimation(true);
      setTimeout(() => setShakeAnimation(false), 500);
      return;
    }

    // Validate custom organization if "Other" is selected
    if (isSignUp && selectedOrganization === OTHER_ORGANIZATION_VALUE && !customOrganization.trim()) {
      toast.error('Please enter your organization name');
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
            ? `This email is registered for "${expectedOrg}". Please select that organization from the dropdown, or choose "Other" to enter a different one.`
            : `This email is registered for "${expectedOrg}". Please choose "Other" in the dropdown and enter "${expectedOrg}" as your organization.`;

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
          toast.error('Registration failed. Please try again.');
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

        if (isModerator) {
          toast.success('Moderator account created successfully!');
        } else {
          toast.success('Registration successful! You can now sign in.');
        }
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // Directly show toast for invalid credentials without throwing
          if (error.message === 'Invalid login credentials') {
            setValidationErrors(prev => ({ ...prev, password: 'The email or password you entered is incorrect' }));
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
          toast.success('Welcome back!');
          if (onSuccess) onSuccess();
        } else {
          toast.error('Sign in failed. Please try again.');
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

  // Get password strength color
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 40) return 'bg-red-500';
    if (passwordStrength < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get password strength text
  const getPasswordStrengthText = () => {
    if (passwordStrength < 40) return 'Weak';
    if (passwordStrength < 70) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="flex-grow flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex flex-col items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="self-start mb-4 flex items-center text-gray-600 hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span>Back to Home</span>
              </button>
            )}
            <div className="flex items-center justify-center space-x-2">
              <Scale className="h-10 w-10 text-primary" />
              <span className="text-3xl font-bold text-primary">ReproPulse</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {isForgotPassword ? 'Reset your password' : isSignUp ? 'Create your account' : 'Sign in to your account'}
            </h2>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                <motion.form
                    className="space-y-6"
                    onSubmit={handleAuth}
                    animate={shakeAnimation ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                    transition={{ duration: 0.5 }}
                  >
                    {!isForgotPassword && isSignUp && (
                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                        Full Name
                      </label>
                      <div className="mt-1 relative">
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          placeholder="Enter your full name"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <HelpCircle 
                            className="h-5 w-5 text-gray-400 hover:text-gray-500 cursor-help" 
                            title="Enter your full name as it appears on official documents."
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!isForgotPassword && isSignUp && (
                    <div>
                      <label htmlFor="profession" className="block text-sm font-medium text-gray-700">
                        Profession
                      </label>
                      <div className="mt-1">
                        <input
                          id="profession"
                          name="profession"
                          type="text"
                          value={profession}
                          onChange={(e) => setProfession(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          placeholder="e.g. Lawyer, Researcher, Advocate"
                        />
                      </div>
                    </div>
                  )}
                  
                  {!isForgotPassword && isSignUp && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                          Organization <span className="text-red-500">*</span>
                        </label>
                        <div className="mt-1 relative">
                          <select
                            id="organization"
                            name="organization"
                            required
                            value={selectedOrganization}
                            onChange={handleOrganizationChange}
                            className={`appearance-none block w-full px-3 py-2 border ${
                              validationErrors.organization ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'
                            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                          >
                            <option value="">Select your organization</option>
                            {PARTNER_ORGANIZATIONS.map((org) => (
                              <option key={org} value={org}>
                                {org}
                              </option>
                            ))}
                            <option value={OTHER_ORGANIZATION_VALUE}>{OTHER_ORGANIZATION_VALUE} (specify below)</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <HelpCircle
                              className="h-5 w-5 text-gray-400"
                              title="Select the organization you are affiliated with from the dropdown. Choose 'Other' if your organization is not listed."
                            />
                          </div>
                        </div>
                      </div>
                      {validationErrors.organization && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 text-sm text-red-500 flex items-start"
                        >
                          <X className="h-4 w-4 mr-1 mt-0.5 shrink-0" />
                          <span>{validationErrors.organization}</span>
                        </motion.p>
                      )}

                      {showCustomOrganization && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <label htmlFor="customOrganization" className="block text-sm font-medium text-gray-700">
                            Organization Name <span className="text-red-500">*</span>
                          </label>
                          <div className="mt-1 relative">
                            <input
                              id="customOrganization"
                              name="customOrganization"
                              type="text"
                              required
                              value={customOrganization}
                              onChange={handleCustomOrganizationChange}
                              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                              placeholder="Enter your organization name"
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <HelpCircle
                                className="h-5 w-5 text-gray-400"
                                title="Enter the full name of your organization."
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                  
                  {!isForgotPassword && isSignUp && (
                    <div>
                      <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <div className="mt-1">
                        <input
                          id="phoneNumber"
                          name="phoneNumber"
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                          placeholder="+1234567890"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <div className="mt-1 relative">
                      <input
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
                        aria-invalid={!!validationErrors.email}
                        aria-describedby={validationErrors.email ? "email-error" : undefined}
                        className={`appearance-none block w-full px-3 py-2 border ${
                          validationErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'
                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm`}
                        placeholder="you@example.com"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <HelpCircle 
                          className="h-5 w-5 text-gray-400 hover:text-gray-500 cursor-help" 
                          title={isSignUp ? "This email will be used to log in to your account and for account recovery." : "Enter the email address associated with your account."}
                        />
                      </div>
                    </div>
                    {validationErrors.email && (
                      <motion.p 
                        id="email-error"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-500 flex items-center"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {validationErrors.email}
                      </motion.p>
                    )}
                  </div>

                  {!isForgotPassword && <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="mt-1 relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={isSignUp ? "new-password" : "current-password"}
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
                        aria-invalid={!!validationErrors.password}
                        aria-describedby={validationErrors.password ? "password-error" : undefined}
                        className={`appearance-none block w-full px-3 py-2 border ${
                          validationErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-primary focus:border-primary'
                        } rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm pr-10`}
                        placeholder={isSignUp ? "Create a strong password" : "Enter your password"}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-gray-400 hover:text-gray-500 focus:outline-none"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                        <HelpCircle 
                          className="h-5 w-5 text-gray-400 hover:text-gray-500 cursor-help" 
                          title={isSignUp 
                            ? "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
                            : "Enter the password associated with your account."}
                        />
                      </div>
                    </div>
                    {validationErrors.password && (
                      <motion.p 
                        id="password-error"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-sm text-red-500 flex items-center"
                      >
                        <X className="h-4 w-4 mr-1" />
                        {validationErrors.password}
                      </motion.p>
                    )}

                    {/* Password strength meter (only for signup) */}
                    {isSignUp && passwordTouched && (
                      <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-700">Password strength</span>
                          <span className="text-xs font-medium">{getPasswordStrengthText()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <motion.div 
                            className={`h-2.5 rounded-full ${getPasswordStrengthColor()}`}
                            style={{ width: `${passwordStrength}%` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${passwordStrength}%` }}
                            transition={{ duration: 0.3 }}
                          ></motion.div>
                        </div>
                        
                        {/* Password requirements */}
                        <div className="mt-3 space-y-2">
                          {passwordRequirements.map((req, index) => (
                            <div key={index} className="flex items-center">
                              {req.met ? (
                                <Check className="h-4 w-4 text-green-500 mr-2" />
                              ) : (
                                <X className="h-4 w-4 text-gray-400 mr-2" />
                              )}
                              <span className={`text-xs ${req.met ? 'text-green-500' : 'text-gray-500'}`}>
                                {req.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>}

                  {!isForgotPassword && !isSignUp && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                          title="Keep me signed in on this device"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                          Remember me
                        </label>
                      </div>
                      <div className="text-sm text-gray-500">
                        <button
                          type="button"
                          onClick={() => {
                            setIsForgotPassword(true);
                            setValidationErrors({ email: '', password: '', organization: '' });
                            setPassword('');
                          }}
                          className="font-medium text-primary hover:text-primary-dark"
                        >
                          Forgot your password?
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Processing...' : isForgotPassword ? 'Send reset instructions' : isSignUp ? 'Sign up' : 'Sign in'}
                    </button>
                  </div>
                </motion.form>

              <div className="mt-6">
                  <button
                    onClick={isForgotPassword ? () => setIsForgotPassword(false) : toggleAuthMode}
                    className="flex items-center text-sm font-medium text-primary hover:text-primary-dark"
                  >
                    {isForgotPassword ? 'Back to sign in' : isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;