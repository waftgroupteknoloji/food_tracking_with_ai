import { View, Text, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { todayLocalDate } from '@yemek-takip/utils';

const QUICK_AMOUNTS = [100, 250, 330, 500, 750, 1000];

export default function AddWaterScreen() {
  const today = todayLocalDate();
  const qc = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    queryKey: ['water', today],
    queryFn: () => api.water.listByDate(today),
  });

  const add = useMutation({
    mutationFn: (amountMl: number) => api.water.add({ amountMl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water', today] }),
    onError: (err) => Alert.alert('Hata', err instanceof Error ? err.message : 'Hata'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.water.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water', today] }),
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Su' }} />
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
        <ScrollView contentContainerClassName="p-6 gap-6">
          <View className="rounded-2xl bg-blue-500/10 p-8 items-center">
            <Text className="text-6xl font-bold text-blue-500">
              {Math.round(((query.data?.totalMl ?? 0) / 1000) * 10) / 10}L
            </Text>
            <Text className="text-sm text-neutral-500 mt-2">bugün</Text>
          </View>

          <View>
            <Text className="font-semibold mb-3 text-neutral-900 dark:text-neutral-100">
              Hızlı ekle
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {QUICK_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => add.mutate(amount)}
                  disabled={add.isPending}
                  className="w-[30%] h-20 rounded-xl border border-blue-500/30 bg-blue-500/5 items-center justify-center active:bg-blue-500/10"
                >
                  <Text className="text-2xl">💧</Text>
                  <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {amount}ml
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View>
            <Text className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
              Bugünkü kayıtlar
            </Text>
            <View className="gap-2">
              {(query.data?.entries ?? []).map((e) => (
                <View
                  key={e._id}
                  className="flex-row items-center gap-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800"
                >
                  <Ionicons name="water" size={18} color="#3b82f6" />
                  <Text className="flex-1 font-medium text-neutral-900 dark:text-neutral-100">
                    {e.amountMl} ml
                  </Text>
                  <Pressable onPress={() => remove.mutate(e._id)} className="p-1">
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
              {!query.data?.entries.length && (
                <Text className="text-sm text-neutral-500 text-center py-4">
                  Henüz su eklenmedi.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
