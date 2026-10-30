import Constants from 'expo-constants';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Info, MapPin, Navigation, Pill, RefreshCw, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MedicationSearch } from '@/components/medications/MedicationSearch';
import { PharmacyMap } from '@/components/maps/PharmacyMap';
import { BottomDock } from '@/components/ui/BottomDock';
import { colors } from '@/constants/colors';
import { SANTIAGO_CENTER } from '@/data/mock';
import { SANTIAGO_COMMUNES, type Commune } from '@/data/communes';
import { useAuth } from '@/providers/AuthProvider';
import { useSelectedMedication } from '@/store/selectedMedication';
import { useSearchQuery } from '@/store/searchQuery';
import { Link } from 'expo-router';
import { getCurrentCoordinates, LocationError, type Coordinates } from '@/services/location';
import {
  findNearbyPharmacies,
  formatDistance,
  formatHours,
  isOpenNow,
  PharmacySearchError,
  type NearbyPharmacy,
} from '@/services/pharmacies';
import type { MedicationResult } from '@/services/medications';

type SearchStatus = 'idle' | 'locating' | 'searching' | 'success' | 'error';

const CARD = 'rounded-3xl bg-surface px-4 py-4 shadow-lg shadow-indigo-950/10';

export function MapScreen({ onNavigate }: { onNavigate?: (href: string) => void } = {}) {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const selectedFromScan = useSelectedMedication((s) => s.medication);

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [pharmacies, setPharmacies] = useState<NearbyPharmacy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recommendedId, setRecommendedId] = useState<string | null>(null);
  const processedScanRef = useRef<string | null>(null);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<MedicationResult | null>(null);
  const [radiusM, setRadiusM] = useState<number>(100_000);
  const [locationSource, setLocationSource] = useState<'gps' | 'commune'>('gps');
  const [showCommunePicker, setShowCommunePicker] = useState(false);
  const [communeName, setCommuneName] = useState<string | null>(null);
  const [initialQuery, setInitialQuery] = useState<string | undefined>(undefined);
  const consumeSearchQuery = useSearchQuery((s) => s.consume);
  useEffect(() => {
    const q = consumeSearchQuery();
    if (q) setTimeout(() => setInitialQuery(q), 0);
  }, [consumeSearchQuery]);

  const selectedPharmacy = pharmacies.find((pharmacy) => pharmacy.id === selectedId) ?? null;


  // En Expo Go para Android, el SDK de Google Maps que trae Expo Go usa una
  // clave que ya no autoriza peticiones: el mapa se ve en blanco. En iOS Expo Go
  // se usa Apple Maps (sin clave) y funciona; una development build con tu propia
  // API key también funciona en Android.
  const isExpoGoAndroid =
    Platform.OS === 'android' && Constants.appOwnership === 'expo';

  useEffect(() => {
    if (__DEV__) {
      console.log(
        '[MapScreen] platform=' +
          Platform.OS +
          ' expoGo=' +
          String(Constants.appOwnership === 'expo'),
      );
    }
  }, []);

  const runSearch = useCallback(
    async (medicationId?: string | null, coordsOverride?: Coordinates | null, radiusOverride?: number) => {
      if (!session) {
        return;
      }

      setErrorMessage(null);
      setCanOpenSettings(false);
      setStatus('locating');

      try {
        let coordinates = coordsOverride ?? null;
        if (!coordinates) {
          if (locationSource === 'commune' && communeName) {
            const c = SANTIAGO_COMMUNES.find((x) => x.name === communeName);
            if (c) {
              coordinates = { latitude: c.latitude, longitude: c.longitude };
            } else {
              coordinates = await getCurrentCoordinates();
              setLocationSource('gps');
            }
          } else {
            coordinates = await getCurrentCoordinates();
            setLocationSource('gps');
          }
        }
        setUserLocation(coordinates);

        const effectiveRadius = radiusOverride ?? radiusM;
        // Solo persistimos el radio cuando es una búsqueda normal (sin override).
        // Así "Ampliar a 10 km" no deja el radio fijo en 10 km para búsquedas futuras.
        if (radiusOverride == null) {
          setRadiusM(effectiveRadius);
        }

        setStatus('searching');
        const results = await findNearbyPharmacies({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          radiusM: effectiveRadius,
          ...(medicationId ? { medicationId } : {}),
        });

        setPharmacies(results);
        setSelectedId(results[0]?.id ?? null);
        setRecommendedId(results[0]?.id ?? null);
        setStatus('success');
      } catch (error) {
        setStatus('error');
        if (error instanceof LocationError) {
          setCanOpenSettings(error.code === 'permission_denied');
          setErrorMessage(error.message);
          if (error.code === 'permission_denied' || error.code === 'services_disabled') {
            setLocationSource('commune');
            if (!communeName) {
              setShowCommunePicker(true);
            }
          }
        } else if (error instanceof PharmacySearchError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Ocurrió un error inesperado. Intenta de nuevo.');
        }
      }
    },
    [session, radiusM, communeName, locationSource],
  );

  useEffect(() => {
    if (selectedFromScan && processedScanRef.current !== selectedFromScan.id) {
      processedScanRef.current = selectedFromScan.id;
      void runSearch(selectedFromScan.id, userLocation, radiusM);
    }
  }, [selectedFromScan]); // eslint-disable-line react-hooks/exhaustive-deps



  const handleSelectMedication = useCallback((medication: MedicationResult) => {
    setSelectedMedication(medication);
    void runSearch(medication.id);
  }, [runSearch]);

  const handleSelectCommune = useCallback((commune: Commune) => {
    setShowCommunePicker(false);
    setCommuneName(commune.name);
    setLocationSource('commune');
    const coords = { latitude: commune.latitude, longitude: commune.longitude };
    void runSearch(selectedMedication?.id ?? null, coords);
  }, [runSearch, selectedMedication]);

  if (!session) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="mb-4 text-center text-[16px] font-plus-semibold text-text-primary">
          Iniciá sesión para usar farmaGO
        </Text>
        <Link href="/login" asChild>
          <Pressable className="rounded-full bg-primary px-6 py-3">
            <Text className="font-plus-semibold text-[14px] text-white">Ir a iniciar sesión</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ flex: 1 }}>
      <PharmacyMap
        userLocation={userLocation ?? SANTIAGO_CENTER}
        pharmacies={pharmacies}
        recommendedId={recommendedId}
        selectedId={selectedId}
        onSelectPharmacy={setSelectedId}
      />

      {/* Header: buscador de medicamentos (antes del mapa) + indicador de seleccion.
          pointerEvents="box-none" para que, en Android, el MapView nativo no capture
          los toques que deben llegar al TextInput del buscador (el contenedor es
          transparente y sobre el mapa). Los hijos (input, botones) reciben el toque. */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16 }} pointerEvents="box-none" className="z-10">
        <View className="items-center">
          <View className="w-full max-w-md">
            {session ? (
              <MedicationSearch
                selectedId={selectedMedication?.id}
                onSelect={handleSelectMedication}
                locationLabel={locationSource === 'commune' ? (communeName ?? 'Elige Comuna') : 'Ubicación actual'}
                onLocationPress={locationSource === 'commune' ? () => setShowCommunePicker(true) : undefined}
                initialQuery={initialQuery}
              />
            ) : (
              <Pressable className="flex-row items-center rounded-3xl bg-surface py-3 pl-4 pr-1 shadow-md shadow-indigo-900/10">
                <Text numberOfLines={1} className="flex-1 pr-2 font-plus-medium text-[14px] text-text-secondary">
                  ¿Qué estás buscando?
                </Text>
                <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
                  <MapPin size={15} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              </Pressable>
            )}
          </View>
        </View>

        {selectedMedication ? (
          <View className="mt-2 flex-row items-center rounded-2xl bg-surface px-3 py-2 shadow-md shadow-indigo-900/10">
            <Pill size={15} color={colors.primary} strokeWidth={2.4} />
            <Text numberOfLines={1} className="ml-2 flex-1 font-plus-semibold text-[12px] text-text-primary">
              {selectedMedication.name}
            </Text>
            <Text className="font-plus-medium text-[10px] text-text-secondary">
              Medicamento seleccionado
            </Text>
          </View>
        ) : null}

        {isExpoGoAndroid ? (
          <View className="mt-2 flex-row items-start rounded-2xl bg-surface px-3 py-2 shadow-md shadow-indigo-900/10">
            <Info size={16} color={colors.primary} strokeWidth={2.4} />
            <Text className="ml-2 flex-1 font-plus-medium text-[11px] leading-4 text-text-secondary">
              En Expo Go (Android) el mapa puede verse en blanco por una limitación de Expo Go. En una
              development build con tu API key de Google Maps se ve correctamente.
            </Text>
          </View>
        ) : null}
      </View>

      {/* Panel inferior: resultado / estado / acceso */}
      <View
        style={{ position: 'absolute', left: 16, right: 16, bottom: Math.max(insets.bottom, 8) + 96 }}
        className="z-10">
        {!session ? null : status === 'idle' ? (
          <View style={{ alignItems: 'center' }}>
            <Pressable
              onPress={() => void runSearch(selectedMedication?.id, userLocation, radiusM)}
              style={{ marginTop: 12, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 9999, backgroundColor: colors.primary, minWidth: 220, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={{ marginLeft: 8, color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                {selectedMedication ? 'Buscar farmacias con este medicamento' : 'Buscar farmacias cercanas'}
              </Text>
            </Pressable>
          </View>
        ) : status === 'locating' || status === 'searching' ? (
          <View className={`${CARD} flex-row items-center`}>
            <ActivityIndicator color={colors.primary} />
            <Text className="ml-3 font-plus-medium text-[14px] text-text-primary">
              {status === 'locating' ? 'Obteniendo tu ubicación…' : 'Buscando farmacias cercanas…'}
            </Text>
          </View>
        ) : status === 'error' ? (
          <View className={CARD}>
            <Text className="font-plus-semibold text-[15px] text-text-primary">
              No pudimos completar la búsqueda
            </Text>
            <Text className="mt-1 font-plus-medium text-[13px] text-text-secondary">{errorMessage}</Text>
            <View className="mt-3 flex-row gap-2">
              <Pressable
                onPress={() => void runSearch(selectedMedication?.id, userLocation, radiusM)}
                className="flex-1 flex-row items-center justify-center rounded-full bg-primary py-3">
                <RefreshCw size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text className="ml-2 font-plus-semibold text-[14px] text-white">Reintentar</Text>
              </Pressable>
              {canOpenSettings ? (
                <Pressable
                  onPress={() => Linking.openSettings()}
                  className="items-center justify-center rounded-full bg-primarySoft px-4">
                  <Text className="font-plus-semibold text-[13px] text-primary">Ajustes</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : pharmacies.length === 0 ? (
          <View className={CARD}>
            <Text className="font-plus-semibold text-[15px] text-text-primary">
              No encontramos farmacias cercanas
            </Text>
            <Text className="mt-1 font-plus-medium text-[13px] text-text-secondary">
              No hay farmacias registradas.
            </Text>
            <SearchButton
              label="Buscar de nuevo"
              onPress={() => void runSearch(selectedMedication?.id ?? null, userLocation, radiusM)}
            />
          </View>
        ) : (
          <View className={CARD}>
            <View className="mb-2 flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.primarySoft }}>
                  <Pill size={20} color={colors.primary} strokeWidth={2.4} />
                </View>
                <View className="ml-3 flex-1">
                  <Text numberOfLines={1} className="font-plus-semibold text-[15px] text-text-primary">
                    {selectedPharmacy?.name ?? 'Farmacia'}
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 font-plus-medium text-[12px] text-text-secondary">
                    {selectedPharmacy?.address ??
                      selectedPharmacy?.chain ??
                      'Dirección no informada'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  setStatus('idle');
                  setPharmacies([]);
                  setSelectedId(null);
                  setRecommendedId(null);
                }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                hitSlop={8}
                className="h-8 w-8 items-center justify-center rounded-full bg-primarySoft">
                <X size={16} color={colors.primary} strokeWidth={2.4} />
              </Pressable>
            </View>
                {selectedPharmacy ? (
                  <Text className="mt-0.5 font-plus-medium text-[11px] text-text-secondary">
                    {formatHours(selectedPharmacy.openingTime, selectedPharmacy.closingTime)}
                    {isOpenNow(selectedPharmacy.openingTime, selectedPharmacy.closingTime) === true ? ' · Abierto ahora' : isOpenNow(selectedPharmacy.openingTime, selectedPharmacy.closingTime) === false ? ' · Cerrado' : ''}
                  </Text>
                ) : null}

                {locationSource === 'gps' ? (
                <View className="mt-1 flex-row items-center">
                  <Navigation size={12} color={colors.textSecondary} strokeWidth={2.4} />
                  <Text className="ml-1 font-plus-medium text-[12px] text-text-secondary">
                    {selectedPharmacy ? formatDistance(selectedPharmacy.distanceM) : ''}
                  </Text>
                </View>
                ) : null}
                {selectedMedication && selectedPharmacy && selectedPharmacy.price != null ? (
                  <Text className="mt-2 font-plus-bold text-[15px] text-primary">
                    ${selectedPharmacy.price.toLocaleString('es-CL')}
                  </Text>
                ) : null}
          </View>
        )}
      </View>



      {showCommunePicker ? (
        <View
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }}
          className="z-50 items-center justify-center px-6">
          <View className="w-full max-w-md rounded-3xl bg-surface p-4" style={{ maxHeight: '70%' }}>
            <Text className="mb-3 font-plus-bold text-[15px] text-text-primary">Selecciona una comuna</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {SANTIAGO_COMMUNES.map((commune) => (
                <Pressable
                  key={commune.name}
                  onPress={() => handleSelectCommune(commune)}
                  className="rounded-2xl px-3 py-2.5 active:bg-primarySoft">
                  <Text className="font-plus-medium text-[14px] text-text-primary">{commune.name}</Text>
                  <Text className="text-[11px] font-plus-medium text-text-secondary">{commune.region}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowCommunePicker(false)}
              className="mt-3 items-center justify-center rounded-full bg-primarySoft py-2.5">
              <Text className="font-plus-semibold text-[13px] text-primary">Cancelar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <BottomDock />
    </View>
  );
}

function SearchButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="mt-3 flex-row items-center justify-center rounded-full bg-primary py-4" style={{ minWidth: 250 }}>
      <MapPin size={16} color="#FFFFFF" strokeWidth={2.4} />
      <Text className="ml-2 font-plus-semibold text-[14px] text-white">{label}</Text>
    </Pressable>
  );
}
