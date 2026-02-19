import { useEffect, useState } from 'react';
import { isPushSupported, getPushPermission, isSubscribed } from '@/lib/push-notifications';

const PROMPT_SHOWN_KEY = 'glory-pads-notif-prompt-shown';

/**
 * Returns true once per user session if:
 *  - Push is supported
 *  - Permission hasn't been granted yet
 *  - The prompt hasn't been shown in this browser before
 */
export function useNotificationPrompt(userReady: boolean) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!userReady) return;

    async function check() {
      const alreadyShown = localStorage.getItem(PROMPT_SHOWN_KEY);
      if (alreadyShown) return;

      const supported = await isPushSupported();
      if (!supported) return;

      const perm = await getPushPermission();
      if (perm === 'granted') {
        // Already subscribed — check if subscription exists
        const sub = await isSubscribed();
        if (sub) return; // All good, don't prompt
      }

      setShouldShow(true);
    }

    // Small delay so it doesn't flash immediately on login
    const t = setTimeout(check, 2500);
    return () => clearTimeout(t);
  }, [userReady]);

  const dismiss = () => {
    localStorage.setItem(PROMPT_SHOWN_KEY, '1');
    setShouldShow(false);
  };

  return { shouldShow, dismiss };
}
