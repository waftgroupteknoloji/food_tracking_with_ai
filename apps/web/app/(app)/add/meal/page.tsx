'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import type { CoinBalance } from '@yemek-takip/validators';
import { uploadImage } from '@/lib/upload-web';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, X, Type, Image as ImageIcon } from 'lucide-react';
import { CoinInsufficientModal } from '@/components/coin-insufficient-modal';
import { COIN_BALANCE_QUERY_KEY } from '@/components/coin-badge';

type Stage = 'idle' | 'uploading' | 'analyzing' | 'error';
type Mode = 'photo' | 'text';

const TEXT_SUGGESTIONS = [
  '3 yumurta, 2 dilim beyaz ekmek, biraz peynir',
  '1 porsiyon mercimek çorbası, 2 dilim ekmek',
  '1 tabak makarna, biraz parmesan',
  '1 simit, çay',
  '1 porsiyon pilav, 1 köfte, yoğurt',
];

export default function AddMealPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>('photo');
  const [preview, setPreview] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showInsufficient, setShowInsufficient] = useState(false);
  const [pending, setPending] = useState<{ kind: 'file'; file: File } | { kind: 'text' } | null>(
    null,
  );

  const hasCoinForAnalysis = () => {
    const data = qc.getQueryData<CoinBalance>(COIN_BALANCE_QUERY_KEY);
    if (!data) return true; // henüz yüklenmedi — sunucuya gitsin
    return data.hasActiveSubscription || data.coins >= 1;
  };

  async function handleFile(file: File) {
    setError(null);
    if (!hasCoinForAnalysis()) {
      setPending({ kind: 'file', file });
      setShowInsufficient(true);
      return;
    }
    setPreview(URL.createObjectURL(file));
    try {
      setStage('uploading');
      const { key, publicUrl } = await uploadImage(file, 'meals');

      setStage('analyzing');
      const meal = await api.meals.create({
        photoKey: key,
        photoUrl: publicUrl,
        consumedAt: new Date().toISOString(),
      });
      router.replace(`/meal/${meal._id}?fresh=1`);
    } catch (err) {
      setStage('error');
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_COINS') {
        setPending({ kind: 'file', file });
        setShowInsufficient(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Hata');
    }
  }

  async function handleText() {
    const value = text.trim();
    if (!value) return;
    setError(null);
    if (!hasCoinForAnalysis()) {
      setPending({ kind: 'text' });
      setShowInsufficient(true);
      return;
    }
    try {
      setStage('analyzing');
      const meal = await api.meals.create({
        inputText: value,
        consumedAt: new Date().toISOString(),
      });
      router.replace(`/meal/${meal._id}?fresh=1`);
    } catch (err) {
      setStage('error');
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_COINS') {
        setPending({ kind: 'text' });
        setShowInsufficient(true);
        return;
      }
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Hata');
    }
  }

  function appendSuggestion(s: string) {
    setText((prev) => (prev ? `${prev}, ${s}` : s));
  }

  const isBusy = stage === 'uploading' || stage === 'analyzing';

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-24 md:pb-8 space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Yemek Ekle</h1>
        <p className="text-muted-foreground">
          Fotoğraf yükle ya da yediklerini yaz — AI içindekileri ve kalorisini tahmin etsin.
        </p>
      </header>

      <div className="inline-flex rounded-lg border border-border bg-card p-1 gap-1">
        <button
          onClick={() => setMode('photo')}
          disabled={isBusy}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
            mode === 'photo'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ImageIcon size={16} /> Fotoğraf
        </button>
        <button
          onClick={() => setMode('text')}
          disabled={isBusy}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${
            mode === 'text'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Type size={16} /> Yazı
        </button>
      </div>

      {mode === 'photo' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Fotoğraf seç</CardTitle>
            <CardDescription>
              Tabağa yukarıdan, iyi aydınlatılmış bir fotoğraf en doğru sonucu verir.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview ? (
              <div className="relative aspect-square w-full max-w-md mx-auto rounded-xl overflow-hidden">
                <img
                  src={preview}
                  alt="Yüklenen yemek"
                  className="w-full h-full object-cover"
                />
                {isBusy && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 text-white">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="font-medium">
                      {stage === 'uploading'
                        ? 'Fotoğraf yükleniyor…'
                        : 'AI yemeği analiz ediyor…'}
                    </p>
                  </div>
                )}
                {stage === 'error' && (
                  <button
                    onClick={() => {
                      setPreview(null);
                      setStage('idle');
                      setError(null);
                    }}
                    className="absolute top-2 right-2 p-2 rounded-full bg-black/60 text-white"
                    aria-label="Temizle"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md mx-auto aspect-square rounded-xl border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition flex flex-col items-center justify-center gap-3 text-muted-foreground"
              >
                <Camera size={40} />
                <span className="font-medium">Tıkla ve fotoğraf seç</span>
                <span className="text-xs">JPG / PNG / WEBP — max 10MB</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
            />

            {!preview && (
              <div className="flex justify-center gap-2">
                <Button onClick={() => fileInputRef.current?.click()} variant="default">
                  <Upload size={16} /> Fotoğraf seç
                </Button>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3 text-center">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Yediklerini yaz</CardTitle>
            <CardDescription>
              &ldquo;3 yumurta, biraz peynir, 2 dilim beyaz ekmek&rdquo; gibi virgülle ayır.
              AI miktarları çözüp kaloriyi hesaplar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ör: 3 yumurta, 2 dilim beyaz ekmek, biraz beyaz peynir"
              rows={5}
              maxLength={1000}
              disabled={isBusy}
              className="w-full rounded-lg border border-input bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />

            <div>
              <p className="text-xs text-muted-foreground mb-2">Hızlı örnekler:</p>
              <div className="flex flex-wrap gap-2">
                {TEXT_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => appendSuggestion(s)}
                    disabled={isBusy}
                    className="px-3 py-1.5 rounded-full text-xs border border-border bg-card hover:bg-secondary disabled:opacity-50"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md p-3">
                {error}
              </p>
            )}

            <Button
              onClick={handleText}
              disabled={!text.trim() || isBusy}
              size="lg"
              className="w-full"
            >
              {isBusy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> AI hesaplıyor…
                </>
              ) : (
                'Analiz et ve kaydet'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-xs text-muted-foreground">
        AI analizi 3-10 saniye sürebilir. Tahmin yanlışsa sonraki ekranda her item&apos;ı düzenleyebilirsin.
      </div>

      <CoinInsufficientModal
        open={showInsufficient}
        onClose={() => {
          setShowInsufficient(false);
          setPending(null);
          setStage('idle');
        }}
        onAdRewardSuccess={() => {
          setShowInsufficient(false);
          // Reklam izlendi, +1 coin geldi — bekleyen analizi otomatik tekrar dene.
          const p = pending;
          setPending(null);
          if (p?.kind === 'file') {
            void handleFile(p.file);
          } else if (p?.kind === 'text') {
            void handleText();
          }
        }}
      />
    </main>
  );
}
