import { useRouter, type Href } from 'expo-router';
import { CalendarDays, FileText } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { RECORDS_ROUTE_HISTORIAL, RECORDS_ROUTE_TRATAMIENTO } from '@/data/mock';

type ActiveTab = 'historial' | 'tratamiento' | undefined;

type Props = {
  active?: ActiveTab;
};

type ItemProps = {
  icon: typeof CalendarDays;
  label: string;
  route: string;
  activeTab: 'historial' | 'tratamiento';
  active?: ActiveTab;
};

function NavItem({ icon: Icon, label, route, activeTab, active }: ItemProps) {
  const router = useRouter();
  const isActive = active === activeTab;
  const color = isActive ? colors.primary : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (!isActive) router.navigate(route as Href);
      }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, minHeight: 56 }}>
      <View
        className="h-10 w-10 items-center justify-center rounded-2xl"
        style={{ backgroundColor: isActive ? colors.primarySoft : 'transparent' }}>
        <Icon size={22} color={color} strokeWidth={2.2} />
      </View>
      <Text className="mt-1 text-[11px] font-plus-medium" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomNavBar({ active }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingBottom: Math.max(insets.bottom, 8),
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}>
      <View className="flex-row items-center justify-between px-4">
        <NavItem
          icon={CalendarDays}
          label="Tratamientos"
          route={RECORDS_ROUTE_TRATAMIENTO}
          activeTab="tratamiento"
          active={active}
        />
        <View style={{ width: 64 }} />
        <NavItem
          icon={FileText}
          label="Historial"
          route={RECORDS_ROUTE_HISTORIAL}
          activeTab="historial"
          active={active}
        />
      </View>
    </View>
  );
}
