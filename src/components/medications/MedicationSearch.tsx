import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronRight, MapPin, Pill, Search, UserX, X } from "lucide-react-native";

import { colors } from '@/constants/colors';
import { saveRecentSearch } from '@/services/recentSearches';
import { useAuth } from '@/providers/AuthProvider';
import {
  MedicationSearchError,
  MedicationResult,
  searchMedications,
} from '@/services/medications';

type SearchStatus = 'idle' | 'searching' | 'results' | 'no_results' | 'error';

type Props = {
  selectedId?: string | null;
  onSelect?: (medication: MedicationResult) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  locationLabel?: string;
  onLocationPress?: () => void;
  initialQuery?: string;
};

const DEBOUNCE_MS = 300;

export function MedicationSearch({ selectedId, onSelect, onFocus, onBlur, locationLabel, onLocationPress, initialQuery }: Props) {
  const { session } = useAuth();

  const [query, setQuery] = useState(initialQuery ?? '');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<MedicationResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (initialQuery && initialQuery.trim().length >= 2) {
      setTimeout(() => setQuery(initialQuery), 0);
      const requestId = ++requestIdRef.current;
      (async () => {
        try {
          const medications = await searchMedications(initialQuery);
          if (requestId !== requestIdRef.current) return;
          setResults(medications);
          setStatus(medications.length > 0 ? 'results' : 'no_results');
        } catch {
          // ignore
        }
      })();
    }
  }, [initialQuery]);

  const resetResults = useCallback(() => {
    setResults([]);
    setErrorMessage(null);
    setStatus('idle');
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    setQuery(value);

    if (value.trim().length < 2) {
      resetResults();
      return;
    }

    setStatus('searching');
    setErrorMessage(null);
  }, [resetResults]);

  useEffect(() => {
    if (query.trim().length < 2) {
      return;
    }

    const requestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(async () => {
      try {
        const medications = await searchMedications(query);

        if (requestId !== requestIdRef.current) {
          return;
        }

        setResults(medications);
        setStatus(medications.length > 0 ? 'results' : 'no_results');
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return;
        }

        setResults([]);
        if (error instanceof MedicationSearchError) {
          if (error.code === 'not_authenticated') {
            setErrorMessage('Iniciá sesión para buscar medicamentos.');
            setStatus('error');
            return;
          }
          setErrorMessage(
            error.code === 'not_configured'
              ? 'El buscador no esta configurado todavia.'
              : 'No pudimos realizar la busqueda. Intenta de nuevo.',
          );
        } else {
          setErrorMessage('Ocurrio un error inesperado.');
        }
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleSelect = (medication: MedicationResult) => {
    void saveRecentSearch(medication);
    onSelect?.(medication);
    // Cerramos el dropdown y limpiamos la consulta tras seleccionar.
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setQuery('');
    resetResults();
  };

  const handleClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setQuery('');
    resetResults();
  };

  if (!session) {
    return (
      <View className="rounded-3xl bg-surface px-4 py-3 shadow-lg shadow-indigo-950/10">
        <View className="flex-row items-center">
          <UserX size={18} color={colors.textSecondary} strokeWidth={2.2} />
          <Text className="ml-3 flex-1 font-plus-medium text-[13px] text-text-secondary">
            Inicia sesión para buscar medicamentos
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View>
      <View className="rounded-3xl bg-surface px-4 py-3 shadow-lg shadow-indigo-950/10">
        <View className="flex-row items-center">
          <Search size={18} color={colors.textSecondary} strokeWidth={2.2} />
          <TextInput
            value={query}
            onChangeText={handleQueryChange}
            placeholder="¿Qué estás buscando?"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onFocus={onFocus}
            onBlur={onBlur}
            className="ml-3 flex-1 font-plus-medium text-[14px] text-text-primary"
          />
          {query.length > 0 ? (
            <Pressable onPress={handleClear} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda" className="h-8 w-8 items-center justify-center rounded-full">
              <X size={16} color={colors.textSecondary} strokeWidth={2.4} />
            </Pressable>
          ) : null}
          {locationLabel ? (
            <Pressable
              onPress={onLocationPress}
              disabled={!onLocationPress}
              accessibilityRole="button"
              accessibilityLabel={locationLabel}
              className="ml-2 flex-row items-center gap-1">
              <MapPin size={12} color={colors.primary} strokeWidth={2.4} />
              <Text className="text-[11px] font-plus-semibold text-primary">{locationLabel}</Text>
            </Pressable>
          ) : null}
        </View>

        {status === 'searching' ? (
          <View className="mt-3 flex-row items-center">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="ml-3 font-plus-medium text-[12px] text-text-secondary">
              Buscando medicamentos…
            </Text>
          </View>
        ) : null}

        {status === 'error' && errorMessage ? (
          <Text className="mt-2 font-plus-medium text-[12px]" style={{ color: '#D6455D' }}>
            {errorMessage}
          </Text>
        ) : null}

        {status === 'no_results' ? (
          <Text className="mt-2 font-plus-medium text-[12px] text-text-secondary">
            {`No encontramos medicamentos para: ${query.trim()}`}
          </Text>
        ) : null}
      </View>

      {status === 'results' ? (
        <View className="mt-2 overflow-hidden rounded-3xl bg-surface shadow-lg shadow-indigo-950/10">
          {results.map((medication, index) => (
            <ResultItem
              key={medication.id}
              medication={medication}
              isSelected={medication.id === selectedId}
              isLast={index === results.length - 1}
              onSelect={handleSelect}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

type ResultItemProps = {
  medication: MedicationResult;
  isSelected: boolean;
  isLast: boolean;
  onSelect: (medication: MedicationResult) => void;
};

function ResultItem({ medication, isSelected, isLast, onSelect }: ResultItemProps) {
  return (
    <Pressable
      onPress={() => onSelect(medication)}
      className="flex-row items-start px-4 py-3"
      style={[
        isSelected ? { backgroundColor: colors.primarySoft } : undefined,
        !isLast && styles.resultSeparator,
      ]}
    >
      <View
        className="mt-0.5 h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: isSelected ? colors.accentSoft : '#F4F3FB' }}>
        <Pill size={16} color={isSelected ? colors.primary : colors.textSecondary} strokeWidth={2.2} />
      </View>
      <View className="ml-3 flex-1">
        <Text numberOfLines={2} className="font-plus-semibold text-[14px] text-text-primary">
          {medication.name}
        </Text>
        {medication.presentation_unit ? (
          <Text numberOfLines={1} className="mt-0.5 font-plus-medium text-[12px] text-text-secondary">
            {medication.presentation_unit}
          </Text>
        ) : null}

        {medication.barcode ? (
          <Text numberOfLines={1} className="mt-1 font-plus-medium text-[10px] text-text-secondary">
            {`Codigo: ${medication.barcode}`}
          </Text>
        ) : null}
      </View>
      {isSelected ? (
        <View className="mt-1 h-7 w-7 items-center justify-center rounded-full bg-primary">
          <ChevronRight size={14} color="#FFFFFF" strokeWidth={2.6} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  resultSeparator: {
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    borderBottomWidth: 1,
  },
});
