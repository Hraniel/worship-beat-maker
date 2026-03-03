import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glorypads.app',
  appName: 'Glory Pads',
  webDir: 'dist',
  server: {
    url: 'https://glorypads.com/app?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
