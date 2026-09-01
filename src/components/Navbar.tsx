import React from 'react';
import { Scale, Menu, X, Bell, ChevronDown, LayoutDashboard, Upload, Shield, ShieldCheck, Send, Gavel, BookOpen, ScrollText, Settings, LogOut, User, AlertOctagon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Button, Badge } from './ui';

interface NavbarProps {
  className?: string;
  isAuthenticated?: boolean;
  isLandingPage?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  isModerator?: boolean;
  userProfile?: any;
  onSignInClick?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  className = '',
  isAuthenticated = false,
  isLandingPage = false,
  activeTab,
  setActiveTab,
  isModerator = false,
  userProfile,
  onSignInClick
}) => {
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
    toast.success('Notifications cleared');
  };

  const landingPageLinks = [
    { name: 'Home', href: '#hero-section' },
    { name: 'Features', href: '#features-section' },
    { name: 'Focus Areas', href: '#thematic-focus-section' },
    { name: 'Benefits', href: '#benefits-section' },
    { name: 'Testimonials', href: '#testimonial-section' },
  ];

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(isModerator ? [
      { id: 'upload-case', label: 'Upload Case', icon: Upload },
      { id: 'moderation', label: 'Moderation', icon: Shield },
      { id: 'rapid-response', label: 'Rapid Response', icon: AlertOctagon, badge: 'New' }
    ] : [
      { id: 'submit-case', label: 'Submit Case', icon: Send },
      { id: 'submit-judgment', label: 'Submit Judgment', icon: Send }
    ]),
    { id: 'cases', label: 'Cases', icon: Scale },
    { id: 'judgments', label: 'Judgments', icon: Gavel },
    { id: 'laws', label: 'Laws', icon: BookOpen },
    { id: 'resources', label: 'Resources', icon: ScrollText },
    ...(isModerator ? [
      { id: 'moderator-admin', label: 'Moderators', icon: ShieldCheck },
      { id: 'settings', label: 'Settings', icon: Settings }
    ] : [])
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
                    <a
                      key={link.name}
                      href={link.href}
                      className="text-sm font-medium text-stone-600 hover:text-primary transition-colors"
                      aria-label={`Navigate to ${link.name} section`}
                    >
                      {link.name}
                    </a>
                  ))}
                </div>
              )}

              {isAuthenticated && isModerator && notificationCount > 0 && (
                <button
                  onClick={clearNotifications}
                  className="relative p-2 rounded-md text-stone-600 hover:text-stone-900 hover:bg-stone-100"
                  aria-label={`Notifications, ${notificationCount} unread`}
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
                      {userProfile.full_name || 'User'}
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
                        Sign Out
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
                  aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              )}

              {!isAuthenticated && isLandingPage && onSignInClick && (
                <Button onClick={onSignInClick} className="hidden md:inline-flex">
                  Sign In
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`Navigate to ${item.label}`}
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
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </nav>
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
                  Sign Out
                </button>
              </>
            ) : (
              <>
                {landingPageLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="block px-3 py-2 rounded-md text-base font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                ))}
                {onSignInClick && (
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onSignInClick();
                    }}
                    className="w-full mt-4"
                  >
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
