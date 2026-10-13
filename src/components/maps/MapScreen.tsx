import Constants from 'expo-constants';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Info, LogIn, MapPin, Menu, Navigation, Pill, RefreshCw } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MedicationSearch } from '@/components/medications/MedicationSearch';
import { PharmacyMap } from '@/components/maps/PharmacyMap';
import { BottomDock } from '@/components/ui/BottomDock';
import { colors } from '@/constants/colors';
import { SANTIAGO_CENTER } from '@/data/mock';
import { useAuth } from '@/providers/AuthProvider';
import { getCurrentCoordinates, LocationError, type Coordinates } from '@/services/location';
import {
  findNearbyPharmacies,
  formatDistance,
  PharmacySearchError,
  type NearbyPharmacy,
} from '@/services/pharmacies';
import type { MedicationResult } from '@/services/medications';

type SearchStatus = 'idle' | 'locating' | 'searching' | 'success' | 'error';

const CARD = 'rounded-3xl bg-surface px-4 py-4 shadow-lg shadow-indigo-950/10';

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const { session, signIn } = useAuth();

  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [pharmacies, setPharmacies] = useState<NearbyPharmacy[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canOpenSettings, setCanOpenSettings] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<MedicationResult | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

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

  const runSearch = useCallback(async () => {
    if (!session) {
      return;
    }

    setErrorMessage(null);
    setCanOpenSettings(false);
    setStatus('locating');

    try {
      const coordinates = await getCurrentCoordinates();
      setUserLocation(coordinates);

      setStatus('searching');
      const results = await findNearbyPharmacies({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      setPharmacies(results);
      setSelectedId(results[0]?.id ?? null);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      if (error instanceof LocationError) {
        setCanOpenSettings(error.code === 'permission_denied');
        setErrorMessage(error.message);
      } else if (error instanceof PharmacySearchError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Ocurrió un error inesperado. Intentá de nuevo.');
      }
    }
  }, [session]);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password) {
      setSignInError('Ingresá tu correo y contraseña.');
      return;
    }

    setSignInError(null);
    setSigningIn(true);
    try {
      await signIn({ email: email.trim(), password });
      setPassword('');
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'No pudimos iniciar sesión.');
    } finally {
      setSigningIn(false);
    }
  }, [email, password, signIn]);

  return (
    <View className="flex-1 bg-background" style={{ flex: 1 }}>
      <PharmacyMap
        userLocation={userLocation ?? SANTIAGO_CENTER}
        pharmacies={pharmacies}
        selectedId={selectedId}
        onSelectPharmacy={setSelectedId}
      />

      {/* Header: buscador de medicamentos (antes del mapa) + indicador de seleccion */}
      <View style={{ position: 'absolute', top: insets.top + 12, left: 16, right: 16 }} className="z-10">
        <View className="flex-row items-center">
          <Pressable className="h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface shadow-md shadow-indigo-900/10">
            <Menu size={21} color={colors.textPrimary} strokeWidth={2.2} />
          </Pressable>
          <View className="ml-3 flex-1">
            {session ? (
              <MedicationSearch selectedId={selectedMedication?.id} onSelect={setSelectedMedication} />
            ) : (
              <Pressable className="flex-row items-center rounded-3xl bg-surface py-3 pl-4 pr-1 shadow-md shadow-indigo-900/10">
                <Text numberOfLines={1} className="flex-1 pr-2 font-plus-medium text-[14px] text-text-secondary">
                  ¿Qué medicamento estás buscando?
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
      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 132 }} className="z-10">
        {!session ? (
          <SignInCard
            email={email}
            password={password}
            loading={signingIn}
            error={signInError}
            onChangeEmail={setEmail}
            onChangePassword={setPassword}
            onSubmit={handleSignIn}
          />
        ) : status === 'idle' ? (
          <View className={CARD}>
            <Text className="font-plus-semibold text-[15px] text-text-primary">
              Encontrá farmacias con stock cerca tuyo
            </Text>
            <Text className="mt-1 font-plus-medium text-[13px] text-text-secondary">
              Usamos tu ubicación solo para esta búsqueda.
            </Text>
            <SearchButton label="Buscar farmacias cercanas" onPress={runSearch} />
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
                onPress={runSearch}
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
              No hay farmacias registradas en un radio de 5 km.
            </Text>
            <SearchButton label="Buscar de nuevo" onPress={runSearch} />
          </View>
        ) : (
          <View className={CARD}>
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
                <View className="mt-1 flex-row items-center">
                  <Navigation size={12} color={colors.textSecondary} strokeWidth={2.4} />
                  <Text className="ml-1 font-plus-medium text-[12px] text-text-secondary">
                    {selectedPharmacy ? formatDistance(selectedPharmacy.distanceM) : ''}
                  </Text>
                  {selectedPharmacy?.isAvailable ? (
                    <View
                      className="ml-2 rounded-full px-2 py-0.5"
                      style={{ backgroundColor: colors.accentSoft }}>
                      <Text className="font-plus-semibold text-[11px]" style={{ color: '#2F9E8F' }}>
                        Con stock
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              {selectedPharmacy?.price != null ? (
                <Text className="ml-2 font-plus-bold text-[15px] text-primary">
                  ${selectedPharmacy.price.toLocaleString('es-CL')}
                </Text>
              ) : null}
            </View>

            <View className="mt-3 flex-row items-center justify-between border-t border-black/5 pt-3">
              <Text className="font-plus-medium text-[12px] text-text-secondary">
                {pharmacies.length} {pharmacies.length === 1 ? 'farmacia' : 'farmacias'} cerca
              </Text>
              <Pressable onPress={runSearch} className="flex-row items-center">
                <RefreshCw size={13} color={colors.primary} strokeWidth={2.6} />
                <Text className="ml-1 font-plus-semibold text-[12px] text-primary">Actualizar</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <BottomDock />
    </View>
  );
}

type SignInCardProps = {
  email: string;
  password: string;
  loading: boolean;
  error: string | null;
  onChangeEmail: (value: string) => void;
  onChangePassword: (value: string) => void;
  onSubmit: () => void;
};

// Acceso mínimo para habilitar la búsqueda (que requiere sesión). Reemplazar por
// la pantalla de autenticación definitiva cuando esté lista.
function SignInCard({
  email,
  password,
  loading,
  error,
  onChangeEmail,
  onChangePassword,
  onSubmit,
}: SignInCardProps) {
  return (
    <View className={CARD}>
      <View className="flex-row items-center">
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: colors.primarySoft }}>
          <LogIn size={18} color={colors.primary} strokeWidth={2.4} />
        </View>
        <Text className="ml-3 flex-1 font-plus-semibold text-[15px] text-text-primary">
          Iniciá sesión para buscar farmacias
        </Text>
      </View>

      <TextInput
        value={email}
        onChangeText={onChangeEmail}
        placeholder="Correo electrónico"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        className="mt-3 rounded-2xl bg-background px-4 py-3 font-plus-medium text-[14px] text-text-primary"
      />
      <TextInput
        value={password}
        onChangeText={onChangePassword}
        placeholder="Contraseña"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        className="mt-2 rounded-2xl bg-background px-4 py-3 font-plus-medium text-[14px] text-text-primary"
      />

      {error ? (
        <Text className="mt-2 font-plus-medium text-[12px]" style={{ color: '#D6455D' }}>
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={onSubmit}
        disabled={loading}
        className="mt-3 items-center justify-center rounded-full bg-primary py-3"
        style={{ opacity: loading ? 0.6 : 1 }}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="font-plus-semibold text-[14px] text-white">Iniciar sesión</Text>
        )}
      </Pressable>
    </View>
  );
}

function SearchButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-3 flex-row items-center justify-center rounded-full bg-primary py-3">
      <MapPin size={16} color="#FFFFFF" strokeWidth={2.4} />
      <Text className="ml-2 font-plus-semibold text-[14px] text-white">{label}</Text>
    </Pressable>
  );
}
