import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import type { CoinBalance } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { C } from '@/lib/theme';
import { CoinInsufficientSheet } from '@/components/coin-insufficient-sheet';
import { COIN_BALANCE_QUERY_KEY } from '@/components/coin-badge';

const SUGGESTIONS: { emoji: string; text: string }[] = [
  { emoji: '🚶', text: '1 saat yürüyüş' },
  { emoji: '🏃', text: '30 dk koşu' },
  { emoji: '🚴', text: '45 dk bisiklet' },
  { emoji: '🏊', text: '20 dk yüzme' },
  { emoji: '🧘', text: '1 saat pilates' },
  { emoji: '🏋️', text: '45 dk salon, ağırlık' },
];

export default function AddActivityScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [showInsufficient, setShowInsufficient] = useState(false);

  const hasCoinForAnalysis = () => {
    const data = qc.getQueryData<CoinBalance>(COIN_BALANCE_QUERY_KEY);
    if (!data) return true;
    return data.hasActiveSubscription || data.coins >= 1;
  };

  const mutation = useMutation({
    mutationFn: (inputText: string) =>
      api.activities.create({
        inputText,
        performedAt: new Date().toISOString(),
      }),
    onSuccess: (a) => router.replace(`/activity/${a._id}`),
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_COINS') {
        setShowInsufficient(true);
        return;
      }
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Bilinmeyen hata');
    },
  });

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    if (!hasCoinForAnalysis()) {
      setShowInsufficient(true);
      return;
    }
    mutation.mutate(value);
  };

  const canSubmit = text.trim().length > 0 && !mutation.isPending;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Aktivite ekle',
          headerBackTitle: 'Geri',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
              >
                <View style={s.aiBadge}>
                  <Ionicons name="sparkles" size={11} color="#fff" />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: '#fff',
                      letterSpacing: 0.4,
                    }}
                  >
                    AI
                  </Text>
                </View>
                <Text style={s.labelXs}>YAZIYLA AKTİVİTE</Text>
              </View>
              <Text style={s.h1}>Ne yaptın?</Text>
              <Text style={s.subtitle}>
                Süre + aktivite yaz. AI MET tablosundan kaloriyi hesaplar.
              </Text>
            </View>

            <View
              style={[
                s.inputCard,
                focused && { borderColor: C.coral, backgroundColor: 'rgba(240,141,106,0.05)' },
              ]}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="ör: 1 saat yürüdüm, 10 dk koştum"
                placeholderTextColor={C.text4}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                style={s.input}
              />
              <View style={s.inputFooter}>
                <Text style={{ fontSize: 11, color: C.text4 }}>{text.length} / 1000</Text>
                {text.length > 0 && (
                  <Pressable onPress={() => setText('')} hitSlop={8}>
                    <Text style={{ fontSize: 11, color: C.text3, fontWeight: '600' }}>Temizle</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <View style={s.sectionHead}>
                <Text style={s.sectionLabel}>HIZLI ÖRNEKLER</Text>
                <Text style={s.sectionHint}>Dokun → metne eklenir</Text>
              </View>
              <View style={{ gap: 8 }}>
                {SUGGESTIONS.map((sug) => (
                  <Pressable
                    key={sug.text}
                    onPress={() =>
                      setText((prev) => (prev ? `${prev}, ${sug.text}` : sug.text))
                    }
                    android_ripple={{ color: 'rgba(240,141,106,0.10)' }}
                    style={s.suggCard}
                  >
                    <View style={s.suggEmojiBox}>
                      <Text style={{ fontSize: 18 }}>{sug.emoji}</Text>
                    </View>
                    <Text style={s.suggText} numberOfLines={2}>
                      {sug.text}
                    </Text>
                    <View style={s.suggAddBtn}>
                      <Ionicons name="add" size={16} color={C.coral} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => canSubmit && submit()}
              disabled={!canSubmit}
              style={[s.primaryBtn, !canSubmit && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={['#ffb89c', '#f08d6a', '#d97354']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.primaryBtnInner}
              >
                {mutation.isPending ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={s.primaryBtnText}>AI hesaplıyor…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#fff" />
                    <Text style={s.primaryBtnText}>Analiz et ve kaydet</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
        <CoinInsufficientSheet
          visible={showInsufficient}
          onClose={() => setShowInsufficient(false)}
          onAdRewardSuccess={() => {
            setShowInsufficient(false);
            const value = text.trim();
            if (value) mutation.mutate(value);
          }}
        />
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.coral,
    borderRadius: 999,
  },
  labelXs: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.text3,
    fontWeight: '600',
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.6,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: C.text3,
    marginTop: 6,
    lineHeight: 18,
  },
  inputCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  input: {
    minHeight: 130,
    color: C.text,
    fontSize: 15,
    lineHeight: 22,
    padding: 0,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border2,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.text3,
    fontWeight: '600',
  },
  sectionHint: {
    fontSize: 10.5,
    color: C.text4,
    fontWeight: '500',
  },
  suggCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  suggEmojiBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(240,141,106,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(240,141,106,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggText: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
    lineHeight: 18,
  },
  suggAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(240,141,106,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240,141,106,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    borderRadius: 16,
    marginTop: 8,
    shadowColor: C.coral,
    shadowOpacity: 0.45,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  primaryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
