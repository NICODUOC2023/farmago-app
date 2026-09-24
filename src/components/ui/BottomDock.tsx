import { StyleSheet, View } from 'react-native';

import { BottomNavBar } from '@/components/ui/BottomNavBar';
import { ScanFab } from '@/components/ui/ScanFab';

type Props = {
  active?: 'historial' | 'tratamiento';
};

export function BottomDock({ active }: Props) {
  return (
    <View style={styles.root}>
      <View pointerEvents="box-none" style={styles.fabSlot}>
        <ScanFab />
      </View>
      <BottomNavBar active={active} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  fabSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 58,
    alignItems: 'center',
    zIndex: 30,
  },
});