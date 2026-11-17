import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  Image as ImageIcon,
  MapPin,
  Pill,
  ScanLine,
  Sparkles,
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';
import { useTreatments } from '@/store/treatments';
import { ConsentSheet } from '@/components/privacy/ConsentSheet';
import { grantConsent, hasConsent } from '@/services/consents';
import { useCoverage } from '@/store/coverage';
import { SANTIAGO_CENTER } from '@/data/mock';
import { analyzePrescriptionImage, AnalyzedPrescription, AnalyzedMedicine } from '@/services/gemini';
import { searchMedications } from '@/services/medications';
import { useSelectedMedication } from '@/store/selectedMedication';

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
  const setSelectedMedication = useSelectedMedication((s) => s.setMedication);
  const setCoverageInput = useCoverage((s) => s.setCoverageInput);

  const [phase, setPhase] = useState<Phase>('pick');
  const [image, setImage] = useState<ImageAsset | null>(null);
  const [result, setResult] = useState<AnalyzedPrescription | null>(null);
  const [editedMeds, setEditedMeds] = useState<AnalyzedMedicine[]>([]);
  const [showPrescriptionConsent, setShowPrescriptionConsent] = useState(false);
  const [showHealthConsent, setShowHealthConsent] = useState(false);
  const [pendingPicker, setPendingPicker] = useState<(() => void) | null>(null);

  const takePhoto = async () => {
    const consent = await hasConsent('prescription_processing');
    if (!consent) {
      setPendingPicker(() => async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Permiso requerido', 'Necesitamos la cámara para escanear tu receta.');
          return;
        }
        launchPicker(ImagePicker.launchCameraAsync(PICK_OPTIONS));
      });
      setShowPrescriptionConsent(true);
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos la cámara para escanear tu receta.');
      return;
    }
    launchPicker(ImagePicker.launchCameraAsync(PICK_OPTIONS));
  };

  const pickFromLibrary = async () => {
    const consent = await hasConsent('prescription_processing');
    if (!consent) {
      setPendingPicker(() => async () => {
        launchPicker(ImagePicker.launchImageLibraryAsync(PICK_OPTIONS));
      });
      setShowPrescriptionConsent(true);
      return;
    }
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
      Alert.alert('Error', 'No se pudo obtener la imagen. Intenta de nuevo.');
    }
  };

  const analyze = async () => {
    if (!image) return;
    setPhase('loading');
    try {
      const parsed = await analyzePrescriptionImage({ base64: image.base64, mimeType: image.mimeType });

      // Si es una caja/código de barras, buscar el medicamento y mostrar farmacias.
      if (parsed.tipo === 'caja' || parsed.codigo_barras) {
        const term = parsed.codigo_barras || parsed.medicamentos[0]?.nombre || '';
        try {
          const meds = await searchMedications(term);
          if (meds.length > 0) {
            setSelectedMedication(meds[0]);
          }
        } catch {
          // ignore
        }
        router.replace('/');
        return;
      }

      setResult(parsed);
      setEditedMeds(parsed.medicamentos);
      setPhase('done');
    } catch (error) {
      setPhase('preview');
      Alert.alert('No pudimos analizar la receta', error instanceof Error ? error.message : 'Revisa tu conexión e intentá de nuevo.');
    }
  };

  const saveToTreatments = async () => {
    if (!result) return;
    const meds = editedMeds.length ? editedMeds : result.medicamentos;
    if (meds.some((m) => !m.nombre || !m.nombre.trim())) {
      Alert.alert('Datos incompletos', 'Completa el nombre de todos los medicamentos antes de guardar.');
      return;
    }
    const consent = await hasConsent('health_data_processing');
    if (!consent) {
      setShowHealthConsent(true);
      return;
    }
    addFromScan({
      medicamentos: meds,
      notas: result.notas,
      medico: result.medico,
      institucion: result.institucion,
    });
    Alert.alert('Guardado', 'Tu tratamiento se guardó correctamente.', [
      { text: 'OK', onPress: () => router.replace('/recetas/tratamiento') },
    ]);
  };

  const acceptHealthConsent = async () => {
    try {
      await grantConsent('health_data_processing');
      setShowHealthConsent(false);
      if (!result) return;
      const meds = editedMeds.length ? editedMeds : result.medicamentos;
      addFromScan({
        medicamentos: meds,
        notas: result.notas,
        medico: result.medico,
        institucion: result.institucion,
      });
      Alert.alert('Guardado', 'Tu tratamiento se guardó correctamente.', [
        { text: 'OK', onPress: () => router.replace('/recetas/tratamiento') },
      ]);
    } catch {
      setShowHealthConsent(false);
    }
  };

  const searchCoverage = () => {
    if (!result) return;
    const meds = editedMeds.length ? editedMeds : result.medicamentos;
    setCoverageInput({
      medicationNames: meds.map((m) => m.nombre).filter(Boolean),
      latitude: SANTIAGO_CENTER.latitude,
      longitude: SANTIAGO_CENTER.longitude,
    });
    router.push('/cobertura');
  };

  const acceptPrescriptionConsent = async () => {
    try {
      await grantConsent('prescription_processing');
      setShowPrescriptionConsent(false);
      const action = pendingPicker;
      setPendingPicker(null);
      if (action) await action();
    } catch {
      setShowPrescriptionConsent(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header onClose={() => router.back()} />

      {phase === 'pick' && <PickStep onCamera={takePhoto} onLibrary={pickFromLibrary} />}
      {(phase === 'preview' || phase === 'loading') && (
        <PreviewStep image={image} loading={phase === 'loading'} onAnalyze={analyze} onRetake={takePhoto} />
      )}
      {showPrescriptionConsent ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
          <ConsentSheet
            title="Antes de procesar tu receta"
            body="Una receta puede contener información de salud. farmaGO procesará temporalmente su contenido para identificar medicamentos y consultar su disponibilidad. La imagen no se almacenará permanentemente en farmaGO."
            extraInfo="La imagen será procesada mediante una Edge Function que utiliza un proveedor de inteligencia artificial. Los datos podrían procesarse fuera de Chile. El tratamiento se limita a extraer medicamentos y datos necesarios para la búsqueda. No se entregará diagnóstico ni recomendación médica."
            checkboxLabel="Acepto el procesamiento de los datos de salud de esta receta para identificar medicamentos y consultar su disponibilidad."
            onAccept={acceptPrescriptionConsent}
            onCancel={() => { setShowPrescriptionConsent(false); setPendingPicker(null); }}
          />
        </View>
      ) : null}

      {showHealthConsent ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}>
          <ConsentSheet
            title="Autorización para guardar tu tratamiento"
            body="Para guardar este tratamiento, farmaGO almacenará los medicamentos, dosis, frecuencia, duración, horarios y tomas asociadas a tu cuenta. Estos datos se utilizarán únicamente para ayudarte a gestionar tu tratamiento dentro de la aplicación."
            checkboxLabel="Acepto que farmaGO trate y almacene estos datos de salud para gestionar mi tratamiento."
            onAccept={acceptHealthConsent}
            onCancel={() => setShowHealthConsent(false)}
          />
        </View>
      ) : null}

      {phase === 'done' && (
        <DoneStep
          result={result}
          editedMeds={editedMeds}
          onChangeMeds={setEditedMeds}
          onSave={saveToTreatments}
          onCoverage={searchCoverage}
          onNewScan={() => {
            setImage(null);
            setResult(null);
            setEditedMeds([]);
            setPhase('pick');
          }}
        />
      )}
    </View>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center px-5 pb-2" style={{ paddingTop: insets.top + 8 }}>
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

      <Pressable onPress={onCamera} accessibilityRole="button" accessibilityLabel="Tomar foto" className="h-14 flex-row items-center justify-center rounded-full bg-primary active:opacity-90">
        <Camera size={20} color="#FFFFFF" strokeWidth={2.2} />
        <Text className="ml-2 font-plus-bold text-white">Tomar foto</Text>
      </Pressable>

      <Pressable
        onPress={onLibrary}
        accessibilityRole="button" accessibilityLabel="Elegir de galería"
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
  editedMeds,
  onChangeMeds,
  onSave,
  onCoverage,
  onNewScan,
}: {
  result: AnalyzedPrescription | null;
  editedMeds: AnalyzedMedicine[];
  onChangeMeds: (meds: AnalyzedMedicine[]) => void;
  onSave: () => void;
  onCoverage: () => void;
  onNewScan: () => void;
}) {
  if (!result) return null;

  const updateMed = (index: number, field: keyof AnalyzedMedicine, value: string) => {
    const next = [...editedMeds];
    next[index] = { ...next[index], [field]: value };
    onChangeMeds(next);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView className="flex-1" contentContainerClassName="gap-4 px-6 pb-10 pt-4" keyboardShouldPersistTaps="handled">
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
        {editedMeds.map((med, index) => (
          <View key={`${med.nombre}-${index}`} className="rounded-3xl bg-surface px-4 py-3.5">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colors.primarySoft }}>
                <Pill size={18} color={colors.primary} strokeWidth={2.2} />
              </View>
              <View className="ml-3 flex-1 gap-2">
                <TextInput
                  value={med.nombre}
                  onChangeText={(v) => updateMed(index, 'nombre', v)}
                  placeholder="Nombre del medicamento"
                  accessibilityLabel="Nombre del medicamento"
                  className="rounded-2xl bg-background px-3 py-2 font-plus-medium text-[14px] text-text-primary"
                />
                <TextInput
                  value={med.dosis}
                  onChangeText={(v) => updateMed(index, 'dosis', v)}
                  placeholder="Dosis"
                  accessibilityLabel="Dosis"
                  className="rounded-2xl bg-background px-3 py-2 font-plus-medium text-[13px] text-text-primary"
                />
                <TextInput
                  value={med.frecuencia}
                  onChangeText={(v) => updateMed(index, 'frecuencia', v)}
                  placeholder="Frecuencia"
                  accessibilityLabel="Frecuencia"
                  className="rounded-2xl bg-background px-3 py-2 font-plus-medium text-[13px] text-text-primary"
                />
                <TextInput
                  value={med.duracion}
                  onChangeText={(v) => updateMed(index, 'duracion', v)}
                  placeholder="Duración"
                  accessibilityLabel="Duración"
                  className="rounded-2xl bg-background px-3 py-2 font-plus-medium text-[13px] text-text-primary"
                />
                <TextInput
                  value={med.cantidad}
                  onChangeText={(v) => updateMed(index, 'cantidad', v)}
                  placeholder="Cantidad prescrita"
                  accessibilityLabel="Cantidad prescrita"
                  className="rounded-2xl bg-background px-3 py-2 font-plus-medium text-[13px] text-text-primary"
                />
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
        <Pressable onPress={onCoverage} style={styles.buttonInner} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
          <MapPin size={20} color="#FFFFFF" strokeWidth={2.2} />
          <Text className="ml-2 font-plus-bold text-white">Buscar farmacias con esta receta</Text>
        </Pressable>
      </LinearGradient>

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
    </KeyboardAvoidingView>
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