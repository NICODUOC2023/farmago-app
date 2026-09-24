import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { DateStrip } from '@/components/records/DateStrip';
import { FilterPills } from '@/components/records/FilterPills';
import { RecordCard } from '@/components/records/RecordCard';
import { TreatmentCard } from '@/components/records/TreatmentCard';
import { BottomDock } from '@/components/ui/BottomDock';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { TopTabSwitch } from '@/components/ui/TopTabSwitch';
import { buildWeekDays, historialRecords, HistorialFilter } from '@/data/mock';
import { useTreatments } from '@/store/treatments';

type Variant = 'historial' | 'tratamiento';

type Props = {
  variant: Variant;
};

const HISTORIAL_PILLS: { label: string; value: HistorialFilter }[] = [
  { label: 'Todo', value: 'todo' },
  { label: 'Compradas', value: 'comprada' },
  { label: 'Pasadas', value: 'pasada' },
];

export function RecordsScreen({ variant }: Props) {
  const [selectedDate, setSelectedDate] = useState(buildWeekDays()[0].date);
  const [historyFilter, setHistoryFilter] = useState<HistorialFilter>('todo');
  const [treatmentFilter, setTreatmentFilter] = useState('Todos');
  const groups = useTreatments((s) => s.groups);
  const toggleTaken = useTreatments((s) => s.toggleTaken);

  const isHistorial = variant === 'historial';

  const historial = historialRecords.filter(
    (record) => record.date === selectedDate && (historyFilter === 'todo' || record.status === historyFilter),
  );

  const filteredGroups = groups.filter(
    (group) => treatmentFilter === 'Todos' || group.title === treatmentFilter,
  );

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title={isHistorial ? 'Historial de recetas' : 'Tratamientos'} />

      <View className="mt-1">
        <TopTabSwitch />
      </View>

      <DateStrip selected={selectedDate} onSelect={setSelectedDate} />

      {isHistorial ? (
        <FilterPills
          options={HISTORIAL_PILLS.map((p) => p.label)}
          selected={HISTORIAL_PILLS.find((p) => p.value === historyFilter)!.label}
          onSelect={(label) => {
            const pill = HISTORIAL_PILLS.find((p) => p.label === label);
            if (pill) setHistoryFilter(pill.value);
          }}
        />
      ) : (
        <FilterPills
          options={['Todos', ...groups.map((group) => group.title)]}
          selected={treatmentFilter}
          onSelect={setTreatmentFilter}
        />
      )}

      {isHistorial ? (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-0 pb-36 pt-2">
          {historial.length > 0 ? (
            historial.map((record) => (
              <RecordCard
                key={record.id}
                variant="historial"
                pharmacy={record.pharmacy}
                medicine={record.medicine}
                time={record.time}
              />
            ))
          ) : (
            <View className="items-center px-10 pt-16">
              <Text className="text-center font-plus-semibold text-text-primary">
                No hay recetas para este día
              </Text>
              <Text className="mt-1 text-center text-sm font-plus-medium text-text-secondary">
                Elige otro día o ajusta el filtro para ver tu historial.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView className="flex-1" contentContainerClassName="gap-3 px-0 pb-36 pt-2">
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <TreatmentCard key={group.id} group={group} onToggle={toggleTaken} />
            ))
          ) : (
            <View className="items-center px-10 pt-16">
              <Text className="text-center font-plus-semibold text-text-primary">
                Todavía no tenés tratamientos
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