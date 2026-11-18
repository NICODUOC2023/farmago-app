import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

import { colors } from '@/constants/colors';
import { useAuth } from '@/providers/AuthProvider';
import { signUp, resetPassword } from '@/services/auth';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const router = useRouter();
  const { session, signIn, signOut, isLoading } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registrationInProgress, setRegistrationInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (session && !registrationInProgress) {
      router.replace('/');
    }
  }, [session, registrationInProgress, router]);

  const isRegister = mode === 'register';

  const clearError = () => {
    if (error) setError(null);
  };

  const submit = async () => {
    if (busy || isLoading) return;

    if (!email.trim()) {
      setError('Ingresa tu correo.');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña.');
      return;
    }
    if (isRegister) {
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }
    }

    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (isRegister) {
        setRegistrationInProgress(true);
        const result = await signUp({ email: email.trim(), password });
        if (result.session) await signOut();
        setMode('login');
        setInfo('Cuenta creada con éxito. Ahora puedes loguearte con tu nueva cuenta.');
        setPassword('');
        setConfirmPassword('');
        setShowPassword(false);
        setShowConfirmPassword(false);
      } else {
        await signIn({ email: email.trim(), password });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos completar la acción.');
    } finally {
      setBusy(false);
      setRegistrationInProgress(false);
    }
  };

  const reset = async () => {
    if (busy || isLoading) return;
    if (!email.trim()) {
      setError('Ingresa tu correo para recuperar la contraseña.');
      return;
    }
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setInfo('Te enviamos un enlace para restablecer tu contraseña.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos enviar el enlace.');
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    height: 54,
    borderRadius: 14,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: '#E7E4F6',
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32 }}
        keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 300, alignSelf: 'center'}}>
          <View style={{ width: '100%', maxWidth: 220, height: 120, alignSelf: 'center', marginBottom: 0, overflow: 'hidden' }}>
            <Image
              source={require('../../assets/images/logofinal.png')}
              style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
              accessibilityLabel="farmaGO"
            />
         
          </View>

          <View style={{ gap: 12 }}>
            <View>
              <Text style={{ marginBottom: 6, fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>Correo electrónico</Text>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  clearError();
                }}
                placeholder="tu@correo.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                accessibilityLabel="Correo electrónico"
                style={inputStyle}
              />
            </View>

            <View>
              <Text style={{ marginBottom: 6, fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>Contraseña</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={password}
                  onChangeText={(v) => {
                    setPassword(v);
                    clearError();
                  }}
                  placeholder="********"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showPassword}
                  textContentType={isRegister ? 'newPassword' : 'password'}
                  returnKeyType={isRegister ? 'next' : 'done'}
                  onSubmitEditing={isRegister ? undefined : submit}
                  accessibilityLabel="Contraseña"
                  style={{ ...inputStyle, paddingRight: 52 }}
                />
                <Pressable
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  hitSlop={8}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: 6,
                    height: 42,
                    width: 42,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} strokeWidth={2} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} strokeWidth={2} />
                  )}
                </Pressable>
              </View>
            </View>

            {isRegister ? (
              <View>
                <Text style={{ marginBottom: 6, fontSize: 12, fontWeight: '500', color: colors.textSecondary }}>Repetir contraseña</Text>
                <View style={{ position: 'relative' }}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      clearError();
                    }}
                    placeholder="Repite la contraseña"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showConfirmPassword}
                    textContentType="newPassword"
                    returnKeyType="done"
                    onSubmitEditing={submit}
                    accessibilityLabel="Repetir contraseña"
                    style={{ ...inputStyle, paddingRight: 52 }}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    hitSlop={8}
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: 6,
                      height: 42,
                      width: 42,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={colors.textSecondary} strokeWidth={2} />
                    ) : (
                      <Eye size={20} color={colors.textSecondary} strokeWidth={2} />
                    )}
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>

          {error ? (
            <View style={{ marginTop: 16, borderRadius: 12, backgroundColor: '#FDECEA', paddingHorizontal: 14, paddingVertical: 10 }} accessibilityRole="alert">
              <Text style={{ fontSize: 13, color: '#D6455D' }}>{error}</Text>
            </View>
          ) : null}

          {info ? (
            <View style={{ marginTop: 16, borderRadius: 12, backgroundColor: '#E6F7F5', paddingHorizontal: 14, paddingVertical: 10 }} accessibilityRole="alert">
              <Text style={{ fontSize: 13, color: '#2F9E8F' }}>{info}</Text>
            </View>
          ) : null}

          {isRegister ? (
            <Text style={{ marginTop: 12, fontSize: 12, color: colors.textSecondary, textAlign: 'center' }}>
              Completa tus datos para crear tu cuenta y acceder a farmaGO.
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={busy || isLoading}
            accessibilityRole="button"
            style={{
              marginTop: 20,
              height: 54,
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.primary,
              opacity: busy || isLoading ? 0.6 : 1,
            }}>
            {busy || isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
              </Text>
            )}
          </Pressable>

          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            {!isRegister ? (
              <Pressable onPress={reset} disabled={busy || isLoading} accessibilityRole="button">
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>¿Olvidaste tu contraseña?</Text>
              </Pressable>
            ) : (
              <View />
            )}
            <Pressable
              onPress={() => {
                setMode(isRegister ? 'login' : 'register');
                setError(null);
                setInfo(null);
              }}
              accessibilityRole="button">
              <Text style={{ fontSize: 13, fontWeight: '400', color: colors.primary }}>
                {isRegister ? 'Ya tengo cuenta' : 'Crear cuenta'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
