import { BookOpen, Check, Clock, Pill } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

export type RecordCardProps = {
  variant: 'historial' | 'tratamiento';
  pharmacy: string;
  medicine: string;
  time?: string;
  taken?: boolean;
  onToggle?: () => void;
};

export function RecordCard({ variant, pharmacy, medicine, time, taken = false, onToggle }: RecordCardProps) {
  return (
    <View className="mx-5 flex-row items-center rounded-3xl bg-surface px-4 py-3.5 shadow-sm shadow-indigo-950/5">
      {variant === 'tratamiento' && (
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          className="mr-3.5 h-8 w-8 items-center justify-center rounded-full border-2"
          style={{
            borderColor: colors.primary,
            backgroundColor: taken ? colors.primary : 'transparent',
          }}>
          {taken && <Check size={16} color="#FFFFFF" strokeWidth={3} />}
        </Pressable>
      )}

      <View className="flex-1">
        <Text className="text-xs font-plus-medium text-text-secondary">{pharmacy}</Text>
        <Text className="mt-0.5 text-[17px] font-plus-bold text-text-primary">{medicine}</Text>
        {variant === 'historial' && time ? (
          <View className="mt-1 flex-row items-center gap-1.5">
            <Clock size={13} color={colors.accent} strokeWidth={2.5} />
            <Text className="text-xs font-plus-medium text-text-secondary">{time}</Text>
          </View>
        ) : null}
      </View>

      {variant === 'historial' ? (
        <View
          className="ml-3 h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.pastelBlocks }}>
          <BookOpen size={20} color={colors.primary} strokeWidth={2} />
        </View>
      ) : (
        <View
          className="ml-3 h-11 w-11 items-center justify-center rounded-2xl"
          style={{ backgroundColor: colors.accentSoft }}>
          <Pill size={20} color={colors.accent} strokeWidth={2} />
        </View>
      )}
    </View>
  );
}