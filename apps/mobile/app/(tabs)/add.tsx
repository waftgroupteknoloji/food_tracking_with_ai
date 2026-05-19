import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { pickFromLibrary, takePhoto, uploadImageFromUri } from '@/lib/upload';

type Stage = 'idle' | 'uploading' | 'analyzing';

export default function AddScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startMealUpload(source: 'camera' | 'library') {
    setError(null);
    try {
      const uri = source === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (!uri) return;
      setPreview(uri);

      setStage('uploading');
      const { key, publicUrl } = await uploadImageFromUri(uri, 'meals');

      setStage('analyzing');
      const meal = await api.meals.create({
        photoKey: key,
        photoUrl: publicUrl,
        consumedAt: new Date().toISOString(),
      });
      setStage('idle');
      setPreview(null);
      router.push(`/meal/${meal._id}?fresh=1`);
    } catch (err) {
      setStage('idle');
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Hata');
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['top']}>
      <View className="p-6 gap-6 flex-1">
        <View>
          <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
            Ekle
          </Text>
          <Text className="mt-1 text-neutral-500">
            Yemek fotoğrafı, aktivite, kilo veya su ekle.
          </Text>
        </View>

        {(stage === 'uploading' || stage === 'analyzing') && (
          <View className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 items-center gap-3">
            {preview && (
              <Image
                source={{ uri: preview }}
                className="w-48 h-48 rounded-xl"
                resizeMode="cover"
              />
            )}
            <ActivityIndicator size="large" color="#16a34a" />
            <Text className="text-neutral-700 dark:text-neutral-300 font-medium">
              {stage === 'uploading' ? 'Fotoğraf yükleniyor…' : 'AI analiz ediyor…'}
            </Text>
          </View>
        )}

        {stage === 'idle' && (
          <View className="gap-3">
            <Pressable
              onPress={() => startMealUpload('camera')}
              className="rounded-2xl bg-primary-600 active:bg-primary-700 p-5 flex-row items-center gap-4"
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="camera" size={24} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-lg">Fotoğraf çek</Text>
                <Text className="text-white/80 text-sm">AI tabağı analiz etsin</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </Pressable>

            <Pressable
              onPress={() => startMealUpload('library')}
              className="rounded-2xl bg-accent-500 active:bg-accent-600 p-5 flex-row items-center gap-4"
            >
              <View className="w-12 h-12 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="images" size={22} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-lg">Galeriden seç</Text>
                <Text className="text-white/80 text-sm">Eski bir foto yükle</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/add-meal-text')}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 flex-row items-center gap-4"
            >
              <View className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                <Ionicons name="create-outline" size={22} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                  Yazıyla yemek ekle
                </Text>
                <Text className="text-sm text-neutral-500">
                  "3 yumurta, biraz peynir" yaz, AI hesaplasın
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/add-activity')}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 flex-row items-center gap-4"
            >
              <View className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                <Ionicons name="walk" size={22} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                  Aktivite
                </Text>
                <Text className="text-sm text-neutral-500">"1 saat yürüdüm" gibi yaz</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/add-weight')}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 flex-row items-center gap-4"
            >
              <View className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                <Ionicons name="scale" size={22} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                  Kilo
                </Text>
                <Text className="text-sm text-neutral-500">Kilonu ve foto ekle</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>

            <Pressable
              onPress={() => router.push('/add-water')}
              className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 flex-row items-center gap-4"
            >
              <View className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                <Ionicons name="water" size={22} color="#0ea5e9" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                  Su
                </Text>
                <Text className="text-sm text-neutral-500">Bardak ekle</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </Pressable>
          </View>
        )}

        {error && (
          <Text className="text-sm text-red-500 bg-red-500/10 rounded-lg p-3">{error}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}
