import React, { useEffect, useRef } from 'react';

// A faint, mostly-hidden watermark of the org's own "Reproductive Justice"
// artwork, layered over the page's teal background. It sits at near-zero
// opacity everywhere except a soft spotlight that follows the cursor —
// present throughout, but only glimpsed where you look ("I see you but I
// can't see you"). Cursor position is written straight to a CSS custom
// property via a ref (not React state), so this never triggers a re-render
// on mousemove — just a cheap style write, throttled to one per frame.
const GhostBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = 0;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--spotlight-x', `${x}px`);
        el.style.setProperty('--spotlight-y', `${y}px`);
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Base: nearly imperceptible, always present — a hint that something is there */}
      <img
        src="/backgrounds/reproductive-justice-hero.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top opacity-[0.06] grayscale contrast-125"
      />
      {/* Spotlight: brightens and reveals color only in a soft radius around the cursor */}
      <img
        src="/backgrounds/reproductive-justice-hero.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top opacity-40"
        style={{
          WebkitMaskImage:
            'radial-gradient(circle 300px at var(--spotlight-x, 50%) var(--spotlight-y, 50%), black 0%, transparent 75%)',
          maskImage:
            'radial-gradient(circle 300px at var(--spotlight-x, 50%) var(--spotlight-y, 50%), black 0%, transparent 75%)',
        }}
      />
    </div>
  );
};

export default GhostBackground;
