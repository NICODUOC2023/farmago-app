import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type Props = {
  title: string;
  body: string;
  checkboxLabel: string;
  extraInfo?: string;
  acceptLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onAccept: () => void | Promise<void>;
  onCancel: () => void;
};

export function ConsentSheet({
  title,
  body,
  checkboxLabel,
  extraInfo,
  acceptLabel = 'Continuar',
  cancelLabel = 'Cancelar',
  busy = false,
  onAccept,
  onCancel,
}: Props) {
  const [checked, setChecked] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' }}>
        <ScrollView>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
            {title}
          </Text>
          <Text style={{ marginTop: 10, fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
            {body}
          </Text>
          {extraInfo ? (
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.textSecondary, lineHeight: 18 }}>
              {extraInfo}
            </Text>
          ) : null}

          <Pressable
            onPress={() => setChecked((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 16 }}>
            <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.primary, backgroundColor: checked ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {checked ? <Text style={{ color: '#FFFFFF', fontSize: 14 }}>✓</Text> : null}
            </View>
            <Text style={{ flex: 1, fontSize: 13, color: colors.textPrimary }}>{checkboxLabel}</Text>
          </Pressable>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Pressable
            onPress={onCancel}
            disabled={busy}
            style={{ flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, opacity: busy ? 0.6 : 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() => { if (checked) void onAccept(); }}
            disabled={!checked || busy}
            style={{ flex: 1, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: !checked || busy ? 0.6 : 1 }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>{acceptLabel}</Text>}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
