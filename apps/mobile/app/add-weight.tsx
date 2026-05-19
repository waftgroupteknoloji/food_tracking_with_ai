import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { pickFromLibrary, takePhoto, uploadImageFromUri } from '@/lib/upload';
import { PressableButton } from '@/components/ui/pressable-button';
import { todayLocalDate } from '@yemek-takip/utils';

export default function AddWeightScreen() {
  const router = useRouter();
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const date = todayLocalDate();

  const save = useMutation({
    mutationFn: async () => {
      let photoKey: string | undefined;
      let photoUrl: string | undefined;
      if (photoUri) {
        setUploading(true);
        try {
          const r = await uploadImageFromUri(photoUri, 'weight');
          photoKey = r.key;
          photoUrl = r.publicUrl;
        } finally {
          setUploading(false);
        }
      }
      return api.weight.upsert({
        date,
        weightKg: Number(weightKg),
        photoKey,
        photoUrl,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => router.back(),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Kaydedilemedi'),
  });

  async function selectPhoto(source: 'camera' | 'library') {
    try {
      const uri = source === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (uri) setPhotoUri(uri);
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Foto seçilemedi');
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Kilo ekle' }} />
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView contentContainerClassName="p-6 gap-4">
            <View>
              <Text className="text-sm text-neutral-500">{date}</Text>
              <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                Kilo
              </Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Kilon (kg)
              </Text>
              <TextInput
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
                placeholder="ör: 78.5"
                placeholderTextColor="#9ca3af"
                className="h-12 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Vücut fotoğrafı (opsiyonel)
              </Text>
              {photoUri ? (
                <View className="relative">
                  <Image
                    source={{ uri: photoUri }}
                    className="w-full h-72 rounded-xl"
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => setPhotoUri(null)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                  >
                    <Ionicons name="close" size={18} color="white" />
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => selectPhoto('camera')}
                    className="flex-1 h-12 rounded-xl border border-neutral-300 dark:border-neutral-700 flex-row items-center justify-center gap-2"
                  >
                    <Ionicons name="camera" size={18} color="#16a34a" />
                    <Text className="text-neutral-900 dark:text-neutral-100 font-medium">
                      Çek
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => selectPhoto('library')}
                    className="flex-1 h-12 rounded-xl border border-neutral-300 dark:border-neutral-700 flex-row items-center justify-center gap-2"
                  >
                    <Ionicons name="images" size={18} color="#16a34a" />
                    <Text className="text-neutral-900 dark:text-neutral-100 font-medium">
                      Galeri
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View>
              <Text className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Not (opsiyonel)
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="ör: aç karna, sabah"
                placeholderTextColor="#9ca3af"
                maxLength={300}
                className="h-12 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              />
            </View>

            <PressableButton
              title={
                uploading
                  ? 'Foto yükleniyor…'
                  : save.isPending
                    ? 'Kaydediliyor…'
                    : 'Kaydet'
              }
              loading={uploading || save.isPending}
              disabled={!weightKg}
              onPress={() => save.mutate()}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
