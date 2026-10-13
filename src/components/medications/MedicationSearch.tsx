import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ChevronRight, Pill, Search, UserX, X } from 'lucide-react-native';

import { colors } from '@/constants/colors';
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
};

const DEBOUNCE_MS = 300;
const MAX_DESCRIPTION_LENGTH = 80;

export function MedicationSearch({ selectedId, onSelect }: Props) {
  const { session } = useAuth();

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [results, setResults] = useState<MedicationResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);

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
            setStatus('idle');
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
    onSelect?.(medication);
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
            placeholder="Nombre o codigo de medicamento"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            className="ml-3 flex-1 font-plus-medium text-[14px] text-text-primary"
          />
          {query.length > 0 ? (
            <Pressable onPress={handleClear} hitSlop={10} className="h-8 w-8 items-center justify-center rounded-full">
              <X size={16} color={colors.textSecondary} strokeWidth={2.4} />
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
  const truncatedDescription =
    medication.description && medication.description.length > MAX_DESCRIPTION_LENGTH
      ? `${medication.description.slice(0, MAX_DESCRIPTION_LENGTH)}…`
      : medication.description;

  return (
    <Pressable
      onPress={() => onSelect(medication)}
      className={`flex-row items-start px-4 py-3 ${isLast ? '' : 'border-b border-black/5'}`}
      style={isSelected ? { backgroundColor: colors.primarySoft } : undefined}>
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
        {truncatedDescription ? (
          <Text numberOfLines={2} className="mt-0.5 font-plus-medium text-[11px] leading-4 text-text-secondary">
            {truncatedDescription}
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
