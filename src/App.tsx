import React, { Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import Auth from './components/Auth';
import ResetPassword from './components/ResetPassword';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './components/LandingPage';
import { supabase, handleSupabaseError, testConnection } from './lib/supabase';
import Navbar from './components/Navbar';
import { useModeratorStatus } from './hooks/useModeratorStatus';
import { can } from './lib/permissions';
import { schedulePrefetchAllRoutes, prefetchRoute } from './lib/routePrefetch';

// Lazy-loaded: these pull in the heaviest dependencies (react-pdf/pdfjs-dist,
// recharts/@tremor/@visx, framer-motion-heavy pages) and previously shipped
// to every visitor — including anonymous landing-page traffic — regardless
// of whether they were ever used. Splitting them into their own chunks means
// they only download once a signed-in user actually opens that tab.
const LawsRepository = lazy(() => import('./components/LawsRepository'));
const JudgmentsPage = lazy(() => import('./components/JudgmentsPage'));
const CasesPage = lazy(() => import('./components/CasesPage'));
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage'));
const SubmissionForm = lazy(() => import('./components/SubmissionForm'));
const BulkCaseUpload = lazy(() => import('./components/forms/BulkCaseUpload'));
const ModerationPage = lazy(() => import('./components/ModerationPage'));
const ModeratorAdminPanel = lazy(() => import('./components/ModeratorAdminPanel'));
const AdminManagementPanel = lazy(() => import('./components/AdminManagementPanel'));
const ResourcesPage = lazy(() => import('./components/ResourcesPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const RapidResponseCasesPage = lazy(() => import('./components/RapidResponseCasesPage'));

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  is_moderator: boolean;
  role: string;
  profession: string | null;
  organization: string | null;
  phone_number: string | null;
}

// A thin animated bar across the very top of the viewport — a distinct,
// app-wide "something is loading" signal, separate from the in-panel
// spinners/skeletons used for individual data fetches.
const TabFallback = () => {
  const { t } = useTranslation('translation');
  return (
  <div className="fixed top-0 left-0 right-0 z-50 h-1 overflow-hidden bg-primary/15" role="status" aria-label={t('common.loading')}>
    <motion.div
      className="h-full w-1/3 rounded-full bg-primary"
      animate={{ x: ['-100%', '300%'] }}
      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
    />
  </div>
  );
};

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

function DashboardApp() {
  const { t } = useTranslation('misc');
  const [session, setSession] = React.useState(null);
  // Which panel the (unauthenticated) single-viewport landing page is
  // showing — driven by the top Navbar's landing links, not the URL, since
  // the landing page itself never navigates/scrolls.
  const [landingSection, setLandingSection] = React.useState('features');
  // Tab is derived from the URL (not local state) so tabs are deep-linkable
  // and browser back/forward work — e.g. /cases, /judgments, /moderation.
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname === '/' ? 'dashboard' : location.pathname.slice(1);
  const setActiveTab = React.useCallback(
    (tab: string) => navigate(tab === 'dashboard' ? '/' : `/${tab}`),
    [navigate]
  );
  const [showCaseForm, setShowCaseForm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<boolean | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 3;
  
  const [dashboardStats, setDashboardStats] = React.useState({
    totalCases: 0,
    totalJudgments: 0
  });
  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [userProfile, setUserProfile] = React.useState<Profile | null>(null);
  const [authInitialMode, setAuthInitialMode] = React.useState<'signIn' | 'signUp'>('signIn');
  // Tracks whose session we've already set up, so a spurious re-notification
  // of the SAME user (see below) can be told apart from an actual new sign-in.
  const signedInUserId = React.useRef<string | null>(null);

  devLog('App render - connectionStatus:', connectionStatus);
  const retryBaseDelay = 1000; // Base delay in milliseconds
  const retryDelay = retryBaseDelay * Math.pow(2, retryCount); // Exponential backoff

  const { isModerator, isAdmin, loading: moderatorLoading, error: moderatorError } = useModeratorStatus({ isConnected: connectionStatus === true });
  devLog('App render - moderator status:', { isModerator, moderatorLoading, moderatorError });

  // Warm the lazy-loaded tab chunks in the background once signed in, so
  // switching tabs doesn't show a visible loading flash — see
  // src/lib/routePrefetch.ts. Nav-item hover prefetching (Navbar.tsx) covers
  // the case where a user clicks before this idle-time pass finishes.
  React.useEffect(() => {
    if (!session) return;
    return schedulePrefetchAllRoutes();
  }, [session]);

  const checkConnection = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      devLog('Checking Supabase connection...');
      const connectionResult = await testConnection();
      devLog('Connection check result:', connectionResult);
      
      if (!connectionResult.success) {
        // Check if this is an authentication error
        if (connectionResult.error && typeof connectionResult.error === 'object' && 
            'type' in connectionResult.error && connectionResult.error.type === 'auth') {
          devLog('Authentication error detected, signing out and showing auth modal');
          // Clear any existing session
          await supabase.auth.signOut();
          setSession(null);
          setUserProfile(null);
          setShowAuthModal(true);
          setAuthInitialMode('signIn');
          setConnectionStatus(true); // Connection is fine, just auth issue
          return;
        }
        
        throw new Error(connectionResult.error?.toString() || 'Unable to connect to the database');
      }
      
      setConnectionStatus(true);
      setRetryCount(0);
      devLog('Connection successful, status set to true');
      
    } catch (err) {
      console.error('Connection check failed:', err);
      setConnectionStatus(false);
      setError('Unable to connect to the database. Please check your internet connection and try again.');
      
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkConnection();
        }, retryDelay);
      }
    } finally {
      setLoading(false);
    }
  }, [retryCount]);

  React.useEffect(() => {
    devLog('Initial connection check effect running');
    checkConnection();
  }, [checkConnection]);

  React.useEffect(() => {
    devLog('Session check effect running, connectionStatus:', connectionStatus);
    if (!connectionStatus) return;

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      // Handle refresh token errors
      if (error && (
        error.message?.includes('Invalid Refresh Token') ||
        error.message?.includes('refresh_token_not_found') ||
        error.code === 'refresh_token_not_found'
      )) {
        devLog('Invalid refresh token detected in session check, signing out...');
        supabase.auth.signOut();
        setSession(null);
        setUserProfile(null);
        setShowAuthModal(true);
        setAuthInitialMode('signIn');
        return;
      }
      
      devLog('Got session:', session ? 'exists' : 'null');
      setSession(session);
      if (session) {
        signedInUserId.current = session.user.id;
        fetchUserProfile(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      devLog('Auth state changed, event:', event, 'new session:', session ? 'exists' : 'null');
      // Always keep the session object fresh (needed so subsequent API calls
      // use the refreshed access token), but only reset navigation/re-fetch
      // the profile on an actual sign-in.
      setSession(session);

      if (event === 'SIGNED_OUT' || !session) {
        signedInUserId.current = null;
        setUserProfile(null);

        // ELU Analytics: clear the identified user on sign-out so subsequent
        // activity is no longer attributed to the previous person.
        if (typeof window !== 'undefined' && window.elu) {
          window.elu.reset();
        }
        return;
      }

      // The Supabase SDK fires 'SIGNED_IN' — not just 'TOKEN_REFRESHED' — every
      // time the browser tab regains focus/visibility and the existing session
      // is still valid (see GoTrueClient's _onVisibilityChanged/_recoverAndRefresh).
      // That's indistinguishable from a real sign-in by event name alone, so we
      // instead check whether this is the SAME user we already set up: if so,
      // it's just the SDK re-confirming an existing session, not a fresh
      // sign-in, and should not reset navigation or re-fetch the profile.
      if (event === 'SIGNED_IN' && signedInUserId.current === session.user.id) {
        return;
      }

      signedInUserId.current = session.user.id;

      if (event !== 'SIGNED_IN') {
        // TOKEN_REFRESHED, USER_UPDATED, etc. — session is already updated
        // above; nothing else should change under the user.
        return;
      }

      setShowAuthModal(false);
      setActiveTab('dashboard');
      fetchUserProfile(session.user.id);

      // ELU Analytics: attach the signed-in user's email to their session so product
      // analytics can attribute behavior to a real person instead of an anonymous
      // device. Optional — safe to remove if you don't want to share email with
      // analytics. See https://elu.dev for docs.
      if (typeof window !== 'undefined' && window.elu && session.user?.email) {
        window.elu.identify(session.user.email, { email: session.user.email });
      }
    });

    return () => subscription.unsubscribe();
  }, [connectionStatus]);

  const fetchUserProfile = async (userId: string) => {
    if (!connectionStatus) return;
    
    try {
      devLog('Fetching user profile for ID:', userId);
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      devLog('Profile query result:', existingProfile);
      devLog('Profile query error:', fetchError);
      
      if (fetchError) throw fetchError;
      
      if (!existingProfile) {
        // NOTE: moderator status is decided server-side by a Postgres
        // trigger on INSERT (see supabase/migrations/*_lock_is_moderator_column.sql),
        // based on a trusted allow-list. We no longer send `is_moderator`
        // from the client — any value we sent would be overridden anyway.
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const userOrganization = user.user_metadata?.organization || '';

          const { data: newProfile, error: upsertError } = await supabase
            .from('profiles')
            .upsert([{
              id: userId,
              email: user.email,
              full_name: user.user_metadata?.full_name || '',
              role: 'user',
              profession: user.user_metadata?.profession || '',
              organization: userOrganization,
              phone_number: user.user_metadata?.phone_number || ''
            }], {
              onConflict: 'id',
              ignoreDuplicates: false
            })
            .select()
            .maybeSingle();

          if (upsertError) throw upsertError;
          setUserProfile(newProfile);
        }
      } else {
        // Moderator status changes after signup (e.g. an admin promoting a
        // user) happen through a trusted server-side path, not here.
        setUserProfile(existingProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      devLog('Error details:', JSON.stringify(error));
      setError(handleSupabaseError(error));
    }
  };

  React.useEffect(() => {
    if (!connectionStatus || !session) return;
    
    if (session) {
      fetchDashboardStats();
    }
  }, [activeTab, session, connectionStatus]);

  const fetchDashboardStats = async () => {
    if (!connectionStatus) return;
    
    try {
      setLoading(true);
      setError(null);

      const { count: totalCount, error: totalError } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('moderation_status', 'approved');

      if (totalError) throw totalError;

      const { count: judgmentsCount, error: judgmentsError } = await supabase
        .from('judgments')
        .select('*', { count: 'exact', head: true });

      if (judgmentsError) throw judgmentsError;

      const stats = {
        totalCases: totalCount || 0,
        totalJudgments: judgmentsCount || 0
      };

      setDashboardStats(stats);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (showAuthModal) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 flex items-center justify-center bg-stone-100"
        >
          <Auth
            onSuccess={() => setShowAuthModal(false)}
            onBack={() => setShowAuthModal(false)} 
            initialMode={authInitialMode}
          />
        </motion.div>
      );
    }

    if (!session) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="h-full flex flex-col"
        >
          <LandingPage
            activeTab={landingSection}
            onGetStarted={() => {
              setAuthInitialMode('signUp');
              setShowAuthModal(true);
            }}
          />
        </motion.div>
      );
    }

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
        >
          <Suspense fallback={<TabFallback />}>
          {(() => {
            switch (activeTab) {
              case 'dashboard':
                return <DashboardLayout
                  stats={dashboardStats}
                  loading={loading}
                  error={error}
                  setActiveTab={setActiveTab}
                />;

              case 'analytics':
                return <AnalyticsPage isModerator={isModerator} />;

              case 'cases':
                return <CasesPage userProfile={userProfile} />;

              case 'rapid-response':
                return <RapidResponseCasesPage />;

              case 'submit-case':
                return (
                  <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('app.submitCaseForReview')}</h2>
                    <SubmissionForm 
                      type="case"
                      onSuccess={() => setActiveTab('cases')}
                      onCancel={() => setActiveTab('cases')}
                    />
                  </div>
                );

              case 'submit-judgment':
                return (
                  <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('app.submitJudgmentForReview')}</h2>
                    <SubmissionForm 
                      type="judgment"
                      onSuccess={() => setActiveTab('judgments')}
                      onCancel={() => setActiveTab('judgments')}
                    />
                  </div>
                );

              case 'bulk-upload-cases':
                return (
                  <div className="max-w-5xl mx-auto px-4">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">{t('app.bulkUploadCases')}</h2>
                    <BulkCaseUpload onDone={() => setActiveTab('cases')} />
                  </div>
                );

              case 'moderation':
                return <ModerationPage />;

              case 'moderator-admin':
                return can({ isModerator, isAdmin }, 'moderator:grant') ? <ModeratorAdminPanel /> : null;

              case 'admin-management':
                return can({ isModerator, isAdmin }, 'admin:grant') ? <AdminManagementPanel /> : null;

              case 'laws':
                return <LawsRepository />;

              case 'judgments':
                return <JudgmentsPage />;
                
              case 'resources':
                return <ResourcesPage />;
                
              case 'settings':
                return <SettingsPage />;

              case 'upload-case':
                return (
                  <div className="space-y-6 px-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-900">{t('app.uploadCase')}</h2>
                      </div>
                      <button
                        onClick={() => setShowCaseForm(true)}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        {t('app.addNewCase')}
                      </button>
                    </div>

                    {showCaseForm && (
                      <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-6">
                          {t('app.addNewCase')}
                        </h3>
                        <SubmissionForm
                          type="case"
                          isDirectUpload={true}
                          onSuccess={() => setShowCaseForm(false)}
                          onCancel={() => setShowCaseForm(false)}
                        />
                      </div>
                    )}
                  </div>
                );

              default:
                return null;
            }
          })()}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-stone-100">
      <Navbar
        isAuthenticated={!!session}
        isLandingPage={!session && !showAuthModal}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeLandingSection={landingSection}
        onLandingSectionChange={setLandingSection}
        isModerator={isModerator}
        isAdmin={isAdmin}
        userProfile={userProfile}
        onSignInClick={() => {
          setAuthInitialMode('signIn');
          setShowAuthModal(true);
        }}
      />
      <div
        className={
          !session && !showAuthModal
            ? 'flex-1 min-h-0 overflow-hidden bg-stone-100 flex flex-col'
            : 'flex-1 overflow-x-hidden overflow-y-auto bg-stone-100 p-4 md:p-6'
        }
      >
          {connectionStatus === false ? (
            <div className="bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded relative" role="alert">
              <div className="flex items-center">
                <div className="flex-1">
                  <strong className="font-bold">{t('app.connectionError')} </strong>
                  <span className="block sm:inline">{t('app.connectionErrorDescription')}</span>
                </div>
                <button
                  onClick={checkConnection}
                  className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-danger hover:bg-danger-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-danger"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('app.retryConnection')}
                </button>
              </div>
              {retryCount > 0 && retryCount < maxRetries && (
                <p className="mt-2 text-sm">
                  {t('app.retryingConnection', { count: retryCount, max: maxRetries })}
                </p>
              )}
            </div>
          ) : error ? (
            <div className="bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">{t('app.error')} </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          ) : (
            renderContent()
          )}
      </div>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#524A3C', // stone-700
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #E7E3DB', // stone-200
            borderRadius: '0.5rem',
            padding: '16px',
            cursor: 'pointer',
          },
          success: {
            iconTheme: {
              primary: '#9C1D20', // primary
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #15803D', // success
            },
          },
          error: {
            iconTheme: {
              primary: '#DC2626', // danger
              secondary: '#fff',
            },
            style: {
              borderLeft: '4px solid #DC2626', // danger
            },
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<DashboardApp />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}