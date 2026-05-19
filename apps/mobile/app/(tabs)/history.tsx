import { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { todayLocalDate } from '@yemek-takip/utils';

function monthGrid(yyyymm: string): string[] {
  const [y, m] = yyyymm.split('-').map(Number);
  const first = new Date(y!, m! - 1, 1);
  const last = new Date(y!, m!, 0);
  const lead = (first.getDay() + 6) % 7;
  const days: string[] = Array(lead).fill('');
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return days;
}

export default function HistoryScreen() {
  const router = useRouter();
  const today = todayLocalDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const days = useMemo(() => monthGrid(month), [month]);

  const query = useQuery({
    queryKey: ['history', month],
    queryFn: async () => {
      const result = await Promise.all(
        days
          .filter(Boolean)
          .map(async (d) => {
            try {
              const s = await api.stats.daily(d);
              return {
                date: d,
                kcalIn: s.kcalIn,
                hasData: s.meals.length > 0 || s.activities.length > 0,
              };
            } catch {
              return null;
            }
          }),
      );
      return result.filter(Boolean) as Array<{
        date: string;
        kcalIn: number;
        hasData: boolean;
      }>;
    },
    staleTime: 60_000,
  });

  const dayDataMap = new Map(query.data?.map((d) => [d.date, d]) ?? []);

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y!, m! - 1 + delta, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['top']}>
      <ScrollView contentContainerClassName="pb-8">
        <View className="px-4 pt-2">
          <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Geçmiş
          </Text>
          <Text className="text-sm text-neutral-500">Bir günü seç</Text>
        </View>

        <View className="px-4 mt-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => shiftMonth(-1)}
            className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800"
          >
            <Ionicons name="chevron-back" size={20} color="#16a34a" />
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {month}
          </Text>
          <Pressable
            onPress={() => shiftMonth(1)}
            className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800"
          >
            <Ionicons name="chevron-forward" size={20} color="#16a34a" />
          </Pressable>
        </View>

        <View className="px-4 mt-3">
          <View className="flex-row mb-2">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
              <View key={d} style={{ flex: 1 }}>
                <Text className="text-[10px] text-center font-medium text-neutral-500 uppercase">
                  {d}
                </Text>
              </View>
            ))}
          </View>
          <View className="flex-row flex-wrap">
            {days.map((d, idx) => {
              if (!d) return <View key={idx} style={{ width: '14.28%', aspectRatio: 1 }} />;
              const info = dayDataMap.get(d);
              const isFuture = d > today;
              const isToday = d === today;
              return (
                <Pressable
                  key={d}
                  onPress={() => !isFuture && router.push(`/history/${d}`)}
                  disabled={isFuture}
                  style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}
                >
                  <View
                    className={`flex-1 rounded-md items-center justify-center border ${
                      isFuture
                        ? 'border-transparent opacity-30'
                        : info?.hasData
                          ? 'border-primary-200 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-neutral-200 dark:border-neutral-800'
                    } ${isToday ? 'border-primary-600 border-2' : ''}`}
                  >
                    <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {d.slice(-2)}
                    </Text>
                    {info?.hasData && (
                      <Text className="text-[9px] text-primary-600">{info.kcalIn}</Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
