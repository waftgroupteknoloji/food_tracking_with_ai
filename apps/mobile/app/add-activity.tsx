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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { PressableButton } from '@/components/ui/pressable-button';

const SUGGESTIONS = [
  '1 saat yürüyüş',
  '30 dk koşu',
  '45 dk bisiklet',
  '20 dk yüzme',
  '1 saat pilates',
];

export default function AddActivityScreen() {
  const router = useRouter();
  const [text, setText] = useState('');

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

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Aktivite ekle' }} />
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView contentContainerClassName="p-6 gap-4">
            <View>
              <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Aktiviteni anlat
              </Text>
              <Text className="text-sm text-neutral-500 mt-1">
                Virgülle ayırarak yaz. AI MET tablosundan kaloriyi hesaplar.
              </Text>
            </View>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="ör: 1 saat yürüdüm, 10 dk koştum"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={5}
              maxLength={1000}
              className="min-h-32 p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
            />

            <View>
              <Text className="text-xs text-neutral-500 mb-2">Hızlı:</Text>
              <View className="flex-row flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setText((prev) => (prev ? `${prev}, ${s}` : s))}
                    className="px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 active:opacity-70"
                  >
                    <Text className="text-sm text-neutral-700 dark:text-neutral-300">
                      + {s}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <PressableButton
              title={mutation.isPending ? 'AI hesaplıyor…' : 'Analiz et ve kaydet'}
              loading={mutation.isPending}
              disabled={!text.trim()}
              onPress={() => mutation.mutate(text.trim())}
              className="mt-2"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
