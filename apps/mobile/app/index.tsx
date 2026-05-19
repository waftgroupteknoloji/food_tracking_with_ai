import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  if (status === 'authed') return <Redirect href="/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}
