'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@yemek-takip/api-client';
import { COIN_BALANCE_QUERY_KEY } from '@/components/coin-badge';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Reklam başarıyla izlenip +1 coin geldikten sonra çağrılır.
   *  Submit'i otomatik tekrarlamak isteyen sayfalar bunu kullanır. */
  onAdRewardSuccess?: () => void;
}

function randomNonce() {
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CoinInsufficientModal({ open, onClose, onAdRewardSuccess }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [status, setStatus] = useState<'idle' | 'playing' | 'awarding' | 'error'>('idle');
  const [errMsg, setErrMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleWatchAd = async () => {
    setErrMsg(null);
    setStatus('playing');
    // TODO: gerçek Rewarded Ad SDK (AdSense Rewarded vb.) bağlandığında burayı değiştir.
    await new Promise((r) => setTimeout(r, 2500));
    setStatus('awarding');
    try {
      await api.coins.adReward(randomNonce(), 'web');
      qc.invalidateQueries({ queryKey: COIN_BALANCE_QUERY_KEY });
      setStatus('idle');
      onClose();
      onAdRewardSuccess?.();
    } catch (e) {
      setStatus('error');
      setErrMsg(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Reklam ödülü alınamadı',
      );
    }
  };

  const busy = status === 'playing' || status === 'awarding';

  return (
    <div
      onClick={busy ? undefined : onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'oklch(0 0 0 / 0.6)',
        zIndex: 100,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'oklch(0.16 0.018 250)',
          border: '1px solid var(--border-2, oklch(1 0 0 / 0.1))',
          borderRadius: 16,
          padding: 24,
          color: 'var(--text)',
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🪙</div>
        <h2 style={{ fontSize: 19, fontWeight: 700, textAlign: 'center', margin: 0 }}>
          {status === 'playing' ? 'Reklam oynatılıyor…' : 'Coin yetersiz'}
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-3, oklch(0.6 0.01 250))',
            textAlign: 'center',
            marginTop: 8,
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {status === 'playing'
            ? 'Reklam bitince +1 coin kazanacaksın ve devam edebilirsin.'
            : 'AI analizi için en az 1 coin gerekiyor. Reklam izleyerek ücretsiz coin kazanabilir veya paket alabilirsin.'}
        </p>
        {errMsg && (
          <p
            style={{
              fontSize: 12.5,
              color: 'var(--coral, oklch(0.7 0.2 30))',
              textAlign: 'center',
              marginTop: -10,
              marginBottom: 16,
              padding: '8px 12px',
              background: 'color-mix(in oklch, var(--coral, oklch(0.7 0.2 30)) 12%, transparent)',
              borderRadius: 8,
            }}
          >
            {errMsg}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            type="button"
            onClick={handleWatchAd}
            disabled={busy}
            className="b-btn b-btn-primary"
            style={{ width: '100%', height: 42, opacity: busy ? 0.7 : 1 }}
          >
            {busy ? 'İşleniyor…' : '📺 Reklam izle (+1 coin)'}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push('/coins');
            }}
            disabled={busy}
            className="b-btn"
            style={{ width: '100%', height: 42 }}
          >
            Coin sayfasına git
          </button>
          {!busy && (
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                height: 36,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-3, oklch(0.6 0.01 250))',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Vazgeç
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
