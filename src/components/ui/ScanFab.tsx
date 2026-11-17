import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScanLine } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { usePaywall } from '@/store/paywall';

export function ScanFab() {
  const router = useRouter();
  const openPaywall = usePaywall((state) => state.openPaywall);

  const openScanner = () => router.push('/escaneo');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Escanear receta"
      onPress={() => openPaywall('scanner', { onUnlock: openScanner })}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
      hitSlop={6}>
      <LinearGradient
        colors={['#5B4FE8', '#8B7CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.fab}>
        <ScanLine size={28} color="#FFFFFF" strokeWidth={2} />
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A1F8C',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
});
