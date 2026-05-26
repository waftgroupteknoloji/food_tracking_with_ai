import { useState } from 'react';
import { View, Text, Pressable, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ApiError } from '@yemek-takip/api-client';
import { showRewardedAd } from '@/lib/ads';
import { C } from '@/lib/theme';
import { COIN_BALANCE_QUERY_KEY } from './coin-badge';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Reklam izlenip +1 coin geldikten sonra çağrılır (örn: analizi otomatik retry için). */
  onAdRewardSuccess?: () => void;
}

export function CoinInsufficientSheet({ visible, onClose, onAdRewardSuccess }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleWatchAd = async () => {
    setErr(null);
    setBusy(true);
    try {
      const result = await showRewardedAd();
      await api.coins.adReward(result.adNonce, 'mobile');
      qc.invalidateQueries({ queryKey: COIN_BALANCE_QUERY_KEY });
      setBusy(false);
      onClose();
      onAdRewardSuccess?.();
    } catch (e) {
      setBusy(false);
      setErr(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Reklam ödülü alınamadı',
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'flex-end',
        }}
        onPress={busy ? undefined : onClose}
      >
        <Pressable
          onPress={() => {}}
          style={{
            backgroundColor: C.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 36,
          }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 18 }} />
          <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>🪙</Text>
          <Text
            style={{
              fontSize: 19,
              fontWeight: '700',
              color: C.text,
              textAlign: 'center',
              marginBottom: 8,
            }}
          >
            {busy ? 'Reklam oynatılıyor…' : 'Coin yetersiz'}
          </Text>
          <Text
            style={{
              fontSize: 13.5,
              color: C.text3,
              textAlign: 'center',
              lineHeight: 20,
              marginBottom: 22,
            }}
          >
            {busy
              ? 'Reklam bitince +1 coin kazanacaksın ve devam edebilirsin.'
              : 'AI analizi için en az 1 coin gerekiyor. Reklam izleyerek ücretsiz coin kazanabilir veya paket alabilirsin.'}
          </Text>

          {err && (
            <View
              style={{
                backgroundColor: 'rgba(240, 141, 106, 0.12)',
                borderColor: 'rgba(240, 141, 106, 0.4)',
                borderWidth: 1,
                padding: 10,
                borderRadius: 10,
                marginBottom: 14,
              }}
            >
              <Text style={{ color: C.coral, fontSize: 12.5, textAlign: 'center' }}>{err}</Text>
            </View>
          )}

          <Pressable
            onPress={handleWatchAd}
            disabled={busy}
            style={{
              backgroundColor: C.lime,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: busy ? 0.7 : 1,
              marginBottom: 8,
            }}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>
                📺 Reklam izle (+1 coin)
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              router.push('/coins');
            }}
            disabled={busy}
            style={{
              backgroundColor: C.surface2,
              borderWidth: 1,
              borderColor: C.border,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>
              Coin sayfasına git
            </Text>
          </Pressable>

          {!busy && (
            <Pressable onPress={onClose} style={{ paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: C.text3, fontSize: 13 }}>Vazgeç</Text>
            </Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
