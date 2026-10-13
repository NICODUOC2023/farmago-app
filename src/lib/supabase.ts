import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL } from '@/constants/env';
import type { Database } from '@/types/database.types';

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Supabase no está configurado. Definí EXPO_PUBLIC_SUPABASE_URL y ' +
        'EXPO_PUBLIC_SUPABASE_ANON_KEY en tu archivo .env (mirá .env.example).',
    );
    this.name = 'SupabaseNotConfiguredError';
  }
}

let client: SupabaseClient<Database> | null = null;

/**
 * Devuelve el cliente Supabase singleton.
 *
 * El cliente se crea de forma perezosa (lazy): si faltan las variables de
 * entorno, NO se construye y se lanza un error claro en lugar de exponer un
 * cliente roto. Nunca usar la service_role key aquí.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (!isSupabaseConfigured) {
    throw new SupabaseNotConfiguredError();
  }

  if (!client) {
    client = createClient<Database>(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        // En native el callback PKCE llega por deep link y se canjea a mano
        // (exchangeCodeForSession); en web conviene que la librería lo detecte.
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    });
  }

  return client;
}

export { isSupabaseConfigured };
