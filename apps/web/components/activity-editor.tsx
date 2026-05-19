'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import type { Activity, ActivityItem } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus, Save, ArrowLeft, AlertTriangle } from 'lucide-react';

type EditableItem = ActivityItem & { _localId: string };
const newLocalId = () => Math.random().toString(36).slice(2);

export function ActivityEditor({ initial }: { initial: Activity }) {
  const router = useRouter();
  const [items, setItems] = useState<EditableItem[]>(
    initial.items.map((it) => ({ ...it, _localId: newLocalId() })),
  );
  const [error, setError] = useState<string | null>(null);

  const totalKcal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.kcalBurned) || 0), 0),
    [items],
  );
  const totalMin = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.durationMin) || 0), 0),
    [items],
  );

  const save = useMutation({
    mutationFn: () =>
      api.activities.update(initial._id, {
        items: items.map(({ _localId, ...rest }) => rest),
      }),
    onSuccess: () => router.replace('/dashboard'),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Hata'),
  });

  const remove = useMutation({
    mutationFn: () => api.activities.remove(initial._id),
    onSuccess: () => router.replace('/dashboard'),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Silinemedi'),
  });

  function updateItem(localId: string, patch: Partial<ActivityItem>) {
    setItems((prev) =>
      prev.map((it) =>
        it._localId === localId ? { ...it, ...patch, isEdited: true } : it,
      ),
    );
  }

  const aiError = initial.aiAnalysis.error;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Geri
      </button>

      <Card>
        <CardHeader>
          <CardTitle>Aktivite</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground italic">&ldquo;{initial.inputText}&rdquo;</p>
        </CardContent>
      </Card>

      {aiError && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>AI analizi yapılamadı: {aiError}. Elle item ekle.</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Aktiviteler</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  {
                    _localId: newLocalId(),
                    name: '',
                    durationMin: 30,
                    kcalBurned: 0,
                    isEdited: false,
                    isAdded: true,
                  },
                ])
              }
            >
              <Plus size={16} /> Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item._localId} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-start gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(item._localId, { name: e.target.value })}
                  placeholder="ör: Yürüyüş"
                  className="flex-1"
                />
                <button
                  onClick={() =>
                    setItems((prev) => prev.filter((i) => i._localId !== item._localId))
                  }
                  className="text-muted-foreground hover:text-destructive p-2"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Süre (dk)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={item.durationMin}
                    onChange={(e) =>
                      updateItem(item._localId, {
                        durationMin: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs">Yakılan (kcal)</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={item.kcalBurned}
                    onChange={(e) =>
                      updateItem(item._localId, { kcalBurned: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Henüz aktivite yok.
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
      )}

      <div className="sticky bottom-16 md:bottom-4 z-20 -mx-4 px-4">
        <div className="rounded-xl border border-border bg-card/95 backdrop-blur shadow-lg p-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">{totalMin} dk · yakıldı</div>
            <div className="text-2xl font-bold text-accent">
              {totalKcal}{' '}
              <span className="text-sm font-normal text-muted-foreground">kcal</span>
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => {
              if (confirm('Bu aktiviteyi silmek istediğine emin misin?')) remove.mutate();
            }}
            disabled={remove.isPending}
          >
            <Trash2 size={16} />
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save size={16} /> {save.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </div>
    </div>
  );
}
