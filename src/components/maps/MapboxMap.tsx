import { StyleSheet, View } from 'react-native';

import { MapBackdrop } from '@/components/maps/MapBackdrop';
import { MapMarkerPin } from '@/components/maps/MapMarkerPin';
import { Pharmacy, SANTIAGO_CENTER } from '@/data/mock';

export const DEFAULT_MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/light-v11';
export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
export const MAPBOX_STYLE_URL = process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL ?? DEFAULT_MAPBOX_STYLE_URL;

type MapboxModule = {
  setAccessToken: (token: string) => void;
  MapView: React.ComponentType<{ style: object; styleURL?: string; children?: React.ReactNode }>;
  Camera: React.ComponentType<{
    centerCoordinate?: { latitude: number; longitude: number };
    zoomLevel?: number;
  }>;
  PointAnnotation: React.ComponentType<{
    id: string;
    coordinate: { latitude: number; longitude: number };
    anchor?: { x: number; y: number };
    onSelected?: () => void;
    children?: React.ReactNode;
  }>;
};

// Carga perezosa del módulo nativo. Fuera de Expo Go / sin token devuelve null
// y se renderiza el placeholder (MapBackdrop) para no romper el mock.
function loadMapbox(): MapboxModule | null {
  if (!MAPBOX_ACCESS_TOKEN) return null;
  try {
    // @rnmapbox/maps es un módulo nativo: no corre en Expo Go ni en web.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Mapbox = require('@rnmapbox/maps') as MapboxModule;
    Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    return Mapbox;
  } catch {
    return null;
  }
}

type Props = {
  pharmacies: Pharmacy[];
  selectedId: string;
  onSelectPharmacy?: (id: string) => void;
};

let cachedMapbox: MapboxModule | null | undefined;

function getMapbox(): MapboxModule | null {
  if (cachedMapbox === undefined) {
    cachedMapbox = loadMapbox();
  }
  return cachedMapbox;
}

export function MapboxMap({ pharmacies, selectedId, onSelectPharmacy }: Props) {
  const Mapbox = getMapbox();

  if (!Mapbox) {
    return <MapBackdrop />;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <Mapbox.MapView style={StyleSheet.absoluteFill} styleURL={MAPBOX_STYLE_URL}>
        <Mapbox.Camera centerCoordinate={SANTIAGO_CENTER} zoomLevel={14.2} />
        {pharmacies.map((pharmacy) => (
          <Mapbox.PointAnnotation
            key={pharmacy.id}
            id={pharmacy.id}
            coordinate={{ latitude: pharmacy.latitude, longitude: pharmacy.longitude }}
            onSelected={() => onSelectPharmacy?.(pharmacy.id)}
            anchor={{ x: 0.5, y: 1 }}>
            <MapMarkerPin active={pharmacy.id === selectedId} />
          </Mapbox.PointAnnotation>
        ))}
      </Mapbox.MapView>
    </View>
  );
}