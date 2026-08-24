import React, { useEffect, useRef } from 'react';

interface TawkChatProps {
  isAuthenticated: boolean;
}

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
  }
}

const TawkChat: React.FC<TawkChatProps> = ({ isAuthenticated }) => {
  const showWidgetRef = useRef(false);

  // Inject the Tawk.to script exactly once when the user authenticates.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (document.querySelector('script[src*="tawk.to"]')) return;

    const s1 = document.createElement('script');
    s1.async = true;
    s1.src = 'https://embed.tawk.to/68346f9d720b741908b9b2a1/1is6d80ed';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    document.head.appendChild(s1);

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    window.Tawk_API.onLoad = function () {
      window.Tawk_API?.hideWidget();
    };

    return () => {
      const tawkScript = document.querySelector('script[src*="tawk.to"]');
      if (tawkScript) tawkScript.remove();
    };
  }, [isAuthenticated]);

  // Handle scroll-based visibility without re-injecting the script.
  useEffect(() => {
    if (!isAuthenticated) return;

    let scrollTimeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const shouldShow = window.scrollY > 100;
        if (shouldShow !== showWidgetRef.current) {
          showWidgetRef.current = shouldShow;
          if (shouldShow) {
            window.Tawk_API?.showWidget();
          } else {
            window.Tawk_API?.hideWidget();
          }
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [isAuthenticated]);

  return null;
};

export default TawkChat;
