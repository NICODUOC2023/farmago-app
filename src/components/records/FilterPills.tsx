import { Pressable, ScrollView, Text } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function FilterPills({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="grow-0"
      contentContainerClassName="gap-2 px-5 py-2">
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            className={`rounded-full px-4 py-2 ${isActive ? 'bg-primary' : ''}`}
            style={!isActive ? { backgroundColor: colors.primarySoft } : undefined}>
            <Text
              className="text-[13px] font-plus-semibold"
              style={{ color: isActive ? colors.surface : colors.primary }}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}