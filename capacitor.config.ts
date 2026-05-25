import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.scrollreader.app',
  appName: 'Scroll Reader',
  webDir: 'dist',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
}

export default config
