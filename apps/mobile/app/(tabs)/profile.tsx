import { View, Text, Pressable, ScrollView, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type { Meal } from '@yemek-takip/validators';
import { api, apiClient } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  calculateBMI,
  bmiCategory,
  ageFromBirthDate,
} from '@yemek-takip/utils';

const { width } = Dimensions.get('window');
const GRID_PADDING = 16;
const GRID_GAP = 2;
const ITEM_SIZE = (width - GRID_PADDING * 2 - GRID_GAP * 2) / 3;

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const streak = useQuery({
    queryKey: ['stats', 'streak'],
    queryFn: () => api.stats.streak(),
  });

  const weightAll = useQuery({
    queryKey: ['weight', 'all'],
    queryFn: () => api.weight.list('all'),
  });

  const meals = useInfiniteQuery({
    queryKey: ['profile', 'meals'],
    queryFn: ({ pageParam }) =>
      apiClient.request<{ items: Meal[]; nextCursor: string | null }>(
        `/api/meals?limit=30${pageParam ? `&cursor=${pageParam}` : ''}`,
        { method: 'GET' },
      ),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const allMeals = meals.data?.pages.flatMap((p) => p.items) ?? [];
  const heightCm = user?.profile.heightCm;
  const birthDate = user?.profile.birthDate;
  const allWeights = weightAll.data ?? [];
  const start = allWeights[0]?.weightKg;
  const current = allWeights[allWeights.length - 1]?.weightKg;
  const lostKg = start && current ? +(start - current).toFixed(1) : null;
  const bmi = current && heightCm ? calculateBMI(current, heightCm) : null;
  const age = birthDate ? ageFromBirthDate(birthDate) : null;

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['top']}>
      <ScrollView contentContainerClassName="pb-8">
        <View className="px-4 pt-2 pb-4 flex-row items-center gap-4">
          <View className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 items-center justify-center">
            <Text className="text-3xl font-bold text-primary-600">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
              {user?.displayName}
            </Text>
            <Text className="text-sm text-neutral-500">{user?.email}</Text>
            <View className="flex-row flex-wrap gap-2 mt-1">
              {age && <Text className="text-xs text-neutral-500">{age} yaş</Text>}
              {heightCm && (
                <Text className="text-xs text-neutral-500">· {heightCm} cm</Text>
              )}
              {current && (
                <Text className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  · {current} kg
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/profile-edit')}
            className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700"
          >
            <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              Düzenle
            </Text>
          </Pressable>
        </View>

        <View className="px-4 flex-row gap-2 mb-4">
          <View className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 items-center">
            <Ionicons name="flame" size={18} color="#f97316" />
            <Text className="text-lg font-bold mt-1 text-neutral-900 dark:text-neutral-100">
              {streak.data?.current ?? 0}
            </Text>
            <Text className="text-[10px] text-neutral-500">Streak</Text>
          </View>
          <View className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 items-center">
            <Ionicons name="restaurant" size={18} color="#16a34a" />
            <Text className="text-lg font-bold mt-1 text-neutral-900 dark:text-neutral-100">
              {allMeals.length}
            </Text>
            <Text className="text-[10px] text-neutral-500">Yemek</Text>
          </View>
          <View className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 items-center">
            <Ionicons name="trending-down" size={18} color="#16a34a" />
            <Text className="text-lg font-bold mt-1 text-neutral-900 dark:text-neutral-100">
              {lostKg !== null && lostKg !== 0
                ? `${lostKg > 0 ? '−' : '+'}${Math.abs(lostKg)}`
                : '—'}
            </Text>
            <Text className="text-[10px] text-neutral-500">kg</Text>
          </View>
          <View className="flex-1 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 items-center">
            <Text className="text-[10px] text-neutral-500 uppercase">BMI</Text>
            <Text className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {bmi ?? '—'}
            </Text>
            <Text className="text-[10px] text-neutral-500 capitalize">
              {bmi ? bmiCategory(bmi) : ''}
            </Text>
          </View>
        </View>

        <View className="px-4">
          <Text className="text-sm font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
            Yemek galerisi
          </Text>
          {allMeals.length === 0 ? (
            <View className="py-12 items-center">
              <Text className="text-sm text-neutral-500">
                Henüz yemek yok. Add tab'ından ekle.
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
              {allMeals.map((m) => (
                <Pressable
                  key={m._id}
                  onPress={() => router.push(`/meal/${m._id}`)}
                  style={{ width: ITEM_SIZE, height: ITEM_SIZE }}
                  className="rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-800"
                >
                  {m.photoUrl ? (
                    <Image
                      source={{ uri: m.photoUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={{ width: '100%', height: '100%', padding: 4 }}
                      className="items-center justify-center"
                    >
                      <Text
                        className="text-[10px] text-neutral-500 text-center"
                        numberOfLines={3}
                      >
                        {m.items[0]?.name ?? 'Yazı'}
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      paddingHorizontal: 4,
                      paddingVertical: 2,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                    }}
                  >
                    <Text className="text-[10px] text-white font-medium">
                      {m.totalKcal} kcal
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
          {meals.hasNextPage && (
            <Pressable
              onPress={() => meals.fetchNextPage()}
              disabled={meals.isFetchingNextPage}
              className="mt-3 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 items-center"
            >
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {meals.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla'}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => logout()}
          className="mx-4 mt-6 h-12 rounded-xl border border-red-500/30 bg-red-500/10 items-center justify-center"
        >
          <Text className="text-red-500 font-semibold">Çıkış yap</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
