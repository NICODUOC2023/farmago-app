import { MapPin } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

// Placeholder map de diseño para cuando @rnmapbox/maps no está disponible
// (Expo Go, web o falta de EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN). Dibuja una
// ciudad pastel armada con vistas para validar el layout de la pantalla.
export function MapBackdrop() {
  return (
    <View style={StyleSheet.absoluteFill} className="overflow-hidden bg-background">
      {/* Quads / manzanas */}
      <View style={[styles.block, { left: -30, top: '12%', width: 190, height: 120, backgroundColor: colors.pastelRows }]} />
      <View style={[styles.block, { right: -40, top: '6%', width: 210, height: 150, backgroundColor: colors.pastelBlocks }]} />
      <View style={[styles.block, { left: -20, top: '42%', width: 250, height: 150, backgroundColor: colors.pastelRows, opacity: 0.9 }]} />
      <View style={[styles.block, { right: -60, top: '46%', width: 240, height: 130, backgroundColor: colors.pastelBlocks, opacity: 0.9 }]} />
      <View style={[styles.block, { left: '30%', top: '4%', width: 180, height: 130, backgroundColor: colors.pastelParks }]} />
      <View style={[styles.block, { right: '16%', top: '34%', width: 170, height: 200, backgroundColor: colors.pastelParks, opacity: 0.95 }]} />
      <View style={[styles.block, { left: '5%', top: '66%', width: 200, height: 160, backgroundColor: colors.pastelBlocks }]} />
      <View style={[styles.block, { right: '-10%', top: '70%', width: 220, height: 140, backgroundColor: colors.pastelRows }]} />

      {/* Calles horizontales */}
      <View style={[styles.roadH, { top: '28%', backgroundColor: colors.pastelRoadMajor }]} />
      <View style={[styles.roadH, { top: '62%', backgroundColor: colors.pastelRoad }]} />
      <View style={[styles.roadH, { top: '88%', backgroundColor: colors.pastelRoad }]} />

      {/* Calles verticales */}
      <View style={[styles.roadV, { left: '22%', backgroundColor: colors.pastelRoad }]} />
      <View style={[styles.roadV, { left: '68%', backgroundColor: colors.pastelRoadMajor }]} />

      {/* Pin centrado en la "farmacia activa" */}
      <View style={styles.pinWrap}>
        <View style={styles.pinRing} />
        <View style={styles.pin}>
          <MapPin size={26} color={colors.primary} strokeWidth={2.4} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    borderRadius: 24,
  },
  roadH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 14,
    transform: [{ rotate: '-2deg' }],
  },
  roadV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 14,
    transform: [{ rotate: '3deg' }],
  },
  pinWrap: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pinRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    opacity: 0.15,
  },
  pin: {
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.surface,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});