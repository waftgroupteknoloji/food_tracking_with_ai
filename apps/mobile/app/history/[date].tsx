import { View, Text, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CalorieRing } from '@/components/calorie-ring';

export default function HistoryDateScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();

  const query = useQuery({
    queryKey: ['stats', 'daily', date],
    queryFn: () => api.stats.daily(date!),
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  const data = query.data;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: date }} />
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
        <ScrollView contentContainerClassName="p-4 gap-4 pb-8">
          <View className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 items-center">
            <CalorieRing
              kcalIn={data?.kcalIn ?? 0}
              kcalOut={data?.kcalOut ?? 0}
              target={data?.target ?? null}
            />
            <View className="flex-row gap-2 mt-4 w-full">
              <View className="flex-1 rounded-xl bg-primary-100 dark:bg-primary-900/30 p-3">
                <Text className="text-xs text-neutral-500 uppercase">Alınan</Text>
                <Text className="text-lg font-bold text-primary-600">
                  {data?.kcalIn ?? 0}
                </Text>
              </View>
              <View className="flex-1 rounded-xl bg-accent-100 dark:bg-accent-900/30 p-3">
                <Text className="text-xs text-neutral-500 uppercase">Yakılan</Text>
                <Text className="text-lg font-bold text-accent-500">
                  {data?.kcalOut ?? 0}
                </Text>
              </View>
              <View className="flex-1 rounded-xl bg-blue-100 dark:bg-blue-900/30 p-3">
                <Text className="text-xs text-neutral-500 uppercase">Su</Text>
                <Text className="text-lg font-bold text-blue-500">
                  {Math.round(((data?.waterMl ?? 0) / 1000) * 10) / 10}L
                </Text>
              </View>
            </View>
          </View>

          <View>
            <Text className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
              Yemekler
            </Text>
            <View className="gap-2">
              {(data?.meals ?? []).map((m) => (
                <Pressable
                  key={m._id}
                  onPress={() => router.push(`/meal/${m._id}`)}
                  className="flex-row items-center gap-3 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800"
                >
                  {m.photoUrl ? (
                    <Image
                      source={{ uri: m.photoUrl }}
                      className="w-12 h-12 rounded-md"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                      <Ionicons name="document-text-outline" size={18} color="#9ca3af" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="font-medium text-neutral-900 dark:text-neutral-100">
                      {m.items[0]?.name ?? 'Yemek'}
                    </Text>
                    <Text className="text-xs text-neutral-500">{m.totalKcal} kcal</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </Pressable>
              ))}
              {!data?.meals.length && (
                <Text className="text-sm text-neutral-500 text-center py-2">
                  Bu günde yemek yok.
                </Text>
              )}
            </View>
          </View>

          <View>
            <Text className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
              Aktiviteler
            </Text>
            <View className="gap-2">
              {(data?.activities ?? []).map((a) => (
                <Pressable
                  key={a._id}
                  onPress={() => router.push(`/activity/${a._id}`)}
                  className="flex-row items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800"
                >
                  <View className="w-12 h-12 rounded-md bg-accent-100 dark:bg-accent-900/30 items-center justify-center">
                    <Ionicons name="walk" size={20} color="#f97316" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-neutral-900 dark:text-neutral-100">
                      {a.items.map((i) => i.name).join(', ')}
                    </Text>
                    <Text className="text-xs text-neutral-500">
                      {a.items.reduce((s, i) => s + i.durationMin, 0)} dk ·{' '}
                      {a.totalKcalBurned} kcal
                    </Text>
                  </View>
                </Pressable>
              ))}
              {!data?.activities.length && (
                <Text className="text-sm text-neutral-500 text-center py-2">
                  Bu günde aktivite yok.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
