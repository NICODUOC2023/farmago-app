import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { mockCoverage } from '@/data/coverageMock';
import { useCoverage } from '@/store/coverage';
import type { PharmacyCoverage } from '@/services/pharmacies';

export default function CoberturaScreen() {
  const router = useRouter();
  const { medicationNames } = useCoverage();
  const result = mockCoverage(medicationNames);

  const full = result.full;
  const partial = result.partial;

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 px-5 pb-10 pt-6">
        <Text className="text-xl font-plus-bold text-text-primary">Cobertura de receta</Text>

        {full ? (
          <View className="rounded-3xl bg-surface px-4 py-4 shadow-lg shadow-indigo-950/10">
            <Text className="font-plus-bold text-[15px] text-text-primary">
              Encontramos todos los medicamentos en una farmacia
            </Text>
            <Text className="mt-1 font-plus-semibold text-[14px] text-text-primary">{full.pharmacy_name}</Text>
            <Text className="font-plus-medium text-[12px] text-text-secondary">{full.address}</Text>
            <Text className="mt-2 font-plus-medium text-[12px] text-text-secondary">
              Distancia: {(full.distance_m / 1000).toFixed(1)} km
            </Text>
            <Text className="font-plus-medium text-[12px] text-text-secondary">
              Total estimado: ${full.total_price?.toLocaleString('es-CL') ?? '-'}
            </Text>
            <Text className="font-plus-medium text-[12px] text-text-secondary">
              Actualización: {full.last_synced_at ? new Date(full.last_synced_at).toLocaleString('es-CL') : '-'}
            </Text>
            <View className="mt-3 gap-1.5">
              {full.matched_medications.map((m) => (
                <View key={m.medication_id} className="flex-row justify-between">
                  <Text className="font-plus-medium text-[12px] text-text-primary">{m.name}</Text>
                  <Text className="font-plus-medium text-[12px] text-text-secondary">
                    ${m.price?.toLocaleString('es-CL') ?? '-'}
                  </Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => router.replace("/")} accessibilityRole="button" accessibilityLabel="Ver en el mapa" className="mt-4 items-center justify-center rounded-full bg-primary py-3">
              <Text className="font-plus-semibold text-[14px] text-white">Ver en el mapa</Text>
            </Pressable>
          </View>
        ) : (
          <View className="rounded-3xl bg-surface px-4 py-4">
            <Text className="font-plus-bold text-[15px] text-text-primary">
              Ninguna farmacia tiene todos los medicamentos
            </Text>
            <Text className="mt-1 font-plus-medium text-[12px] text-text-secondary">
              Resultados agrupados por medicamento (máximo 5 farmacias por medicamento).
            </Text>
          </View>
        )}

        {!full
          ? partial.map((group) => (
              <View key={group.medication} className="rounded-3xl bg-surface px-4 py-4">
                <Text className="font-plus-bold text-[14px] text-text-primary">{group.medication}</Text>
                <View className="mt-2 gap-2">
                  {group.pharmacies.map((p: PharmacyCoverage) => (
                    <View key={p.pharmacy_id} className="rounded-2xl border border-black/5 px-3 py-2">
                      <Text className="font-plus-semibold text-[13px] text-text-primary">{p.pharmacy_name}</Text>
                      <Text className="font-plus-medium text-[11px] text-text-secondary">
                        {(p.distance_m / 1000).toFixed(1)} km
                      </Text>
                      <Text className="font-plus-medium text-[11px] text-text-secondary">
                        Stock: {p.matched_medications[0]?.quantity ?? '-'} · Actualización:{' '}
                        {p.last_synced_at ? new Date(p.last_synced_at).toLocaleString('es-CL') : '-'}
                      </Text>
                      <Pressable onPress={() => router.replace("/")} accessibilityRole="button" accessibilityLabel="Ver en el mapa" className="mt-2 self-start rounded-full bg-primary px-3 py-1.5">
                        <Text className="text-[11px] font-plus-semibold text-white">Ver en el mapa</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ))
          : null}

        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Volver" className="mt-2 items-center justify-center rounded-full bg-primarySoft py-3">
          <Text className="font-plus-semibold text-[13px] text-primary">Volver</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
