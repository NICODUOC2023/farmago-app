import { Pressable, ScrollView, Text } from 'react-native';

import { buildWeekDays } from '@/data/mock';

type Props = {
  selected: string;
  onSelect: (date: string) => void;
};

export function DateStrip({ selected, onSelect }: Props) {
  const days = buildWeekDays();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-2.5 px-5 py-1.5">
      {days.map((day) => {
        const isSelected = day.date === selected;
        return (
          <Pressable
            key={day.date}
            onPress={() => onSelect(day.date)}
            className={`h-[64px] w-[56px] items-center justify-center rounded-2xl border ${
              isSelected ? 'border-primary bg-primary' : 'border-[#E7E4F6] bg-surface'
            }`}>
            <Text
              className={`text-[10px] font-plus-semibold leading-none ${
                isSelected ? 'text-white/85' : 'text-text-secondary'
              }`}>
              {day.month}
            </Text>
            <Text
              className={`my-1 text-lg font-plus-bold leading-none ${
                isSelected ? 'text-white' : 'text-text-primary'
              }`}>
              {day.day}
            </Text>
            <Text
              className={`text-[10px] font-plus-medium leading-none ${
                isSelected ? 'text-white/85' : 'text-text-secondary'
              }`}>
              {day.weekday}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}