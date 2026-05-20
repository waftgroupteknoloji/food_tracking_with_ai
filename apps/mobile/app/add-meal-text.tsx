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
  '3 yumurta, 2 dilim beyaz ekmek, biraz peynir',
  '1 porsiyon mercimek çorbası',
  '1 tabak makarna',
  '1 simit, çay',
  '1 porsiyon pilav, 1 köfte, yoğurt',
];

export default function AddMealTextScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const mutation = useMutation({
    mutationFn: (inputText: string) =>
      api.meals.create({
        inputText,
        consumedAt: new Date().toISOString(),
      }),
    onSuccess: (m) => router.replace(`/meal/${m._id}?fresh=1`),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Bilinmeyen hata'),
  });

  const canSubmit = text.trim().length > 0 && !mutation.isPending;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Yemek ekle' }} />
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
                  <Ionicons name="sparkles" size={11} color={onPrimary} />
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '700',
                      color: onPrimary,
                      letterSpacing: 0.4,
                    }}
                  >
                    AI
                  </Text>
                </View>
                <Text style={s.labelXs}>YAZIYLA YEMEK</Text>
              </View>
              <Text style={s.h1}>Ne yedin?</Text>
              <Text style={s.subtitle}>
                Virgülle ayırarak yaz, AI miktarları çözüp kaloriyi hesaplar.
              </Text>
            </View>

            <View
              style={[
                s.inputCard,
                focused && { borderColor: C.lime, backgroundColor: 'rgba(184,240,77,0.04)' },
              ]}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="ör: 3 yumurta, 2 dilim beyaz ekmek, biraz peynir"
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
                    <Ionicons name="add" size={12} color={C.lime} />
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
                  <ActivityIndicator size="small" color={onPrimary} />
                  <Text style={s.primaryBtnText}>AI hesaplıyor…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sparkles" size={16} color={onPrimary} />
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
    backgroundColor: C.lime,
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
    backgroundColor: C.lime,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: C.lime,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 5,
  },
  primaryBtnText: {
    color: onPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
