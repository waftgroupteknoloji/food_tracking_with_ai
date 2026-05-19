'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { todayLocalDate } from '@yemek-takip/utils';
import type { Activity, DailyStats, Meal, StreakStats } from '@yemek-takip/validators';
import { Icon, type IconName } from './icon';
import { CalorieRing, MacroLine } from './calorie-ring';
import { AIMealModal } from './ai-meal-modal';
import './bugun-tokens.css';

const TR_DAYS = ['Pazar', 'Pzt', 'Salı', 'Çar', 'Per', 'Cum', 'Cmt'];
const TR_DAYS_FULL = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) {
    return { full: iso, short: iso, dayName: '' };
  }
  const date = new Date(y, m - 1, d);
  const monthName = TR_MONTHS[m - 1] ?? '';
  const dayName = TR_DAYS_FULL[date.getDay()] ?? '';
  return {
    full: `${d} ${monthName} ${dayName}`,
    short: `${dayName}, ${d} ${monthName}`,
    dayName,
  };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'İyi geceler';
  if (h < 11) return 'Günaydın';
  if (h < 17) return 'Merhaba';
  if (h < 22) return 'İyi akşamlar';
  return 'İyi geceler';
}

function macrosFromMeals(meals: Meal[] | undefined) {
  const totals = { protein: 0, carbs: 0, fat: 0 };
  for (const m of meals ?? []) {
    for (const it of m.items) {
      const macros = it.macros;
      if (!macros) continue;
      totals.protein += (macros.protein ?? 0) * it.quantity;
      totals.carbs += (macros.carbs ?? 0) * it.quantity;
      totals.fat += (macros.fat ?? 0) * it.quantity;
    }
  }
  return totals;
}

function macroGoalsFromKcal(target: number | null) {
  // Default split: 30% protein, 45% carbs, 25% fat (4·4·9 kcal/g)
  const goal = target ?? 2200;
  return {
    protein: Math.round((goal * 0.3) / 4),
    carbs: Math.round((goal * 0.45) / 4),
    fat: Math.round((goal * 0.25) / 9),
  };
}

interface Props {
  email: string;
}

export function BugunDashboard({ email }: Props) {
  const today = todayLocalDate();
  const qc = useQueryClient();
  const router = useRouter();
  const [aiOpen, setAiOpen] = useState(false);

  const daily = useQuery({
    queryKey: ['stats', 'daily', today],
    queryFn: () => api.stats.daily(today),
  });
  const streak = useQuery({
    queryKey: ['stats', 'streak'],
    queryFn: () => api.stats.streak(),
  });
  const water = useQuery({
    queryKey: ['water', today],
    queryFn: () => api.water.listByDate(today),
  });

  const addWater = useMutation({
    mutationFn: (amountMl: number) => api.water.add({ amountMl }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stats', 'daily', today] });
      qc.invalidateQueries({ queryKey: ['water', today] });
    },
  });
  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      router.replace('/login');
      router.refresh();
    },
  });

  const data = daily.data;
  const dateLabels = formatDateLabel(today);
  const kcalIn = data?.kcalIn ?? 0;
  const kcalOut = data?.kcalOut ?? 0;
  const net = kcalIn - kcalOut;
  const target = data?.target ?? 2200;
  const remaining = target - net;
  const goalPctRaw = target > 0 ? (net / target) * 100 : 0;
  const goalPct = Math.max(0, Math.min(100, Math.round(goalPctRaw)));
  const remainingPct = Math.max(0, 100 - goalPct);
  const macros = macrosFromMeals(data?.meals);
  const macroGoals = macroGoalsFromKcal(data?.target ?? null);

  const waterMl = data?.waterMl ?? water.data?.totalMl ?? 0;
  const waterGoal = data?.waterGoalMl ?? 2500;
  const initial = (email[0] || 'S').toUpperCase();

  return (
    <div className="bugun-app">
      <DesktopNav
        active="bugun"
        initial={initial}
        email={email}
        onOpenAdd={() => setAiOpen(true)}
        onLogout={() => logout.mutate()}
      />

      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          padding: '28px 28px 48px',
        }}
        className="bugun-container"
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 22,
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="b-label-xs" style={{ marginBottom: 6 }}>
              {dateLabels.full} · Bugün
            </div>
            <h1
              className="disp"
              style={{
                margin: 0,
                fontSize: 'clamp(22px, 4vw, 36px)',
                fontWeight: 600,
                letterSpacing: '-0.025em',
              }}
            >
              {greeting()}.{' '}
              <span style={{ color: 'var(--text-3)' }}>
                {remaining > 0 ? (
                  <>
                    Hedefe{' '}
                    <span style={{ color: 'var(--primary)' }}>%{remainingPct}</span>{' '}
                    kaldı.
                  </>
                ) : (
                  <>
                    Hedefin{' '}
                    <span style={{ color: 'var(--coral)' }}>
                      %{Math.abs(100 - goalPct)}
                    </span>{' '}
                    üzerindesin.
                  </>
                )}
              </span>
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/add/activity" className="b-btn">
              <Icon name="dumbbell" size={16} /> Aktivite
            </Link>
            <button
              type="button"
              className="b-btn b-btn-primary"
              onClick={() => setAiOpen(true)}
            >
              <Icon name="camera" size={16} /> Yemek çek
            </button>
          </div>
        </header>

        <HeroCard
          consumed={kcalIn}
          burned={kcalOut}
          goal={target}
          net={net}
          remaining={remaining}
          macros={macros}
          macroGoals={macroGoals}
        />

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: 18,
          }}
        >
          <StreakCard streak={streak.data} />
          <WaterCard
            ml={waterMl}
            goal={waterGoal}
            onAdd={(amt) => addWater.mutate(amt)}
            disabled={addWater.isPending}
          />
          <WeightCard weightKg={data?.weightKg ?? null} />
          <TrendCard daily={data} target={target} />
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 14,
          }}
        >
          <MealsCard
            meals={data?.meals ?? []}
            kcalIn={kcalIn}
            onAdd={() => setAiOpen(true)}
          />
          <ActivitiesCard activities={data?.activities ?? []} kcalOut={kcalOut} />
        </section>
      </div>

      <AIMealModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

function DesktopNav({
  active,
  initial,
  email,
  onOpenAdd,
  onLogout,
}: {
  active: string;
  initial: string;
  email: string;
  onOpenAdd: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const items: { id: string; label: string; href: string; icon: IconName }[] = [
    { id: 'bugun', label: 'Bugün', href: '/dashboard', icon: 'home' },
    { id: 'gunluk', label: 'Günlük', href: '/gunluk', icon: 'clock' },
    { id: 'gecmis', label: 'Geçmiş', href: '/history', icon: 'trend' },
    { id: 'kilo', label: 'Kilo', href: '/weight', icon: 'scale' },
    { id: 'profil', label: 'Profil', href: '/profile', icon: 'user' },
  ];

  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 28px',
        borderBottom: '1px solid var(--border-2)',
        flexWrap: 'wrap',
        gap: 12,
        background: 'oklch(0.13 0.018 250 / 0.7)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 20,
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
            color: 'var(--text)',
            textDecoration: 'none',
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
              it.id === active ||
              pathname === it.href ||
              (pathname && pathname.startsWith(it.href + '/'));
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
        <button
          type="button"
          className="b-btn b-btn-primary"
          style={{ height: 36 }}
          onClick={onOpenAdd}
        >
          <Icon name="camera" size={16} /> Yemek ekle
        </button>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Çıkış"
          title={email}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background:
              'linear-gradient(135deg, var(--primary), var(--coral))',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
            fontSize: 13,
            color: '#0a0d12',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {initial}
        </button>
      </div>
    </nav>
  );
}

function HeroCard({
  consumed,
  burned,
  goal,
  net,
  remaining,
  macros,
  macroGoals,
}: {
  consumed: number;
  burned: number;
  goal: number;
  net: number;
  remaining: number;
  macros: { protein: number; carbs: number; fat: number };
  macroGoals: { protein: number; carbs: number; fat: number };
}) {
  return (
    <section
      className="b-card-2 bugun-hero"
      style={{
        padding: 28,
        display: 'grid',
        gap: 32,
        alignItems: 'center',
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: 'grid',
          placeItems: 'center',
          position: 'relative',
        }}
      >
        <CalorieRing
          size={260}
          stroke={20}
          consumed={consumed}
          burned={burned}
          goal={goal}
          primary="var(--primary)"
          accent="var(--coral)"
        >
          <div>
            <div className="b-label-xs" style={{ color: 'var(--text-3)' }}>
              Kalan
            </div>
            <div
              className="num disp"
              style={{
                fontSize: 56,
                fontWeight: 600,
                lineHeight: 1,
                color: remaining >= 0 ? 'var(--text)' : 'var(--coral)',
              }}
            >
              {remaining}
            </div>
            <div
              className="mono"
              style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}
            >
              kcal · hedef {goal}
            </div>
          </div>
        </CalorieRing>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          <StatBlock label="Alınan" value={consumed} unit="kcal" color="var(--primary)" icon="utensils" />
          <StatBlock label="Yakılan" value={burned} unit="kcal" color="var(--coral)" icon="fire" sign="-" />
          <StatBlock
            label="Net"
            value={net}
            unit="kcal"
            color="var(--text)"
            icon="target"
            delta={remaining >= 0 ? `${remaining} kalan` : `${Math.abs(remaining)} fazla`}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 18,
            padding: '18px 20px',
            background: 'oklch(1 0 0 / 0.025)',
            borderRadius: 14,
            border: '1px solid var(--border-2)',
          }}
        >
          <MacroLine
            label="Protein"
            value={macros.protein}
            goal={macroGoals.protein}
            color="var(--prot)"
          />
          <MacroLine
            label="Karb"
            value={macros.carbs}
            goal={macroGoals.carbs}
            color="var(--carb)"
          />
          <MacroLine
            label="Yağ"
            value={macros.fat}
            goal={macroGoals.fat}
            color="var(--fat)"
          />
        </div>
      </div>

      <style>{`
        @media (min-width: 901px) {
          .bugun-hero { grid-template-columns: 300px 1fr; }
        }
      `}</style>
    </section>
  );
}

function StatBlock({
  label,
  value,
  unit,
  color,
  icon,
  sign = '',
  delta,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  icon: IconName;
  sign?: string;
  delta?: string;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        background: 'oklch(1 0 0 / 0.03)',
        borderRadius: 12,
        border: '1px solid var(--border-2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <span className="b-label-xs">{label}</span>
        <span style={{ color, opacity: 0.85 }}>
          <Icon name={icon} size={14} />
        </span>
      </div>
      <div
        className="num disp"
        style={{ fontSize: 28, fontWeight: 600, color, lineHeight: 1 }}
      >
        {sign}
        {value}
      </div>
      <div
        className="mono"
        style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}
      >
        {unit}
        {delta ? ` · ${delta}` : ''}
      </div>
    </div>
  );
}

function StreakCard({ streak }: { streak: StreakStats | undefined }) {
  const current = streak?.current ?? 0;
  const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
  const todayIdx = (new Date().getDay() + 6) % 7;

  return (
    <div className="b-card" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 999,
            background: 'color-mix(in oklch, var(--coral) 14%, transparent)',
            color: 'var(--coral)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Icon name="fire" size={13} /> STREAK
        </span>
        <span
          className="mono"
          style={{ fontSize: 10.5, color: 'var(--text-4)' }}
        >
          kaybetme
        </span>
      </div>
      <div
        style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}
      >
        <span className="num disp" style={{ fontSize: 36, fontWeight: 600 }}>
          {current}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>gün üst üste</span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
        {days.map((d, i) => {
          const isToday = i === todayIdx;
          const filled = i <= todayIdx && i > todayIdx - current;
          return (
            <div
              key={d}
              style={{
                flex: 1,
                textAlign: 'center',
                display: 'grid',
                gap: 6,
              }}
            >
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  background: isToday
                    ? 'var(--coral)'
                    : filled
                      ? 'oklch(1 0 0 / 0.18)'
                      : 'oklch(1 0 0 / 0.08)',
                }}
              />
              <span
                className="mono"
                style={{
                  fontSize: 9.5,
                  color: isToday ? 'var(--coral)' : 'var(--text-4)',
                }}
              >
                {d}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WaterCard({
  ml,
  goal,
  onAdd,
  disabled,
}: {
  ml: number;
  goal: number;
  onAdd: (amount: number) => void;
  disabled: boolean;
}) {
  const liters = ml / 1000;
  const goalL = goal / 1000;
  const pct = goal > 0 ? Math.min((ml / goal) * 100, 100) : 0;

  return (
    <div className="b-card" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 999,
            background: 'color-mix(in oklch, var(--cyan) 14%, transparent)',
            color: 'var(--cyan)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Icon name="drop" size={13} /> SU
        </span>
        <span
          className="mono"
          style={{ fontSize: 10.5, color: 'var(--text-4)' }}
        >
          %{Math.round(pct)}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="num disp" style={{ fontSize: 36, fontWeight: 600 }}>
          {liters.toFixed(1)}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>
          / {goalL.toFixed(1)}L
        </span>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
        <button
          type="button"
          className="b-chip b-chip-cyan"
          style={{ flex: 1, height: 30, justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => onAdd(250)}
          disabled={disabled}
        >
          +250ml
        </button>
        <button
          type="button"
          className="b-chip b-chip-cyan"
          style={{ flex: 1, height: 30, justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => onAdd(500)}
          disabled={disabled}
        >
          +500ml
        </button>
      </div>
    </div>
  );
}

function WeightCard({ weightKg }: { weightKg: number | null }) {
  return (
    <div className="b-card" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 999,
            background: 'oklch(1 0 0 / 0.04)',
            color: 'var(--text-2)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Icon name="scale" size={13} /> KİLO
        </span>
        {weightKg !== null && (
          <span
            className="mono"
            style={{ fontSize: 10.5, color: 'var(--text-4)' }}
          >
            bugün
          </span>
        )}
      </div>
      {weightKg !== null ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span className="num disp" style={{ fontSize: 36, fontWeight: 600 }}>
            {Math.floor(weightKg)}
            <span style={{ color: 'var(--text-3)', fontSize: 22 }}>
              .{Math.round((weightKg - Math.floor(weightKg)) * 10)}
            </span>
          </span>
          <span style={{ color: 'var(--text-3)', fontSize: 13 }}>kg</span>
        </div>
      ) : (
        <div
          style={{
            color: 'var(--text-3)',
            fontSize: 14,
          }}
        >
          Henüz kayıt yok
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginTop: 14,
          fontSize: 11.5,
          color: 'var(--text-3)',
        }}
      >
        <Link
          href="/add/weight"
          style={{
            color: 'var(--primary)',
            fontWeight: 600,
            fontSize: 11.5,
            textDecoration: 'none',
          }}
        >
          Yeni kayıt →
        </Link>
      </div>
    </div>
  );
}

function TrendCard({
  daily,
  target,
}: {
  daily: DailyStats | undefined;
  target: number;
}) {
  // Single-day data — render a simple progress representation for now.
  const net = daily ? daily.kcalIn - daily.kcalOut : 0;
  const pct = target > 0 ? Math.min((net / target) * 100, 130) : 0;

  return (
    <div className="b-card" style={{ padding: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 999,
            background: 'color-mix(in oklch, var(--lime) 12%, transparent)',
            color: 'var(--lime)',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Icon name="trend" size={13} /> TREND
        </span>
        <span
          className="mono"
          style={{ fontSize: 10.5, color: 'var(--text-4)' }}
        >
          bugün
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span className="num disp" style={{ fontSize: 36, fontWeight: 600 }}>
          {net}
        </span>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>kcal net</span>
      </div>
      <div className="b-macrobar" style={{ marginTop: 14 }}>
        <i
          style={{
            width: Math.max(0, Math.min(100, pct)) + '%',
            background:
              net > target
                ? 'var(--coral)'
                : 'var(--primary)',
          }}
        />
      </div>
      <div
        style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 8 }}
      >
        Hedefin{' '}
        <span style={{ color: 'var(--text)', fontWeight: 600 }} className="num">
          %{Math.round((net / Math.max(target, 1)) * 100)}
        </span>
        &apos;i
      </div>
    </div>
  );
}

function mealKindLabel(t: Meal['mealType']): string {
  switch (t) {
    case 'breakfast':
      return 'Kahvaltı';
    case 'lunch':
      return 'Öğle yemeği';
    case 'dinner':
      return 'Akşam yemeği';
    case 'snack':
      return 'Atıştırma';
    default:
      return 'Öğün';
  }
}

function MealsCard({
  meals,
  kcalIn,
  onAdd,
}: {
  meals: Meal[];
  kcalIn: number;
  onAdd: () => void;
}) {
  return (
    <div className="b-card" style={{ padding: 22 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <div>
          <h3
            className="disp"
            style={{ margin: 0, fontSize: 18, fontWeight: 600 }}
          >
            Bugünkü yemekler
          </h3>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              marginTop: 4,
            }}
          >
            {meals.length} öğün · {kcalIn} kcal
          </div>
        </div>
        <button
          type="button"
          className="b-btn b-btn-ghost"
          style={{ height: 32, padding: '0 12px', fontSize: 12 }}
          onClick={onAdd}
        >
          <Icon name="plus" size={14} /> Yeni öğün
        </button>
      </header>
      <div style={{ display: 'grid', gap: 10 }}>
        {meals.length === 0 && (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: 13,
            }}
          >
            Henüz yemek eklenmedi.
          </div>
        )}
        {meals.map((m) => (
          <MealRow key={m._id} m={m} />
        ))}
      </div>
    </div>
  );
}

function MealRow({ m }: { m: Meal }) {
  const time = useMemo(() => {
    const dt = new Date(m.consumedAt);
    const h = dt.getHours().toString().padStart(2, '0');
    const mn = dt.getMinutes().toString().padStart(2, '0');
    return `${h}:${mn}`;
  }, [m.consumedAt]);
  const firstName = m.items[0]?.name ?? 'Yemek';
  const extra = m.items.length > 1 ? ` +${m.items.length - 1}` : '';
  const macros = m.items.reduce(
    (acc, it) => ({
      p: acc.p + (it.macros?.protein ?? 0) * it.quantity,
      c: acc.c + (it.macros?.carbs ?? 0) * it.quantity,
      f: acc.f + (it.macros?.fat ?? 0) * it.quantity,
    }),
    { p: 0, c: 0, f: 0 },
  );

  return (
    <Link
      href={`/meal/${m._id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'oklch(1 0 0 / 0.025)',
        border: '1px solid var(--border-2)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      {m.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={m.photoUrl}
          alt=""
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            objectFit: 'cover',
            flex: 'none',
          }}
        />
      ) : (
        <div
          className="b-photo-ph"
          style={{ width: 44, height: 44, borderRadius: 12, flex: 'none' }}
        >
          yemek
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: 14,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {firstName}
            {extra}
          </span>
          <span
            className="b-chip"
            style={{
              height: 18,
              fontSize: 9.5,
              padding: '0 6px',
              gap: 3,
              background: 'oklch(1 0 0 / 0.04)',
            }}
          >
            <Icon name="sparkles" size={9} color="var(--primary)" /> AI
          </span>
        </div>
        <div
          className="mono"
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 4,
            fontSize: 11,
            color: 'var(--text-3)',
            flexWrap: 'wrap',
          }}
        >
          <span>{mealKindLabel(m.mealType)}</span>
          <span>·</span>
          <span>{time}</span>
          <span>·</span>
          <span>
            <span style={{ color: 'var(--prot)' }}>{Math.round(macros.p)}p</span> ·{' '}
            <span style={{ color: 'var(--carb)' }}>{Math.round(macros.c)}k</span> ·{' '}
            <span style={{ color: 'var(--fat)' }}>{Math.round(macros.f)}y</span>
          </span>
        </div>
      </div>
      <div
        className="num"
        style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)' }}
      >
        {m.totalKcal}
        <span
          style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 400 }}
        >
          {' '}
          kcal
        </span>
      </div>
    </Link>
  );
}

function ActivitiesCard({
  activities,
  kcalOut,
}: {
  activities: Activity[];
  kcalOut: number;
}) {
  return (
    <div className="b-card" style={{ padding: 22 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <div>
          <h3
            className="disp"
            style={{ margin: 0, fontSize: 18, fontWeight: 600 }}
          >
            Aktiviteler
          </h3>
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              marginTop: 4,
            }}
          >
            {activities.length} kayıt · {kcalOut} kcal
          </div>
        </div>
        <Link
          href="/add/activity"
          className="b-btn b-btn-ghost"
          style={{ height: 32, padding: '0 12px', fontSize: 12 }}
        >
          <Icon name="plus" size={14} /> Ekle
        </Link>
      </header>
      <div style={{ display: 'grid', gap: 10 }}>
        {activities.length === 0 && (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: 13,
            }}
          >
            Henüz aktivite eklenmedi.
          </div>
        )}
        {activities.map((a) => (
          <ActivityRow key={a._id} a={a} />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const totalMin = a.items.reduce((s, i) => s + i.durationMin, 0);
  const title = a.items.map((i) => i.name).join(', ') || 'Aktivite';

  return (
    <Link
      href={`/activity/${a._id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 12px',
        borderRadius: 12,
        background: 'oklch(1 0 0 / 0.025)',
        border: '1px solid var(--border-2)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          display: 'grid',
          placeItems: 'center',
          background: 'color-mix(in oklch, var(--coral) 14%, transparent)',
          color: 'var(--coral)',
          flex: 'none',
        }}
      >
        <Icon name="activity" size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div
          className="mono"
          style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}
        >
          {totalMin} dk
        </div>
      </div>
      <div
        className="num"
        style={{ fontSize: 16, fontWeight: 600, color: 'var(--coral)' }}
      >
        -{a.totalKcalBurned}
        <span
          style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 400 }}
        >
          {' '}
          kcal
        </span>
      </div>
    </Link>
  );
}
