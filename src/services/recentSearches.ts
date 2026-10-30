import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { MedicationResult } from '@/services/medications';

export type RecentSearch = {
  id: string;
  query: string;
  medication_id: string | null;
  medication_name: string | null;
  created_at: string;
};

export async function saveRecentSearch(med: MedicationResult): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  await supabase.from('recent_searches').insert({
    user_id: session.user.id,
    query: med.name,
    search_type: 'medication',
    medication_id: med.id,
  });
}

export async function loadRecentSearches(): Promise<RecentSearch[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return [];
  const { data, error } = await supabase
    .from('recent_searches')
    .select('id, query, medication_id, created_at, medications(name)')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    query: r.query as string,
    medication_id: (r.medication_id as string) ?? null,
    medication_name: ((r.medications as Record<string, unknown> | null)?.name as string) ?? null,
    created_at: r.created_at as string,
  }));
}
