import type { CapacitorConfig } from '@capacitor/cli'

// The phone app opens your live MYOS site (myosapp.site) inside a native shell.
// That keeps sign-in and sync exactly the same as the website, and every website update shows up in the app.
const config: CapacitorConfig = {
  appId: 'site.myosapp.app',
  appName: 'MYOS',
  webDir: 'dist',
  server: {
    url: 'https://myosapp.site',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
