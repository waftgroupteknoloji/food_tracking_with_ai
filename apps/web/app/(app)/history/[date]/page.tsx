'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalorieRing } from '@/components/calorie-ring';
import { ArrowLeft, Activity as ActivityIcon } from 'lucide-react';

interface PageProps {
  params: Promise<{ date: string }>;
}

export default function HistoryDatePage({ params }: PageProps) {
  const { date } = use(params);

  const query = useQuery({
    queryKey: ['stats', 'daily', date],
    queryFn: () => api.stats.daily(date),
  });

  const data = query.data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <Link
        href="/history"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Geçmiş
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight">{date}</h1>
      </header>

      <Card>
        <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8">
          <CalorieRing
            kcalIn={data?.kcalIn ?? 0}
            kcalOut={data?.kcalOut ?? 0}
            target={data?.target ?? null}
          />
          <div className="flex-1 space-y-3">
            <div>
              <div className="text-sm text-muted-foreground">Alınan</div>
              <div className="text-xl font-bold text-primary">
                {data?.kcalIn ?? 0} kcal
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Yakılan</div>
              <div className="text-xl font-bold text-accent">
                {data?.kcalOut ?? 0} kcal
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Su</div>
              <div className="text-xl font-bold text-blue-500">
                {Math.round(((data?.waterMl ?? 0) / 1000) * 10) / 10}L
              </div>
            </div>
            {data?.weightKg && (
              <div>
                <div className="text-sm text-muted-foreground">Kilo</div>
                <div className="text-xl font-bold">{data.weightKg} kg</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Yemekler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.meals ?? []).map((m) => (
              <Link
                key={m._id}
                href={`/meal/${m._id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary shrink-0 flex items-center justify-center text-[10px] text-muted-foreground">
                  {m.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    'yazı'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {m.items[0]?.name ?? 'Yemek'}{' '}
                    {m.items.length > 1 && `+${m.items.length - 1}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {m.mealType ?? ''} · {m.totalKcal} kcal
                  </div>
                </div>
              </Link>
            ))}
            {(!data?.meals || data.meals.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Bu günde yemek loglanmadı.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Aktiviteler</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.activities ?? []).map((a) => (
              <Link
                key={a._id}
                href={`/activity/${a._id}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary"
              >
                <div className="w-12 h-12 rounded-lg bg-accent/10 items-center justify-center flex shrink-0">
                  <ActivityIcon size={20} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {a.items.map((i) => i.name).join(', ') || 'Aktivite'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.items.reduce((s, i) => s + i.durationMin, 0)} dk ·{' '}
                    {a.totalKcalBurned} kcal
                  </div>
                </div>
              </Link>
            ))}
            {(!data?.activities || data.activities.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Bu günde aktivite loglanmadı.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
