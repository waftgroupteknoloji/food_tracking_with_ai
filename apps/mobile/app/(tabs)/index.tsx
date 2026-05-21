import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { CalorieRing } from '@/components/calorie-ring';
import { MealPhoto } from '@/components/meal-photo';
import { todayLocalDate } from '@yemek-takip/utils';

export default function DashboardScreen() {
  const today = todayLocalDate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const router = useRouter();

  const daily = useQuery({
    queryKey: ['stats', 'daily', today],
    queryFn: () => api.stats.daily(today),
  });

  const streak = useQuery({
    queryKey: ['stats', 'streak'],
    queryFn: () => api.stats.streak(),
  });

  const addWater = useMutation({
    mutationFn: (amountMl: number) => api.water.add({ amountMl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stats', 'daily', today] }),
  });

  const data = daily.data;
  const waterMl = data?.waterMl ?? 0;
  const waterGoal = data?.waterGoalMl ?? 2500;
  const waterPct = Math.min((waterMl / waterGoal) * 100, 100);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['top']}>
      <ScrollView
        contentContainerClassName="p-4 gap-4 pb-28"
        refreshControl={
          <RefreshControl
            refreshing={daily.isFetching}
            onRefresh={() => {
              qc.invalidateQueries({ queryKey: ['stats'] });
            }}
          />
        }
      >
        <View>
          <Text className="text-sm text-neutral-500">{today}</Text>
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Merhaba {user?.displayName} 👋
          </Text>
        </View>

        <View className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 items-center">
          <CalorieRing
            kcalIn={data?.kcalIn ?? 0}
            kcalOut={data?.kcalOut ?? 0}
            target={data?.target ?? null}
          />
          <View className="flex-row gap-3 mt-4 w-full">
            <View className="flex-1 rounded-xl bg-primary-100 dark:bg-primary-900/30 p-3">
              <Text className="text-xs text-neutral-500 uppercase">Alınan</Text>
              <Text className="text-xl font-bold text-primary-600">
                {data?.kcalIn ?? 0}
              </Text>
            </View>
            <View className="flex-1 rounded-xl bg-accent-100 dark:bg-accent-900/30 p-3">
              <Text className="text-xs text-neutral-500 uppercase">Yakılan</Text>
              <Text className="text-xl font-bold text-accent-500">
                {data?.kcalOut ?? 0}
              </Text>
            </View>
          </View>
          {data?.target && (
            <Text className="text-xs text-neutral-500 mt-3 text-center">
              Hedef: {data.target} kcal · BMR: {data.bmr ?? '—'} · TDEE: {data.tdee ?? '—'}
            </Text>
          )}
        </View>

        <View className="flex-row flex-wrap gap-3">
          <View className="flex-1 min-w-[45%] rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="flame" size={16} color="#f97316" />
              <Text className="text-xs text-neutral-500">Streak</Text>
            </View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {streak.data?.current ?? 0} gün
            </Text>
          </View>
          <View className="flex-1 min-w-[45%] rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
            <View className="flex-row items-center gap-2 mb-1">
              <Ionicons name="water" size={16} color="#3b82f6" />
              <Text className="text-xs text-neutral-500">Su</Text>
            </View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {Math.round((waterMl / 1000) * 10) / 10}L
            </Text>
            <View className="h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full mt-2 overflow-hidden">
              <View className="h-full bg-blue-500" style={{ width: `${waterPct}%` }} />
            </View>
            <View className="flex-row gap-1 mt-2">
              <Pressable
                onPress={() => addWater.mutate(250)}
                className="flex-1 py-1 rounded-md bg-blue-500/10 active:bg-blue-500/20"
              >
                <Text className="text-xs text-center text-blue-600 font-medium">
                  +250
                </Text>
              </Pressable>
              <Pressable
                onPress={() => addWater.mutate(500)}
                className="flex-1 py-1 rounded-md bg-blue-500/10 active:bg-blue-500/20"
              >
                <Text className="text-xs text-center text-blue-600 font-medium">
                  +500
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View>
          <Text className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
            Yemekler ({data?.meals.length ?? 0})
          </Text>
          <View className="gap-2">
            {(data?.meals ?? []).map((m) => (
              <Pressable
                key={m._id}
                onPress={() => router.push(`/meal/${m._id}`)}
                className="flex-row items-center gap-3 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                <MealPhoto photoUrl={m.photoUrl} className="w-14 h-14 rounded-lg" />
                <View className="flex-1">
                  <Text
                    className="font-medium text-neutral-900 dark:text-neutral-100"
                    numberOfLines={1}
                  >
                    {m.items[0]?.name ?? 'Yemek'}
                    {m.items.length > 1 && ` +${m.items.length - 1}`}
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    {m.mealType ?? ''} · {m.totalKcal} kcal
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>
            ))}
            {(!data?.meals || data.meals.length === 0) && (
              <Text className="text-sm text-neutral-500 text-center py-2">
                Bugün yemek loglanmadı.
              </Text>
            )}
          </View>
        </View>

        <View>
          <Text className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
            Aktiviteler ({data?.activities.length ?? 0})
          </Text>
          <View className="gap-2">
            {(data?.activities ?? []).map((a) => (
              <Pressable
                key={a._id}
                onPress={() => router.push(`/activity/${a._id}`)}
                className="flex-row items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                <View className="w-12 h-12 rounded-lg bg-accent-100 dark:bg-accent-900/30 items-center justify-center">
                  <Ionicons name="walk" size={20} color="#f97316" />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-medium text-neutral-900 dark:text-neutral-100"
                    numberOfLines={1}
                  >
                    {a.items.map((i) => i.name).join(', ') || 'Aktivite'}
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    {a.items.reduce((s, i) => s + i.durationMin, 0)} dk ·{' '}
                    {a.totalKcalBurned} kcal
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>
            ))}
            {(!data?.activities || data.activities.length === 0) && (
              <Text className="text-sm text-neutral-500 text-center py-2">
                Bugün aktivite loglanmadı.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
