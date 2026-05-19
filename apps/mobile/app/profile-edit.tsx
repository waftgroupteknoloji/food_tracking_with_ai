import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { PressableButton } from '@/components/ui/pressable-button';
import { TextField } from '@/components/ui/text-field';

const ACTIVITIES = [
  { value: 'sedentary' as const, label: 'Az hareketli' },
  { value: 'light' as const, label: 'Hafif' },
  { value: 'moderate' as const, label: 'Orta' },
  { value: 'active' as const, label: 'Aktif' },
];

export default function ProfileEditScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });

  const [displayName, setDisplayName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [goalWeightKg, setGoalWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'light' | 'moderate' | 'active' | ''
  >('');
  const [waterGoalMl, setWaterGoalMl] = useState('2500');

  useEffect(() => {
    if (me.data) {
      setDisplayName(me.data.displayName);
      setHeightCm(me.data.profile.heightCm?.toString() ?? '');
      setSex((me.data.profile.sex as any) ?? '');
      setBirthDate(me.data.profile.birthDate ?? '');
      setGoalWeightKg(me.data.profile.goalWeightKg?.toString() ?? '');
      setActivityLevel((me.data.profile.activityLevel as any) ?? '');
      setWaterGoalMl(me.data.profile.waterGoalMl?.toString() ?? '2500');
    }
  }, [me.data]);

  const save = useMutation({
    mutationFn: () =>
      api.profile.update({
        displayName: displayName.trim() || undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        sex: sex || undefined,
        birthDate: birthDate || undefined,
        goalWeightKg: goalWeightKg ? Number(goalWeightKg) : undefined,
        activityLevel: activityLevel || undefined,
        waterGoalMl: waterGoalMl ? Number(waterGoalMl) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      router.back();
    },
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Kaydedilemedi'),
  });

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Profili düzenle' }} />
      <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950" edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView contentContainerClassName="p-6 gap-4">
            <TextField label="İsim" value={displayName} onChangeText={setDisplayName} />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <TextField
                  label="Boy (cm)"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <TextField
                  label="Doğum (YYYY-MM-DD)"
                  value={birthDate}
                  onChangeText={setBirthDate}
                  placeholder="1995-03-15"
                />
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Cinsiyet
              </Text>
              <View className="flex-row gap-2">
                {[
                  { v: 'male', l: 'Erkek' },
                  { v: 'female', l: 'Kadın' },
                  { v: 'other', l: 'Diğer' },
                ].map((o) => (
                  <Pressable
                    key={o.v}
                    onPress={() => setSex(o.v as any)}
                    className={`flex-1 h-11 rounded-lg items-center justify-center border ${
                      sex === o.v
                        ? 'bg-primary-600 border-primary-600'
                        : 'bg-transparent border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    <Text
                      className={`font-medium ${
                        sex === o.v ? 'text-white' : 'text-neutral-900 dark:text-neutral-100'
                      }`}
                    >
                      {o.l}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <TextField
              label="Hedef kilo (kg)"
              value={goalWeightKg}
              onChangeText={setGoalWeightKg}
              keyboardType="decimal-pad"
              placeholder="ör: 70"
            />

            <View>
              <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                Aktivite seviyesi
              </Text>
              <View className="gap-2">
                {ACTIVITIES.map((a) => (
                  <Pressable
                    key={a.value}
                    onPress={() => setActivityLevel(a.value)}
                    className={`h-11 rounded-lg items-start justify-center px-4 border ${
                      activityLevel === a.value
                        ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-600'
                        : 'bg-transparent border-neutral-300 dark:border-neutral-700'
                    }`}
                  >
                    <Text className="font-medium text-neutral-900 dark:text-neutral-100">
                      {a.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <TextField
              label="Günlük su hedefi (ml)"
              value={waterGoalMl}
              onChangeText={setWaterGoalMl}
              keyboardType="numeric"
            />

            <PressableButton
              title={save.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              loading={save.isPending}
              onPress={() => save.mutate()}
              className="mt-2"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}
