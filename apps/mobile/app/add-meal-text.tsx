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
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { C, onPrimary } from '@/lib/theme';

const SUGGESTIONS: { emoji: string; text: string }[] = [
  { emoji: '🍳', text: '3 yumurta, 2 dilim beyaz ekmek, biraz peynir' },
  { emoji: '🍲', text: '1 porsiyon mercimek çorbası' },
  { emoji: '🍝', text: '1 tabak makarna' },
  { emoji: '🥯', text: '1 simit, çay' },
  { emoji: '🍚', text: '1 porsiyon pilav, 1 köfte, yoğurt' },
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
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Yemek ekle',
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
                    android_ripple={{ color: 'rgba(184,240,77,0.10)' }}
                    style={s.suggCard}
                  >
                    <View style={s.suggEmojiBox}>
                      <Text style={{ fontSize: 18 }}>{sug.emoji}</Text>
                    </View>
                    <Text style={s.suggText} numberOfLines={2}>
                      {sug.text}
                    </Text>
                    <View style={s.suggAddBtn}>
                      <Ionicons name="add" size={16} color={C.lime} />
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              onPress={() => canSubmit && mutation.mutate(text.trim())}
              disabled={!canSubmit}
              style={[s.primaryBtn, !canSubmit && { opacity: 0.5 }]}
            >
              <LinearGradient
                colors={['#e4ff8a', '#b8f04d', '#9bd03a']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.primaryBtnInner}
              >
                {mutation.isPending ? (
                  <>
                    <ActivityIndicator size="small" color={onPrimary} />
                    <Text style={s.primaryBtnText}>AI hesaplıyor…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color={onPrimary} />
                    <Text style={s.primaryBtnText}>Analiz et ve kaydet</Text>
                    <Ionicons name="arrow-forward" size={18} color={onPrimary} />
                  </>
                )}
              </LinearGradient>
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
    backgroundColor: 'rgba(184,240,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(184,240,77,0.22)',
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
    backgroundColor: 'rgba(184,240,77,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(184,240,77,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    borderRadius: 16,
    marginTop: 8,
    shadowColor: C.lime,
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
    color: onPrimary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
