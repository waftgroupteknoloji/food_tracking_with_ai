import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginInputSchema, type LoginInput } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@yemek-takip/api-client';
import { TextField } from '@/components/ui/text-field';
import { PressableButton } from '@/components/ui/pressable-button';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await api.auth.login(data);
      await setAuth({
        user: result.user,
        tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken },
      });
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[login] error:', err);
      setServerError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? `Bağlantı hatası: ${err.message}`
            : 'Giriş başarısız',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow px-6 justify-center py-12 gap-6">
          <View>
            <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              Tekrar hoşgeldin
            </Text>
            <Text className="mt-2 text-neutral-600 dark:text-neutral-400">
              Hesabına giriş yap ve günlüğünü aç.
            </Text>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextField
                  label="E-posta"
                  placeholder="sen@ornek.com"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  error={errors.email?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextField
                  label="Şifre"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  autoComplete="current-password"
                  error={errors.password?.message}
                />
              )}
            />
            {serverError && (
              <Text className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3">
                {serverError}
              </Text>
            )}
            <PressableButton
              title={submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
              loading={submitting}
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          <View className="items-center">
            <Text className="text-sm text-neutral-600 dark:text-neutral-400">
              Hesabın yok mu?{' '}
              <Link href="/(auth)/register" className="text-primary-600 font-semibold">
                Kayıt ol
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
