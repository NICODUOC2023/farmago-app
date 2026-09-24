import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Image as ImageIcon,
  Pill,
  ScanLine,
  Sparkles,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useTreatments } from '@/store/treatments';
import { analyzePrescriptionImage, AnalyzedPrescription } from '@/services/gemini';

type Phase = 'pick' | 'preview' | 'loading' | 'done';

type ImageAsset = { uri: string; base64: string; mimeType: string };

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  quality: 0.5,
  base64: true,
};

export default function ScanScreen() {
  const router = useRouter();
  const addFromScan = useTreatments((s) => s.addFromScan);

  const [phase, setPhase] = useState<Phase>('pick');
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [result, setResult] = useState<AnalyzedPrescription | null>(null);

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos la cámara para escanear tu receta.');
      return;
    }
    launchPicker(ImagePicker.launchCameraAsync(PICK_OPTIONS));
  };

  const pickFromLibrary = () => {
    launchPicker(ImagePicker.launchImageLibraryAsync(PICK_OPTIONS));
  };

  const launchPicker = async (promise: Promise<ImagePicker.ImagePickerResult>) => {
    try {
      const result = await promise;
      const asset = result.canceled ? null : result.assets[0];
      if (!asset?.base64 || !asset.uri) return;
      setImage({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
      setResult(null);
      setPhase('preview');
    } catch {
      Alert.alert('Error', 'No se pudo obtener la imagen. Intentá de nuevo.');
    }
  };

  const analyze = async () => {
    if (!image) return;
    setPhase('loading');
    try {
      const parsed = await analyzePrescriptionImage({ base64: image.base64, mimeType: image.mimeType });
      setResult(parsed);
      setPhase('done');
    } catch (error) {
      setPhase('preview');
      Alert.alert('No pudimos analizar la receta', error instanceof Error ? error.message : 'Revisá tu conexión e intentá de nuevo.');
    }
  };

  const saveToTreatments = () => {
    if (!result) return;
    addFromScan({
      medicamentos: result.medicamentos,
      notas: result.notas,
      medico: result.medico,
      institucion: result.institucion,
    });
    router.replace('/recetas/tratamiento');
  };

  return (
    <View className="flex-1 bg-background">
      <Header onClose={() => router.back()} />

      {phase === 'pick' && <PickStep onCamera={takePhoto} onLibrary={pickFromLibrary} />}
      {(phase === 'preview' || phase === 'loading') && (
        <PreviewStep image={image} loading={phase === 'loading'} onAnalyze={analyze} onRetake={takePhoto} />
      )}
      {phase === 'done' && (
        <DoneStep
          result={result}
          onSave={saveToTreatments}
          onNewScan={() => {
            setImage(null);
            setResult(null);
            setPhase('pick');
          }}
        />
      )}
    </View>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <View className="flex-row items-center px-5 pb-2 pt-4">
      <Pressable onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-surface">
        <ChevronLeft size={22} color={colors.textPrimary} strokeWidth={2.4} />
      </Pressable>
      <View className="ml-4 flex-1">
        <Text className="text-lg font-plus-bold text-text-primary">Escanear receta</Text>
        <Text className="text-xs font-plus-medium text-text-secondary">
          La IA extrae tus medicamentos y los agrega al tratamiento
        </Text>
      </View>
    </View>
  );
}

function PickStep({ onCamera, onLibrary }: { onCamera: () => void; onLibrary: () => void }) {
  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 pb-10 pt-6">
      <View className="items-center rounded-3xl border-2 border-dashed border-primary/30 bg-surface px-6 py-14">
        <View className="h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
          <ScanLine size={30} color={colors.primary} strokeWidth={2} />
        </View>
        <Text className="mt-4 text-center font-plus-bold text-text-primary">Fotografiá tu receta</Text>
        <Text className="mt-1 text-center text-sm font-plus-medium text-text-secondary">
          Subí una foto clara de la receta médica o de la caja del medicamento.
        </Text>
      </View>

      <Pressable onPress={onCamera} className="h-14 flex-row items-center justify-center rounded-full bg-primary active:opacity-90">
        <Camera size={20} color="#FFFFFF" strokeWidth={2.2} />
        <Text className="ml-2 font-plus-bold text-white">Tomar foto</Text>
      </Pressable>

      <Pressable
        onPress={onLibrary}
        className="h-14 flex-row items-center justify-center rounded-full border border-primary/25 bg-surface active:opacity-90">
        <ImageIcon size={20} color={colors.primary} strokeWidth={2.2} />
        <Text className="ml-2 font-plus-bold" style={{ color: colors.primary }}>
          Elegir de galería
        </Text>
      </Pressable>
    </ScrollView>
  );
}

function PreviewStep({
  image,
  loading,
  onAnalyze,
  onRetake,
}: {
  image: ImageAsset | null;
  loading: boolean;
  onAnalyze: () => void;
  onRetake: () => void;
}) {
  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 pb-10 pt-4">
      <View className="overflow-hidden rounded-3xl bg-surface shadow-lg shadow-indigo-950/10">
        {image && (
          <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" transition={200} />
        )}
      </View>

      {loading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 font-plus-semibold text-text-primary">Analizando receta…</Text>
          <Text className="mt-1 text-sm font-plus-medium text-text-secondary">Gemini está leyendo la imagen</Text>
        </View>
      ) : (
        <>
          <LinearGradient colors={['#5B4FE8', '#8B7CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
            <Pressable onPress={onAnalyze} style={styles.buttonInner} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
              <Sparkles size={20} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="ml-2 font-plus-bold text-white">Analizar con IA</Text>
            </Pressable>
          </LinearGradient>

          <Pressable
            onPress={onRetake}
            className="h-14 flex-row items-center justify-center rounded-full border border-primary/25 bg-surface active:opacity-90">
            <Camera size={20} color={colors.primary} strokeWidth={2.2} />
            <Text className="ml-2 font-plus-bold" style={{ color: colors.primary }}>
              Tomar otra foto
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

function DoneStep({
  result,
  onSave,
  onNewScan,
}: {
  result: AnalyzedPrescription | null;
  onSave: () => void;
  onNewScan: () => void;
}) {
  if (!result) return null;

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 pb-10 pt-4">
      <View className="flex-row items-center gap-2">
        <CheckCircle2 size={22} color={colors.accent} strokeWidth={2.4} />
        <Text className="text-base font-plus-bold text-text-primary">Receta analizada</Text>
        {result.isDemo && (
          <View className="rounded-full bg-primary/10 px-2.5 py-1">
            <Text className="text-[11px] font-plus-bold" style={{ color: colors.primary }}>
              Modo demo: sin API key
            </Text>
          </View>
        )}
      </View>

      {(result.institucion || result.medico) && (
        <View className="rounded-3xl bg-surface px-4 py-3">
          <Text className="font-plus-semibold text-text-primary">Origen de la receta</Text>
          <Text className="mt-0.5 text-sm font-plus-medium text-text-secondary">
            {[result.institucion, result.medico].filter(Boolean).join(' · ')}
          </Text>
        </View>
      )}

      <View className="gap-2.5">
        {result.medicamentos.map((med, index) => (
          <View key={`${med.nombre}-${index}`} className="rounded-3xl bg-surface px-4 py-3.5">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
                <Pill size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[15px] font-plus-bold text-text-primary">{med.nombre}</Text>
                <Text className="text-sm font-plus-medium text-text-secondary">
                  {[med.dosis, med.frecuencia, med.duracion].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {result.notas && (
        <View className="rounded-3xl bg-surface px-4 py-3.5">
          <Text className="text-sm font-plus-bold text-text-primary">Notas del médico</Text>
          <Text className="mt-1 text-sm font-plus-medium text-text-secondary">{result.notas}</Text>
        </View>
      )}

      <View className="h-2" />

      <LinearGradient colors={['#5B4FE8', '#8B7CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.primaryButton}>
        <Pressable onPress={onSave} style={styles.buttonInner} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
          <CheckCircle2 size={20} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="ml-2 font-plus-bold text-white">Guardar en Tratamientos</Text>
        </Pressable>
      </LinearGradient>

      <Pressable
        onPress={onNewScan}
        className="h-14 flex-row items-center justify-center rounded-full border border-primary/25 bg-surface active:opacity-90">
        <ScanLine size={20} color={colors.primary} strokeWidth={2.2} />
        <Text className="ml-2 font-plus-bold" style={{ color: colors.primary }}>
          Escanear otra receta
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  primaryButton: {
    borderRadius: 9999,
    elevation: 4,
    shadowColor: '#2A1F8C',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  buttonInner: {
    height: 56,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
});