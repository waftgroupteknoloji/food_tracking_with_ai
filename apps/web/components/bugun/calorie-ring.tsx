'use client';

import type { ReactNode } from 'react';

interface Props {
  size?: number;
  stroke?: number;
  consumed: number;
  burned: number;
  goal: number;
  primary?: string;
  accent?: string;
  children?: ReactNode;
}

export function CalorieRing({
  size = 220,
  stroke = 18,
  consumed,
  burned,
  goal,
  primary = 'var(--primary)',
  accent = 'var(--coral)',
  children,
}: Props) {
  const safeGoal = Math.max(goal, 1);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const innerR = r - stroke - 4;
  const cInner = 2 * Math.PI * Math.max(innerR, 0);

  const pConsumed = Math.min(consumed / safeGoal, 1);
  const pBurned = Math.min(burned / safeGoal, 1);
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke="oklch(1 0 0 / 0.05)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          stroke={primary}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c * pConsumed} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          stroke="oklch(1 0 0 / 0.04)"
          strokeWidth={Math.max(stroke - 6, 2)}
          fill="none"
        />
        <circle
          cx={cx}
          cy={cy}
          r={innerR}
          stroke={accent}
          strokeWidth={Math.max(stroke - 6, 2)}
          fill="none"
          strokeDasharray={`${cInner * pBurned} ${cInner}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          textAlign: 'center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function MacroLine({
  label,
  value,
  goal,
  color,
  suffix = 'g',
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
  suffix?: string;
}) {
  const pct = Math.min(value / Math.max(goal, 1), 1) * 100;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          fontSize: 12,
        }}
      >
        <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
        <span className="num" style={{ color: 'var(--text)', fontWeight: 600 }}>
          {Math.round(value)}
          <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>
            /{Math.round(goal)}
            {suffix}
          </span>
        </span>
      </div>
      <div className="b-macrobar">
        <i style={{ width: pct + '%', background: color }} />
      </div>
    </div>
  );
}
