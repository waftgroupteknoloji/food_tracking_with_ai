'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@yemek-takip/api-client';
import {
  ageFromBirthDate,
  calculateBMR,
  calculateTDEE,
  suggestedDailyKcal,
  todayLocalDate,
} from '@yemek-takip/utils';
import { ArrowLeft, Flame } from 'lucide-react';
import Link from 'next/link';

const ACTIVITIES = [
  { value: 'sedentary', label: 'Az hareketli (masa başı)', mult: '×1.2' },
  { value: 'light', label: 'Hafif (haftada 1-3 egzersiz)', mult: '×1.375' },
  { value: 'moderate', label: 'Orta (3-5 egzersiz)', mult: '×1.55' },
  { value: 'active', label: 'Aktif (6-7 egzersiz)', mult: '×1.725' },
] as const;

export default function ProfileEditPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const latestWeight = useQuery({
    queryKey: ['weight', 'all'],
    queryFn: () => api.weight.list('all'),
  });

  const [displayName, setDisplayName] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>('');
  const [birthDate, setBirthDate] = useState('');
  const [currentWeightKg, setCurrentWeightKg] = useState('');
  const [initialWeightKg, setInitialWeightKg] = useState<number | null>(null);
  const [goalWeightKg, setGoalWeightKg] = useState('');
  const [activityLevel, setActivityLevel] = useState<
    'sedentary' | 'light' | 'moderate' | 'active' | ''
  >('');
  const [targetDailyKcal, setTargetDailyKcal] = useState('');
  const [waterGoalMl, setWaterGoalMl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (me.data) {
      setDisplayName(me.data.displayName);
      setHeightCm(me.data.profile.heightCm?.toString() ?? '');
      setSex((me.data.profile.sex as any) ?? '');
      setBirthDate(me.data.profile.birthDate ?? '');
      setGoalWeightKg(me.data.profile.goalWeightKg?.toString() ?? '');
      setActivityLevel((me.data.profile.activityLevel as any) ?? '');
      setTargetDailyKcal(me.data.profile.targetDailyKcal?.toString() ?? '');
      setWaterGoalMl(me.data.profile.waterGoalMl?.toString() ?? '2500');
    }
  }, [me.data]);

  useEffect(() => {
    const arr = latestWeight.data ?? [];
    const last = arr[arr.length - 1]?.weightKg;
    if (last !== undefined) {
      setCurrentWeightKg(last.toString());
      setInitialWeightKg(last);
    }
  }, [latestWeight.data]);

  const preview = useMemo(() => {
    const w = Number(currentWeightKg);
    const h = Number(heightCm);
    const age = birthDate ? ageFromBirthDate(birthDate) : null;
    if (!w || !h || !age || !sex || !activityLevel) return null;
    const bmr = calculateBMR({
      weightKg: w,
      heightCm: h,
      ageYears: age,
      sex: sex as 'male' | 'female' | 'other',
    });
    const tdee = calculateTDEE(bmr, activityLevel as 'sedentary' | 'light' | 'moderate' | 'active');
    const suggested = suggestedDailyKcal(tdee);
    return { bmr, tdee, suggested, age };
  }, [currentWeightKg, heightCm, birthDate, sex, activityLevel]);

  const save = useMutation({
    mutationFn: async () => {
      const w = currentWeightKg ? Number(currentWeightKg) : null;
      const weightChanged = w !== null && !Number.isNaN(w) && w !== initialWeightKg;

      await api.profile.update({
        displayName: displayName.trim() || undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        sex: sex || undefined,
        birthDate: birthDate || undefined,
        goalWeightKg: goalWeightKg ? Number(goalWeightKg) : undefined,
        activityLevel: activityLevel || undefined,
        targetDailyKcal: targetDailyKcal ? Number(targetDailyKcal) : undefined,
        waterGoalMl: waterGoalMl ? Number(waterGoalMl) : undefined,
      });

      if (weightChanged) {
        await api.weight.upsert({
          date: todayLocalDate(),
          weightKg: w,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['weight'] });
      router.replace('/profile');
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Hata'),
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <Link
        href="/profile"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Profil
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">Profil düzenle</h1>
        <p className="text-muted-foreground">
          Bilgilerini doldur — günlük kalori hedefin kilo, boy, yaş ve aktivite seviyene göre otomatik hesaplanır.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Kişisel bilgiler</CardTitle>
          <CardDescription>Kalori hesabı için gerekli.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">İsim</Label>
            <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="height">Boy (cm)</Label>
              <Input
                id="height"
                type="number"
                inputMode="numeric"
                placeholder="ör: 175"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth">Doğum tarihi</Label>
              <Input
                id="birth"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="weight">Mevcut kilo (kg)</Label>
              <Input
                id="weight"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={20}
                max={500}
                placeholder="ör: 78.5"
                value={currentWeightKg}
                onChange={(e) => setCurrentWeightKg(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Değiştirirsen bugüne kilo girişi olarak kaydedilir.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Hedef kilo (kg)</Label>
              <Input
                id="goal"
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="ör: 75"
                value={goalWeightKg}
                onChange={(e) => setGoalWeightKg(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cinsiyet</Label>
            <div className="flex gap-2">
              {[
                { v: 'male', l: 'Erkek' },
                { v: 'female', l: 'Kadın' },
                { v: 'other', l: 'Diğer' },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setSex(o.v as any)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                    sex === o.v
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border hover:bg-secondary'
                  }`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aktivite seviyesi</CardTitle>
          <CardDescription>BMR çarpanı — yakılan günlük kaloriyi etkiler.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {ACTIVITIES.map((a) => (
              <button
                key={a.value}
                onClick={() => setActivityLevel(a.value)}
                className={`w-full text-left p-3 rounded-lg border flex items-center justify-between ${
                  activityLevel === a.value
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border hover:bg-secondary'
                }`}
              >
                <span className="font-medium">{a.label}</span>
                <span className="text-xs text-muted-foreground font-mono">{a.mult}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame size={18} className="text-primary" /> Günlük kalori hesabı
          </CardTitle>
          <CardDescription>
            Mifflin-St Jeor formülü — kilon değiştikçe limit otomatik güncellenir.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {preview ? (
            <>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-card border p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">BMR</div>
                  <div className="text-xl font-bold mt-1">{preview.bmr}</div>
                  <div className="text-[10px] text-muted-foreground">dinlenme</div>
                </div>
                <div className="rounded-lg bg-card border p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">TDEE</div>
                  <div className="text-xl font-bold mt-1">{preview.tdee}</div>
                  <div className="text-[10px] text-muted-foreground">toplam yakım</div>
                </div>
                <div className="rounded-lg bg-primary text-primary-foreground p-3">
                  <div className="text-xs uppercase tracking-wide opacity-80">Hedef</div>
                  <div className="text-xl font-bold mt-1">{preview.suggested}</div>
                  <div className="text-[10px] opacity-80">−500 kcal açık</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentWeightKg} kg · {heightCm} cm · {preview.age} yaş ·{' '}
                {sex === 'male' ? 'Erkek' : sex === 'female' ? 'Kadın' : 'Diğer'} →{' '}
                <strong className="text-foreground">{preview.suggested} kcal/gün</strong>
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Boy, kilo, doğum tarihi, cinsiyet ve aktivite seviyeni doldur — hesap burada anlık görünecek.
            </p>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
            <Label htmlFor="kcal" className="text-sm">
              Manuel hedef (opsiyonel)
            </Label>
            <Input
              id="kcal"
              type="number"
              inputMode="numeric"
              placeholder={preview ? `Otomatik: ${preview.suggested}` : 'Otomatik'}
              value={targetDailyKcal}
              onChange={(e) => setTargetDailyKcal(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Boş bırakırsan yukarıdaki otomatik hesap kullanılır.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Su hedefi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="water">Günlük su hedefi (ml)</Label>
            <Input
              id="water"
              type="number"
              inputMode="numeric"
              value={waterGoalMl}
              onChange={(e) => setWaterGoalMl(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
      )}

      <Button
        size="lg"
        className="w-full"
        onClick={() => {
          setError(null);
          save.mutate();
        }}
        disabled={save.isPending}
      >
        {save.isPending ? 'Kaydediliyor…' : 'Kaydet'}
      </Button>
    </main>
  );
}
