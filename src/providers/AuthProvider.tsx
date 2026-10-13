import type { Session, User } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { isSupabaseConfigured } from '@/constants/env';
import { getSupabase } from '@/lib/supabase';
import {
  resetPassword,
  signIn,
  signOut,
  signUp,
  type AuthResult,
} from '@/services/auth';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<AuthResult>;
  signUp: typeof signUp;
  signOut: typeof signOut;
  resetPassword: typeof resetPassword;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  // Si Supabase no está configurado no hay nada que cargar.
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    // Sin variables de entorno no intentamos crear el cliente para no romper
    // la app. La sesión queda nula y el consumidor decide qué hacer.
    if (!isSupabaseConfigured) {
      return;
    }

    let mounted = true;
    const supabase = getSupabase();

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
      })
      .catch(() => {
        if (mounted) setSession(null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isConfigured: isSupabaseConfigured,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider />.');
  }
  return value;
}
