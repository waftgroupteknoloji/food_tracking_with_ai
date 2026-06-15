import { Redirect } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { isProfileComplete } from '@/lib/profile';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  if (status === 'authed') {
    return <Redirect href={isProfileComplete(user) ? '/(tabs)' : '/onboarding'} />;
  }
  return <Redirect href="/(auth)/login" />;
}
