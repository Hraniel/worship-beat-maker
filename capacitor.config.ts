import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glorypads.app',
  appName: 'Glory Pads',
  webDir: 'dist',
  server: {
    url: 'https://worship-beat-maker.lovable.app?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
