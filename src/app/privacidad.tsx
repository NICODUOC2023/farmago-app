import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';
import { exportMyData, requestAccountDeletion, revokeAllConsents } from '@/services/consents';

export default function PrivacidadScreen() {
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setBusy(true);
    try {
      const data = await exportMyData();
      Alert.alert('Exportación', data ? 'Tus datos se generaron correctamente.' : 'No se pudo exportar.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo exportar.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    Alert.alert('Revocar consentimientos', '¿Seguro que querés revocar todos los consentimientos?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Revocar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await revokeAllConsents();
            Alert.alert('Listo', 'Se revocaron los consentimientos activos.');
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo revocar.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const deleteAccount = async () => {
    Alert.alert('Eliminar cuenta', '¿Seguro que querés solicitar la eliminación de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Solicitar',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await requestAccountDeletion();
            Alert.alert('Solicitud enviada', 'Tu cuenta será eliminada conforme al procedimiento.');
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo solicitar.');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-[16px] font-plus-semibold text-text-primary">Inicia sesión para gestionar tu privacidad</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-5 py-6">
        <Text className="text-xl font-plus-bold text-text-primary">Privacidad y datos</Text>

        <View className="rounded-3xl bg-surface px-4 py-4">
          <Text className="font-plus-semibold text-[14px] text-text-primary">Política de privacidad</Text>
          <Text className="mt-1 text-[12px] font-plus-medium text-text-secondary">
            Documento provisional del MVP. Requiere revisión jurídica antes de producción.
          </Text>
        </View>

        <View className="rounded-3xl bg-surface px-4 py-4">
          <Text className="font-plus-semibold text-[14px] text-text-primary">Términos de servicio</Text>
          <Text className="mt-1 text-[12px] font-plus-medium text-text-secondary">
            Documento provisional del MVP. Requiere revisión jurídica antes de producción.
          </Text>
        </View>

        <Pressable onPress={exportData} disabled={busy} className="rounded-3xl bg-surface px-4 py-4">
          <Text className="font-plus-semibold text-[14px] text-text-primary">Exportar mis datos</Text>
        </Pressable>

        <Pressable onPress={revoke} disabled={busy} className="rounded-3xl bg-surface px-4 py-4">
          <Text className="font-plus-semibold text-[14px] text-text-primary">Revocar consentimientos</Text>
        </Pressable>

        <Pressable onPress={deleteAccount} disabled={busy} className="rounded-3xl bg-surface px-4 py-4">
          <Text className="font-plus-semibold text-[14px]" style={{ color: '#D6455D' }}>Solicitar eliminación de cuenta</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
