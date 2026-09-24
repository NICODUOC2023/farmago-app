import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  title: string;
};

export function ScreenHeader({ title }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View
      className="flex-row items-center justify-between bg-background px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}>
      <Pressable
        onPress={goBack}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full bg-surface shadow-sm">
        <ChevronLeft size={22} color="#1E1B3A" strokeWidth={2.5} />
      </Pressable>
      <Text className="max-w-[60%] text-center font-plus-bold text-lg text-text-primary">{title}</Text>
      <Pressable
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full bg-primary">
        <Bell size={18} color="#FFFFFF" strokeWidth={2} />
      </Pressable>
    </View>
  );
}