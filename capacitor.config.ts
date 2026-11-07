import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hoodgames.app',
  appName: 'Hood Gaming',
  webDir: 'public',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    url: process.env.CAPACITOR_SERVER_URL || 'https://hoodgames.com',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#09142a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'FIT_CENTER',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#09142a',
    },
  },
};

export default config;
