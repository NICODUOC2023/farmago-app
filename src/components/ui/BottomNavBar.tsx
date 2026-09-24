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
  side: 'left' | 'right';
};

function NavItem({ icon: Icon, label, route, activeTab, active, side }: ItemProps) {
  const router = useRouter();
  const isActive = active === activeTab;
  const color = isActive ? colors.primary : colors.textSecondary;

  return (
    <Pressable
      onPress={() => router.replace(route as Href)}
      className={`items-center justify-center gap-1 bg-nav-bg px-9 pt-3 ${
        side === 'left' ? 'rounded-tr-[30px]' : 'rounded-tl-[30px]'
      }`}>
      <View
        className="h-10 w-14 items-center justify-center rounded-2xl"
        style={{ backgroundColor: isActive ? colors.primarySoft : 'transparent' }}>
        <Icon size={22} color={color} strokeWidth={2.2} />
      </View>
      <Text className="pb-1 text-[11px] font-plus-medium" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomNavBar({ active }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-end justify-between"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <NavItem
        side="left"
        icon={CalendarDays}
        label="Tratamientos"
        route={RECORDS_ROUTE_TRATAMIENTO}
        activeTab="tratamiento"
        active={active}
      />
      <NavItem
        side="right"
        icon={FileText}
        label="Historial"
        route={RECORDS_ROUTE_HISTORIAL}
        activeTab="historial"
        active={active}
      />
    </View>
  );
}