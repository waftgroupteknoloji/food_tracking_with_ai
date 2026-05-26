'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const COIN_BALANCE_QUERY_KEY = ['coins', 'balance'] as const;

export function CoinBadge() {
  const q = useQuery({
    queryKey: COIN_BALANCE_QUERY_KEY,
    queryFn: () => api.coins.balance(),
    staleTime: 15_000,
  });

  const coins = q.data?.coins ?? null;
  const active = q.data?.hasActiveSubscription ?? false;

  return (
    <Link
      href="/coins"
      title={active ? 'Sınırsız üyelik aktif' : 'Coin bakiyen'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 32,
        padding: '0 12px',
        borderRadius: 999,
        background: active
          ? 'linear-gradient(135deg, oklch(0.78 0.16 75 / 0.18), oklch(0.78 0.16 75 / 0.08))'
          : 'oklch(1 0 0 / 0.06)',
        border: `1px solid ${active ? 'oklch(0.78 0.16 75 / 0.4)' : 'var(--border-2, oklch(1 0 0 / 0.1))'}`,
        color: 'var(--text)',
        fontSize: 13,
        fontWeight: 600,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-inter), system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: 14 }}>🪙</span>
      <span>{active ? '∞' : coins ?? '—'}</span>
    </Link>
  );
}
