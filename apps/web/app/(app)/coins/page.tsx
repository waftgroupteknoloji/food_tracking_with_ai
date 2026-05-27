'use client';

import { useState, type CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { OdematikButton } from '@odematik/billing';
import { api } from '@/lib/api';
import { COIN_BALANCE_QUERY_KEY } from '@/components/coin-badge';
import '@/components/bugun/bugun-tokens.css';

const COINS_HISTORY_KEY = ['coins', 'transactions'] as const;

function randomNonce() {
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CoinsPage() {
  const qc = useQueryClient();
  const [toast, setToast] = useState<string | null>(null);
  const [watchingAd, setWatchingAd] = useState(false);

  const balance = useQuery({
    queryKey: COIN_BALANCE_QUERY_KEY,
    queryFn: () => api.coins.balance(),
  });
  const me = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60_000,
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
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Ödeme akışı: <OdematikButton> productId ile mount edilir, klik açılır
  // modal'da PSP iframe'i gösterir, başarılı ödeme server-side doğrulanır,
  // /api/odematik handler'ı coin/subscription kreditlemesini yapar. Burada
  // sadece success callback'inde bakiyeyi invalidate ediyoruz.
  const handlePaid = (msg: string) => () => {
    invalidate();
    showToast(msg);
  };

  const adReward = useMutation({
    mutationFn: (nonce: string) => api.coins.adReward(nonce, 'web'),
    onSuccess: (data) => {
      showToast(`✓ +${data.awarded} coin kazandın!`);
      invalidate();
    },
    onError: (err: Error) => showToast(err.message),
  });

  const handleWatchAd = async () => {
    setWatchingAd(true);
    // TODO: gerçek Rewarded Ad SDK (AdSense Rewarded vb.) entegre et.
    // Şu an stub: kullanıcıya 3 sn ilerleme göster, sonra reward.
    await new Promise((r) => setTimeout(r, 3000));
    setWatchingAd(false);
    adReward.mutate(randomNonce());
  };

  const coins = balance.data?.coins ?? 0;
  const hasActiveSub = balance.data?.hasActiveSubscription ?? false;
  const subExpiry = balance.data?.subscription?.expiresAt;

  return (
    <div
      className="bugun-vars"
      style={{
        maxWidth: 880,
        margin: '0 auto',
        padding: '24px 20px 60px',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
        color: 'var(--text)',
      }}
    >
      {/* Balance header */}
      <section
        style={{
          background: 'linear-gradient(135deg, oklch(0.18 0.02 250), oklch(0.15 0.02 250))',
          border: '1px solid var(--border-2, oklch(1 0 0 / 0.08))',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--text-3, oklch(0.6 0.01 250))', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Bakiyen
        </div>
        <div style={{ fontSize: 44, fontWeight: 800, marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span>🪙</span>
          <span>{hasActiveSub ? '∞' : coins}</span>
          {!hasActiveSub && (
            <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-3, oklch(0.6 0.01 250))' }}>coin</span>
          )}
        </div>
        {hasActiveSub && subExpiry && (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--coral, oklch(0.78 0.16 30))' }}>
            ✨ Sınırsız üyelik aktif — bitiş: {new Date(subExpiry).toLocaleDateString('tr-TR')}
          </div>
        )}
      </section>

      {/* Ad reward */}
      {!hasActiveSub && (
        <section style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Reklam izle, coin kazan</h3>
          <button
            type="button"
            disabled={watchingAd || adReward.isPending}
            onClick={handleWatchAd}
            className="b-btn b-btn-primary"
            style={{ height: 44, width: '100%' }}
          >
            {watchingAd ? 'Reklam oynatılıyor… (3 sn)' : '📺 Reklam izle (+1 coin)'}
          </button>
          <div style={{ fontSize: 12, color: 'var(--text-3, oklch(0.6 0.01 250))', marginTop: 8 }}>
            Reklamlar arası 30 saniye bekleme süresi var. Günlük en fazla 30 reklam.
          </div>
        </section>
      )}

      {/* Subscription */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>
          {hasActiveSub ? 'Üyelik (yenile / uzat)' : 'Sınırsız üyelik'}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {catalog.data?.plans.map((plan) => (
            <OdematikButton
              key={plan.id}
              productId={`plan_${plan.id}`}
              customer={me.data ? { id: me.data._id, email: me.data.email } : { id: '', email: '' }}
              disabled={!me.data}
              brand={{
                name: 'Yemek Takip',
                summary: `${plan.label} · ${plan.priceTRY} ₺`,
                accent: plan.id === 'yearly' ? '#d4a949' : '#6366F1',
              }}
              onPaid={handlePaid('✓ Üyeliğin aktifleştirildi')}
              onError={(e: Error) => showToast(e.message)}
              style={planCardStyle(plan.id === 'yearly')}
            >
              <PlanCardContent
                label={plan.label}
                priceTRY={plan.priceTRY}
                note={plan.id === 'yearly' ? 'Yıl boyunca sınırsız' : 'Ay boyunca sınırsız'}
              />
            </OdematikButton>
          ))}
        </div>
      </section>

      {/* Packages */}
      <section style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Coin paketleri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {catalog.data?.packages.map((pkg) => (
            <OdematikButton
              key={pkg.id}
              productId={pkg.id}
              customer={me.data ? { id: me.data._id, email: me.data.email } : { id: '', email: '' }}
              disabled={!me.data}
              brand={{
                name: 'Yemek Takip',
                summary: `${pkg.coins} Coin · ${pkg.priceTRY} ₺`,
                accent: '#6366F1',
              }}
              onPaid={handlePaid('✓ Coin paketin hesabına eklendi')}
              onError={(e: Error) => showToast(e.message)}
              style={packageCardStyle}
            >
              <PackageCardContent label={pkg.label} coins={pkg.coins} priceTRY={pkg.priceTRY} />
            </OdematikButton>
          ))}
        </div>
      </section>

      {/* History */}
      <section>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 12px' }}>Son hareketler</h3>
        <div
          style={{
            background: 'oklch(0.16 0.018 250)',
            border: '1px solid var(--border-2, oklch(1 0 0 / 0.08))',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {history.data?.items.length === 0 && (
            <div style={{ padding: 20, color: 'var(--text-3, oklch(0.6 0.01 250))', fontSize: 13 }}>
              Henüz hareket yok.
            </div>
          )}
          {history.data?.items.map((tx) => (
            <div
              key={tx._id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-2, oklch(1 0 0 / 0.06))',
                fontSize: 13,
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{labelForType(tx.type)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3, oklch(0.6 0.01 250))', marginTop: 2 }}>
                  {new Date(tx.createdAt as string | Date).toLocaleString('tr-TR')}
                </div>
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color:
                    tx.amount > 0
                      ? 'oklch(0.75 0.15 145)'
                      : tx.amount < 0
                        ? 'var(--coral, oklch(0.7 0.2 30))'
                        : 'var(--text-3, oklch(0.6 0.01 250))',
                }}
              >
                {tx.amount > 0 ? '+' : ''}
                {tx.amount}
              </div>
            </div>
          ))}
        </div>
      </section>

      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: 30,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'oklch(0.2 0.02 250)',
            border: '1px solid var(--primary, oklch(0.65 0.2 200))',
            borderRadius: 10,
            padding: '12px 20px',
            fontSize: 13.5,
            fontWeight: 500,
            zIndex: 200,
            color: 'var(--text)',
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// Visual styling for the buy buttons. OdematikButton takes a `style` prop that
// is applied to the underlying <button>, so we pass these to make the buttons
// look like cards.

const packageCardStyle: CSSProperties = {
  textAlign: 'left',
  padding: 18,
  borderRadius: 12,
  background: 'oklch(0.17 0.018 250)',
  border: '1px solid var(--border-2, oklch(1 0 0 / 0.08))',
  color: 'var(--text)',
  fontFamily: 'inherit',
  width: '100%',
};

const planCardStyle = (highlight: boolean): CSSProperties => ({
  textAlign: 'left',
  padding: 18,
  borderRadius: 12,
  background: highlight
    ? 'linear-gradient(135deg, oklch(0.78 0.16 75 / 0.2), oklch(0.2 0.02 250))'
    : 'oklch(0.17 0.018 250)',
  border: `1px solid ${highlight ? 'oklch(0.78 0.16 75 / 0.5)' : 'var(--border-2, oklch(1 0 0 / 0.08))'}`,
  color: 'var(--text)',
  fontFamily: 'inherit',
  width: '100%',
});

function PackageCardContent({ label, coins, priceTRY }: { label: string; coins: number; priceTRY: number }) {
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--text-3, oklch(0.6 0.01 250))' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, margin: '6px 0', display: 'flex', alignItems: 'baseline', gap: 6 }}>
        🪙 <span>{coins}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--primary, oklch(0.75 0.18 200))' }}>
        {priceTRY} ₺
      </div>
    </>
  );
}

function PlanCardContent({ label, priceTRY, note }: { label: string; priceTRY: number; note: string }) {
  return (
    <>
      <div style={{ fontSize: 13, color: 'var(--text-3, oklch(0.6 0.01 250))' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, margin: '6px 0' }}>{priceTRY} ₺</div>
      <div style={{ fontSize: 12, color: 'var(--text-3, oklch(0.6 0.01 250))' }}>{note}</div>
    </>
  );
}

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
