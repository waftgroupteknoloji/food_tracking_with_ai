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
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { C, onPrimary } from '@/lib/theme';

const SUGGESTIONS = [
  '1 saat yürüyüş',
  '30 dk koşu',
  '45 dk bisiklet',
  '20 dk yüzme',
  '1 saat pilates',
  '45 dk salon, ağırlık',
];

export default function AddActivityScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const mutation = useMutation({
    mutationFn: (inputText: string) =>
      api.activities.create({
        inputText,
        performedAt: new Date().toISOString(),
      }),
    onSuccess: (a) => router.replace(`/activity/${a._id}`),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Bilinmeyen hata'),
  });

  const canSubmit = text.trim().length > 0 && !mutation.isPending;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Aktivite ekle' }} />
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

            <View style={{ gap: 8 }}>
              <Text style={s.sectionLabel}>HIZLI ÖRNEKLER</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTIONS.map((sug) => (
                  <Pressable
                    key={sug}
                    onPress={() => setText((prev) => (prev ? `${prev}, ${sug}` : sug))}
                    style={({ pressed }) => [s.suggChip, pressed && { opacity: 0.7 }]}
                  >
                    <Ionicons name="add" size={12} color={C.coral} />
                    <Text style={{ fontSize: 12, color: C.text2, fontWeight: '500' }}>{sug}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => canSubmit && mutation.mutate(text.trim())}
              disabled={!canSubmit}
              style={({ pressed }) => [
                s.primaryBtn,
                !canSubmit && { opacity: 0.5 },
                pressed && canSubmit && { opacity: 0.9 },
              ]}
            >
              {mutation.isPending ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={s.primaryBtnText}>AI hesaplıyor…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>Analiz et ve kaydet</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
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
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.text3,
    fontWeight: '600',
  },
  suggChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border2,
    borderRadius: 999,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    backgroundColor: C.coral,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: C.coral,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
