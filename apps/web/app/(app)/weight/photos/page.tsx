'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';

export default function WeightPhotosPage() {
  const query = useQuery({
    queryKey: ['weight', 'photos'],
    queryFn: () => api.weight.photos(),
  });

  const photos = query.data ?? [];
  const [aId, setAId] = useState<string | null>(null);
  const [bId, setBId] = useState<string | null>(null);
  const [slider, setSlider] = useState(50);

  const a = photos.find((p) => p._id === aId) ?? photos[0];
  const b = photos.find((p) => p._id === bId) ?? photos[photos.length - 1];

  const diffKg =
    a && b ? +(b.weightKg - a.weightKg).toFixed(1) : null;
  const diffDays =
    a && b
      ? Math.abs(
          Math.round(
            (new Date(b.date).getTime() - new Date(a.date).getTime()) /
              86400000,
          ),
        )
      : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <Link
        href="/weight"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Kilo
      </Link>

      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Karşılaştır</h1>
          <p className="text-muted-foreground">İki tarih seç, fotoğrafları yan yana gör.</p>
        </div>
        <Button asChild>
          <Link href="/add/weight">
            <Plus size={16} /> Yeni foto
          </Link>
        </Button>
      </header>

      {photos.length < 2 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <p className="text-muted-foreground">
              En az 2 fotoğraflı kilo kaydı lazım. Şu an: <strong>{photos.length}</strong>
            </p>
            <Button asChild>
              <Link href="/add/weight">İlk foto ekle</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Slider */}
          {a && b && (
            <Card>
              <CardHeader>
                <div className="flex items-baseline justify-between flex-wrap gap-3">
                  <CardTitle>
                    {a.date} → {b.date}
                  </CardTitle>
                  {diffKg !== null && (
                    <span
                      className={`text-xl font-bold ${
                        diffKg < 0 ? 'text-primary' : diffKg > 0 ? 'text-accent' : ''
                      }`}
                    >
                      {diffDays} gün · {diffKg > 0 ? '+' : ''}
                      {diffKg} kg
                    </span>
                  )}
                </div>
                <CardDescription>
                  {a.weightKg} kg → {b.weightKg} kg. Slider&apos;ı sürükle.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative w-full max-w-xl mx-auto aspect-[3/4] rounded-xl overflow-hidden bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.photoUrl ?? ''}
                    alt="Önce"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 0 0 ${slider}%)` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.photoUrl ?? ''}
                      alt="Sonra"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize"
                    style={{ left: `${slider}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={slider}
                  onChange={(e) => setSlider(Number(e.target.value))}
                  className="w-full mt-4 max-w-xl mx-auto block accent-primary"
                />
              </CardContent>
            </Card>
          )}

          {/* Photo pickers */}
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                { label: 'Önce', value: a?._id, set: setAId },
                { label: 'Sonra', value: b?._id, set: setBId },
              ] as const
            ).map((side) => (
              <Card key={side.label}>
                <CardHeader>
                  <CardTitle className="text-lg">{side.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-auto">
                    {photos.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => side.set(p._id)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                          side.value === p._id ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.photoUrl ?? ''}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 px-1 py-0.5 bg-black/60 text-white text-[10px]">
                          {p.date}
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
