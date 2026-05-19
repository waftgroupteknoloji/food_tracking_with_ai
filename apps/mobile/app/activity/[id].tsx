import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import type { Activity, ActivityItem } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { PressableButton } from '@/components/ui/pressable-button';

type EditableItem = ActivityItem & { _localId: string };
const newLocalId = () => Math.random().toString(36).slice(2);

export default function ActivityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery<Activity>({
    queryKey: ['activity', id],
    queryFn: () => api.activities.get(id!),
  });

  const [items, setItems] = useState<EditableItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (query.data && !hydrated) {
      setItems(query.data.items.map((it) => ({ ...it, _localId: newLocalId() })));
      setHydrated(true);
    }
  }, [query.data, hydrated]);

  const totalKcal = useMemo(
    () => items.reduce((s, it) => s + (it.kcalBurned || 0), 0),
    [items],
  );

  const save = useMutation({
    mutationFn: () =>
      api.activities.update(id!, {
        items: items.map(({ _localId, ...rest }) => rest),
      }),
    onSuccess: () => router.back(),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Kaydedilemedi'),
  });

  const remove = useMutation({
    mutationFn: () => api.activities.remove(id!),
    onSuccess: () => router.replace('/(tabs)'),
  });

  if (query.isLoading || !query.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  const a = query.data;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Aktivite' }} />
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView contentContainerClassName="p-4 pb-32 gap-4">
            <View className="rounded-xl bg-neutral-100 dark:bg-neutral-800 p-3">
              <Text className="text-sm text-neutral-600 dark:text-neutral-400 italic">
                "{a.inputText}"
              </Text>
            </View>

            {a.aiAnalysis.error && (
              <View className="rounded-lg bg-amber-500/10 p-3">
                <Text className="text-sm text-amber-800 dark:text-amber-300">
                  AI analizi yapılamadı: {a.aiAnalysis.error}
                </Text>
              </View>
            )}

            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Aktiviteler
                </Text>
                <Pressable
                  onPress={() =>
                    setItems((prev) => [
                      ...prev,
                      {
                        _localId: newLocalId(),
                        name: '',
                        durationMin: 30,
                        kcalBurned: 0,
                        isEdited: false,
                        isAdded: true,
                      },
                    ])
                  }
                  className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30"
                >
                  <Ionicons name="add" size={16} color="#16a34a" />
                  <Text className="text-primary-700 dark:text-primary-300 text-sm font-medium">
                    Ekle
                  </Text>
                </Pressable>
              </View>

              {items.map((item) => (
                <View
                  key={item._localId}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 gap-2"
                >
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={item.name}
                      onChangeText={(t) =>
                        setItems((prev) =>
                          prev.map((i) =>
                            i._localId === item._localId
                              ? { ...i, name: t, isEdited: true }
                              : i,
                          ),
                        )
                      }
                      placeholder="ör: Yürüyüş"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                    />
                    <Pressable
                      onPress={() =>
                        setItems((prev) =>
                          prev.filter((i) => i._localId !== item._localId),
                        )
                      }
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </Pressable>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className="text-xs text-neutral-500 mb-1">Süre (dk)</Text>
                      <TextInput
                        value={String(item.durationMin)}
                        onChangeText={(t) =>
                          setItems((prev) =>
                            prev.map((i) =>
                              i._localId === item._localId
                                ? { ...i, durationMin: Number(t) || 0, isEdited: true }
                                : i,
                            ),
                          )
                        }
                        keyboardType="numeric"
                        className="h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-neutral-500 mb-1">Yakılan kcal</Text>
                      <TextInput
                        value={String(item.kcalBurned)}
                        onChangeText={(t) =>
                          setItems((prev) =>
                            prev.map((i) =>
                              i._localId === item._localId
                                ? { ...i, kcalBurned: Number(t) || 0, isEdited: true }
                                : i,
                            ),
                          )
                        }
                        keyboardType="numeric"
                        className="h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-2 bg-white/95 dark:bg-neutral-950/95 border-t border-neutral-200 dark:border-neutral-800 flex-row gap-3 items-center">
            <View className="flex-1">
              <Text className="text-xs text-neutral-500">Toplam yakıldı</Text>
              <Text className="text-2xl font-bold text-accent-500">
                {totalKcal}{' '}
                <Text className="text-sm text-neutral-500 font-normal">kcal</Text>
              </Text>
            </View>
            <Pressable
              onPress={() =>
                Alert.alert('Sil', 'Bu aktiviteyi silmek istediğine emin misin?', [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => remove.mutate() },
                ])
              }
              className="h-12 w-12 rounded-xl bg-red-500/10 items-center justify-center"
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </Pressable>
            <PressableButton
              title={save.isPending ? '…' : 'Kaydet'}
              onPress={() => save.mutate()}
              loading={save.isPending}
              className="flex-1"
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
