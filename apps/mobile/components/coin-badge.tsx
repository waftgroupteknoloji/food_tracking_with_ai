import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

export const COIN_BALANCE_QUERY_KEY = ['coins', 'balance'] as const;

export function CoinBadge() {
  const router = useRouter();
  const userCoins = useAuthStore((s) => s.user?.coins ?? null);
  const userActive = useAuthStore((s) => s.user?.hasActiveSubscription ?? false);

  const q = useQuery({
    queryKey: COIN_BALANCE_QUERY_KEY,
    queryFn: () => api.coins.balance(),
    staleTime: 15_000,
    // İlk yüklemede auth-store'daki kullanıcı bilgisinden bekle, dahasını sunucudan al.
    initialData: () =>
      userCoins !== null
        ? {
            coins: userCoins,
            subscription: null,
            hasActiveSubscription: userActive,
          }
        : undefined,
  });

  const coins = q.data?.coins ?? null;
  const active = q.data?.hasActiveSubscription ?? false;

  return (
    <Pressable
      onPress={() => router.push('/coins')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: active ? 'rgba(251, 191, 36, 0.18)' : 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        borderColor: active ? 'rgba(251, 191, 36, 0.4)' : 'rgba(0,0,0,0.08)',
      }}
    >
      <Text style={{ fontSize: 14 }}>🪙</Text>
      {q.isLoading && coins === null ? (
        <ActivityIndicator size="small" />
      ) : (
        <Text style={{ fontWeight: '700', fontSize: 13 }}>
          {active ? '∞' : (coins ?? '—')}
        </Text>
      )}
    </Pressable>
  );
}
