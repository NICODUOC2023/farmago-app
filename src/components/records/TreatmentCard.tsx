import { CalendarClock, Check, FileText, Pill } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { TratamientoGroup } from '@/data/mock';
import { maxDurationText } from '@/utils/tratamiento';

type Props = {
  group: TratamientoGroup;
  onToggle: (itemId: string, slot: number) => void;
};

export function TreatmentCard({ group, onToggle }: Props) {
  const totalSlots = group.items.reduce((sum, item) => sum + item.taken.length, 0);
  const takenSlots = group.items.reduce((sum, item) => sum + item.taken.filter(Boolean).length, 0);
  const duration = maxDurationText(group.items.map((item) => item.duration));

  return (
    <View className="mx-5 rounded-3xl bg-surface px-4 py-4 shadow-sm shadow-indigo-950/5">
      <View className="flex-row items-center">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-[15px] font-plus-bold text-text-primary">{group.title}</Text>
            <SourceBadge source={group.source} />
          </View>
          {(group.institucion || group.medico) && (
            <Text className="mt-0.5 text-xs font-plus-medium text-text-secondary">
              {[group.institucion, group.medico].filter(Boolean).join(' · ')}
            </Text>
          )}
        </View>
        <Text className="text-xs font-plus-semibold" style={{ color: colors.textSecondary }}>
          {takenSlots}/{totalSlots} tomadas
        </Text>
      </View>

      {duration && (
        <View className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1" style={{ backgroundColor: colors.accentSoft }}>
          <CalendarClock size={13} color={colors.accent} strokeWidth={2.4} />
          <Text className="text-[11px] font-plus-bold" style={{ color: colors.accent }}>
            Duración: {duration}
          </Text>
        </View>
      )}

      <View className="mt-3.5 gap-2.5">
        {group.items.map((item) => {
          const itemTaken = item.taken.filter(Boolean).length;
          return (
            <View key={item.id} className="rounded-2xl px-3 py-3" style={{ backgroundColor: colors.primarySoft }}>
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text className="text-[15px] font-plus-bold text-text-primary">{item.medicine}</Text>
                  <Text className="mt-0.5 text-xs font-plus-medium text-text-secondary">
                    {[item.dose, item.frequency, item.duration].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <View className="ml-2 h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: colors.accentSoft }}>
                  <Pill size={16} color={colors.accent} strokeWidth={2.2} />
                </View>
              </View>

              <View className="mt-2.5 flex-row items-center gap-2.5 border-t border-white/70 pt-2.5">
                {item.taken.map((taken, slot) => (
                  <Pressable
                    key={`${item.id}-${slot}`}
                    onPress={() => onToggle(item.id, slot)}
                    hitSlop={6}
                    className="h-7 w-7 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: colors.primary,
                      backgroundColor: taken ? colors.primary : 'transparent',
                    }}>
                    {taken && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </Pressable>
                ))}
                <Text className="text-[11px] font-plus-semibold" style={{ color: colors.textSecondary }}>
                  {itemTaken}/{item.taken.length} tomadas
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {group.notas ? (
        <View className="mt-3.5 border-t border-[#EEF0FA] pt-3">
          <View className="flex-row items-center gap-1.5">
            <FileText size={14} color={colors.primary} strokeWidth={2.4} />
            <Text className="text-xs font-plus-bold text-text-primary">Notas del médico</Text>
          </View>
          <Text className="mt-1 text-[13px] font-plus-medium leading-relaxed text-text-secondary">
            {group.notas}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SourceBadge({ source }: { source: TratamientoGroup['source'] }) {
  const isScan = source === 'escaneado';
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: isScan ? colors.primarySoft : colors.accentSoft }}>
      <Text
        className="text-[10px] font-plus-bold"
        style={{ color: isScan ? colors.primary : colors.accent }}>
        {isScan ? 'Escaneado' : 'Manual'}
      </Text>
    </View>
  );
}