import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.alertproche.app',
  appName: 'AlertProche',
  webDir: 'dist/alert-proche/browser',
  plugins: {
    PushNotifications: {
      // Demande la permission automatiquement au premier lancement
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      // Canal Android pour les notifications locales et push en foreground
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#1A9E2A',
      sound: 'default',
    },
  },
  android: {
    // Crée le canal avec IMPORTANCE_HIGH pour les bannières plein écran
    // Ce channelId doit correspondre exactement à ce qu'envoie le backend FCM
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
};

export default config;
