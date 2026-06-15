import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { OdematikPaymentSheet } from '@odematik/billing/native';
import { api, API_BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type {
  CoinPackage,
  CoinPackageId,
  CoinTransaction,
  SubscriptionPlan,
  SubscriptionPlanId,
} from '@yemek-takip/validators';
import { C } from '@/lib/theme';
import { COIN_BALANCE_QUERY_KEY } from '@/components/coin-badge';

const COINS_HISTORY_KEY = ['coins', 'transactions'] as const;

export default function CoinsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const me = useAuthStore((s) => s.user);
  // Ödeme akışı tamamen @odematik/billing/native içindeki OdematikPaymentSheet
  // tarafından yönetilir — burada sadece hangi planId ödeniyor onu tutuyoruz.
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [payingAccent, setPayingAccent] = useState<string | undefined>(undefined);

  const balance = useQuery({
    queryKey: COIN_BALANCE_QUERY_KEY,
    queryFn: () => api.coins.balance(),
  });
  const catalog = useQuery({
    queryKey: ['coins', 'catalog'],
    queryFn: () => api.coins.catalog(),
    staleTime: 5 * 60_000,
  });
  const history = useQuery({
    queryKey: COINS_HISTORY_KEY,
    queryFn: () => api.coins.transactions(20),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: COIN_BALANCE_QUERY_KEY });
    qc.invalidateQueries({ queryKey: COINS_HISTORY_KEY });
    void refreshMe();
  };

  const requireLogin = () => {
    if (!me) {
      Alert.alert('Giriş gerekli', 'Ödeme yapabilmek için önce giriş yap.');
      return false;
    }
    return true;
  };

  const openPayment = (planId: string, accent?: string) => {
    if (!requireLogin()) return;
    setPayingAccent(accent);
    setPayingPlanId(planId);
  };

  const handlePurchase = (id: CoinPackageId) => {
    const pkg = catalog.data?.packages.find((p: CoinPackage) => p.id === id);
    if (!pkg) return;
    openPayment(pkg.id);
  };

  const handleSubscribe = (id: SubscriptionPlanId) => {
    const plan = catalog.data?.plans.find((p: SubscriptionPlan) => p.id === id);
    if (!plan) return;
    openPayment(plan.id, plan.id === 'yearly' ? '#d4a949' : undefined);
  };

  const handlePaid = () => {
    Alert.alert(
      '✓ Ödeme başarılı',
      payingPlanId === 'monthly' || payingPlanId === 'yearly'
        ? 'Üyeliğin aktifleştirildi.'
        : 'Coin paketin hesabına eklendi.',
    );
    invalidate();
  };

  const coins = balance.data?.coins ?? 0;
  const hasActiveSub = balance.data?.hasActiveSubscription ?? false;
  const subExpiry = balance.data?.subscription?.expiresAt;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Coin & Üyelik',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 4 }}>
              <Ionicons name="chevron-back" size={26} color={C.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 40 }}>
          {/* Balance hero */}
          <View
            style={{
              padding: 20,
              borderRadius: 18,
              backgroundColor: hasActiveSub ? 'rgba(251, 191, 36, 0.12)' : C.surface2,
              borderWidth: 1,
              borderColor: hasActiveSub ? 'rgba(251, 191, 36, 0.4)' : C.border,
            }}
          >
            <Text style={{ color: C.text3, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Bakiyen
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
              <Text style={{ fontSize: 38 }}>🪙</Text>
              <Text style={{ fontSize: 40, fontWeight: '800', color: C.text }}>
                {hasActiveSub ? '∞' : coins}
              </Text>
              {!hasActiveSub && (
                <Text style={{ fontSize: 14, color: C.text3, fontWeight: '500' }}>coin</Text>
              )}
            </View>
            {hasActiveSub && subExpiry && (
              <Text style={{ marginTop: 6, color: '#fbbf24', fontSize: 12 }}>
                ✨ Sınırsız üyelik aktif — bitiş:{' '}
                {new Date(subExpiry as string | Date).toLocaleDateString('tr-TR')}
              </Text>
            )}
          </View>

          {/* Ad reward — yakında (reklam entegrasyonu henüz aktif değil) */}
          {!hasActiveSub && (
            <View>
              <Text style={styles.h3}>Reklam izle, coin kazan</Text>
              <View
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: C.surface2,
                  borderWidth: 1,
                  borderColor: C.border,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: 0.7,
                }}
              >
                <Ionicons name="time-outline" size={20} color={C.text3} />
                <Text style={{ color: C.text3, fontWeight: '700' }}>
                  Reklam izle (+1 coin) · Yakında
                </Text>
              </View>
              <Text style={{ color: C.text3, fontSize: 11.5, marginTop: 6 }}>
                Reklam ile coin kazanma özelliği çok yakında eklenecek.
              </Text>
            </View>
          )}

          {/* Subscription */}
          <View>
            <Text style={styles.h3}>
              {hasActiveSub ? 'Üyeliği uzat' : 'Sınırsız üyelik'}
            </Text>
            <View style={{ gap: 10 }}>
              {catalog.data?.plans.map((plan: SubscriptionPlan) => (
                <Pressable
                  key={plan.id}
                  onPress={() => handleSubscribe(plan.id)}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor:
                      plan.id === 'yearly' ? 'rgba(251, 191, 36, 0.08)' : C.surface2,
                    borderWidth: 1,
                    borderColor:
                      plan.id === 'yearly' ? 'rgba(251, 191, 36, 0.45)' : C.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>
                      {plan.label}
                    </Text>
                    <Text style={{ color: C.text3, fontSize: 12, marginTop: 2 }}>
                      {plan.id === 'yearly' ? 'Yıl boyunca sınırsız' : 'Ay boyunca sınırsız'}
                    </Text>
                  </View>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 18 }}>
                    {plan.priceTRY} ₺
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Packages */}
          <View>
            <Text style={styles.h3}>Coin paketleri</Text>
            <View style={{ gap: 10 }}>
              {catalog.data?.packages.map((pkg: CoinPackage) => (
                <Pressable
                  key={pkg.id}
                  onPress={() => handlePurchase(pkg.id)}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    backgroundColor: C.surface2,
                    borderWidth: 1,
                    borderColor: C.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 26 }}>🪙</Text>
                    <View>
                      <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>
                        {pkg.coins} Coin
                      </Text>
                      <Text style={{ color: C.text3, fontSize: 12 }}>{pkg.label}</Text>
                    </View>
                  </View>
                  <Text style={{ color: C.text, fontWeight: '800', fontSize: 17 }}>
                    {pkg.priceTRY} ₺
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* History */}
          <View>
            <Text style={styles.h3}>Son hareketler</Text>
            <View
              style={{
                borderRadius: 12,
                backgroundColor: C.surface2,
                borderWidth: 1,
                borderColor: C.border,
                overflow: 'hidden',
              }}
            >
              {history.data?.items.length === 0 && (
                <Text style={{ padding: 16, color: C.text3, fontSize: 13 }}>
                  Henüz hareket yok.
                </Text>
              )}
              {history.data?.items.map((tx: CoinTransaction, idx: number) => (
                <View
                  key={tx._id}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderTopWidth: idx === 0 ? 0 : 1,
                    borderTopColor: C.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 13.5, fontWeight: '500' }}>
                      {labelForType(tx.type)}
                    </Text>
                    <Text style={{ color: C.text3, fontSize: 11, marginTop: 2 }}>
                      {new Date(tx.createdAt as string | Date).toLocaleString('tr-TR')}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: tx.amount > 0 ? '#86efac' : tx.amount < 0 ? '#fca5a5' : C.text3,
                      fontWeight: '700',
                      fontSize: 14,
                    }}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <OdematikPaymentSheet
        visible={!!payingPlanId}
        planId={payingPlanId}
        customer={{
          id: me?._id ?? '',
          email: me?.email ?? '',
        }}
        apiBaseUrl={API_BASE_URL}
        getAuthToken={() => SecureStore.getItemAsync('auth_access')}
        brand={{ name: 'Yemek Takip', accent: payingAccent }}
        onClose={() => setPayingPlanId(null)}
        onPaid={handlePaid}
        onError={(err: Error) => Alert.alert('Ödeme hatası', err.message)}
      />
    </>
  );
}

const styles = {
  h3: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
};

function labelForType(type: string) {
  switch (type) {
    case 'signup_bonus':
      return 'Hoş geldin bonusu';
    case 'analysis_spend':
      return 'AI analizi';
    case 'analysis_refund':
      return 'Analiz iadesi';
    case 'ad_reward':
      return 'Reklam ödülü';
    case 'purchase':
      return 'Coin paketi';
    case 'subscription_grant':
      return 'Üyelik';
    case 'manual_adjust':
      return 'Manuel düzeltme';
    default:
      return type;
  }
}
