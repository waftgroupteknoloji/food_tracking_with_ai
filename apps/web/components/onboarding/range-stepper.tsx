'use client';

import { Minus, Plus } from 'lucide-react';

interface RangeStepperProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  decimals?: number;
}

/**
 * Büyük sayı göstergeli, kaydırmalı + artır/azalt butonlu seçici.
 * Onboarding'de yaş / boy / kilo gibi sayısal adımlar için.
 */
export function RangeStepper({
  min,
  max,
  step = 1,
  value,
  onChange,
  unit,
  decimals = 0,
}: RangeStepperProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, +v.toFixed(6)));
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex flex-col items-center gap-8 py-2">
      <div className="flex items-end gap-2">
        <span className="text-6xl font-bold tracking-tight tabular-nums">
          {value.toFixed(decimals)}
        </span>
        {unit && (
          <span className="mb-2 text-lg font-medium text-muted-foreground">{unit}</span>
        )}
      </div>

      <div className="flex w-full items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-secondary disabled:opacity-40"
          disabled={value <= min}
          aria-label="Azalt"
        >
          <Minus size={18} />
        </button>

        <div className="relative flex-1">
          {/* dolu kısım göstergesi */}
          <div className="pointer-events-none absolute top-1/2 left-0 h-2 w-full -translate-y-1/2 rounded-full bg-secondary" />
          <div
            className="pointer-events-none absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full bg-primary"
            style={{ width: `${pct}%` }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="onboarding-range relative z-10 w-full cursor-pointer appearance-none bg-transparent"
            aria-label={unit}
          />
        </div>

        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:bg-secondary disabled:opacity-40"
          disabled={value >= max}
          aria-label="Artır"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex w-full justify-between px-12 text-xs text-muted-foreground tabular-nums">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
