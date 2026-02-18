import { useEffect } from 'react';

/**
 * Enables body scroll for pages that need it (landing, store, etc.)
 * and restores overflow:hidden on cleanup (used by the main app).
 */
export function useBodyScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = 'auto';
    html.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.height = 'auto';
    body.style.overscrollBehavior = 'auto';

    return () => {
      html.style.overflow = 'hidden';
      html.style.height = '100%';
      body.style.overflow = 'hidden';
      body.style.height = '100%';
      body.style.overscrollBehavior = 'none';
    };
  }, []);
}
