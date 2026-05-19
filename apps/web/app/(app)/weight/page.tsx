'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ImageIcon } from 'lucide-react';

const PERIODS = [
  { value: 'week', label: '7 gün' },
  { value: 'month', label: '30 gün' },
  { value: 'year', label: '1 yıl' },
  { value: 'all', label: 'Tümü' },
] as const;

export default function WeightPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['weight', period],
    queryFn: () => api.weight.list(period),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.weight.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weight'] }),
  });

  const data = query.data ?? [];
  const chartData = data.map((w) => ({
    date: w.date.slice(5),
    weight: w.weightKg,
  }));

  const first = data[0];
  const last = data[data.length - 1];
  const change = first && last ? +(last.weightKg - first.weightKg).toFixed(1) : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kilo</h1>
          <p className="text-muted-foreground">Zaman içindeki ilerlemen.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/weight/photos">
              <ImageIcon size={16} /> Fotoğraflar
            </Link>
          </Button>
          <Button asChild>
            <Link href="/add/weight">
              <Plus size={16} /> Ölçüm ekle
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border ${
              p.value === period
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:bg-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-baseline justify-between">
            <CardTitle>Trend</CardTitle>
            {change !== null && (
              <span
                className={`text-2xl font-bold ${
                  change < 0 ? 'text-primary' : change > 0 ? 'text-accent' : ''
                }`}
              >
                {change > 0 ? '+' : ''}
                {change} kg
              </span>
            )}
          </div>
          <CardDescription>
            {first && last
              ? `${first.date} → ${last.date}`
              : 'Henüz veri yok'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Bu dönemde kayıt yok. <Link href="/add/weight" className="text-primary hover:underline">Ekle</Link>
            </p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kayıtlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Boş.</p>
          ) : (
            [...data].reverse().map((w) => (
              <div
                key={w._id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                {w.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={w.photoUrl}
                    alt=""
                    className="w-12 h-12 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-md bg-secondary" />
                )}
                <div className="flex-1">
                  <div className="font-semibold">{w.weightKg} kg</div>
                  <div className="text-xs text-muted-foreground">
                    {w.date} {w.note && `· ${w.note}`}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Sil?')) remove.mutate(w._id);
                  }}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
