import { MapPin } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  active?: boolean;
  size?: number;
};

// Pin custom para los PointAnnotation de Mapbox y para el placeholder web.
export function MapMarkerPin({ active, size = 40 }: Props) {
  const inner = Math.round(size * 0.78);
  return (
    <View style={[styles.wrap, { width: size + 10, height: size + 12 }]}>
      <View
        style={[
          styles.pin,
          { width: inner, height: inner, borderRadius: inner / 2 },
          active && { borderColor: colors.primary },
        ]}>
        <MapPin size={Math.round(size * 0.62)} color={active ? colors.primary : colors.textSecondary} strokeWidth={2.4} />
      </View>
      <View
        style={[
          styles.tip,
          active ? { backgroundColor: colors.primary } : { backgroundColor: colors.textSecondary },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2.5,
    borderColor: colors.surface,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    zIndex: 2,
  },
  tip: {
    width: 10,
    height: 10,
    marginTop: -4,
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
    zIndex: 1,
  },
});