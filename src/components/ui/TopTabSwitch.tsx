import { usePathname, useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { RECORDS_ROUTE_HISTORIAL, RECORDS_ROUTE_TRATAMIENTO } from '@/data/mock';

type TabId = 'historial' | 'tratamiento';

const TAB_BUTTONS: { id: TabId; label: string; route: string }[] = [
  { id: 'historial', label: 'Historial de recetas', route: RECORDS_ROUTE_HISTORIAL },
  { id: 'tratamiento', label: 'Tratamientos', route: RECORDS_ROUTE_TRATAMIENTO },
];

export function TopTabSwitch() {
  const pathname = usePathname();
  const router = useRouter();
  const active: TabId = pathname.startsWith(RECORDS_ROUTE_TRATAMIENTO) ? 'tratamiento' : 'historial';

  return (
    <View className="mx-5 mt-1 flex-row rounded-full bg-nav-bg p-1">
      {TAB_BUTTONS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => router.replace(tab.route as Href)}
            className={`flex-1 items-center rounded-full px-3 py-2.5 ${isActive ? 'bg-primary' : ''}`}>
            <Text
              className="text-[13px] font-plus-bold"
              style={{ color: isActive ? colors.surface : colors.textSecondary }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}