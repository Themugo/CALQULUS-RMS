import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor config for RentFlow PWA / native app wrapper.
 * The biometricService uses Capacitor.isNativePlatform() to gracefully
 * fall back on web — no native build is required for the web app.
 *
 * Server URL is read from the CAPACITOR_SERVER_URL environment variable
 * at build time, falling back to the production domain.
 *
 * If building a native Android/iOS app in future:
 *   1. Update appId to your Play Store / App Store bundle ID
 *   2. Set CAPACITOR_SERVER_URL to your production domain
 *   3. Run: npx cap add android && npx cap add ios
 */
const config: CapacitorConfig = {
  appId: 'ink.rentflow.app',
  appName: 'RentFlow',
  webDir: 'dist',
  server: {
    url: process.env.CAPACITOR_SERVER_URL || 'https://rentflow.ink',
    cleartext: false,
  },
};

export default config;
