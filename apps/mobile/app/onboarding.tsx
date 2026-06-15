import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import type { Sex, ActivityLevel } from '@yemek-takip/validators';
import {
  calculateBMR,
  calculateTDEE,
  suggestedDailyKcal,
  todayLocalDate,
} from '@yemek-takip/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { C, onPrimary } from '@/lib/theme';
import { RulerPicker } from '@/components/onboarding/ruler-picker';
import { OptionCard } from '@/components/onboarding/option-card';

type StepKey = 'sex' | 'age' | 'height' | 'weight' | 'goal' | 'activity' | 'summary';

const STEPS: StepKey[] = ['sex', 'age', 'height', 'weight', 'goal', 'activity', 'summary'];

const ACTIVITIES: {
  value: ActivityLevel;
  label: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'sedentary', label: 'Az hareketli', desc: 'Masa başı, çok az egzersiz', icon: 'cafe-outline' },
  { value: 'light', label: 'Hafif aktif', desc: 'Haftada 1-3 gün egzersiz', icon: 'walk-outline' },
  { value: 'moderate', label: 'Orta aktif', desc: 'Haftada 3-5 gün egzersiz', icon: 'bicycle-outline' },
  { value: 'active', label: 'Çok aktif', desc: 'Haftada 6-7 gün egzersiz', icon: 'barbell-outline' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const refreshMe = useAuthStore((s) => s.refreshMe);

  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx]!;

  const [sex, setSex] = useState<Sex | null>((user?.profile.sex as Sex) ?? null);
  const [age, setAge] = useState(25);
  const [heightCm, setHeightCm] = useState(user?.profile.heightCm ?? 170);
  const [weightKg, setWeightKg] = useState(70);
  const [goalWeightKg, setGoalWeightKg] = useState(user?.profile.goalWeightKg ?? 70);
  const [activity, setActivity] = useState<ActivityLevel | null>(
    (user?.profile.activityLevel as ActivityLevel) ?? null,
  );

  const target = useMemo(() => {
    const bmr = calculateBMR({ weightKg, heightCm, ageYears: age, sex: sex ?? 'other' });
    const tdee = calculateTDEE(bmr, activity ?? 'sedentary');
    let goal: number;
    if (goalWeightKg < weightKg - 0.5) goal = suggestedDailyKcal(tdee);
    else if (goalWeightKg > weightKg + 0.5) goal = tdee + 300;
    else goal = tdee;
    return { bmr, tdee, goal: Math.round(goal) };
  }, [weightKg, heightCm, age, sex, activity, goalWeightKg]);

  const save = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const birthYear = now.getFullYear() - age;
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const birthDate = `${birthYear}-${mm}-${dd}`;

      await api.profile.update({
        sex: sex ?? undefined,
        heightCm,
        birthDate,
        goalWeightKg,
        activityLevel: activity ?? undefined,
        targetDailyKcal: target.goal,
      });
      await api.weight.upsert({ date: todayLocalDate(), weightKg });
    },
    onSuccess: async () => {
      await refreshMe();
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['weight'] });
      router.replace('/(tabs)');
    },
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Kaydedilemedi'),
  });

  const canContinue =
    (step === 'sex' && !!sex) ||
    (step === 'activity' && !!activity) ||
    ['age', 'height', 'weight', 'goal', 'summary'].includes(step);

  const goNext = () => {
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
    else save.mutate();
  };
  const goBack = () => setStepIdx((i) => Math.max(0, i - 1));

  const diff = +(goalWeightKg - weightKg).toFixed(1);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Üst bar: geri + ilerleme segmentleri */}
        <View style={styles.topBar}>
          <Pressable
            onPress={goBack}
            disabled={stepIdx === 0}
            hitSlop={10}
            style={[styles.backBtn, stepIdx === 0 && { opacity: 0 }]}
          >
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </Pressable>
          <View style={styles.progressRow}>
            {STEPS.map((s, i) => (
              <View
                key={s}
                style={[
                  styles.progressSeg,
                  { backgroundColor: i <= stepIdx ? C.lime : C.surface2 },
                ]}
              />
            ))}
          </View>
          <View style={styles.backBtn} />
        </View>

        <Animated.View
          key={step}
          entering={FadeInRight.duration(280)}
          style={styles.content}
        >
          {step === 'sex' && (
            <StepShell
              eyebrow="ADIM 1 / 6"
              title="Cinsiyetin nedir?"
              subtitle="Kalori ihtiyacını doğru hesaplamak için gerekli."
            >
              <View style={styles.sexRow}>
                <SexCard
                  icon="male"
                  label="Erkek"
                  color={C.cyan}
                  selected={sex === 'male'}
                  onPress={() => setSex('male')}
                />
                <SexCard
                  icon="female"
                  label="Kadın"
                  color={C.magenta}
                  selected={sex === 'female'}
                  onPress={() => setSex('female')}
                />
              </View>
              <Pressable
                onPress={() => setSex('other')}
                style={[styles.otherPill, sex === 'other' && styles.otherPillSel]}
              >
                <Text style={[styles.otherTxt, sex === 'other' && { color: C.lime }]}>
                  Belirtmek istemiyorum
                </Text>
              </Pressable>
            </StepShell>
          )}

          {step === 'age' && (
            <StepShell
              eyebrow="ADIM 2 / 6"
              title="Kaç yaşındasın?"
              subtitle="Yaş, metabolizma hızını etkiler."
            >
              <RulerPicker min={14} max={90} value={age} onChange={setAge} unit="yaş" />
            </StepShell>
          )}

          {step === 'height' && (
            <StepShell
              eyebrow="ADIM 3 / 6"
              title="Boyun kaç cm?"
              subtitle="Vücut kitle indeksin için kullanılır."
            >
              <RulerPicker min={120} max={220} value={heightCm} onChange={setHeightCm} unit="cm" />
            </StepShell>
          )}

          {step === 'weight' && (
            <StepShell
              eyebrow="ADIM 4 / 6"
              title="Şu anki kilon?"
              subtitle="İlk ölçümün olarak kaydedilecek."
            >
              <RulerPicker
                min={35}
                max={200}
                step={0.5}
                decimals={1}
                value={weightKg}
                onChange={setWeightKg}
                unit="kg"
              />
            </StepShell>
          )}

          {step === 'goal' && (
            <StepShell
              eyebrow="ADIM 5 / 6"
              title="Hedef kilon?"
              subtitle="Ulaşmak istediğin kiloyu seç."
            >
              <RulerPicker
                min={35}
                max={200}
                step={0.5}
                decimals={1}
                value={goalWeightKg}
                onChange={setGoalWeightKg}
                unit="kg"
              />
              {diff !== 0 && (
                <Animated.View entering={FadeIn} style={styles.goalHint}>
                  <Ionicons
                    name={diff < 0 ? 'trending-down' : 'trending-up'}
                    size={16}
                    color={C.lime}
                  />
                  <Text style={styles.goalHintTxt}>
                    {Math.abs(diff)} kg {diff < 0 ? 'vermen' : 'alman'} gerekiyor
                  </Text>
                </Animated.View>
              )}
            </StepShell>
          )}

          {step === 'activity' && (
            <StepShell
              eyebrow="ADIM 6 / 6"
              title="Ne kadar aktifsin?"
              subtitle="Günlük hareket seviyeni seç."
            >
              <View style={{ gap: 12 }}>
                {ACTIVITIES.map((a) => (
                  <OptionCard
                    key={a.value}
                    icon={a.icon}
                    title={a.label}
                    subtitle={a.desc}
                    selected={activity === a.value}
                    onPress={() => setActivity(a.value)}
                  />
                ))}
              </View>
            </StepShell>
          )}

          {step === 'summary' && (
            <StepShell
              eyebrow="HAZIRSIN"
              title="Günlük kalori hedefin"
              subtitle="Hedefine göre senin için hesapladık."
            >
              <View style={styles.kcalCard}>
                <Text style={styles.kcalValue}>{target.goal}</Text>
                <Text style={styles.kcalUnit}>kcal / gün</Text>
              </View>
              <View style={styles.statRow}>
                <Stat label="Metabolizma" value={`${target.bmr}`} unit="kcal" />
                <Stat label="Günlük yakım" value={`${target.tdee}`} unit="kcal" />
                <Stat
                  label="Hedef"
                  value={diff < 0 ? `${Math.abs(diff)}` : diff > 0 ? `+${diff}` : '0'}
                  unit="kg"
                />
              </View>
              <Text style={styles.summaryNote}>
                Bu değerleri profilinden istediğin zaman değiştirebilirsin.
              </Text>
            </StepShell>
          )}
        </Animated.View>

        {/* Devam butonu */}
        <View style={styles.footer}>
          <Pressable
            onPress={goNext}
            disabled={!canContinue || save.isPending}
            style={[styles.cta, (!canContinue || save.isPending) && { opacity: 0.5 }]}
          >
            <LinearGradient
              colors={['#e4ff8a', '#b8f04d', '#9bd03a']}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaInner}
            >
              {save.isPending ? (
                <ActivityIndicator size="small" color={onPrimary} />
              ) : (
                <>
                  <Text style={styles.ctaTxt}>
                    {step === 'summary' ? 'Başla' : 'Devam'}
                  </Text>
                  <Ionicons
                    name={step === 'summary' ? 'rocket' : 'arrow-forward'}
                    size={18}
                    color={onPrimary}
                  />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </>
  );
}

function StepShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.stepBody}>{children}</View>
    </View>
  );
}

function SexCard({
  icon,
  label,
  color,
  selected,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(184,240,77,0.10)' }}
      style={[styles.sexCard, selected && styles.sexCardSel]}
    >
      <View
        style={[
          styles.sexIconWrap,
          { backgroundColor: selected ? C.lime : C.surface2 },
        ]}
      >
        <Ionicons name={icon} size={34} color={selected ? onPrimary : color} />
      </View>
      <Text style={[styles.sexLabel, selected && { color: C.text }]}>{label}</Text>
    </Pressable>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 12,
  },
  backBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flex: 1, flexDirection: 'row', gap: 6 },
  progressSeg: { flex: 1, height: 4, borderRadius: 4 },
  content: { flex: 1, paddingHorizontal: 22, paddingTop: 28 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6, fontWeight: '700', color: C.lime },
  title: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.8, marginTop: 10 },
  subtitle: { fontSize: 14.5, color: C.text3, marginTop: 8, lineHeight: 20 },
  stepBody: { flex: 1, justifyContent: 'center', paddingBottom: 30 },

  // Cinsiyet
  sexRow: { flexDirection: 'row', gap: 14 },
  sexCard: {
    flex: 1,
    alignItems: 'center',
    gap: 16,
    paddingVertical: 30,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  sexCardSel: { borderColor: C.lime, backgroundColor: 'rgba(184,240,77,0.07)' },
  sexIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sexLabel: { fontSize: 17, fontWeight: '700', color: C.text2 },
  otherPill: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  otherPillSel: { borderColor: C.lime, backgroundColor: 'rgba(184,240,77,0.07)' },
  otherTxt: { fontSize: 14, fontWeight: '600', color: C.text2 },

  // Hedef ipucu
  goalHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(184,240,77,0.08)',
  },
  goalHintTxt: { fontSize: 14, fontWeight: '700', color: C.lime },

  // Özet
  kcalCard: {
    alignItems: 'center',
    paddingVertical: 36,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: C.lime,
    backgroundColor: 'rgba(184,240,77,0.07)',
  },
  kcalValue: { fontSize: 64, fontWeight: '800', color: C.lime, letterSpacing: -2 },
  kcalUnit: { fontSize: 15, fontWeight: '600', color: C.text2, marginTop: 2 },
  statRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: C.text },
  statUnit: { fontSize: 11, fontWeight: '600', color: C.text3, marginTop: 1 },
  statLabel: { fontSize: 11.5, fontWeight: '600', color: C.text3, marginTop: 8 },
  summaryNote: { fontSize: 13, color: C.text3, textAlign: 'center', marginTop: 22, lineHeight: 19 },

  // Footer
  footer: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 6 },
  cta: {
    borderRadius: 18,
    shadowColor: C.lime,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
    overflow: 'hidden',
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 58,
  },
  ctaTxt: { fontSize: 17, fontWeight: '800', color: onPrimary, letterSpacing: -0.2 },
});
