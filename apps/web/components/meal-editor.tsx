'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import type { Meal, MealType, MealItem } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import { Trash2, Plus, Save, AlertTriangle, ArrowLeft } from 'lucide-react';

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Kahvaltı' },
  { value: 'lunch', label: 'Öğle' },
  { value: 'dinner', label: 'Akşam' },
  { value: 'snack', label: 'Atıştırma' },
];

type EditableItem = MealItem & { _localId: string };

function newLocalId() {
  return Math.random().toString(36).slice(2);
}

export function MealEditor({
  initialMeal,
  startInEditMode = false,
}: {
  initialMeal: Meal;
  startInEditMode?: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<EditableItem[]>(
    initialMeal.items.map((it) => ({ ...it, _localId: newLocalId() })),
  );
  const [mealType, setMealType] = useState<MealType | undefined>(initialMeal.mealType);
  const [userNote, setUserNote] = useState(initialMeal.userNote ?? '');
  const [error, setError] = useState<string | null>(null);

  const totalKcal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.kcal) || 0), 0),
    [items],
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      api.meals.update(initialMeal._id, {
        mealType,
        userNote: userNote.trim() || undefined,
        items: items.map(({ _localId, ...rest }) => rest),
      }),
    onSuccess: () => {
      setError(null);
      router.replace('/dashboard');
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Kaydedilemedi');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.meals.remove(initialMeal._id),
    onSuccess: () => router.replace('/dashboard'),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Silinemedi'),
  });

  function updateItem(localId: string, patch: Partial<MealItem>) {
    setItems((prev) =>
      prev.map((it) =>
        it._localId === localId
          ? { ...it, ...patch, isEdited: true }
          : it,
      ),
    );
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((it) => it._localId !== localId));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        _localId: newLocalId(),
        name: '',
        quantity: 1,
        unit: 'porsiyon',
        kcal: 0,
        isEdited: false,
        isAdded: true,
      },
    ]);
  }

  const aiError = initialMeal.aiAnalysis.error;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Geri
      </button>

      {/* Foto veya kullanıcı metni */}
      {initialMeal.photoUrl ? (
        <div className="relative w-full aspect-square sm:aspect-[16/9] rounded-xl overflow-hidden bg-secondary">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={initialMeal.photoUrl}
            alt="Yemek fotoğrafı"
            className="w-full h-full object-cover"
          />
        </div>
      ) : initialMeal.inputText ? (
        <div className="rounded-xl border border-border bg-secondary/40 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Yazdıkların
          </p>
          <p className="text-sm leading-relaxed">{initialMeal.inputText}</p>
        </div>
      ) : null}

      {aiError && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            AI analizi yapılamadı: <strong>{aiError}</strong>. Aşağıdan elle item ekle.
          </span>
        </div>
      )}

      {/* Meal type chip'ler */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Öğün türü</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {MEAL_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setMealType(t.value === mealType ? undefined : t.value)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium border transition',
                  mealType === t.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:bg-secondary',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Yemekler</CardTitle>
              <CardDescription>
                Her bir öğeyi düzenleyebilirsin. AI tahmin ettiyse rozetli görünür.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={addItem}>
              <Plus size={16} /> Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Henüz item yok — yukarıdan ekle.
            </p>
          )}
          {items.map((item) => (
            <div
              key={item._localId}
              className="rounded-lg border border-border p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => updateItem(item._localId, { name: e.target.value })}
                  placeholder="İsim (ör: Beyaz peynir)"
                  className="flex-1"
                />
                <button
                  onClick={() => removeItem(item._localId)}
                  className="text-muted-foreground hover:text-destructive p-2"
                  aria-label="Sil"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Gram</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item.grams ?? ''}
                    onChange={(e) =>
                      updateItem(item._localId, {
                        grams: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="—"
                  />
                </div>
                <div>
                  <Label className="text-xs">Kalori (kcal)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={item.kcal}
                    onChange={(e) =>
                      updateItem(item._localId, { kcal: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                {item.isAdded && (
                  <span className="px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    Eklendi
                  </span>
                )}
                {item.isEdited && !item.isAdded && (
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Düzenlendi
                  </span>
                )}
                {!item.isEdited && !item.isAdded && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    AI tahmini
                  </span>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Not */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <Label htmlFor="note">Not (opsiyonel)</Label>
          <Input
            id="note"
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="ör: Anne yapımı, hafif baharatlı..."
            maxLength={500}
          />
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
      )}

      {/* Sticky bottom bar */}
      <div className="sticky bottom-16 md:bottom-4 z-20 -mx-4 px-4">
        <div className="rounded-xl border border-border bg-card/95 backdrop-blur shadow-lg p-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Toplam</div>
            <div className="text-2xl font-bold text-primary">
              {totalKcal} <span className="text-sm font-normal text-muted-foreground">kcal</span>
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={() => {
              if (confirm('Bu yemeği silmek istediğine emin misin?')) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
          >
            <Trash2 size={16} />
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            <Save size={16} /> {saveMutation.isPending ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </div>
      </div>
    </div>
  );
}
