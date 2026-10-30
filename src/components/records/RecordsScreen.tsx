import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { DateStrip } from '@/components/records/DateStrip';
import { RecordCard } from '@/components/records/RecordCard';
import { TreatmentCard } from '@/components/records/TreatmentCard';
import { BottomDock } from '@/components/ui/BottomDock';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { buildWeekDays } from '@/data/mock';
import { loadRecentSearches, type RecentSearch } from '@/services/recentSearches';
import { useTreatments } from '@/store/treatments';

type Variant = 'historial' | 'tratamiento';

type Props = {
  variant: Variant;
};

export function RecordsScreen({ variant }: Props) {
  const [selectedDate, setSelectedDate] = useState(buildWeekDays()[0].date);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const groups = useTreatments((s) => s.groups);
  useEffect(() => {
    void loadRecentSearches().then(setRecentSearches).catch(() => setRecentSearches([]));
  }, []);
  const loadFromSupabase = useTreatments((s) => s.loadFromSupabase);
  useEffect(() => { void loadFromSupabase(); }, [loadFromSupabase]);
  const toggleTaken = useTreatments((s) => s.toggleTaken);
  const removeGroup = useTreatments((s) => s.removeGroup);

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

  const historialItems = [
    ...recentSearches.map((rs) => ({
      id: `rs-${rs.id}`,
      type: 'search' as const,
      title: rs.medication_name ?? rs.query,
      date: rs.created_at.slice(0, 10),
      time: rs.created_at.slice(11, 16),
    })),
    ...groups
      .filter((g) => g.source === 'escaneado')
      .map((g) => ({
        id: `tr-${g.id}`,
        type: 'scan' as const,
        title: g.title,
        date: new Date().toISOString().slice(0, 10),
        time: '',
      })),
  ];

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={isHistorial ? 'Historial de recetas' : 'Tratamientos'} />

      {!isHistorial ? <DateStrip selected={selectedDate} onSelect={setSelectedDate} /> : null}

      {null}

      {isHistorial ? (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-0 pb-36 pt-2">
          {historialItems.length > 0 ? (
            historialItems.map((item) => (
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
                No hay actividad para este día
              </Text>
              <Text className="mt-1 text-center text-sm font-plus-medium text-text-secondary">
                Elige otro día o ajusta el filtro para ver tu historial.
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
                Escaneá una receta desde el botón azul para empezar a seguir tu tratamiento.
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <BottomDock active={isHistorial ? 'historial' : 'tratamiento'} />
    </View>
  );
}