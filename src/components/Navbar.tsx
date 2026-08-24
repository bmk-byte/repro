import React from 'react';
import { Scale, Menu, X, Bell, ChevronDown, LayoutDashboard, Upload, Shield, ShieldCheck, Send, Gavel, BookOpen, ScrollText, Settings, LogOut, User, AlertOctagon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

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

  // Set up real-time subscription for notifications if user is a moderator
  React.useEffect(() => {
    if (!isAuthenticated || !isModerator) return;
    
    // Subscribe to INSERT events on the pending_submissions table
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
          // Increment notification count
          setNotificationCount(prev => prev + 1);
          
          // Play a notification sound
          const audio = new Audio('/notification-sound.mp3');
          audio.play().catch(err => {
            console.log('Error playing notification sound:', err);
            // Silently fail if audio can't play (common in browsers that require user interaction)
          });
        }
      )
      .subscribe();

    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isAuthenticated, isModerator]);
  
  const clearNotifications = () => {
    setNotificationCount(0);
    toast.success('Notifications cleared');
  };

  // Landing page navigation links - used in both desktop and mobile menus
  const landingPageLinks = [
    { name: 'Home', href: '#hero-section' },
    { name: 'Features', href: '#features-section' },
    { name: 'Focus Areas', href: '#thematic-focus-section' },
    { name: 'Benefits', href: '#benefits-section' },
    { name: 'Testimonials', href: '#testimonial-section' },
  ];

  // Navigation items for authenticated users
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
    <header className={`bg-white shadow-sm ${className}`} role="banner">
      {/* Main Navbar */}
      <nav className="relative" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* ReproPulse Logo/Text - always visible on the left */}
          <div className="flex items-center space-x-2">
            <Scale className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-primary" aria-label="ReproPulse - Home">ReproPulse</span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Landing page navigation - desktop */}
            {isLandingPage && !isAuthenticated && (
              <div className="hidden md:flex items-center space-x-6" role="navigation" aria-label="Page sections">
                {landingPageLinks.map((link) => (
                  <a 
                    key={link.name}
                    href={link.href}
                    className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
                    aria-label={`Navigate to ${link.name} section`}
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            )}

            {/* Notification bell for moderators */}
            {isAuthenticated && isModerator && notificationCount > 0 && (
              <div className="relative">
                <button 
                  onClick={clearNotifications}
                  className="p-2 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                  aria-label="Notifications"
                >
                  <Bell className="h-6 w-6" />
                  {notificationCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-primary rounded-full">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* User menu for authenticated users */}
            {isAuthenticated && userProfile && (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden md:block text-sm font-medium">
                    {userProfile.full_name || 'User'}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{userProfile.full_name}</div>
                      <div className="text-gray-500">{userProfile.email}</div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            {(isAuthenticated || isLandingPage) && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            )}

            {/* Sign In button for landing page */}
            {!isAuthenticated && isLandingPage && onSignInClick && (
              <button
                onClick={onSignInClick}
                className="hidden md:block px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
      </nav>

      {/* Desktop Navigation Bar for authenticated users */}
      {isAuthenticated && (
        <nav className="hidden md:block bg-gray-50 border-t border-gray-200" role="navigation" aria-label="Dashboard navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-1 py-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab?.(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={`Navigate to ${item.label}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 ml-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
              
              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors ml-4"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-x-0 top-16 bg-white shadow-lg z-40"
        >
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
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.label}
                      {item.badge && (
                        <span className="px-2 py-0.5 ml-2 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          {item.badge}
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
                  className="flex items-center w-full px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 mt-4 border-t pt-4"
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
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                ))}
                {onSignInClick && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onSignInClick();
                    }}
                    className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-white bg-primary hover:bg-primary-dark mt-4"
                  >
                    Sign In
                  </button>
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