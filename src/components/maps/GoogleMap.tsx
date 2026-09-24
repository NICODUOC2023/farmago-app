import { Platform, StyleSheet, View } from 'react-native';

import { MapBackdrop } from '@/components/maps/MapBackdrop';
import { MapMarkerPin } from '@/components/maps/MapMarkerPin';
import { PASTEL_MAP_STYLE } from '@/constants/mapStyle';
import { Pharmacy, SANTIAGO_CENTER } from '@/data/mock';

type MapsModule = {
  MapView: React.ComponentType<Record<string, unknown>>;
  Marker: React.ComponentType<Record<string, unknown>>;
  PROVIDER_GOOGLE: string;
};

// react-native-maps corre en Expo Go y en builds nativas. Se carga de forma
// perezosa para no romper el export web / mock si llegara a faltar.
function loadMaps(): MapsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-maps') as MapsModule;
  } catch {
    return null;
  }
}

type Props = {
  pharmacies: Pharmacy[];
  selectedId: string;
  onSelectPharmacy?: (id: string) => void;
};

let cachedMaps: MapsModule | null | undefined;

function getMaps(): MapsModule | null {
  if (cachedMaps === undefined) {
    cachedMaps = loadMaps();
  }
  return cachedMaps;
}

export function GoogleMap({ pharmacies, selectedId, onSelectPharmacy }: Props) {
  const Maps = getMaps();

  if (!Maps) {
    return <MapBackdrop />;
  }

  // Android usa Google Maps (requiere ANDROID_MAPS_API_KEY); iOS usa Apple Maps.
  const provider = Platform.OS === 'android' ? Maps.PROVIDER_GOOGLE : undefined;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Maps.MapView
        style={StyleSheet.absoluteFill}
        provider={provider}
        customMapStyle={PASTEL_MAP_STYLE}
        initialRegion={{
          latitude: SANTIAGO_CENTER.latitude,
          longitude: SANTIAGO_CENTER.longitude,
          latitudeDelta: 0.055,
          longitudeDelta: 0.055,
        }}>
        {pharmacies.map((pharmacy) => (
          <Maps.Marker
            key={pharmacy.id}
            coordinate={{ latitude: pharmacy.latitude, longitude: pharmacy.longitude }}
            onPress={() => onSelectPharmacy?.(pharmacy.id)}>
            <MapMarkerPin active={pharmacy.id === selectedId} />
          </Maps.Marker>
        ))}
      </Maps.MapView>
    </View>
  );
}