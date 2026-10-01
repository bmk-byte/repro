import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Auth from '../../components/Auth';

/**
 * Shared header/sign-in chrome for the public, no-login scorecard routes
 * (AnalysisPage, CountryDetailPage — mounted outside the authenticated
 * DashboardApp, see App.tsx). Without this, those pages rendered with no
 * header at all: no way back to the rest of Repropulse, and no way to sign
 * in without first navigating away. This wraps them in the same Navbar
 * used everywhere else, and swaps in the same Auth component App.tsx uses
 * when "Sign In" is clicked — so it's the same sign-in flow, not a second
 * one, and a successful sign-in lands the now-authenticated visitor on the
 * normal dashboard at "/".
 */
export function PublicScorecardChrome({ children }: { children: React.ReactNode }) {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  if (showAuth) {
    return <Auth onSuccess={() => navigate('/')} onBack={() => setShowAuth(false)} />;
  }

  return (
    <>
      <Navbar isAuthenticated={false} isLandingPage={false} onSignInClick={() => setShowAuth(true)} />
      {children}
    </>
  );
}
