import React, { useEffect, useState } from 'react';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';

interface AppLoadingScreenProps {
  onDone: () => void;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('Limpando cache...');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      // Step 1: clear SW caches
      try {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(n => caches.delete(n)));
        }
      } catch {/* ignore */}

      if (cancelled) return;
      setProgress(40);
      setLabel('Preparando app...');

      // Small delay so the user sees the transition
      await new Promise(r => setTimeout(r, 400));
      if (cancelled) return;
      setProgress(75);
      setLabel('Quase lá...');

      await new Promise(r => setTimeout(r, 350));
      if (cancelled) return;
      setProgress(100);
      setLabel('Pronto!');

      await new Promise(r => setTimeout(r, 300));
      if (!cancelled) onDone();
    };

    // Kick off with a tiny delay so the screen renders first
    const t = setTimeout(run, 80);
    return () => { cancelled = true; clearTimeout(t); };
  }, [onDone]);

  // Detect color scheme for logo
  const prefersDark =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true;
  const logo = prefersDark ? logoDark : logoLight;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xs px-8">
        <img
          src={logo}
          alt="Glory Pads"
          className="h-14 w-auto object-contain opacity-90"
        />

        {/* Progress bar */}
        <div className="w-full space-y-2">
          <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center tracking-wide">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AppLoadingScreen;
