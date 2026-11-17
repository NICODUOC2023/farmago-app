import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { grantConsent } from "@/services/consents";

type Props = {
  onDone: () => void;
};

export function ConsentGate({ onDone }: Props) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = terms && privacy;

  const submit = async () => {
    if (!canContinue) return;
    setBusy(true);
    setError(null);
    try {
      await grantConsent('terms_of_service');
      await grantConsent('privacy_policy');
      if (marketing) await grantConsent('marketing');
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el consentimiento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}>
        <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: 24 }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' }}>
            Privacidad y datos
          </Text>
          <Text style={{ marginTop: 8, fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>
            Antes de usar farmaGO, acepta los términos y la política de privacidad.
          </Text>

          <View style={{ marginTop: 20, gap: 12 }}>
            <Pressable onPress={() => setTerms((v) => !v)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.primary, backgroundColor: terms ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {terms ? <Text style={{ color: '#FFFFFF', fontSize: 14 }}>✓</Text> : null}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: colors.textPrimary }}>Acepto los Términos de servicio</Text>
            </Pressable>

            <Pressable onPress={() => setPrivacy((v) => !v)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.primary, backgroundColor: privacy ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {privacy ? <Text style={{ color: '#FFFFFF', fontSize: 14 }}>✓</Text> : null}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: colors.textPrimary }}>He leído la Política de privacidad</Text>
            </Pressable>

            <Pressable onPress={() => setMarketing((v) => !v)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.textSecondary, backgroundColor: marketing ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {marketing ? <Text style={{ color: '#FFFFFF', fontSize: 14 }}>✓</Text> : null}
              </View>
              <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary }}>Quiero recibir comunicaciones de farmaGO (opcional)</Text>
            </Pressable>
          </View>

          {error ? (
            <Text style={{ marginTop: 12, fontSize: 12, color: '#D6455D' }} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={!canContinue || busy}
            accessibilityRole="button"
            style={{ marginTop: 20, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, opacity: !canContinue || busy ? 0.6 : 1 }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Continuar</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
