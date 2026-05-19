'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { todayLocalDate, addDaysToLocal } from '@yemek-takip/utils';
import type { Activity, DailyStats, Meal } from '@yemek-takip/validators';
import { Icon, type IconName } from '@/components/bugun/icon';
import { AIMealModal } from '@/components/bugun/ai-meal-modal';
import '@/components/bugun/bugun-tokens.css';

const TR_DAYS_LONG = [
  'Pazar',
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
];
const TR_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const KIND_LABEL: Record<NonNullable<Meal['mealType']>, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle yemeği',
  dinner: 'Akşam yemeği',
  snack: 'Atıştırmalık',
};

type Filter = 'all' | 'meal' | 'activity';

interface Props {
  email: string;
}

interface TimelineMeal {
  _type: 'meal';
  id: string;
  href: string;
  name: string;
  kind: string;
  ai: boolean;
  hue: number;
  kcal: number;
  p: number;
  c: number;
  f: number;
  time: string;
  iso: string;
  photoUrl?: string;
}

interface TimelineActivity {
  _type: 'activity';
  id: string;
  href: string;
  name: string;
  icon: IconName;
  kcal: number;
  dur: number;
  time: string;
  iso: string;
}

type TimelineEntry = TimelineMeal | TimelineActivity;

interface DayShape {
  iso: string;
  date: Date;
  isToday: boolean;
  consumed: number;
  burned: number;
  net: number;
  goal: number;
  protein: number;
  carbs: number;
  fat: number;
  protGoal: number;
  carbGoal: number;
  fatGoal: number;
  waterTotal: number;
  waterGoal: number;
  meals: TimelineMeal[];
  activities: TimelineActivity[];
}

function parseLocalIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function timeFromIso(iso: string | Date): string {
  const dt = typeof iso === 'string' ? new Date(iso) : iso;
  const h = String(dt.getHours()).padStart(2, '0');
  const m = String(dt.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function fmtFull(d: Date) {
  return `${TR_DAYS_LONG[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}

function hueFromString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function macroGoalsFromKcal(target: number) {
  return {
    protein: Math.round((target * 0.3) / 4),
    carbs: Math.round((target * 0.45) / 4),
    fat: Math.round((target * 0.25) / 9),
  };
}

function macrosFromMealItems(meal: Meal) {
  return meal.items.reduce(
    (acc, it) => ({
      p: acc.p + (it.macros?.protein ?? 0) * it.quantity,
      c: acc.c + (it.macros?.carbs ?? 0) * it.quantity,
      f: acc.f + (it.macros?.fat ?? 0) * it.quantity,
    }),
    { p: 0, c: 0, f: 0 },
  );
}

function pickActivityIcon(name: string): IconName {
  const n = name.toLowerCase();
  if (n.includes('yüz') || n.includes('yuz')) return 'water';
  if (n.includes('salon') || n.includes('ağırlık') || n.includes('agirlik')) return 'dumbbell';
  if (n.includes('esneme') || n.includes('yoga')) return 'dumbbell';
  return 'activity';
}

function dayShapeFromStats(date: string, stats: DailyStats | undefined, today: string): DayShape {
  const dateObj = parseLocalIso(date);
  const isToday = date === today;
  const goal = stats?.target ?? 2200;
  const macroGoal = macroGoalsFromKcal(goal);
  const consumed = stats?.kcalIn ?? 0;
  const burned = stats?.kcalOut ?? 0;

  const meals: TimelineMeal[] = (stats?.meals ?? []).map((m) => {
    const macros = macrosFromMealItems(m);
    const firstName = m.items[0]?.name ?? 'Yemek';
    const extra = m.items.length > 1 ? ` +${m.items.length - 1}` : '';
    return {
      _type: 'meal',
      id: m._id,
      href: `/meal/${m._id}`,
      name: `${firstName}${extra}`,
      kind: m.mealType ? KIND_LABEL[m.mealType] : 'Öğün',
      ai: true,
      hue: hueFromString(firstName),
      kcal: Math.round(m.totalKcal),
      p: Math.round(macros.p),
      c: Math.round(macros.c),
      f: Math.round(macros.f),
      time: timeFromIso(m.consumedAt as string),
      iso: typeof m.consumedAt === 'string' ? m.consumedAt : new Date(m.consumedAt).toISOString(),
      photoUrl: m.photoUrl,
    };
  });

  const activities: TimelineActivity[] = (stats?.activities ?? []).map((a) => {
    const name = a.items.map((i) => i.name).join(', ') || 'Aktivite';
    const dur = a.items.reduce((s, i) => s + i.durationMin, 0);
    return {
      _type: 'activity',
      id: a._id,
      href: `/activity/${a._id}`,
      name,
      icon: pickActivityIcon(name),
      kcal: Math.round(a.totalKcalBurned),
      dur,
      time: timeFromIso(a.performedAt as string),
      iso: typeof a.performedAt === 'string' ? a.performedAt : new Date(a.performedAt).toISOString(),
    };
  });

  const protein = (stats?.meals ?? []).reduce((sum, m) => {
    return sum + m.items.reduce((s, it) => s + (it.macros?.protein ?? 0) * it.quantity, 0);
  }, 0);
  const carbs = (stats?.meals ?? []).reduce((sum, m) => {
    return sum + m.items.reduce((s, it) => s + (it.macros?.carbs ?? 0) * it.quantity, 0);
  }, 0);
  const fat = (stats?.meals ?? []).reduce((sum, m) => {
    return sum + m.items.reduce((s, it) => s + (it.macros?.fat ?? 0) * it.quantity, 0);
  }, 0);

  return {
    iso: date,
    date: dateObj,
    isToday,
    consumed,
    burned,
    net: consumed - burned,
    goal,
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
    protGoal: macroGoal.protein,
    carbGoal: macroGoal.carbs,
    fatGoal: macroGoal.fat,
    waterTotal: (stats?.waterMl ?? 0) / 1000,
    waterGoal: (stats?.waterGoalMl ?? 2500) / 1000,
    meals,
    activities,
  };
}

function dayLabel(day: DayShape, today: string): string {
  if (day.iso === today) return 'Bugün';
  const yesterday = addDaysToLocal(today, -1);
  if (day.iso === yesterday) return 'Dün';
  return TR_DAYS_LONG[day.date.getDay()]!;
}

export function GunlukFeed({ email }: Props) {
  const today = todayLocalDate();
  const [filter, setFilter] = useState<Filter>('all');
  const [count, setCount] = useState(7);
  const [aiOpen, setAiOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([today]));

  const dates = useMemo(() => {
    const arr: string[] = [];
    for (let i = 0; i < count; i++) arr.push(addDaysToLocal(today, -i));
    return arr;
  }, [count, today]);

  const queries = useQueries({
    queries: dates.map((d) => ({
      queryKey: ['stats', 'daily', d],
      queryFn: () => api.stats.daily(d),
      staleTime: 60_000,
    })),
  });

  const router = useRouter();
  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      router.replace('/login');
      router.refresh();
    },
  });

  const days = useMemo<DayShape[]>(() => {
    return dates.map((iso, i) => dayShapeFromStats(iso, queries[i]?.data, today));
  }, [dates, queries, today]);

  const filteredDays = useMemo(() => {
    if (filter === 'all') return days;
    return days.map((d) => ({
      ...d,
      meals: filter === 'meal' ? d.meals : [],
      activities: filter === 'activity' ? d.activities : [],
    }));
  }, [days, filter]);

  const toggle = (iso: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });

  const isLoading = queries.some((q) => q.isLoading);
  const initial = (email[0] || 'S').toUpperCase();

  return (
    <div className="bugun-app" style={{ minHeight: '100vh' }}>
      <GunlukNav initial={initial} email={email} onOpenAdd={() => setAiOpen(true)} onLogout={() => logout.mutate()} />

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '32px 28px 80px' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 22,
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div className="b-label-xs" style={{ marginBottom: 6 }}>
              Günlük · akış
            </div>
            <h1
              className="disp"
              style={{
                margin: 0,
                fontSize: 'clamp(22px, 4vw, 34px)',
                fontWeight: 600,
                letterSpacing: '-0.025em',
              }}
            >
              Ne yedin, ne içtin, ne yaktın?
            </h1>
            <div style={{ marginTop: 6, fontSize: 13.5, color: 'var(--text-3)' }}>
              Son {count} günün tam dökümü, saat saat.
            </div>
          </div>
          <FilterBar filter={filter} setFilter={setFilter} />
        </header>

        {isLoading && days.every((d) => d.meals.length === 0 && d.activities.length === 0) ? (
          <div
            style={{
              padding: 32,
              textAlign: 'center',
              color: 'var(--text-3)',
              fontSize: 13,
            }}
          >
            Yükleniyor…
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 20 }}>
            {filteredDays.map((day) => {
              const isOpen = expanded.has(day.iso);
              const cnt = day.meals.length + day.activities.length;
              return (
                <section key={day.iso} style={{ display: 'grid', gap: 14 }}>
                  <DayHeader
                    day={day}
                    expanded={isOpen}
                    onToggle={() => toggle(day.iso)}
                    count={cnt}
                    today={today}
                  />
                  {isOpen && <DayTimeline day={day} />}
                </section>
              );
            })}
          </div>
        )}

        {count < 90 && (
          <div style={{ display: 'grid', placeItems: 'center', marginTop: 36 }}>
            <button
              type="button"
              className="b-btn"
              onClick={() => setCount((c) => Math.min(c + 7, 90))}
            >
              Daha eski günleri yükle
              <Icon name="arrow-dn" size={14} />
            </button>
          </div>
        )}
      </div>

      <AIMealModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

function GunlukNav({
  initial,
  email,
  onOpenAdd,
  onLogout,
}: {
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
        background: 'oklch(0.13 0.018 250 / 0.78)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
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
            const isActive = pathname === it.href || pathname?.startsWith(it.href + '/');
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
                <Icon name={it.icon} size={16} color={isActive ? 'var(--primary)' : 'currentColor'} />
                {it.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className="b-btn b-btn-primary" style={{ height: 36 }} onClick={onOpenAdd}>
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
            background: 'linear-gradient(135deg, var(--primary), var(--coral))',
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

function FilterBar({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const opts: { id: Filter; label: string; icon: IconName | null }[] = [
    { id: 'all', label: 'Hepsi', icon: null },
    { id: 'meal', label: 'Yemekler', icon: 'utensils' },
    { id: 'activity', label: 'Aktiviteler', icon: 'activity' },
  ];
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        background: 'var(--surface)',
        border: '1px solid var(--border-2)',
        borderRadius: 11,
        gap: 2,
      }}
    >
      {opts.map((o) => {
        const active = filter === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => setFilter(o.id)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 13px',
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: active ? '#0a0d12' : 'var(--text-2)',
              background: active ? 'var(--primary)' : 'transparent',
              transition: 'background .15s, color .15s',
            }}
          >
            {o.icon && <Icon name={o.icon} size={13} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function DayHeader({
  day,
  expanded,
  onToggle,
  count,
  today,
}: {
  day: DayShape;
  expanded: boolean;
  onToggle: () => void;
  count: number;
  today: string;
}) {
  const netColor =
    day.net > day.goal
      ? 'var(--coral)'
      : day.net < day.goal * 0.7
        ? 'var(--text-3)'
        : 'var(--primary)';
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'grid',
        gap: 14,
        padding: '20px 24px',
        background: 'linear-gradient(180deg, var(--surface-2), var(--surface))',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        boxShadow: 'var(--shadow-2)',
        transition: 'border-color .15s, transform .15s',
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 32,
              height: 32,
              borderRadius: 10,
              background: 'oklch(1 0 0 / 0.05)',
              border: '1px solid var(--border-2)',
              color: 'var(--text-2)',
              transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
              transition: 'transform .22s cubic-bezier(.4,.7,.3,1.1), color .15s',
            }}
          >
            <Icon name="arrow-dn" size={15} stroke={2.2} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              className="b-label-xs"
              style={{ marginBottom: 4, color: day.isToday ? 'var(--primary)' : 'var(--text-3)' }}
            >
              {dayLabel(day, today)}{' '}
              <span style={{ color: 'var(--text-4)', marginLeft: 6 }}>· {count} kayıt</span>
            </div>
            <h2
              className="disp"
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
                color: 'var(--text)',
              }}
            >
              {fmtFull(day.date)}
            </h2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 22, alignItems: 'baseline' }}>
          <SummaryStat label="Alındı" value={day.consumed} color="var(--primary)" />
          <SummaryStat label="Yakıldı" value={day.burned} color="var(--coral)" sign="−" />
          <SummaryStat label="Net" value={day.net} color={netColor} unit={`/ ${day.goal}`} />
        </div>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 14,
          padding: '12px 16px',
          background: 'oklch(1 0 0 / 0.025)',
          borderRadius: 12,
          border: '1px solid var(--border-2)',
        }}
      >
        <MacroMini label="Protein" value={day.protein} goal={day.protGoal} color="var(--prot)" />
        <MacroMini label="Karb" value={day.carbs} goal={day.carbGoal} color="var(--carb)" />
        <MacroMini label="Yağ" value={day.fat} goal={day.fatGoal} color="var(--fat)" />
        <MacroMini
          label="Su"
          value={day.waterTotal.toFixed(1)}
          goal={day.waterGoal}
          color="var(--cyan)"
          suffix="L"
        />
      </div>
    </button>
  );
}

function SummaryStat({
  label,
  value,
  color,
  unit,
  sign = '',
}: {
  label: string;
  value: number;
  color: string;
  unit?: string;
  sign?: string;
}) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div className="b-label-xs" style={{ marginBottom: 2 }}>
        {label}
      </div>
      <div>
        <span
          className="num disp"
          style={{ fontSize: 22, fontWeight: 600, color, lineHeight: 1 }}
        >
          {sign}
          {value.toLocaleString('tr-TR')}
        </span>
        {unit && (
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)', marginLeft: 4 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function MacroMini({
  label,
  value,
  goal,
  color,
  suffix = 'g',
}: {
  label: string;
  value: number | string;
  goal: number;
  color: string;
  suffix?: string;
}) {
  const num = typeof value === 'number' ? value : parseFloat(value);
  const pct = goal > 0 ? Math.min((num / goal) * 100, 100) : 0;
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 5,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
        <span className="num" style={{ fontSize: 11, fontWeight: 600 }}>
          {value}
          <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>
            /{goal}
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

function TimeRail({ time, dotColor }: { time: string; dotColor: string }) {
  return (
    <div style={{ position: 'relative', textAlign: 'right', paddingRight: 18 }}>
      <span
        className="mono"
        style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}
      >
        {time}
      </span>
      <span
        style={{
          position: 'absolute',
          right: -5,
          top: 7,
          width: 9,
          height: 9,
          borderRadius: 999,
          background: dotColor,
          boxShadow: `0 0 0 2px var(--bg), 0 0 0 3px ${dotColor}`,
        }}
      />
    </div>
  );
}

function DayTimeline({ day }: { day: DayShape }) {
  const entries = useMemo<TimelineEntry[]>(() => {
    const all: TimelineEntry[] = [...day.meals, ...day.activities];
    all.sort((x, y) => x.iso.localeCompare(y.iso));
    return all;
  }, [day]);

  if (entries.length === 0) {
    return (
      <div
        style={{
          padding: '22px',
          textAlign: 'center',
          background: 'var(--surface)',
          border: '1px dashed var(--border-2)',
          borderRadius: 14,
          color: 'var(--text-4)',
          fontSize: 13,
        }}
      >
        Bu gün için kayıt yok.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10, paddingTop: 4 }}>
      {entries.map((e) => {
        const dotColor = e._type === 'meal' ? 'var(--primary)' : 'var(--coral)';
        return (
          <div
            key={`${e._type}-${e.id}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr',
              alignItems: 'center',
              gap: 0,
              position: 'relative',
            }}
          >
            <TimeRail time={e.time} dotColor={dotColor} />
            <div style={{ borderLeft: '1px solid var(--border-2)', paddingLeft: 18 }}>
              {e._type === 'meal' ? <MealCard m={e} /> : <ActivityCard a={e} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FoodPhoto({ size = 120, hue, label, radius = 14, src }: { size?: number; hue: number; label: string; radius?: number; src?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        style={{
          width: size,
          height: size,
          flex: 'none',
          borderRadius: radius,
          objectFit: 'cover',
        }}
      />
    );
  }
  const a = `oklch(0.62 0.12 ${hue})`;
  const b = `oklch(0.48 0.10 ${hue})`;
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: radius,
        background: `repeating-linear-gradient(135deg, ${a} 0 10px, ${b} 10px 20px)`,
        position: 'relative',
        overflow: 'hidden',
        boxShadow:
          'inset 0 1px 0 oklch(1 0 0 / 0.08), inset 0 -10px 16px oklch(0 0 0 / 0.25)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          color: 'oklch(1 0 0 / 0.85)',
          fontFamily: 'var(--font-jetbrains-mono), ui-monospace, monospace',
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          fontWeight: 600,
          textShadow: '0 1px 2px oklch(0 0 0 / 0.4)',
        }}
      >
        {label || 'foto'}
      </div>
    </div>
  );
}

function MealCard({ m }: { m: TimelineMeal }) {
  return (
    <Link
      href={m.href}
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr auto',
        gap: 16,
        alignItems: 'center',
        padding: 14,
        background: 'var(--surface)',
        border: '1px solid var(--border-2)',
        borderRadius: 16,
        boxShadow: 'var(--shadow-1)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <FoodPhoto size={120} hue={m.hue} label={m.kind.slice(0, 4)} src={m.photoUrl} />
      <div style={{ minWidth: 0, display: 'grid', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            className="disp"
            style={{
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            {m.name}
          </span>
          {m.ai && (
            <span
              className="b-chip"
              style={{
                height: 20,
                fontSize: 10,
                padding: '0 7px',
                gap: 4,
                background: 'color-mix(in oklch, var(--primary) 14%, transparent)',
                color: 'var(--primary)',
                borderColor: 'color-mix(in oklch, var(--primary) 30%, transparent)',
              }}
            >
              <Icon name="sparkles" size={10} /> AI
            </span>
          )}
        </div>
        <div
          className="mono"
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            fontSize: 11.5,
            color: 'var(--text-3)',
          }}
        >
          <span
            style={{
              padding: '2px 8px',
              background: 'oklch(1 0 0 / 0.04)',
              borderRadius: 999,
              border: '1px solid var(--border-2)',
            }}
          >
            {m.kind}
          </span>
          <span>·</span>
          <span>{m.time}</span>
        </div>
        <div
          className="mono"
          style={{ fontSize: 11.5, marginTop: 2, display: 'flex', gap: 12 }}
        >
          <span>
            <span style={{ color: 'var(--text-4)' }}>P</span>{' '}
            <span style={{ color: 'var(--prot)', fontWeight: 600 }}>{m.p}g</span>
          </span>
          <span>
            <span style={{ color: 'var(--text-4)' }}>K</span>{' '}
            <span style={{ color: 'var(--carb)', fontWeight: 600 }}>{m.c}g</span>
          </span>
          <span>
            <span style={{ color: 'var(--text-4)' }}>Y</span>{' '}
            <span style={{ color: 'var(--fat)', fontWeight: 600 }}>{m.f}g</span>
          </span>
        </div>
      </div>
      <div style={{ textAlign: 'right', alignSelf: 'flex-start' }}>
        <div className="num disp" style={{ fontSize: 28, fontWeight: 600, lineHeight: 1 }}>
          {m.kcal}
        </div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
          kcal
        </div>
      </div>
    </Link>
  );
}

function ActivityCard({ a }: { a: TimelineActivity }) {
  return (
    <Link
      href={a.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 16px',
        background: 'var(--surface)',
        border: '1px solid var(--border-2)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-1)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          flex: 'none',
          background: 'color-mix(in oklch, var(--coral) 16%, transparent)',
          color: 'var(--coral)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <Icon name={a.icon} size={20} stroke={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="disp" style={{ fontSize: 15, fontWeight: 600 }}>
          {a.name}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
          {a.time} · {a.dur} dk
        </div>
      </div>
      <div className="num" style={{ fontSize: 18, fontWeight: 600, color: 'var(--coral)' }}>
        −{a.kcal}
        <span style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 400 }}> kcal</span>
      </div>
    </Link>
  );
}
