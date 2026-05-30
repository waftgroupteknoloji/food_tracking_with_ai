import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { showRewardedAd } from '@/lib/ads';
import { ApiError } from '@yemek-takip/api-client';
import type {
  CoinPackage,
  CoinPackageId,
  CoinTransaction,
  SubscriptionPlan,
  SubscriptionPlanId,
} from '@yemek-takip/validators';
import { C } from '@/lib/theme';
import { COIN_BALANCE_QUERY_KEY } from '@/components/coin-badge';
import {
  OdematikPaymentSheet,
  type ProductSummary,
} from '@/components/OdematikPaymentSheet';

const COINS_HISTORY_KEY = ['coins', 'transactions'] as const;

export default function CoinsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const refreshMe = useAuthStore((s) => s.refreshMe);
  const me = useAuthStore((s) => s.user);
  const [watchingAd, setWatchingAd] = useState(false);
  const [paymentProduct, setPaymentProduct] = useState<ProductSummary | null>(null);

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

  const openPaymentSheet = (product: ProductSummary) => {
    if (!requireLogin()) return;
    setPaymentProduct(product);
  };

  const handlePurchase = (id: CoinPackageId) => {
    const pkg = catalog.data?.packages.find((p: CoinPackage) => p.id === id);
    if (!pkg) return;
    openPaymentSheet({
      productId: pkg.id,
      label: `${pkg.coins} Coin`,
      priceTRY: pkg.priceTRY,
      summary: `${pkg.coins} Coin · ${pkg.priceTRY} ₺`,
    });
  };

  const handleSubscribe = (id: SubscriptionPlanId) => {
    const plan = catalog.data?.plans.find((p: SubscriptionPlan) => p.id === id);
    if (!plan) return;
    openPaymentSheet({
      productId: `plan_${plan.id}`,
      label: plan.label,
      priceTRY: plan.priceTRY,
      summary: `${plan.label} · ${plan.priceTRY} ₺`,
      accent: plan.id === 'yearly' ? '#d4a949' : '#6366F1',
    });
  };

  const handlePaid = () => {
    Alert.alert(
      '✓ Ödeme başarılı',
      paymentProduct?.productId.startsWith('plan_')
        ? 'Üyeliğin aktifleştirildi.'
        : 'Coin paketin hesabına eklendi.',
    );
    invalidate();
  };

  const adReward = useMutation({
    mutationFn: (nonce: string) => api.coins.adReward(nonce, 'mobile'),
    onSuccess: (data) => {
      Alert.alert('Tebrikler 🪙', `+${data.awarded} coin kazandın!`);
      invalidate();
    },
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Bir hata oluştu'),
  });

  const handleWatchAd = async () => {
    setWatchingAd(true);
    try {
      const result = await showRewardedAd();
      adReward.mutate(result.adNonce);
    } catch (e) {
      Alert.alert('Reklam yüklenemedi', e instanceof Error ? e.message : 'Tekrar dene');
    } finally {
      setWatchingAd(false);
    }
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

          {/* Ad reward */}
          {!hasActiveSub && (
            <View>
              <Text style={styles.h3}>Reklam izle, coin kazan</Text>
              <Pressable
                onPress={handleWatchAd}
                disabled={watchingAd || adReward.isPending}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: C.lime,
                  alignItems: 'center',
                  opacity: watchingAd || adReward.isPending ? 0.6 : 1,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {watchingAd ? (
                  <>
                    <ActivityIndicator color="#000" />
                    <Text style={{ color: '#000', fontWeight: '700' }}>Reklam oynatılıyor…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="play-circle" size={20} color="#000" />
                    <Text style={{ color: '#000', fontWeight: '700' }}>
                      Reklam izle (+1 coin)
                    </Text>
                  </>
                )}
              </Pressable>
              <Text style={{ color: C.text3, fontSize: 11.5, marginTop: 6 }}>
                Reklamlar arası 30 sn bekleme · günlük en fazla 30 reklam
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
        visible={!!paymentProduct}
        product={paymentProduct}
        customer={{
          id: me?._id ?? '',
          email: me?.email ?? '',
        }}
        onClose={() => setPaymentProduct(null)}
        onPaid={handlePaid}
        onError={(err) => Alert.alert('Ödeme hatası', err.message)}
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
