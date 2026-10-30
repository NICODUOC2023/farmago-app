// Supabase. Solo la URL pública y la anon key deben vivir en el cliente.
// La service_role key JAMÁS debe declararse con el prefijo EXPO_PUBLIC_.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Supabase acepta tanto la anon key legacy como la nueva publishable key.
// Ambas son claves públicas aptas para el cliente. La service_role key JAMÁS
// debe declararse con el prefijo EXPO_PUBLIC_.
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
