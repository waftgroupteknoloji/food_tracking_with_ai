import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';

export default function AuthLayout() {
  const status = useAuthStore((s) => s.status);
  if (status === 'authed') return <Redirect href="/(tabs)" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
