import { View, Text, Pressable, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Reklam izlenip +1 coin geldikten sonra çağrılır (örn: analizi otomatik retry için). Reklam özelliği aktif olunca tekrar kullanılacak. */
  onAdRewardSuccess?: () => void;
}

export function CoinInsufficientSheet({ visible, onClose }: Props) {
  const router = useRouter();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          justifyContent: 'flex-end',
        }}
        onPress={onClose}
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
            Coin yetersiz
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
            AI analizi için en az 1 coin gerekiyor. Coin paketi alarak devam edebilirsin.
          </Text>

          {/* Reklam izle — yakında (reklam entegrasyonu henüz aktif değil) */}
          <View
            style={{
              backgroundColor: C.surface2,
              borderWidth: 1,
              borderColor: C.border,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              opacity: 0.7,
              marginBottom: 8,
            }}
          >
            <Ionicons name="time-outline" size={18} color={C.text3} />
            <Text style={{ color: C.text3, fontWeight: '700', fontSize: 15 }}>
              Reklam izle (+1 coin) · Yakında
            </Text>
          </View>

          <Pressable
            onPress={() => {
              onClose();
              router.push('/coins');
            }}
            style={{
              backgroundColor: C.lime,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>
              Coin sayfasına git
            </Text>
          </Pressable>

          <Pressable onPress={onClose} style={{ paddingVertical: 10, alignItems: 'center' }}>
            <Text style={{ color: C.text3, fontSize: 13 }}>Vazgeç</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
