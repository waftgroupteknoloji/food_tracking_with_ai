import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RegisterInputSchema, type RegisterInput } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ApiError } from '@yemek-takip/api-client';
import { TextField } from '@/components/ui/text-field';
import { PressableButton } from '@/components/ui/pressable-button';

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterInputSchema),
    defaultValues: { email: '', password: '', displayName: '' },
  });

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await api.auth.register(data);
      await setAuth({
        user: result.user,
        tokens: { accessToken: result.accessToken, refreshToken: result.refreshToken },
      });
      router.replace('/(tabs)');
    } catch (err) {
      console.error('[register] error:', err);
      setServerError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? `Bağlantı hatası: ${err.message}`
            : 'Kayıt başarısız',
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
              Hadi başlayalım
            </Text>
            <Text className="mt-2 text-neutral-600 dark:text-neutral-400">
              Birkaç saniyede hesap oluştur, kalori takibine başla.
            </Text>
          </View>

          <View className="gap-4">
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextField
                  label="İsim"
                  placeholder="Adın"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoComplete="name"
                  error={errors.displayName?.message}
                />
              )}
            />
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
                  autoComplete="new-password"
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
              title={submitting ? 'Hesap oluşturuluyor…' : 'Hesap Oluştur'}
              loading={submitting}
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          <View className="items-center">
            <Text className="text-sm text-neutral-600 dark:text-neutral-400">
              Hesabın var mı?{' '}
              <Link href="/(auth)/login" className="text-primary-600 font-semibold">
                Giriş yap
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
