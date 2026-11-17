import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

export type ConsentType =
  | 'health_data_processing'
  | 'prescription_processing'
  | 'privacy_policy'
  | 'terms_of_service'
  | 'marketing'
  | 'geolocation_processing';

export async function hasConsent(type: ConsentType): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const supabase = getSupabase();
  const { data, error } = await (supabase as any).rpc('has_active_consent', { p_type: type });
  if (error) return false;
  return data === true;
}

export async function grantConsent(type: ConsentType, version = 'v1'): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabase();
  const { error } = await (supabase as any).rpc('grant_consent', {
    p_consent_type: type,
    p_policy_version: version,
  });
  if (error) throw new Error(error.message);
}

export async function revokeConsent(type: ConsentType): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabase();
  const { error } = await (supabase as any).rpc('revoke_consent', { p_consent_type: type });
  if (error) throw new Error(error.message);
}

export async function revokeAllConsents(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabase();
  const { error } = await (supabase as any).rpc('revoke_all_consents');
  if (error) throw new Error(error.message);
}

export async function exportMyData(): Promise<unknown> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabase();
  const { data, error } = await (supabase as any).rpc('export_my_data');
  if (error) throw new Error(error.message);
  return data;
}

export async function requestAccountDeletion(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabase();
  const { data, error } = await (supabase as any).rpc('request_account_deletion');
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}
