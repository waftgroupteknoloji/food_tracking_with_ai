import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
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
import type { Meal, MealType, MealItem } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { PressableButton } from '@/components/ui/pressable-button';
import { cn } from '@/lib/cn';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Kahvaltı' },
  { value: 'lunch', label: 'Öğle' },
  { value: 'dinner', label: 'Akşam' },
  { value: 'snack', label: 'Atıştırma' },
];

type EditableItem = MealItem & { _localId: string };
const newLocalId = () => Math.random().toString(36).slice(2);

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery<Meal>({
    queryKey: ['meal', id],
    queryFn: () => api.meals.get(id!),
  });

  const [items, setItems] = useState<EditableItem[]>([]);
  const [mealType, setMealType] = useState<MealType | undefined>(undefined);
  const [userNote, setUserNote] = useState('');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (query.data && !hydrated) {
      setItems(query.data.items.map((it) => ({ ...it, _localId: newLocalId() })));
      setMealType(query.data.mealType);
      setUserNote(query.data.userNote ?? '');
      setHydrated(true);
    }
  }, [query.data, hydrated]);

  const totalKcal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.kcal) || 0), 0),
    [items],
  );

  const save = useMutation({
    mutationFn: () =>
      api.meals.update(id!, {
        mealType,
        userNote: userNote.trim() || undefined,
        items: items.map(({ _localId, ...rest }) => rest),
      }),
    onSuccess: () => router.back(),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Kaydedilemedi'),
  });

  const remove = useMutation({
    mutationFn: () => api.meals.remove(id!),
    onSuccess: () => router.replace('/(tabs)'),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Silinemedi'),
  });

  function updateItem(localId: string, patch: Partial<MealItem>) {
    setItems((prev) =>
      prev.map((it) =>
        it._localId === localId ? { ...it, ...patch, isEdited: true } : it,
      ),
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white dark:bg-neutral-950">
        <ActivityIndicator size="large" color="#16a34a" />
      </SafeAreaView>
    );
  }

  const meal = query.data;
  const aiError = meal.aiAnalysis.error;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Yemek detayı' }} />
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView contentContainerClassName="p-4 pb-32 gap-4">
            {meal.photoUrl ? (
              <Image
                source={{ uri: meal.photoUrl }}
                className="w-full aspect-square rounded-2xl"
                resizeMode="cover"
              />
            ) : meal.inputText ? (
              <View className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 p-4">
                <Text className="text-xs uppercase tracking-wide text-neutral-500 mb-1">
                  Yazdıkların
                </Text>
                <Text className="text-sm leading-relaxed text-neutral-900 dark:text-neutral-100">
                  {meal.inputText}
                </Text>
              </View>
            ) : null}

            {aiError && (
              <View className="rounded-lg bg-amber-500/10 p-3 flex-row gap-2">
                <Ionicons name="warning-outline" size={18} color="#b45309" />
                <Text className="flex-1 text-sm text-amber-800 dark:text-amber-300">
                  AI analizi yapılamadı: {aiError}. Aşağıdan elle item ekle.
                </Text>
              </View>
            )}

            {/* Meal type */}
            <View>
              <Text className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                Öğün
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {MEAL_TYPES.map((t) => (
                  <Pressable
                    key={t.value}
                    onPress={() =>
                      setMealType(t.value === mealType ? undefined : t.value)
                    }
                    className={cn(
                      'px-4 py-2 rounded-full border',
                      mealType === t.value
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-transparent border-neutral-300 dark:border-neutral-700',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-sm font-medium',
                        mealType === t.value
                          ? 'text-white'
                          : 'text-neutral-900 dark:text-neutral-100',
                      )}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Items */}
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Yemekler
                </Text>
                <Pressable
                  onPress={() =>
                    setItems((prev) => [
                      ...prev,
                      {
                        _localId: newLocalId(),
                        name: '',
                        quantity: 1,
                        unit: 'porsiyon',
                        kcal: 0,
                        isEdited: false,
                        isAdded: true,
                      },
                    ])
                  }
                  className="flex-row items-center gap-1 px-3 py-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30"
                >
                  <Ionicons name="add" size={16} color="#16a34a" />
                  <Text className="text-primary-700 dark:text-primary-300 font-medium text-sm">
                    Ekle
                  </Text>
                </Pressable>
              </View>

              {items.length === 0 && (
                <Text className="text-sm text-neutral-500 text-center py-4">
                  Henüz item yok.
                </Text>
              )}

              {items.map((item) => (
                <View
                  key={item._localId}
                  className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 gap-2"
                >
                  <View className="flex-row items-center gap-2">
                    <TextInput
                      value={item.name}
                      onChangeText={(t) => updateItem(item._localId, { name: t })}
                      placeholder="İsim (ör: Beyaz peynir)"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                    />
                    <Pressable
                      onPress={() =>
                        setItems((prev) => prev.filter((i) => i._localId !== item._localId))
                      }
                      className="p-2"
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </Pressable>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1">
                      <Text className="text-xs text-neutral-500 mb-1">Gram</Text>
                      <TextInput
                        value={item.grams !== undefined ? String(item.grams) : ''}
                        onChangeText={(t) =>
                          updateItem(item._localId, {
                            grams: t ? Number(t) : undefined,
                          })
                        }
                        keyboardType="numeric"
                        placeholder="—"
                        placeholderTextColor="#9ca3af"
                        className="h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-neutral-500 mb-1">Kalori</Text>
                      <TextInput
                        value={String(item.kcal)}
                        onChangeText={(t) =>
                          updateItem(item._localId, { kcal: Number(t) || 0 })
                        }
                        keyboardType="numeric"
                        className="h-10 px-3 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
                      />
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    {item.isAdded && (
                      <View className="px-2 py-0.5 rounded-full bg-accent-500/10">
                        <Text className="text-xs text-accent-600">Eklendi</Text>
                      </View>
                    )}
                    {item.isEdited && !item.isAdded && (
                      <View className="px-2 py-0.5 rounded-full bg-primary-500/10">
                        <Text className="text-xs text-primary-600">Düzenlendi</Text>
                      </View>
                    )}
                    {!item.isEdited && !item.isAdded && (
                      <View className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <Text className="text-xs text-neutral-500">AI tahmini</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Not */}
            <View>
              <Text className="font-semibold mb-1 text-neutral-900 dark:text-neutral-100">
                Not (opsiyonel)
              </Text>
              <TextInput
                value={userNote}
                onChangeText={setUserNote}
                placeholder="ör: Anne yapımı, hafif baharatlı..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
                className="min-h-12 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100"
              />
            </View>
          </ScrollView>

          {/* Sticky bottom bar */}
          <View className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-2 bg-white/95 dark:bg-neutral-950/95 border-t border-neutral-200 dark:border-neutral-800">
            <View className="flex-row gap-3 items-center">
              <View className="flex-1">
                <Text className="text-xs text-neutral-500">Toplam</Text>
                <Text className="text-2xl font-bold text-primary-600">
                  {totalKcal}{' '}
                  <Text className="text-sm font-normal text-neutral-500">kcal</Text>
                </Text>
              </View>
              <Pressable
                onPress={() =>
                  Alert.alert('Sil', 'Bu yemeği silmek istediğine emin misin?', [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: () => remove.mutate(),
                    },
                  ])
                }
                disabled={remove.isPending}
                className="h-12 w-12 rounded-xl bg-red-500/10 items-center justify-center"
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </Pressable>
              <PressableButton
                title={save.isPending ? 'Kaydediliyor…' : 'Kaydet'}
                onPress={() => save.mutate()}
                loading={save.isPending}
                className="flex-1"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
