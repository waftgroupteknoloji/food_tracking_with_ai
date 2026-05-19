'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { todayLocalDate } from '@yemek-takip/utils';
import { Droplet, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';

const QUICK_AMOUNTS = [100, 250, 330, 500, 750, 1000];

export default function AddWaterPage() {
  const router = useRouter();
  const today = todayLocalDate();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['water', today],
    queryFn: () => api.water.listByDate(today),
  });

  const add = useMutation({
    mutationFn: (amountMl: number) => api.water.add({ amountMl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water', today] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.water.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water', today] }),
  });

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Dashboard
      </Link>

      <header>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Droplet className="text-blue-500" /> Su
        </h1>
        <p className="text-muted-foreground">Bugün ne kadar içtin?</p>
      </header>

      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-6xl font-bold text-blue-500">
            {Math.round(((query.data?.totalMl ?? 0) / 1000) * 10) / 10}L
          </div>
          <p className="text-sm text-muted-foreground mt-2">bugün</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hızlı ekle</CardTitle>
          <CardDescription>Tıkla → anında eklenir.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="lg"
                onClick={() => add.mutate(amount)}
                disabled={add.isPending}
                className="h-20 flex-col"
              >
                <span className="text-2xl">💧</span>
                <span className="text-sm">{amount} ml</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bugünkü kayıtlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(query.data?.entries ?? []).map((e) => (
            <div
              key={e._id}
              className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50"
            >
              <Droplet size={16} className="text-blue-500" />
              <span className="flex-1 font-medium">{e.amountMl} ml</span>
              <span className="text-xs text-muted-foreground">
                {new Date(e.loggedAt as string).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <button
                onClick={() => remove.mutate(e._id)}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!query.data?.entries.length && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Henüz su eklenmedi.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
