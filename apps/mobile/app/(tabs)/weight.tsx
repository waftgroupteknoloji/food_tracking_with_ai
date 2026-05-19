import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

const PERIODS = [
  { value: 'week' as const, label: '7g' },
  { value: 'month' as const, label: '30g' },
  { value: 'year' as const, label: '1y' },
  { value: 'all' as const, label: 'Tümü' },
];

export default function WeightScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');

  const query = useQuery({
    queryKey: ['weight', period],
    queryFn: () => api.weight.list(period),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.weight.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weight'] }),
  });

  const data = query.data ?? [];
  const first = data[0];
  const last = data[data.length - 1];
  const change = first && last ? +(last.weightKg - first.weightKg).toFixed(1) : null;

  const weights = data.map((w) => w.weightKg);
  const minW = weights.length ? Math.min(...weights) - 1 : 0;
  const maxW = weights.length ? Math.max(...weights) + 1 : 1;
  const range = Math.max(maxW - minW, 1);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['top']}>
      <ScrollView contentContainerClassName="pb-8">
        <View className="px-4 pt-2 flex-row items-end justify-between">
          <View>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Kilo
            </Text>
            <Text className="text-sm text-neutral-500">İlerleme grafiği</Text>
          </View>
          <Pressable
            onPress={() => router.push('/add-weight')}
            className="px-3 py-2 rounded-lg bg-primary-600 flex-row items-center gap-1"
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white font-medium text-sm">Ekle</Text>
          </Pressable>
        </View>

        <View className="px-4 flex-row gap-2 my-4">
          {PERIODS.map((p) => (
            <Pressable
              key={p.value}
              onPress={() => setPeriod(p.value)}
              className={`px-4 py-1.5 rounded-full border ${
                period === p.value
                  ? 'bg-primary-600 border-primary-600'
                  : 'bg-transparent border-neutral-300 dark:border-neutral-700'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  period === p.value ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {data.length > 0 && (
          <View className="mx-4 mb-4 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <View className="flex-row items-baseline justify-between mb-2">
              <Text className="text-sm text-neutral-500">
                {first?.date} → {last?.date}
              </Text>
              {change !== null && (
                <Text
                  className={`text-xl font-bold ${
                    change < 0
                      ? 'text-primary-600'
                      : change > 0
                        ? 'text-accent-500'
                        : 'text-neutral-500'
                  }`}
                >
                  {change > 0 ? '+' : ''}
                  {change} kg
                </Text>
              )}
            </View>
            <View className="h-32 flex-row items-end justify-between gap-0.5">
              {data.map((w) => {
                const pct = ((w.weightKg - minW) / range) * 100;
                return (
                  <View
                    key={w._id}
                    style={{
                      flex: 1,
                      height: `${Math.max(pct, 8)}%`,
                      backgroundColor: '#16a34a',
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                    }}
                  />
                );
              })}
            </View>
            <Text className="text-xs text-neutral-500 mt-2 text-center">
              {minW.toFixed(1)} - {maxW.toFixed(1)} kg
            </Text>
          </View>
        )}

        <View className="px-4 gap-2">
          <Text className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Kayıtlar
          </Text>
          {data.length === 0 && (
            <Text className="text-sm text-neutral-500 text-center py-4">
              Bu dönemde kayıt yok.
            </Text>
          )}
          {[...data].reverse().map((w) => (
            <View
              key={w._id}
              className="flex-row items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800"
            >
              {w.photoUrl ? (
                <Image
                  source={{ uri: w.photoUrl }}
                  className="w-12 h-12 rounded-md"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-12 h-12 rounded-md bg-neutral-100 dark:bg-neutral-800 items-center justify-center">
                  <Ionicons name="scale-outline" size={20} color="#9ca3af" />
                </View>
              )}
              <View className="flex-1">
                <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {w.weightKg} kg
                </Text>
                <Text className="text-xs text-neutral-500">
                  {w.date} {w.note ? `· ${w.note}` : ''}
                </Text>
              </View>
              <Pressable onPress={() => remove.mutate(w._id)} className="p-2">
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
