'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Icon, type IconName } from '@/components/bugun/icon';
import '@/components/bugun/bugun-tokens.css';

const items: { id: string; label: string; href: string; icon: IconName }[] = [
  { id: 'bugun', label: 'Bugün', href: '/dashboard', icon: 'home' },
  { id: 'gunluk', label: 'Günlük', href: '/gunluk', icon: 'clock' },
  { id: 'gecmis', label: 'Geçmiş', href: '/history', icon: 'trend' },
  { id: 'kilo', label: 'Kilo', href: '/weight', icon: 'scale' },
  { id: 'profil', label: 'Profil', href: '/profile', icon: 'user' },
];

export function AppNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      router.replace('/login');
      router.refresh();
    },
  });

  // Bugün, Günlük ve Geçmiş kendi AI-modal'lı nav'larını render ediyor —
  // burada mount etmeyelim ki iki nav üst üste binmesin.
  if (pathname === '/dashboard' || pathname === '/gunluk' || pathname === '/history') return null;

  const initial = (email[0] || 'S').toUpperCase();

  return (
    <nav
      className="bugun-vars"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid var(--border-2)',
        background: 'oklch(0.13 0.018 250 / 0.78)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link
          href="/dashboard"
          className="disp"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 700,
            fontSize: 17,
            textDecoration: 'none',
            color: 'var(--text)',
            fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          <span style={{ color: 'var(--primary)' }}>
            <Icon name="logo" size={22} />
          </span>
          <span>
            yemek<span style={{ color: 'var(--primary)' }}>·</span>takip
          </span>
        </Link>
        <div style={{ display: 'flex', gap: 4 }}>
          {items.map((it) => {
            const isActive =
              pathname === it.href || (pathname && pathname.startsWith(it.href + '/'));
            return (
              <Link
                key={it.id}
                href={it.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: isActive ? 'var(--text)' : 'var(--text-3)',
                  background: isActive ? 'oklch(1 0 0 / 0.06)' : 'transparent',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                }}
              >
                <Icon
                  name={it.icon}
                  size={16}
                  color={isActive ? 'var(--primary)' : 'currentColor'}
                />
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/add/meal" className="b-btn b-btn-primary" style={{ height: 36 }}>
          <Icon name="camera" size={16} /> Yemek ekle
        </Link>
        <button
          type="button"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Çıkış"
          title={email}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: 'linear-gradient(135deg, var(--primary), var(--coral))',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 13,
            color: '#0a0d12',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-inter), system-ui, sans-serif',
          }}
        >
          {initial}
        </button>
      </div>
    </nav>
  );
}
