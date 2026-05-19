'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError } from '@yemek-takip/api-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const ACTIVITIES = [
  { value: 'sedentary', label: 'Az hareketli (masa başı)' },
  { value: 'light', label: 'Hafif (haftada 1-3 egzersiz)' },
  { value: 'moderate', label: 'Orta (3-5 egzersiz)' },
  { value: 'active', label: 'Aktif (6-7 egzersiz)' },
] as const;

export default function ProfileEditPage() {
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

  const save = useMutation({
    mutationFn: () =>
      api.profile.update({
        displayName: displayName.trim() || undefined,
        heightCm: heightCm ? Number(heightCm) : undefined,
        sex: sex || undefined,
        birthDate: birthDate || undefined,
        goalWeightKg: goalWeightKg ? Number(goalWeightKg) : undefined,
        activityLevel: activityLevel || undefined,
        targetDailyKcal: targetDailyKcal ? Number(targetDailyKcal) : undefined,
        waterGoalMl: waterGoalMl ? Number(waterGoalMl) : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
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
          Bilgilerini doldurursan günlük kalori hedefin BMR/TDEE'den otomatik hesaplanır.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Kişisel bilgiler</CardTitle>
          <CardDescription>BMR hesabı için gerekli.</CardDescription>
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
          <CardTitle>Hedefler</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal">Hedef kilo (kg)</Label>
              <Input
                id="goal"
                type="number"
                inputMode="decimal"
                step="0.1"
                value={goalWeightKg}
                onChange={(e) => setGoalWeightKg(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kcal">Günlük kalori (boş bırak → otomatik)</Label>
              <Input
                id="kcal"
                type="number"
                inputMode="numeric"
                placeholder="Otomatik"
                value={targetDailyKcal}
                onChange={(e) => setTargetDailyKcal(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Aktivite seviyesi</Label>
            <div className="space-y-2">
              {ACTIVITIES.map((a) => (
                <button
                  key={a.value}
                  onClick={() => setActivityLevel(a.value)}
                  className={`w-full text-left p-3 rounded-lg border ${
                    activityLevel === a.value
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-secondary'
                  }`}
                >
                  <div className="font-medium">{a.label}</div>
                </button>
              ))}
            </div>
          </div>

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
