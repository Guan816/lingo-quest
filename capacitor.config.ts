import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lingoquest.app',
  appName: 'LingoQuest',
  webDir: 'dist',
  bundledWebRuntime: false,
  loggingBehavior: 'none',
  android: {
    allowMixedContent: true,
    // 录音权限由 Web Speech API 触发，Capacitor 侧需要显式声明
    buildOptions: {
      keystorePath: undefined,
    },
  },
  ios: {
    contentInset: 'always',
  },
  plugins: {
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
