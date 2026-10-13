import type { ExpoConfig } from 'expo/config';

/**
 * Config dinámica de Expo.
 *
 * Se usa `app.config.ts` (en lugar de `app.json`) porque los plugins que
 * dependen de variables de entorno deben resolverse en tiempo de build. En
 * `app.json` estático los valores se pasarían literales (p. ej. la key quedaría
 * como la cadena "process.env.GOOGLE_MAPS_API_KEY" y no se interpolaría).
 *
 * La API key de Google Maps se lee de `process.env.GOOGLE_MAPS_API_KEY`, que
 * EAS inyecta según el `environment` del perfil de build (ver `eas.json`). Nunca
 * se escribe el valor de la key en este archivo ni en ningún archivo versionado.
 *
 * iOS usa Apple Maps por defecto, por eso NO se define `iosGoogleMapsApiKey`.
 */
const appConfig: ExpoConfig = {
  name: 'Farmago',
  slug: 'farmago',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'farmago',
  userInterfaceStyle: 'light',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: 'com.farmago.app',
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Farmago usa tu ubicación para mostrar las farmacias cercanas con stock.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#EDEBFB',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    package: 'com.farmago.app',
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-image-picker',
      {
        photosPermission: 'Farmago accede a tus fotos para permitirte escanear recetas.',
        cameraPermission: 'Farmago usa la cámara para escanear recetas médicas.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Farmago usa tu ubicación para mostrar las farmacias cercanas con stock.',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#EDEBFB',
        image: './assets/images/splash-icon.png',
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    ],
    '@rnmapbox/maps',
  ],
  extra: {
    eas: {
      projectId: '7dcd31bb-2f05-4a25-baa7-e9e03dcea6e8',
    },
  },
  owner: 'nicodev32',
};

export default appConfig;
