import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Sparkles } from 'lucide-react-native';

import { DateStrip } from '@/components/records/DateStrip';
import { RecordCard } from '@/components/records/RecordCard';
import { TreatmentCard } from '@/components/records/TreatmentCard';
import { BottomDock } from '@/components/ui/BottomDock';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { buildWeekDays } from '@/data/mock';
import { loadRecentSearches, type RecentSearch } from '@/services/recentSearches';
import { usePaywall } from '@/store/paywall';
import { useTreatments } from '@/store/treatments';

type Variant = 'historial' | 'tratamiento';

type Props = {
  variant: Variant;
};

export function RecordsScreen({ variant }: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(() => buildWeekDays()[0].date);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const groups = useTreatments((s) => s.groups);
  useEffect(() => {
    void loadRecentSearches().then(setRecentSearches).catch(() => setRecentSearches([]));
  }, []);
  const loadFromSupabase = useTreatments((s) => s.loadFromSupabase);
  useEffect(() => { void loadFromSupabase(); }, [loadFromSupabase]);
  const toggleTaken = useTreatments((s) => s.toggleTaken);
  const removeGroup = useTreatments((s) => s.removeGroup);
  const openPaywall = usePaywall((s) => s.openPaywall);

  const handleDeleteGroup = (groupId: string) => {
    Alert.alert(
      'Eliminar tratamiento',
      '¿Seguro que quieres eliminar este tratamiento y sus tomas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => removeGroup(groupId) },
      ],
    );
  };

  const isHistorial = variant === 'historial';

  const addTreatment = () =>
    openPaywall('treatment', { onUnlock: () => router.push('/escaneo') });

  const historialItems = [
    ...recentSearches.map((rs) => ({
      id: `rs-${rs.id}`,
      type: 'search' as const,
      title: rs.medication_name ?? rs.query,
      date: localDateKey(new Date(rs.created_at)),
      time: localTime(rs.created_at),
    })),
    ...groups
      .filter((g) => g.source === 'escaneado')
      .map((g) => ({
        id: `tr-${g.id}`,
        type: 'scan' as const,
        title: g.title,
        date: localDateKey(new Date()),
        time: '',
      })),
  ];
  const visibleHistoryItems = historialItems.filter((item) => item.date === selectedDate);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={isHistorial ? 'Historial de recetas' : 'Tratamientos'} />

      {isHistorial ? <DateStrip selected={selectedDate} onSelect={setSelectedDate} /> : null}

      {!isHistorial ? (
        <View className="mx-5 mt-3">
          <Pressable
            accessibilityRole="button"
            onPress={addTreatment}
            className="flex-row items-center rounded-3xl bg-primary px-4 py-3.5">
            <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)' }}>
              <Plus size={21} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="font-plus-bold text-[14px] text-white">Agregar tratamiento</Text>
              <Text className="mt-0.5 text-[11px] font-plus-medium" style={{ color: 'rgba(255, 255, 255, 0.82)' }}>
                Escanea una receta para organizar tus tomas
              </Text>
            </View>
            <View className="flex-row items-center gap-1 rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)' }}>
              <Sparkles size={11} color="#FFF2B2" strokeWidth={2.5} />
              <Text className="text-[9px] font-plus-extrabold" style={{ color: '#FFF2B2' }}>PRO</Text>
            </View>
          </Pressable>
        </View>
      ) : null}

      {isHistorial ? (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-0 pb-36 pt-2">
          {visibleHistoryItems.length > 0 ? (
            visibleHistoryItems.map((item) => (
              <RecordCard
                key={item.id}
                variant="historial"
                pharmacy={item.type === 'search' ? 'Búsqueda' : 'Escaneo OCR'}
                medicine={item.title}
                time={item.time || '--:--'}
              />
            ))
          ) : (
            <View className="items-center px-10 pt-16">
              <Text className="text-center font-plus-semibold text-text-primary">
                No hay actividad para esta fecha
              </Text>
              <Text className="mt-1 text-center text-sm font-plus-medium text-text-secondary">
                Prueba seleccionando otro día en el calendario.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-0 pb-36 pt-2">
          {groups.length > 0 ? (
            groups.map((group) => (
              <TreatmentCard key={group.id} group={group} onToggle={toggleTaken} onDelete={handleDeleteGroup} />
            ))
          ) : (
            <View className="items-center px-10 pt-16">
              <Text className="text-center font-plus-semibold text-text-primary">
                Todavía no tienes tratamientos
              </Text>
              <Text className="mt-1 text-center text-sm font-plus-medium text-text-secondary">
                Agrega tu primera receta para empezar a organizar tus tomas.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <BottomDock active={isHistorial ? 'historial' : 'tratamiento'} />
    </View>
  );
}

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}
