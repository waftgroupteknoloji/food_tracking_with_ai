'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  User,
  UserRound,
  CircleDashed,
  Coffee,
  Footprints,
  Bike,
  Dumbbell,
  TrendingDown,
  TrendingUp,
  Rocket,
  Check,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { ApiError } from '@yemek-takip/api-client';
import type { Sex, ActivityLevel, UserProfile } from '@yemek-takip/validators';
import {
  calculateBMR,
  calculateTDEE,
  suggestedDailyKcal,
  todayLocalDate,
} from '@yemek-takip/utils';
import { cn } from '@/lib/cn';
import { RangeStepper } from '@/components/onboarding/range-stepper';
import { OptionCard } from '@/components/onboarding/option-card';

type StepKey = 'sex' | 'age' | 'height' | 'weight' | 'goal' | 'activity' | 'summary';
const STEPS: StepKey[] = ['sex', 'age', 'height', 'weight', 'goal', 'activity', 'summary'];

const ACTIVITIES: {
  value: ActivityLevel;
  label: string;
  desc: string;
  icon: LucideIcon;
}[] = [
  { value: 'sedentary', label: 'Az hareketli', desc: 'Masa başı, çok az egzersiz', icon: Coffee },
  { value: 'light', label: 'Hafif aktif', desc: 'Haftada 1-3 gün egzersiz', icon: Footprints },
  { value: 'moderate', label: 'Orta aktif', desc: 'Haftada 3-5 gün egzersiz', icon: Bike },
  { value: 'active', label: 'Çok aktif', desc: 'Haftada 6-7 gün egzersiz', icon: Dumbbell },
];

export function OnboardingFlow({
  initialProfile,
}: {
  initialProfile: Partial<UserProfile> | null;
}) {
  const router = useRouter();
  const qc = useQueryClient();

  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx]!;

  const [sex, setSex] = useState<Sex | null>((initialProfile?.sex as Sex) ?? null);
  const [age, setAge] = useState(25);
  const [heightCm, setHeightCm] = useState(initialProfile?.heightCm ?? 170);
  const [weightKg, setWeightKg] = useState(70);
  const [goalWeightKg, setGoalWeightKg] = useState(initialProfile?.goalWeightKg ?? 70);
  const [activity, setActivity] = useState<ActivityLevel | null>(
    (initialProfile?.activityLevel as ActivityLevel) ?? null,
  );
  const [error, setError] = useState<string | null>(null);

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['weight'] });
      router.replace('/dashboard');
      router.refresh();
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Kaydedilemedi'),
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
  const stepNo = stepIdx + 1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Üst bar: ilerleme */}
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-5 pt-6">
        <button
          type="button"
          onClick={goBack}
          disabled={stepIdx === 0}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary',
            stepIdx === 0 && 'invisible',
          )}
          aria-label="Geri"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-1 gap-1.5">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                i <= stepIdx ? 'bg-primary' : 'bg-secondary',
              )}
            />
          ))}
        </div>
        <div className="h-9 w-9" />
      </div>

      {/* İçerik */}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-8">
        <div key={step} className="flex flex-1 flex-col animate-fade-in">
          {step === 'sex' && (
            <Header eyebrow={`ADIM ${stepNo} / 6`} title="Cinsiyetin nedir?" subtitle="Kalori ihtiyacını doğru hesaplamak için gerekli.">
              <div className="grid grid-cols-2 gap-4">
                <SexCard icon={User} label="Erkek" selected={sex === 'male'} onClick={() => setSex('male')} />
                <SexCard icon={UserRound} label="Kadın" selected={sex === 'female'} onClick={() => setSex('female')} />
              </div>
              <button
                type="button"
                onClick={() => setSex('other')}
                className={cn(
                  'mx-auto mt-4 flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium transition',
                  sex === 'other' ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-card text-muted-foreground hover:bg-secondary',
                )}
              >
                <CircleDashed size={16} /> Belirtmek istemiyorum
              </button>
            </Header>
          )}

          {step === 'age' && (
            <Header eyebrow={`ADIM ${stepNo} / 6`} title="Kaç yaşındasın?" subtitle="Yaş, metabolizma hızını etkiler.">
              <RangeStepper min={14} max={90} value={age} onChange={setAge} unit="yaş" />
            </Header>
          )}

          {step === 'height' && (
            <Header eyebrow={`ADIM ${stepNo} / 6`} title="Boyun kaç cm?" subtitle="Vücut kitle indeksin için kullanılır.">
              <RangeStepper min={120} max={220} value={heightCm} onChange={setHeightCm} unit="cm" />
            </Header>
          )}

          {step === 'weight' && (
            <Header eyebrow={`ADIM ${stepNo} / 6`} title="Şu anki kilon?" subtitle="İlk ölçümün olarak kaydedilecek.">
              <RangeStepper min={35} max={200} step={0.5} decimals={1} value={weightKg} onChange={setWeightKg} unit="kg" />
            </Header>
          )}

          {step === 'goal' && (
            <Header eyebrow={`ADIM ${stepNo} / 6`} title="Hedef kilon?" subtitle="Ulaşmak istediğin kiloyu seç.">
              <RangeStepper min={35} max={200} step={0.5} decimals={1} value={goalWeightKg} onChange={setGoalWeightKg} unit="kg" />
              {diff !== 0 && (
                <div className="mx-auto mt-2 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
                  {diff < 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                  {Math.abs(diff)} kg {diff < 0 ? 'vermen' : 'alman'} gerekiyor
                </div>
              )}
            </Header>
          )}

          {step === 'activity' && (
            <Header eyebrow={`ADIM ${stepNo} / 6`} title="Ne kadar aktifsin?" subtitle="Günlük hareket seviyeni seç.">
              <div className="flex flex-col gap-3">
                {ACTIVITIES.map((a) => (
                  <OptionCard
                    key={a.value}
                    icon={a.icon}
                    title={a.label}
                    subtitle={a.desc}
                    selected={activity === a.value}
                    onClick={() => setActivity(a.value)}
                  />
                ))}
              </div>
            </Header>
          )}

          {step === 'summary' && (
            <Header eyebrow="HAZIRSIN" title="Günlük kalori hedefin" subtitle="Hedefine göre senin için hesapladık.">
              <div className="flex flex-col items-center rounded-2xl border border-primary/30 bg-primary/5 py-9">
                <span className="text-6xl font-bold tracking-tight text-primary tabular-nums">
                  {target.goal}
                </span>
                <span className="mt-1 text-sm font-medium text-muted-foreground">kcal / gün</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <Stat label="Metabolizma" value={`${target.bmr}`} unit="kcal" />
                <Stat label="Günlük yakım" value={`${target.tdee}`} unit="kcal" />
                <Stat
                  label="Hedef"
                  value={diff < 0 ? `${Math.abs(diff)}` : diff > 0 ? `+${diff}` : '0'}
                  unit="kg"
                />
              </div>
              <p className="mt-5 text-center text-sm text-muted-foreground">
                Bu değerleri profilinden istediğin zaman değiştirebilirsin.
              </p>
            </Header>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 -mx-5 mt-6 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-4">
          <button
            type="button"
            onClick={goNext}
            disabled={!canContinue || save.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-90 disabled:opacity-40"
          >
            {save.isPending ? (
              'Kaydediliyor…'
            ) : step === 'summary' ? (
              <>
                Başla <Rocket size={18} />
              </>
            ) : (
              <>
                Devam <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({
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
    <div className="flex flex-1 flex-col">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
      <div className="flex flex-1 flex-col justify-center py-8">{children}</div>
    </div>
  );
}

function SexCard({
  icon: Icon,
  label,
  selected,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-4 rounded-2xl border py-8 transition',
        selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:bg-secondary',
      )}
    >
      <span
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full transition',
          selected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground',
        )}
      >
        <Icon size={30} />
      </span>
      <span className={cn('text-lg font-semibold', selected ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
    </button>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{unit}</div>
      <div className="mt-2 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
