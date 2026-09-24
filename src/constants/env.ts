export type MapProvider = 'google' | 'mapbox';

export const MAP_PROVIDER: MapProvider =
  (process.env.EXPO_PUBLIC_MAP_PROVIDER as MapProvider) ?? 'google';