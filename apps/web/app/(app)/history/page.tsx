'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { todayLocalDate, addDaysToLocal } from '@yemek-takip/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function monthGrid(yyyymm: string): string[] {
  // Returns array of YYYY-MM-DD strings for the calendar (incl. leading blanks for week alignment)
  const [y, m] = yyyymm.split('-').map(Number);
  const first = new Date(y!, m! - 1, 1);
  const last = new Date(y!, m!, 0);
  const lead = (first.getDay() + 6) % 7; // Mon=0
  const days: string[] = Array(lead).fill('');
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(
      `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    );
  }
  return days;
}

export default function HistoryPage() {
  const today = todayLocalDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const days = useMemo(() => monthGrid(month), [month]);

  // Sadece bu ay için meals listesi alalım — basit, performans için
  const monthStart = `${month}-01`;
  const monthEnd = addDaysToLocal(`${month}-01`, 31).slice(0, 10);

  const query = useQuery({
    queryKey: ['history', month],
    queryFn: async () => {
      const result = await Promise.all(
        days
          .filter((d) => d)
          .map(async (d) => {
            try {
              const stats = await api.stats.daily(d);
              return {
                date: d,
                kcalIn: stats.kcalIn,
                kcalOut: stats.kcalOut,
                hasData: stats.meals.length > 0 || stats.activities.length > 0,
              };
            } catch {
              return null;
            }
          }),
      );
      return result.filter(Boolean) as Array<{
        date: string;
        kcalIn: number;
        kcalOut: number;
        hasData: boolean;
      }>;
    },
    staleTime: 60_000,
  });

  const dayDataMap = new Map(query.data?.map((d) => [d.date, d]) ?? []);

  function shiftMonth(delta: number) {
    const [y, m] = month.split('-').map(Number);
    const date = new Date(y!, m! - 1 + delta, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Geçmiş</h1>
        <p className="text-muted-foreground">Bir günü seç, detayları gör.</p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <button
              onClick={() => shiftMonth(-1)}
              className="p-2 rounded-md hover:bg-secondary"
            >
              <ChevronLeft size={20} />
            </button>
            <CardTitle>{month}</CardTitle>
            <button
              onClick={() => shiftMonth(1)}
              className="p-2 rounded-md hover:bg-secondary"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <CardDescription className="text-center">
            Yeşil rozet = bir şey loglandı
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-medium text-muted-foreground uppercase">
            {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, idx) => {
              if (!d) return <div key={idx} />;
              const info = dayDataMap.get(d);
              const isFuture = d > today;
              const isToday = d === today;
              return (
                <Link
                  key={d}
                  href={`/history/${d}`}
                  className={`aspect-square rounded-md flex flex-col items-center justify-center text-sm border transition ${
                    isFuture
                      ? 'border-transparent text-muted-foreground/40 pointer-events-none'
                      : info?.hasData
                        ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                        : 'border-border hover:bg-secondary'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <div className="font-medium">{d.slice(-2)}</div>
                  {info?.hasData && (
                    <div className="text-[9px] text-primary">{info.kcalIn}</div>
                  )}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
