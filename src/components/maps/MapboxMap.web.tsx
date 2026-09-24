import { StyleSheet, View } from 'react-native';

import { MapBackdrop } from '@/components/maps/MapBackdrop';
import { MapMarkerPin } from '@/components/maps/MapMarkerPin';
import { Pharmacy } from '@/data/mock';

// En web @rnmapbox/maps no está disponible: renderiza el placeholder pastel
// con un pin recordando la "farmacia activa", para seguir validando el diseño.
type Props = {
  pharmacies: Pharmacy[];
  selectedId: string;
  onSelectPharmacy?: (id: string) => void;
};

export function MapboxMap({ pharmacies, selectedId }: Props) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <MapBackdrop />
      <View style={styles.pin} pointerEvents="none">
        <MapMarkerPin active size={34} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    top: '46%',
    left: '50%',
    transform: [{ translateX: -22 }],
  },
});