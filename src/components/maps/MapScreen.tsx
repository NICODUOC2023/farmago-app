import { Clock, MapPin, Menu, Pill } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppMap } from '@/components/maps/AppMap';
import { BottomDock } from '@/components/ui/BottomDock';
import { colors } from '@/constants/colors';
import { activePharmacyId, pharmacies } from '@/data/mock';

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState(activePharmacyId);
  const pharmacy = pharmacies.find((p) => p.id === selectedId) ?? pharmacies[0];

  return (
    <View className="flex-1 bg-background">
      <AppMap pharmacies={pharmacies} selectedId={selectedId} onSelectPharmacy={setSelectedId} />

      {/* Header flotante: menú + barra de búsqueda */}
      <View
        style={{ position: 'absolute', top: insets.top + 10, left: 16, right: 16 }}
        className="z-10 flex-row gap-3">
        <Pressable className="h-12 w-12 items-center justify-center rounded-full bg-surface shadow-md shadow-indigo-900/10">
          <Menu size={22} color={colors.textPrimary} strokeWidth={2.2} />
        </Pressable>
        <Pressable className="flex-1 flex-row items-center rounded-full bg-surface py-1 pl-4 pr-1 shadow-md shadow-indigo-900/10">
          <Text numberOfLines={1} className="flex-1 pr-2 font-plus-medium text-[14px] text-text-secondary">
            ¿Qué medicamento estás buscando?
          </Text>
          <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-primary">
            <MapPin size={15} color="#FFFFFF" strokeWidth={2.4} />
          </Pressable>
        </Pressable>
      </View>

      {/* Tarjeta de la farmacia activa */}
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 132 }} className="z-10">
        <View className="flex-row items-center rounded-3xl bg-surface px-4 py-4 shadow-lg shadow-indigo-950/10">
          <View className="h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
            <Pill size={22} color={colors.primary} strokeWidth={2.2} />
          </View>
          <View className="ml-3.5 flex-1">
            <Text className="text-[17px] font-plus-bold text-text-primary">{pharmacy.name}</Text>
            <Text className="mt-0.5 text-xs font-plus-medium text-text-secondary">
              Stock disponible · {pharmacy.medicine}
            </Text>
          </View>
          <View className="ml-2 h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.accentSoft }}>
            <Clock size={18} color={colors.accent} strokeWidth={2.4} />
          </View>
        </View>
      </View>

      <BottomDock />
    </View>
  );
}