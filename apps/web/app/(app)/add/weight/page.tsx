'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import { uploadImage } from '@/lib/upload-web';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { todayLocalDate } from '@yemek-takip/utils';
import { Camera, Loader2, X } from 'lucide-react';

export default function AddWeightPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(todayLocalDate());
  const [weightKg, setWeightKg] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<{ file: File; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let photoKey: string | undefined;
      let photoUrl: string | undefined;
      if (photo) {
        setUploading(true);
        try {
          const r = await uploadImage(photo.file, 'weight');
          photoKey = r.key;
          photoUrl = r.publicUrl;
        } finally {
          setUploading(false);
        }
      }
      return api.weight.upsert({
        date,
        weightKg: Number(weightKg),
        photoKey,
        photoUrl,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => router.replace('/weight'),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Hata'),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Kilo Ekle</h1>
        <p className="text-muted-foreground">
          Düzenli ölçüm + opsiyonel vücut fotoğrafı ilerlemeyi en iyi şekilde gösterir.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ölçüm</CardTitle>
          <CardDescription>Aynı gün yeniden girersen üzerine yazılır.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kg">Kilo (kg)</Label>
              <Input
                id="kg"
                type="number"
                inputMode="decimal"
                step="0.1"
                min={20}
                max={500}
                placeholder="ör: 78.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Vücut fotoğrafı (opsiyonel)</Label>
            {photo ? (
              <div className="relative w-full max-w-xs aspect-[3/4] rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt="Vücut"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-xs aspect-[3/4] rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 flex flex-col items-center justify-center gap-2 text-muted-foreground"
              >
                <Camera size={32} />
                <span className="text-sm">Fotoğraf ekle</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto({ file: f, preview: URL.createObjectURL(f) });
                e.target.value = '';
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Not (opsiyonel)</Label>
            <Input
              id="note"
              placeholder="ör: aç karna, sabah"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</p>
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={!weightKg || mutation.isPending}
            onClick={() => {
              setError(null);
              mutation.mutate();
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Foto yükleniyor…
              </>
            ) : mutation.isPending ? (
              'Kaydediliyor…'
            ) : (
              'Kaydet'
            )}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
