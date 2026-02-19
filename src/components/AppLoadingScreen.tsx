import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import logoDark from '@/assets/logo-dark.png';
import logoLight from '@/assets/logo-light.png';

interface AppLoadingScreenProps {
  onDone: () => void;
}

const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ onDone }) => {
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState('Limpando cache...');
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        if ('caches' in window) {
          const names = await caches.keys();
          await Promise.all(names.map(n => caches.delete(n)));
        }
      } catch {/* ignore */}

      if (cancelled) return;
      setProgress(40);
      setLabel('Preparando app...');

      await new Promise(r => setTimeout(r, 400));
      if (cancelled) return;
      setProgress(75);
      setLabel('Quase lá...');

      await new Promise(r => setTimeout(r, 350));
      if (cancelled) return;
      setProgress(100);
      setLabel('Pronto!');

      await new Promise(r => setTimeout(r, 350));
      if (!cancelled) setExiting(true);
    };

    const t = setTimeout(run, 80);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  const prefersDark =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true;
  const logo = prefersDark ? logoDark : logoLight;

  return (
    <AnimatePresence onExitComplete={onDone}>
      {!exiting && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex flex-col items-center gap-8 w-full max-w-xs px-8">
            {/* Logo */}
            <motion.img
              src={logo}
              alt="Glory Pads"
              className="h-14 w-auto object-contain"
              initial={{ opacity: 0, y: -12, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
            />

            {/* Progress area */}
            <motion.div
              className="w-full space-y-2.5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 }}
            >
              {/* Track */}
              <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>

              {/* Label */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={label}
                  className="text-xs text-muted-foreground text-center tracking-wide"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                  {label}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppLoadingScreen;
