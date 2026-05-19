'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const SUGGESTIONS = [
  '1 saat yürüyüş',
  '30 dk koşu',
  '45 dk bisiklet',
  '20 dk yüzme',
  '1 saat pilates',
  '30 dk ağırlık',
];

export default function AddActivityPage() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (inputText: string) =>
      api.activities.create({
        inputText,
        performedAt: new Date().toISOString(),
      }),
    onSuccess: (a) => router.replace(`/activity/${a._id}`),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Hata'),
  });

  function append(s: string) {
    setText((prev) => (prev ? `${prev}, ${s}` : s));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Aktivite Ekle</h1>
        <p className="text-muted-foreground">
          Bugün ne yaptığını yaz — AI MET tablosundan kaloriyi hesaplasın.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Aktiviteni anlat</CardTitle>
          <CardDescription>
            "1 saat yürüdüm, 10 dk koştum, 30 dk yüzdüm" gibi virgülle ayır.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="ör: 1 saat yürüyüş + 20 dk koşu"
            rows={4}
            maxLength={1000}
            className="w-full rounded-lg border border-input bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <div>
            <p className="text-xs text-muted-foreground mb-2">Hızlı:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => append(s)}
                  className="px-3 py-1.5 rounded-full text-sm border border-border bg-card hover:bg-secondary"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
          )}

          <Button
            onClick={() => {
              setError(null);
              mutation.mutate(text.trim());
            }}
            disabled={!text.trim() || mutation.isPending}
            className="w-full"
            size="lg"
          >
            {mutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> AI hesaplıyor…
              </>
            ) : (
              'Analiz et ve kaydet'
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
