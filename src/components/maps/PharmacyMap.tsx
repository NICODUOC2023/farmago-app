import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { MapMarkerPin } from '@/components/maps/MapMarkerPin';
import { PASTEL_MAP_STYLE } from '@/constants/mapStyle';
import type { Coordinates } from '@/services/location';
import type { NearbyPharmacy } from '@/services/pharmacies';

type Props = {
  /** Ubicación actual del usuario (solo en memoria, nunca persistida). */
  userLocation: Coordinates;
  pharmacies: NearbyPharmacy[];
  selectedId?: string | null;
  onSelectPharmacy?: (id: string) => void;
};

const INITIAL_DELTA = { latitudeDelta: 0.055, longitudeDelta: 0.055 };
const FIT_EDGE_PADDING = { top: 160, right: 60, bottom: 320, left: 60 };

function regionFor(coordinates: Coordinates): Region {
  return { ...coordinates, ...INITIAL_DELTA };
}

export function PharmacyMap({ userLocation, pharmacies, selectedId, onSelectPharmacy }: Props) {
  const mapRef = useRef<MapView>(null);
  const pharmacyIds = pharmacies.map((pharmacy) => pharmacy.id).join(',');

  useEffect(() => {
    if (__DEV__) {
      console.log('[PharmacyMap] impl=react-native-maps platform=' + Platform.OS);
    }
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (pharmacies.length === 0) {
      map.animateToRegion(regionFor(userLocation), 350);
      return;
    }

    map.fitToCoordinates(
      [
        userLocation,
        ...pharmacies.map((pharmacy) => ({
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
        })),
      ],
      { edgePadding: FIT_EDGE_PADDING, animated: true },
    );
    // Se re-encuadra cuando cambia la ubicación o el conjunto de resultados.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLocation.latitude, userLocation.longitude, pharmacyIds]);

  // Android usa Google Maps (requiere GOOGLE_MAPS_API_KEY); iOS usa Apple Maps.
  const provider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={provider}
        customMapStyle={PASTEL_MAP_STYLE}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        initialRegion={regionFor(userLocation)}>
        {pharmacies.map((pharmacy) => (
          <Marker
            key={pharmacy.id}
            coordinate={{ latitude: pharmacy.latitude, longitude: pharmacy.longitude }}
            title={pharmacy.name}
            description={pharmacy.address ?? undefined}
            onPress={() => onSelectPharmacy?.(pharmacy.id)}>
            <MapMarkerPin active={pharmacy.id === selectedId} />
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    minHeight: 240,
  },
});
