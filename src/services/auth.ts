import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { getSupabase } from '@/lib/supabase';

export type AuthResult = {
  user: User | null;
  session: Session | null;
};

type Credentials = {
  email: string;
  password: string;
};

type SignUpParams = Credentials & {
  data?: Record<string, unknown>;
  emailRedirectTo?: string;
};

function rethrow(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export async function signUp({ email, password, data, emailRedirectTo }: SignUpParams): Promise<AuthResult> {
  const { data: result, error } = await getSupabase().auth.signUp({
    email,
    password,
    options: {
      data,
      emailRedirectTo,
    },
  });
  rethrow(error);
  return { user: result.user, session: result.session };
}

export async function signIn({ email, password }: Credentials): Promise<AuthResult> {
  const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
  rethrow(error);
  return { user: data.user, session: data.session };
}

export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut();
  rethrow(error);
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession();
  rethrow(error);
  return data.session;
}

export async function resetPassword(
  email: string,
  redirectTo: string = Linking.createURL('reset-password'),
): Promise<void> {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email, { redirectTo });
  rethrow(error);
}
