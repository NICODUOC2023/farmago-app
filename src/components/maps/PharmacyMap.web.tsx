import { Map as MapIcon } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MapBackdrop } from '@/components/maps/MapBackdrop';
import { colors } from '@/constants/colors';

type Props = {
  userLocation?: { latitude: number; longitude: number };
  pharmacies?: unknown[];
  selectedId?: string | null;
  onSelectPharmacy?: (id: string) => void;
};

// react-native-maps no corre en web. Mostramos el placeholder pastel con un
// aviso claro: el mapa real solo está disponible en la app nativa (iOS/Android).
export function PharmacyMap(_: Props) {
  useEffect(() => {
    if (__DEV__) {
      console.log('[PharmacyMap] impl=web-fallback platform=web');
    }
  }, []);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapBackdrop />
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.card}>
          <MapIcon size={22} color={colors.primary} strokeWidth={2.4} />
          <Text style={styles.title}>Mapa disponible en la app</Text>
          <Text style={styles.body}>
            El mapa real se muestra en iOS y Android (Expo Go o build). En web usamos una vista de
            referencia.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: {
    marginTop: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  body: {
    marginTop: 4,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
});
