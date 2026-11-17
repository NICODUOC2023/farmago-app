import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MedicationResult } from '@/services/medications';

const STORAGE_KEY = 'farmago_recent_searches';
const MAX_ITEMS = 15;

export type RecentSearch = {
  id: string;
  query: string;
  medication_id: string | null;
  medication_name: string | null;
  created_at: string;
};

export async function saveRecentSearch(med: MedicationResult): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const list: RecentSearch[] = raw ? JSON.parse(raw) : [];
    const next: RecentSearch = {
      id: `${med.id}-${Date.now()}`,
      query: med.name,
      medication_id: med.id,
      medication_name: med.name,
      created_at: new Date().toISOString(),
    };
    const filtered = list.filter((r) => r.medication_id !== med.id);
    const updated = [next, ...filtered].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignorar errores de almacenamiento local.
  }
}

export async function loadRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
