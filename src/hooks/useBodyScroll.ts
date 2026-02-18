import { useEffect } from 'react';

/**
 * Enables body scroll for pages that need it (landing, store, etc.)
 * Adds a CSS class to <html> that overrides the fixed/hidden body styles.
 * Restores the app layout on cleanup.
 */
export function useBodyScroll() {
  useEffect(() => {
    document.documentElement.classList.add('scrollable-page');
    return () => {
      document.documentElement.classList.remove('scrollable-page');
    };
  }, []);
}
