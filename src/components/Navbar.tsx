import React from 'react';
import { useTranslation } from 'react-i18next';
import { Scale, Menu, X, Bell, ChevronDown, LayoutDashboard, Upload, Shield, ShieldCheck, KeyRound, Send, Gavel, BookOpen, ScrollText, Settings, LogOut, User, AlertOctagon, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { Button, Badge, LanguageSwitcher } from './ui';
import { prefetchRoute } from '../lib/routePrefetch';

interface NavbarProps {
  className?: string;
  isAuthenticated?: boolean;
  isLandingPage?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  /** Which landing-page panel is showing (see LandingTabs.tsx) — distinct from `activeTab`, which drives the authenticated dashboard's URL-based routing. */
  activeLandingSection?: string;
  onLandingSectionChange?: (id: string) => void;
  /** "moderator or admin" — see useModeratorStatus.ts. */
  isModerator?: boolean;
  /** Full-access admin, distinct from (and a superset of) moderator — see src/lib/permissions.ts. */
  isAdmin?: boolean;
  userProfile?: any;
  onSignInClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  className = '',
  isAuthenticated = false,
  isLandingPage = false,
  activeTab,
  setActiveTab,
  activeLandingSection,
  onLandingSectionChange,
  isModerator = false,
  isAdmin = false,
  userProfile,
  onSignInClick
}) => {
  const { t } = useTranslation();
  const [notificationCount, setNotificationCount] = React.useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  // Set up real-time subscription for notifications if user is a moderator
  React.useEffect(() => {
    if (!isAuthenticated || !isModerator) return;

    const subscription = supabase
      .channel('navbar-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pending_submissions',
          filter: 'status=eq.pending'
        },
        () => {
          setNotificationCount(prev => prev + 1);

          const audio = new Audio('/notification-sound.mp3');
          audio.play().catch(() => {
            // Silently fail if audio can't play (common in browsers that require user interaction)
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isAuthenticated, isModerator]);

  // Close the user menu on outside click or Escape
  React.useEffect(() => {
    if (!userDropdownOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [userDropdownOpen]);

  const clearNotifications = () => {
    setNotificationCount(0);
    toast.success(t('common.notificationsCleared'));
  };

  // ids match LandingTabs.tsx's TabId. No separate "Home" link — the hero
  // above these tabs is always visible regardless of which panel is active,
  // so there's no distinct "home" destination to jump to on a
  // single-viewport page.
  const landingPageLinks = [
    { name: t('landing.features'), id: 'features' },
    { name: t('landing.focusAreas'), id: 'thematic' },
    { name: t('landing.benefits'), id: 'benefits' },
    { name: t('landing.testimonials'), id: 'testimonials' },
  ];

  const navigationItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'analytics', label: t('nav.analytics'), icon: BarChart2 },
    ...(isModerator ? [
      { id: 'upload-case', label: t('nav.uploadCase'), icon: Upload },
      { id: 'moderation', label: t('nav.moderation'), icon: Shield },
      { id: 'rapid-response', label: t('nav.rapidResponse'), icon: AlertOctagon, badge: t('nav.rapidResponseBadge') }
    ] : [
      { id: 'submit-case', label: t('nav.submitCase'), icon: Send },
      { id: 'submit-judgment', label: t('nav.submitJudgment'), icon: Send }
    ]),
    { id: 'cases', label: t('nav.cases'), icon: Scale },
    { id: 'judgments', label: t('nav.judgments'), icon: Gavel },
    { id: 'laws', label: t('nav.laws'), icon: BookOpen },
    { id: 'resources', label: t('nav.resources'), icon: ScrollText },
    // Granting/revoking moderator status is admin-only (see
    // src/lib/permissions.ts) — a plain moderator no longer sees this tab.
    ...(isAdmin ? [
      { id: 'moderator-admin', label: t('nav.moderators'), icon: ShieldCheck }
    ] : []),
    ...(isAdmin ? [
      { id: 'admin-management', label: t('nav.admins'), icon: KeyRound }
    ] : []),
    { id: 'settings', label: t('nav.settings'), icon: Settings }
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setActiveTab?.('dashboard');
    setUserDropdownOpen(false);
  };

  return (
    <header className={`bg-white border-b border-stone-200 ${className}`} role="banner">
      <nav className="relative" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Scale className="h-7 w-7 text-primary" />
              <span className="font-serif text-xl font-semibold text-primary" aria-label="ReproPulse - Home">
                ReproPulse
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isLandingPage && !isAuthenticated && (
                <div className="hidden md:flex items-center gap-6" role="navigation" aria-label="Page sections">
                  {landingPageLinks.map((link) => (
                    <button
                      key={link.id}
                      onClick={() => onLandingSectionChange?.(link.id)}
                      className={`text-sm font-medium transition-colors ${
                        activeLandingSection === link.id ? 'text-primary' : 'text-stone-600 hover:text-primary'
                      }`}
                      aria-current={activeLandingSection === link.id ? 'page' : undefined}
                    >
                      {link.name}
                    </button>
                  ))}
                </div>
              )}

              {isAuthenticated && isModerator && notificationCount > 0 && (
                <button
                  onClick={() => {
                    clearNotifications();
                    setActiveTab?.('moderation');
                  }}
                  className="relative p-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  aria-label={t('nav.notificationsUnread', { count: notificationCount })}
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold leading-none text-white bg-primary rounded-full">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                </button>
              )}

              {isAuthenticated && userProfile && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-haspopup="menu"
                    aria-expanded={userDropdownOpen}
                    className="flex items-center gap-2 p-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden md:block text-sm font-medium">
                      {userProfile.full_name || t('common.user')}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {userDropdownOpen && (
                    <div role="menu" className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-raised border border-stone-100 py-1 z-50">
                      <div className="px-4 py-2 text-sm text-stone-700 border-b border-stone-100">
                        <div className="font-medium">{userProfile.full_name}</div>
                        <div className="text-stone-500 truncate">{userProfile.email}</div>
                      </div>
                      <button
                        role="menuitem"
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-stone-700 hover:bg-stone-100"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('common.signOut')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(isAuthenticated || isLandingPage) && (
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-menu"
                  className="md:hidden p-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  aria-label={isMobileMenuOpen ? t('common.closeMenu') : t('common.openMenu')}
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              )}

              <LanguageSwitcher className="hidden sm:inline-flex" />

              {!isAuthenticated && isLandingPage && onSignInClick && (
                <Button onClick={onSignInClick} className="hidden md:inline-flex">
                  {t('common.signIn')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {isAuthenticated && (
        <nav className="hidden md:block bg-stone-50 border-t border-stone-200" role="navigation" aria-label="Dashboard navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 py-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab?.(item.id)}
                    onMouseEnter={() => prefetchRoute(item.id)}
                    onFocus={() => prefetchRoute(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={t('nav.navigateTo', { label: item.label })}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge tone="primary">{item.badge}</Badge>
                    )}
                  </button>
                );
              })}

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors ml-4"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('common.signOut')}</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 top-16 z-30 bg-stone-900/30"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {isMobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden fixed inset-x-0 top-16 bg-white shadow-raised z-40 border-t border-stone-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab?.(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center w-full px-3 py-2 rounded-md text-base font-medium ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'text-stone-700 hover:text-stone-900 hover:bg-stone-50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.label}
                      {item.badge && (
                        <span className="ml-2">
                          <Badge tone="primary">{item.badge}</Badge>
                        </span>
                      )}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    handleSignOut();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50 mt-4 border-t border-stone-200 pt-4"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  {t('common.signOut')}
                </button>
                <div className="px-3 pt-2">
                  <LanguageSwitcher />
                </div>
              </>
            ) : (
              <>
                {landingPageLinks.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => {
                      onLandingSectionChange?.(link.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                      activeLandingSection === link.id
                        ? 'bg-primary text-white'
                        : 'text-stone-700 hover:text-stone-900 hover:bg-stone-50'
                    }`}
                  >
                    {link.name}
                  </button>
                ))}
                {onSignInClick && (
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onSignInClick();
                    }}
                    className="w-full mt-4"
                  >
                    {t('common.signIn')}
                  </Button>
                )}
                <div className="px-3 pt-4">
                  <LanguageSwitcher />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
