'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { uploadImage } from '@/lib/upload-web';
import { ApiError } from '@yemek-takip/api-client';
import { Icon } from './icon';

type Step = 1 | 2 | 3;
type Source = 'photo' | 'manual' | 'voice' | 'fav';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AIMealModal({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [source, setSource] = useState<Source>('photo');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSource('photo');
      setErrorMsg(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { key, publicUrl } = await uploadImage(file, 'meals');
      const meal = await api.meals.create({
        photoKey: key,
        photoUrl: publicUrl,
        consumedAt: new Date().toISOString(),
      });
      return meal;
    },
    onSuccess: (meal) => {
      setStep(3);
      // brief pause so user sees the success state, then jump to the real meal editor
      setTimeout(() => {
        onClose();
        router.push(`/meal/${meal._id}?fresh=1`);
      }, 600);
    },
    onError: (err) => {
      setErrorMsg(
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Hata',
      );
      setStep(1);
    },
  });

  if (!open) return null;

  const handleFile = (file: File) => {
    setErrorMsg(null);
    setStep(2);
    upload.mutate(file);
  };

  const goManual = () => {
    onClose();
    router.push('/add/meal');
  };

  return (
    <div className="bugun-app bugun-modal-scrim" onClick={onClose}>
      <div
        className="bugun-modal-shell"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px 12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              className="disp"
              style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}
            >
              Yemek ekle
            </div>
            <Stepper step={step} />
          </div>
          <button
            onClick={onClose}
            aria-label="Kapat"
            style={{
              all: 'unset',
              cursor: 'pointer',
              color: 'var(--text-3)',
              fontSize: 18,
              padding: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </header>

        <div style={{ padding: '4px 22px 22px' }}>
          {step === 1 && (
            <ModalStep1
              source={source}
              onSource={setSource}
              onFile={handleFile}
              onManual={goManual}
              onClose={onClose}
              error={errorMsg}
            />
          )}
          {step === 2 && <ModalStep2 />}
          {step === 3 && <ModalStep3 />}
        </div>
      </div>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: i === step ? 24 : 8,
            height: 8,
            borderRadius: 999,
            background: i <= step ? 'var(--primary)' : 'oklch(1 0 0 / 0.08)',
            transition: 'all .2s ease',
          }}
        />
      ))}
      <span
        className="mono"
        style={{ fontSize: 10.5, color: 'var(--text-4)', marginLeft: 4 }}
      >
        {step}/3
      </span>
    </div>
  );
}

function ModalStep1({
  source,
  onSource,
  onFile,
  onManual,
  onClose,
  error,
}: {
  source: Source;
  onSource: (s: Source) => void;
  onFile: (f: File) => void;
  onManual: () => void;
  onClose: () => void;
  error: string | null;
}) {
  const [drag, setDrag] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { id: Source; label: string; icon: 'camera' | 'edit' | 'mic' | 'bolt' }[] = [
    { id: 'photo', label: 'Fotoğraf', icon: 'camera' },
    { id: 'manual', label: 'Manuel', icon: 'edit' },
    { id: 'voice', label: 'Sesli', icon: 'mic' },
    { id: 'fav', label: 'Favori', icon: 'bolt' },
  ];

  const pick = () => fileInputRef.current?.click();
  const isPhoto = source === 'photo';

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'oklch(1 0 0 / 0.03)',
          borderRadius: 12,
          border: '1px solid var(--border-2)',
          marginBottom: 16,
        }}
      >
        {tabs.map((t) => {
          const active = t.id === source;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSource(t.id)}
              style={{
                flex: 1,
                height: 34,
                all: 'unset',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontSize: 12.5,
                fontWeight: 600,
                borderRadius: 8,
                color: active ? '#0a0d12' : 'var(--text-3)',
                background: active ? 'var(--primary)' : 'transparent',
              }}
            >
              <Icon name={t.icon} size={13} /> {t.label}
            </button>
          );
        })}
      </div>

      {isPhoto ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) onFile(f);
          }}
          onClick={pick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') pick();
          }}
          style={{
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            borderRadius: 18,
            padding: '32px 22px',
            border: `2px dashed color-mix(in oklch, var(--primary) ${drag ? 80 : 45}%, transparent)`,
            background: `color-mix(in oklch, var(--primary) ${drag ? 12 : 6}%, transparent)`,
            textAlign: 'center',
            minHeight: 220,
            transition: 'all .15s',
          }}
        >
          <div>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 999,
                margin: '0 auto 14px',
                display: 'grid',
                placeItems: 'center',
                background: 'var(--primary)',
                color: '#0a0d12',
                boxShadow: '0 10px 28px color-mix(in oklch, var(--primary) 32%, transparent)',
              }}
            >
              <Icon name="camera" size={28} stroke={2} />
            </div>
            <div
              className="disp"
              style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}
            >
              Fotoğrafı buraya sürükle
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}
            >
              veya{' '}
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>dosya seç</span>{' '}
              · JPG · PNG · HEIC
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            placeItems: 'center',
            width: '100%',
            borderRadius: 18,
            padding: '32px 22px',
            border: '1px dashed var(--border)',
            minHeight: 220,
            textAlign: 'center',
          }}
        >
          <div>
            <div
              className="disp"
              style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}
            >
              Bu mod yakında
            </div>
            <div
              style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6 }}
            >
              Şimdilik fotoğraftan AI ile ekleyebilirsin.
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 10,
            background: 'color-mix(in oklch, var(--coral) 12%, transparent)',
            color: 'var(--coral)',
            fontSize: 12.5,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button type="button" className="b-btn" style={{ flex: 1 }} onClick={onClose}>
          İptal
        </button>
        {isPhoto ? (
          <button
            type="button"
            className="b-btn b-btn-primary"
            style={{ flex: 1.4 }}
            onClick={pick}
          >
            Fotoğraf seç <Icon name="arrow" size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="b-btn b-btn-primary"
            style={{ flex: 1.4 }}
            onClick={onManual}
          >
            Manuel ekleme sayfası <Icon name="arrow" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

function ModalStep2() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setProgress((p) => Math.min(p + 1, 4)), 600);
    return () => clearInterval(id);
  }, []);

  const stages = [
    'Tabak ve yemekler tanındı',
    'Porsiyon büyüklüğü tahmin ediliyor',
    'Makro besinler hesaplanıyor',
    'Sonuç hazırlanıyor',
  ];

  const boxes = [
    { x: 18, y: 22, w: 38, h: 36, label: 'tabak', c: 92 },
    { x: 56, y: 38, w: 30, h: 28, label: 'pirinç', c: 88 },
    { x: 12, y: 60, w: 28, h: 22, label: 'sos', c: 76 },
  ];

  return (
    <div>
      <div
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          height: 220,
          background:
            'repeating-linear-gradient(45deg, oklch(0.30 0.02 250) 0 8px, oklch(0.26 0.02 250) 8px 16px)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: 'var(--text-3)',
              background: 'oklch(0 0 0 / 0.4)',
              padding: '4px 10px',
              borderRadius: 6,
            }}
          >
            yemek · analiz ediliyor
          </span>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${40 + progress * 8}%`,
            height: 2,
            background: 'var(--primary)',
            boxShadow: '0 0 16px var(--primary)',
            transition: 'top .5s ease',
          }}
        />
        {boxes.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.x + '%',
              top: b.y + '%',
              width: b.w + '%',
              height: b.h + '%',
              border: '1.5px solid var(--primary)',
              borderRadius: 6,
              boxShadow: '0 0 0 2px color-mix(in oklch, var(--primary) 12%, transparent)',
              opacity: progress >= i ? 1 : 0,
              transition: 'opacity .3s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -22,
                left: -1,
                padding: '2px 8px',
                background: 'var(--primary)',
                color: '#0a0d12',
                fontSize: 10,
                fontWeight: 700,
                fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
                borderRadius: 4,
              }}
            >
              {b.label} · %{b.c}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 14,
          borderRadius: 12,
          background: 'color-mix(in oklch, var(--primary) 6%, transparent)',
          border: '1px solid color-mix(in oklch, var(--primary) 22%, transparent)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 999,
              background: 'var(--primary)',
              display: 'grid',
              placeItems: 'center',
              color: '#0a0d12',
            }}
          >
            <Icon name="sparkles" size={13} stroke={2.4} />
          </span>
          <span
            className="disp"
            style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}
          >
            AI · analiz
          </span>
          <span
            className="mono"
            style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-3)' }}
          >
            ~birkaç saniye
          </span>
        </div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'grid',
            gap: 7,
          }}
        >
          {stages.map((s, i) => {
            const done = i < progress;
            const loading = i === progress;
            return (
              <li
                key={s}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12.5,
                  color: done ? 'var(--text-2)' : 'var(--text-3)',
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    display: 'grid',
                    placeItems: 'center',
                    background: done ? 'var(--primary)' : 'transparent',
                    border: done
                      ? 'none'
                      : loading
                        ? '2px solid var(--primary)'
                        : '1.5px solid var(--border)',
                    borderTopColor: loading ? 'transparent' : undefined,
                    animation: loading ? 'bugun-spin 0.9s linear infinite' : 'none',
                    color: '#0a0d12',
                  }}
                >
                  {done ? <Icon name="check" size={10} stroke={3} /> : null}
                </span>
                {s}
                {loading ? '…' : ''}
              </li>
            );
          })}
        </ul>
      </div>

      <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button type="button" className="b-btn" style={{ flex: 1 }} disabled>
          Geri
        </button>
        <button type="button" className="b-btn b-btn-primary" style={{ flex: 1.4 }} disabled>
          Analiz sürüyor…
        </button>
      </div>
    </div>
  );
}

function ModalStep3() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', padding: '40px 0' }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: 'var(--primary)',
          display: 'grid',
          placeItems: 'center',
          color: '#0a0d12',
          marginBottom: 16,
        }}
      >
        <Icon name="check" size={32} stroke={2.6} />
      </div>
      <div
        className="disp"
        style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}
      >
        Yemek hazır
      </div>
      <div
        className="mono"
        style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}
      >
        Detay sayfasına yönlendiriliyor…
      </div>
    </div>
  );
}
