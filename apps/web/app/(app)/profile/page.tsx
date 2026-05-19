'use client';

import Link from 'next/link';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, apiClient } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Flame, Camera, Scale, Target } from 'lucide-react';
import {
  calculateBMI,
  bmiCategory,
  ageFromBirthDate,
  calculateBMR,
  calculateTDEE,
  suggestedDailyKcal,
} from '@yemek-takip/utils';
import type { Meal } from '@yemek-takip/validators';

export default function ProfilePage() {
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
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
        `/api/meals?limit=24${pageParam ? `&cursor=${pageParam}` : ''}`,
        { method: 'GET' },
      ),
    initialPageParam: '' as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const allMeals = meals.data?.pages.flatMap((p) => p.items) ?? [];

  const user = me.data;
  const heightCm = user?.profile.heightCm;
  const sex = user?.profile.sex;
  const birthDate = user?.profile.birthDate;
  const goalWeightKg = user?.profile.goalWeightKg;
  const activityLevel = user?.profile.activityLevel;
  const manualTarget = user?.profile.targetDailyKcal;

  const allWeights = weightAll.data ?? [];
  const startWeight = allWeights[0]?.weightKg;
  const currentWeight = allWeights[allWeights.length - 1]?.weightKg;
  const lostKg =
    startWeight && currentWeight ? +(startWeight - currentWeight).toFixed(1) : null;
  const bmi =
    currentWeight && heightCm ? calculateBMI(currentWeight, heightCm) : null;
  const age = birthDate ? ageFromBirthDate(birthDate) : null;

  const calorieCalc =
    currentWeight && heightCm && age && sex && activityLevel
      ? (() => {
          const bmr = calculateBMR({
            weightKg: currentWeight,
            heightCm,
            ageYears: age,
            sex: sex as 'male' | 'female' | 'other',
          });
          const tdee = calculateTDEE(
            bmr,
            activityLevel as 'sedentary' | 'light' | 'moderate' | 'active',
          );
          return { bmr, tdee, suggested: suggestedDailyKcal(tdee) };
        })()
      : null;
  const dailyTarget = manualTarget ?? calorieCalc?.suggested ?? null;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">
            <Settings size={16} /> Ayarlar
          </Link>
        </Button>
      </header>

      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-primary">
              {user?.displayName?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold">{user?.displayName}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex gap-3 flex-wrap mt-3 text-sm justify-center sm:justify-start">
              {age && (
                <span className="text-muted-foreground">
                  {age} yaş{sex === 'male' ? ' ♂' : sex === 'female' ? ' ♀' : ''}
                </span>
              )}
              {heightCm && (
                <span className="text-muted-foreground">{heightCm} cm</span>
              )}
              {currentWeight && (
                <span className="font-medium">{currentWeight} kg</span>
              )}
              {goalWeightKg && (
                <span className="text-muted-foreground">→ hedef {goalWeightKg} kg</span>
              )}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/profile/edit">Düzenle</Link>
          </Button>
        </CardContent>
      </Card>

      {calorieCalc && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target size={16} className="text-primary" />
                  Günlük kalori limiti
                </div>
                <div className="text-4xl font-bold mt-2">
                  {dailyTarget} <span className="text-base font-normal text-muted-foreground">kcal</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {manualTarget ? 'Manuel olarak ayarlandı' : 'Otomatik hesap (TDEE − 500 kcal)'}
                </div>
              </div>
              <div className="text-right text-xs text-muted-foreground space-y-1">
                <div>
                  BMR <strong className="text-foreground">{calorieCalc.bmr}</strong>
                </div>
                <div>
                  TDEE <strong className="text-foreground">{calorieCalc.tdee}</strong>
                </div>
                <div className="capitalize">
                  Aktivite <strong className="text-foreground">{activityLevel}</strong>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Kilo değiştikçe limit otomatik güncellenir. {currentWeight} kg → {dailyTarget} kcal/gün.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <Flame size={18} className="text-accent mb-2" />
            <div className="text-2xl font-bold">{streak.data?.current ?? 0}</div>
            <div className="text-xs text-muted-foreground">Gün streak</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Camera size={18} className="text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">{allMeals.length}</div>
            <div className="text-xs text-muted-foreground">Yemek loglu</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Scale size={18} className="text-muted-foreground mb-2" />
            <div className="text-2xl font-bold">
              {lostKg !== null && lostKg !== 0
                ? `${lostKg > 0 ? '−' : '+'}${Math.abs(lostKg)} kg`
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground">İlerleme</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">
              BMI
            </div>
            <div className="text-2xl font-bold">{bmi ?? '—'}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {bmi ? bmiCategory(bmi) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Yemek galerisi</h3>
        {allMeals.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                Henüz yemek yok. <Link href="/add/meal" className="text-primary hover:underline">İlk yemeğini ekle</Link>
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-3 gap-1 sm:gap-2">
            {allMeals.map((m) => (
              <Link
                key={m._id}
                href={`/meal/${m._id}`}
                className="relative aspect-square rounded-md overflow-hidden group bg-secondary"
              >
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoUrl}
                    alt=""
                    className="w-full h-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full p-2 flex items-center justify-center text-center text-[10px] sm:text-xs text-muted-foreground">
                    {m.items[0]?.name ?? 'Yazıyla eklendi'}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-1 left-1 right-1 text-white text-[10px] sm:text-xs font-medium">
                  {m.totalKcal} kcal
                </div>
              </Link>
            ))}
          </div>
        )}
        {meals.hasNextPage && (
          <div className="flex justify-center mt-4">
            <Button
              variant="outline"
              onClick={() => meals.fetchNextPage()}
              disabled={meals.isFetchingNextPage}
            >
              {meals.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla yükle'}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
