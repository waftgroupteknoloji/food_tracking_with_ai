'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { addDaysToLocal, todayLocalDate } from '@yemek-takip/utils';
import type { DailyStats, Meal } from '@yemek-takip/validators';
import { Icon, type IconName } from '@/components/bugun/icon';
import { AIMealModal } from '@/components/bugun/ai-meal-modal';
import { CalorieRing, MacroLine } from '@/components/bugun/calorie-ring';
import { CoinBadge } from '@/components/coin-badge';
import '@/components/bugun/bugun-tokens.css';

const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const TR_DAYS_LONG = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const KIND_LABEL: Record<NonNullable<Meal['mealType']>, string> = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle yemeği',
  dinner: 'Akşam yemeği',
  snack: 'Atıştırmalık',
};

type RangeOption = 7 | 14 | 30;
const RANGE_OPTIONS: { id: RangeOption; label: string }[] = [
  { id: 7, label: '7 gün' },
  { id: 14, label: '14 gün' },
  { id: 30, label: '30 gün' },
];

interface DayMeal {
  id: string;
  name: string;
  kind: string;
  ai: boolean;
  kcal: number;
  p: number;
  c: number;
  f: number;
  time: string;
  href: string;
}
interface DayActivity {
  id: string;
  name: string;
  icon: IconName;
  dur: number;
  kcal: number;
  href: string;
}
interface DaySummary {
  iso: string;
  date: Date;
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
  meals: DayMeal[];
  activities: DayActivity[];
  hasData: boolean;
}

function parseLocalIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

function timeFromIso(iso: string | Date): string {
  const dt = typeof iso === 'string' ? new Date(iso) : iso;
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

function macroGoalsFromKcal(target: number) {
  return {
    protein: Math.round((target * 0.3) / 4),
    carbs: Math.round((target * 0.45) / 4),
    fat: Math.round((target * 0.25) / 9),
  };
}

function pickActivityIcon(name: string): IconName {
  const n = name.toLowerCase();
  if (n.includes('yüz') || n.includes('yuz')) return 'water';
  if (n.includes('salon') || n.includes('ağırlık') || n.includes('agirlik')) return 'dumbbell';
  if (n.includes('esneme') || n.includes('yoga')) return 'dumbbell';
  return 'activity';
}

function daySummaryFromStats(iso: string, stats: DailyStats | undefined): DaySummary {
  const goal = stats?.target ?? 2200;
  const macroGoal = macroGoalsFromKcal(goal);
  const meals = stats?.meals ?? [];
  const activities = stats?.activities ?? [];

  const protein = meals.reduce((s, m) => s + m.items.reduce((x, i) => x + (i.macros?.protein ?? 0) * i.quantity, 0), 0);
  const carbs = meals.reduce((s, m) => s + m.items.reduce((x, i) => x + (i.macros?.carbs ?? 0) * i.quantity, 0), 0);
  const fat = meals.reduce((s, m) => s + m.items.reduce((x, i) => x + (i.macros?.fat ?? 0) * i.quantity, 0), 0);

  const mealRows: DayMeal[] = meals.map((m) => {
    const firstName = m.items[0]?.name ?? 'Yemek';
    const extra = m.items.length > 1 ? ` +${m.items.length - 1}` : '';
    const mp = m.items.reduce((x, i) => x + (i.macros?.protein ?? 0) * i.quantity, 0);
    const mc = m.items.reduce((x, i) => x + (i.macros?.carbs ?? 0) * i.quantity, 0);
    const mf = m.items.reduce((x, i) => x + (i.macros?.fat ?? 0) * i.quantity, 0);
    return {
      id: m._id,
      name: `${firstName}${extra}`,
      kind: m.mealType ? KIND_LABEL[m.mealType] : 'Öğün',
      ai: true,
      kcal: Math.round(m.totalKcal),
      p: Math.round(mp),
      c: Math.round(mc),
      f: Math.round(mf),
      time: timeFromIso(m.consumedAt as string),
      href: `/meal/${m._id}`,
    };
  });

  const activityRows: DayActivity[] = activities.map((a) => {
    const name = a.items.map((i) => i.name).join(', ') || 'Aktivite';
    const dur = a.items.reduce((s, i) => s + i.durationMin, 0);
    return {
      id: a._id,
      name,
      icon: pickActivityIcon(name),
      dur,
      kcal: Math.round(a.totalKcalBurned),
      href: `/activity/${a._id}`,
    };
  });

  const consumed = Math.round(stats?.kcalIn ?? 0);
  const burned = Math.round(stats?.kcalOut ?? 0);

  return {
    iso,
    date: parseLocalIso(iso),
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
    meals: mealRows,
    activities: activityRows,
    hasData: mealRows.length > 0 || activityRows.length > 0,
  };
}

function fmtDate(d: Date) {
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]}`;
}
function fmtFull(d: Date) {
  return `${TR_DAYS_LONG[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function dayLabelRelative(iso: string, today: string): string {
  if (iso === today) return 'Bugün';
  if (iso === addDaysToLocal(today, -1)) return 'Dün';
  const date = parseLocalIso(iso);
  const todayDate = parseLocalIso(today);
  const diff = Math.round((todayDate.getTime() - date.getTime()) / 86400000);
  if (diff < 7 && diff > 0) return `${diff} gün önce`;
  return fmtDate(date);
}

function statusColor(pct: number, primary: string): string {
  if (pct <= 0) return 'oklch(1 0 0 / 0.06)';
  if (pct < 0.55) return `color-mix(in oklch, ${primary} 22%, transparent)`;
  if (pct < 0.85) return `color-mix(in oklch, ${primary} 45%, transparent)`;
  if (pct < 1.10) return `color-mix(in oklch, ${primary} 78%, transparent)`;
  return `color-mix(in oklch, var(--coral) 78%, transparent)`;
}

interface Props {
  email: string;
}

export function GecmisPage({ email }: Props) {
  const today = todayLocalDate();
  const [range, setRange] = useState<RangeOption>(30);
  const [selectedIso, setSelectedIso] = useState<string>(today);
  const [aiOpen, setAiOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const logout = useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      router.replace('/login');
      router.refresh();
    },
  });

  // Heatmap shows the month of the selected day. Fetch enough days so the
  // visible heatmap is mostly populated: union of (range) and (~current month).
  const dates = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < range; i++) set.add(addDaysToLocal(today, -i));
    // Also fetch the current month-of-today (so heatmap is filled) — up to 35 days
    const ref = parseLocalIso(today);
    const firstOfMonth = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}-01`;
    const fillDays = 35;
    for (let i = 0; i < fillDays; i++) {
      const iso = addDaysToLocal(firstOfMonth, i);
      if (iso > today) break;
      set.add(iso);
    }
    return Array.from(set).sort();
  }, [range, today]);

  const queries = useQueries({
    queries: dates.map((d) => ({
      queryKey: ['stats', 'daily', d],
      queryFn: () => api.stats.daily(d),
      staleTime: 60_000,
    })),
  });

  const dayMap = useMemo(() => {
    const map = new Map<string, DaySummary>();
    dates.forEach((iso, i) => {
      const q = queries[i];
      map.set(iso, daySummaryFromStats(iso, q?.data));
    });
    return map;
  }, [dates, queries]);

  // Range-scoped days, oldest → newest
  const rangeDays = useMemo<DaySummary[]>(() => {
    const arr: DaySummary[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const iso = addDaysToLocal(today, -i);
      arr.push(dayMap.get(iso) ?? daySummaryFromStats(iso, undefined));
    }
    return arr;
  }, [dayMap, range, today]);

  const selectedDay = dayMap.get(selectedIso) ?? rangeDays[rangeDays.length - 1]!;
  const isLoading = queries.some((q) => q.isLoading);

  const initial = (email[0] || 'S').toUpperCase();

  return (
    <div className="bugun-app" style={{ minHeight: '100vh' }}>
      <GecmisNav
        initial={initial}
        email={email}
        onOpenAdd={() => setAiOpen(true)}
        onLogout={() => logout.mutate()}
      />

      {isMobile ? (
        <MobileView
          rangeDays={rangeDays}
          dayMap={dayMap}
          today={today}
          range={range}
          setRange={setRange}
          selectedIso={selectedIso}
          setSelectedIso={setSelectedIso}
        />
      ) : (
        <DesktopView
          rangeDays={rangeDays}
          dayMap={dayMap}
          today={today}
          range={range}
          setRange={setRange}
          selectedIso={selectedIso}
          setSelectedIso={setSelectedIso}
          selectedDay={selectedDay}
          isLoading={isLoading}
        />
      )}

      <AIMealModal open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

// ── Desktop layout ──────────────────────────────────────────────────────────

interface ViewProps {
  rangeDays: DaySummary[];
  dayMap: Map<string, DaySummary>;
  today: string;
  range: RangeOption;
  setRange: (r: RangeOption) => void;
  selectedIso: string;
  setSelectedIso: (iso: string) => void;
  selectedDay: DaySummary;
  isLoading: boolean;
}

function DesktopView({
  rangeDays,
  dayMap,
  today,
  range,
  setRange,
  selectedIso,
  setSelectedIso,
  selectedDay,
  isLoading,
}: ViewProps) {
  const primary = 'var(--primary)';
  const monthRef = selectedDay.date;

  return (
    <div style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 28px 48px' }}>
      <header style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 22,
        gap: 24,
        flexWrap: 'wrap',
      }}>
        <div>
          <div className="b-label-xs" style={{ marginBottom: 6 }}>Geçmiş</div>
          <h1 className="disp" style={{
            margin: 0,
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 600,
            letterSpacing: '-0.025em',
          }}>
            Son {range} gün.{' '}
            <span style={{ color: 'var(--text-3)' }}>Ne yedin, ne yaktın?</span>
          </h1>
        </div>
        <RangeBar range={range} onRange={setRange} primary={primary} />
      </header>

      <section style={{ marginBottom: 18 }}>
        <HeaderStats days={rangeDays} primary={primary} isLoading={isLoading} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <DailyChart days={rangeDays} selectedIso={selectedIso} onSelect={setSelectedIso} primary={primary} />
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 14 }}>
            <MonthHeatmap
              dayMap={dayMap}
              monthRef={monthRef}
              today={today}
              selectedIso={selectedIso}
              onSelect={setSelectedIso}
              primary={primary}
            />
            <DayList
              days={rangeDays}
              today={today}
              selectedIso={selectedIso}
              onSelect={setSelectedIso}
              primary={primary}
            />
          </div>
        </div>
        <div style={{ position: 'sticky', top: 88 }}>
          <DayDetail day={selectedDay} today={today} primary={primary} />
        </div>
      </section>
    </div>
  );
}

// ── Mobile layout ───────────────────────────────────────────────────────────

function MobileView({
  rangeDays,
  dayMap,
  today,
  range,
  setRange,
  selectedIso,
  setSelectedIso,
}: Omit<ViewProps, 'selectedDay' | 'isLoading'>) {
  const primary = 'var(--primary)';
  const monthRef = useMemo(() => parseLocalIso(selectedIso), [selectedIso]);

  const last7 = rangeDays.slice(-7);
  const avg = last7.length
    ? Math.round(last7.reduce((s, d) => s + d.net, 0) / last7.length)
    : 0;
  const onTarget = rangeDays.filter((d) => d.net >= d.goal * 0.85 && d.net <= d.goal * 1.1).length;
  const reversed = [...rangeDays].reverse();

  return (
    <div style={{ padding: '14px 0 80px' }}>
      <div style={{ padding: '4px 20px 8px' }}>
        <div className="b-label-xs">Geçmiş</div>
        <div className="disp" style={{ fontSize: 24, fontWeight: 600, marginTop: 2, letterSpacing: '-0.02em' }}>
          Son {range} gün
        </div>
      </div>

      <div style={{ padding: '4px 20px 14px' }}>
        <RangeBar range={range} onRange={setRange} primary={primary} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '0 16px 12px' }}>
        <div className="b-card" style={{ padding: 14 }}>
          <div className="b-label-xs" style={{ marginBottom: 8 }}>Ortalama net</div>
          <div className="num disp" style={{ fontSize: 24, fontWeight: 600 }}>
            {avg}
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}> kcal</span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>günlük</div>
        </div>
        <div className="b-card" style={{ padding: 14 }}>
          <div className="b-label-xs" style={{ marginBottom: 8 }}>Hedefte</div>
          <div className="num disp" style={{ fontSize: 24, fontWeight: 600 }}>
            {onTarget}
            <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}>
              {' '}/ {rangeDays.length}
            </span>
          </div>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>±%15</div>
        </div>
      </div>

      <div style={{ margin: '0 16px 12px' }}>
        <MonthHeatmap
          dayMap={dayMap}
          monthRef={monthRef}
          today={today}
          selectedIso={selectedIso}
          onSelect={setSelectedIso}
          primary={primary}
        />
      </div>

      <div style={{ margin: '4px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 4px' }}>
          <h3 className="disp" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Günler</h3>
          <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)' }}>aç → detay</span>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {reversed.map((d) => (
            <DayCardMobile
              key={d.iso}
              d={d}
              today={today}
              expanded={selectedIso === d.iso}
              onToggle={() => setSelectedIso(selectedIso === d.iso ? '' : d.iso)}
              primary={primary}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Components ──────────────────────────────────────────────────────────────

function GecmisNav({
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
            const isActive = pathname === it.href || (pathname?.startsWith(it.href + '/') ?? false);
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
        <CoinBadge />
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

function RangeBar({
  range,
  onRange,
  primary,
}: {
  range: RangeOption;
  onRange: (r: RangeOption) => void;
  primary: string;
}) {
  return (
    <div style={{
      display: 'inline-flex',
      padding: 3,
      background: 'var(--surface)',
      border: '1px solid var(--border-2)',
      borderRadius: 10,
    }}>
      {RANGE_OPTIONS.map((o) => {
        const active = range === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onRange(o.id)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '6px 14px',
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: active ? '#0a0d12' : 'var(--text-2)',
              background: active ? primary : 'transparent',
              transition: 'background .15s, color .15s',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function HeaderStats({
  days,
  primary,
  isLoading,
}: {
  days: DaySummary[];
  primary: string;
  isLoading: boolean;
}) {
  const recordedDays = days.filter((d) => d.hasData);
  const last7 = days.slice(-7);
  const avg = last7.length ? Math.round(last7.reduce((s, d) => s + d.net, 0) / last7.length) : 0;
  const onTarget = days.filter((d) => d.net >= d.goal * 0.85 && d.net <= d.goal * 1.1).length;
  const totalBurned = days.reduce((s, d) => s + d.burned, 0);

  // Streak: consecutive most-recent days where consumed > 0
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i]!.consumed > 0) streak++;
    else break;
  }

  const goal = days[0]?.goal ?? 2200;
  const pctOfGoal = goal > 0 ? Math.round((avg / goal) * 100) : 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
      <SummaryCard
        label="7 günlük ortalama"
        value={isLoading && avg === 0 ? '—' : avg.toLocaleString('tr-TR')}
        unit="kcal/gün"
        icon="trend"
        color={primary}
        sub={`hedefin %${pctOfGoal}'i`}
      />
      <SummaryCard
        label="Hedefte gün"
        value={onTarget}
        unit={`/ ${days.length} gün`}
        icon="target"
        color={primary}
        sub="±%15 aralıkta"
      />
      <SummaryCard
        label="Toplam yakılan"
        value={totalBurned.toLocaleString('tr-TR')}
        unit="kcal"
        icon="fire"
        color="var(--coral)"
        sub={`son ${days.length} gün`}
      />
      <SummaryCard
        label="Aktif seri"
        value={streak}
        unit="gün"
        icon="flame"
        color="var(--coral)"
        sub={recordedDays.length > 0 ? 'kayıp yok' : 'kayıt yok'}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  unit,
  icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  unit: string;
  icon: IconName;
  color: string;
  sub?: string;
}) {
  return (
    <div className="b-card" style={{ padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span className="b-label-xs">{label}</span>
        <span style={{
          color,
          display: 'inline-flex',
          padding: 6,
          borderRadius: 8,
          background: `color-mix(in oklch, ${color} 14%, transparent)`,
        }}>
          <Icon name={icon} size={13} />
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span className="num disp" style={{
          fontSize: 32,
          fontWeight: 600,
          color: 'var(--text)',
          lineHeight: 1,
        }}>{value}</span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--text-3)' }}>{unit}</span>
      </div>
      {sub && <div className="mono" style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 8 }}>{sub}</div>}
    </div>
  );
}

function DailyChart({
  days,
  selectedIso,
  onSelect,
  primary,
}: {
  days: DaySummary[];
  selectedIso: string;
  onSelect: (iso: string) => void;
  primary: string;
}) {
  const goalLine = days[0]?.goal ?? 2200;
  const maxVal = Math.max(...days.map((d) => Math.max(d.consumed, d.goal))) * 1.08;
  const chartH = 200;

  return (
    <div className="b-card" style={{ padding: '22px 22px 18px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h3 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Günlük kalori</h3>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
            Son {days.length} gün · alınan kcal
          </div>
        </div>
        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          fontSize: 11,
          color: 'var(--text-3)',
          flexWrap: 'wrap',
        }}>
          <LegendDot color={primary} label="Hedefte" />
          <LegendDot color="var(--coral)" label="Aşım" />
          <LegendDot color="oklch(1 0 0 / 0.18)" label="Düşük" />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 14,
              height: 1,
              borderTop: '1px dashed var(--text-4)',
              display: 'inline-block',
            }} />
            <span>Hedef</span>
          </span>
        </div>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${days.length}, 1fr)`,
        gap: 4,
        alignItems: 'end',
        height: chartH,
        position: 'relative',
        borderBottom: '1px solid var(--border-2)',
        paddingBottom: 6,
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 6 + (goalLine / maxVal) * chartH,
          height: 0,
          borderTop: '1px dashed var(--text-4)',
          opacity: 0.55,
        }} />
        {days.map((d) => {
          const pct = d.consumed / d.goal;
          const h = (d.consumed / maxVal) * chartH;
          const isSel = d.iso === selectedIso;
          const color = pct === 0 ? 'oklch(1 0 0 / 0.10)'
            : pct > 1.10 ? 'var(--coral)'
            : pct < 0.85 ? 'oklch(1 0 0 / 0.18)'
            : primary;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => onSelect(d.iso)}
              title={`${fmtDate(d.date)} · ${d.consumed} kcal`}
              style={{
                all: 'unset',
                cursor: 'pointer',
                height: Math.max(h, 2),
                background: isSel ? color : `color-mix(in oklch, ${color} 80%, transparent)`,
                borderRadius: 4,
                outline: isSel ? `2px solid ${color}` : 'none',
                outlineOffset: 2,
                transition: 'background .15s, outline-offset .15s',
              }}
            />
          );
        })}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${days.length}, 1fr)`,
        gap: 4,
        marginTop: 6,
      }}>
        {days.map((d, i) => (
          <div
            key={d.iso}
            className="mono"
            style={{
              textAlign: 'center',
              fontSize: 9,
              color: i % 5 === 0 || i === days.length - 1 ? 'var(--text-3)' : 'transparent',
            }}
          >
            {d.date.getDate()}
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
      <span>{label}</span>
    </span>
  );
}

function MonthHeatmap({
  dayMap,
  monthRef,
  today,
  selectedIso,
  onSelect,
  primary,
}: {
  dayMap: Map<string, DaySummary>;
  monthRef: Date;
  today: string;
  selectedIso: string;
  onSelect: (iso: string) => void;
  primary: string;
}) {
  const year = monthRef.getFullYear();
  const month = monthRef.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = (first.getDay() + 6) % 7; // Mon=0
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;

  const cells: ({ iso: string; dayNum: number; data: DaySummary | undefined; isFuture: boolean } | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > last.getDate()) {
      cells.push(null);
      continue;
    }
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    cells.push({
      iso,
      dayNum,
      data: dayMap.get(iso),
      isFuture: iso > today,
    });
  }

  return (
    <div className="b-card" style={{ padding: 22 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div>
          <h3 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
            {TR_MONTHS[month]} {year}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Hedef tutturma haritası</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-3)' }}>
          <span>Az</span>
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {[0.2, 0.5, 0.7, 0.95, 1.2].map((p, i) => (
              <span
                key={i}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: statusColor(p, primary),
                }}
              />
            ))}
          </span>
          <span>Çok</span>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
        {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => (
          <div
            key={d}
            className="mono"
            style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-4)', fontWeight: 600 }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const data = cell.data;
          const pct = data && data.goal > 0 ? data.consumed / data.goal : 0;
          const isSel = cell.iso === selectedIso;
          const bg = cell.isFuture ? 'transparent' : statusColor(pct, primary);
          const clickable = !cell.isFuture;
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect(cell.iso)}
              title={data?.hasData ? `${data.consumed} kcal` : '—'}
              style={{
                all: 'unset',
                cursor: clickable ? 'pointer' : 'default',
                aspectRatio: '1',
                borderRadius: 6,
                background: bg,
                border: isSel
                  ? `1.5px solid ${primary}`
                  : cell.isFuture
                    ? '1px dashed var(--border-2)'
                    : '1px solid var(--border-2)',
                display: 'grid',
                placeItems: 'center',
                position: 'relative',
                transition: 'transform .12s, border-color .12s',
                opacity: cell.isFuture ? 0.45 : 1,
              }}
            >
              <span
                className="num"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: pct > 0 ? 'var(--text)' : 'var(--text-4)',
                }}
              >
                {cell.dayNum}
              </span>
              {data?.hasData && (
                <span
                  className="mono"
                  style={{
                    position: 'absolute',
                    bottom: 3,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    fontSize: 8.5,
                    color: 'var(--text-3)',
                    fontWeight: 500,
                  }}
                >
                  {Math.round(data.consumed / 100) * 100}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayList({
  days,
  today,
  selectedIso,
  onSelect,
  primary,
}: {
  days: DaySummary[];
  today: string;
  selectedIso: string;
  onSelect: (iso: string) => void;
  primary: string;
}) {
  const reversed = [...days].reverse();
  return (
    <div className="b-card" style={{ padding: 22 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
        <div>
          <h3 className="disp" style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Günler</h3>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>Detay için seç</div>
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-4)' }}>{days.length} gün</span>
      </header>
      <div
        style={{ display: 'grid', gap: 6, maxHeight: 380, overflow: 'auto', marginRight: -8, paddingRight: 8 }}
      >
        {reversed.map((d) => {
          const pct = d.goal > 0 ? d.consumed / d.goal : 0;
          const isSel = d.iso === selectedIso;
          const color = !d.hasData
            ? 'var(--text-4)'
            : pct > 1.10
              ? 'var(--coral)'
              : pct < 0.85
                ? 'var(--text-3)'
                : primary;
          return (
            <button
              key={d.iso}
              type="button"
              onClick={() => onSelect(d.iso)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: '36px 1fr auto',
                gap: 12,
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 10,
                background: isSel ? `color-mix(in oklch, ${primary} 14%, transparent)` : 'oklch(1 0 0 / 0.02)',
                border: `1px solid ${isSel ? `color-mix(in oklch, ${primary} 30%, transparent)` : 'var(--border-2)'}`,
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)', textTransform: 'uppercase' }}>
                  {TR_DAYS[d.date.getDay()]}
                </div>
                <div className="num disp" style={{ fontSize: 16, fontWeight: 600, lineHeight: 1 }}>
                  {d.date.getDate()}
                </div>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>
                  {dayLabelRelative(d.iso, today)}
                </div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 3 }}>
                  {d.meals.length} öğün · {d.activities.length} aktivite
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontSize: 15, fontWeight: 600, color }}>
                  {d.consumed}
                </div>
                <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)' }}>
                  kcal · %{Math.round(pct * 100)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayDetail({ day, today, primary }: { day: DaySummary; today: string; primary: string }) {
  const remaining = Math.max(day.goal - day.net, 0);
  return (
    <div className="b-card-2" style={{ padding: 24 }}>
      <header style={{ marginBottom: 18 }}>
        <div className="b-label-xs" style={{ marginBottom: 4 }}>{dayLabelRelative(day.iso, today)}</div>
        <h2 className="disp" style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.02em',
        }}>
          {fmtFull(day.date)}
        </h2>
        <Link
          href={`/history/${day.iso}`}
          className="mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 8,
            fontSize: 11,
            color: 'var(--text-3)',
            textDecoration: 'none',
          }}
        >
          Tam sayfa görünümü <Icon name="arrow" size={11} />
        </Link>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '160px 1fr',
        gap: 18,
        alignItems: 'center',
        marginBottom: 18,
      }}>
        <CalorieRing
          size={150}
          stroke={14}
          consumed={day.consumed}
          burned={day.burned}
          goal={day.goal}
          primary={primary}
          accent="var(--coral)"
        >
          <div>
            <div className="num disp" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>
              {remaining}
            </div>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-3)', marginTop: 4 }}>
              kcal kalan
            </div>
          </div>
        </CalorieRing>
        <div style={{ display: 'grid', gap: 8 }}>
          <DetailStat label="Alınan" value={day.consumed} unit="kcal" color={primary} />
          <DetailStat label="Yakılan" value={day.burned} unit="kcal" color="var(--coral)" sign="−" />
          <DetailStat
            label="Net"
            value={day.net}
            unit={`/ ${day.goal} kcal`}
            color="var(--text)"
          />
        </div>
      </div>

      <div style={{
        padding: '14px 16px',
        background: 'oklch(1 0 0 / 0.025)',
        borderRadius: 12,
        border: '1px solid var(--border-2)',
        marginBottom: 18,
      }}>
        <div className="b-label-xs" style={{ marginBottom: 10 }}>Makrolar</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <MacroLine label="Protein" value={day.protein} goal={day.protGoal} color="var(--prot)" />
          <MacroLine label="Karbonhidrat" value={day.carbs} goal={day.carbGoal} color="var(--carb)" />
          <MacroLine label="Yağ" value={day.fat} goal={day.fatGoal} color="var(--fat)" />
        </div>
      </div>

      {day.meals.length > 0 ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="disp" style={{ fontSize: 14, fontWeight: 600 }}>O günkü yemekler</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)' }}>
              {day.meals.length} öğün · {day.consumed} kcal
            </span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {day.meals.map((m) => <MealRowCompact key={m.id} m={m} accent={primary} />)}
          </div>
        </div>
      ) : (
        <EmptyState text="Bu gün için öğün kaydı yok." />
      )}

      {day.activities.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="disp" style={{ fontSize: 14, fontWeight: 600 }}>Aktiviteler</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)' }}>
              {day.activities.length} kayıt · −{day.burned} kcal
            </span>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {day.activities.map((a) => <ActivityRowCompact key={a.id} a={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '20px 16px',
        textAlign: 'center',
        background: 'oklch(1 0 0 / 0.02)',
        border: '1px dashed var(--border-2)',
        borderRadius: 12,
        color: 'var(--text-4)',
        fontSize: 12.5,
      }}
    >
      {text}
    </div>
  );
}

function DetailStat({
  label,
  value,
  unit,
  color,
  sign = '',
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  sign?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '6px 10px',
      borderRadius: 8,
      background: 'oklch(1 0 0 / 0.025)',
    }}>
      <span className="b-label-xs">{label}</span>
      <span>
        <span className="num disp" style={{ fontSize: 18, fontWeight: 600, color }}>
          {sign}
          {value.toLocaleString('tr-TR')}
        </span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginLeft: 6 }}>
          {unit}
        </span>
      </span>
    </div>
  );
}

function MealRowCompact({ m, accent }: { m: DayMeal; accent: string }) {
  return (
    <Link
      href={m.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 10px',
        borderRadius: 10,
        background: 'oklch(1 0 0 / 0.025)',
        border: '1px solid var(--border-2)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div className="b-photo-ph" style={{ width: 36, height: 36, borderRadius: 8, flex: 'none' }}>
        meal
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontWeight: 600,
            fontSize: 13,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {m.name}
          </span>
          {m.ai && (
            <span className="b-chip" style={{
              height: 16,
              fontSize: 8.5,
              padding: '0 5px',
              gap: 3,
              background: 'oklch(1 0 0 / 0.04)',
            }}>
              <Icon name="sparkles" size={8} color={accent} /> AI
            </span>
          )}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 3 }}>
          {m.kind} · {m.time} ·{' '}
          <span style={{ color: 'var(--prot)' }}>{m.p}p</span> ·{' '}
          <span style={{ color: 'var(--carb)' }}>{m.c}k</span> ·{' '}
          <span style={{ color: 'var(--fat)' }}>{m.f}y</span>
        </div>
      </div>
      <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>
        {m.kcal}
        <span style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 400 }}> kcal</span>
      </div>
    </Link>
  );
}

function ActivityRowCompact({ a }: { a: DayActivity }) {
  return (
    <Link
      href={a.href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 12px',
        borderRadius: 10,
        background: 'oklch(1 0 0 / 0.025)',
        border: '1px solid var(--border-2)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: 'color-mix(in oklch, var(--coral) 14%, transparent)',
        color: 'var(--coral)',
        display: 'grid',
        placeItems: 'center',
      }}>
        <Icon name={a.icon} size={17} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>
          {a.dur} dk
        </div>
      </div>
      <div className="num" style={{ fontSize: 14, fontWeight: 600, color: 'var(--coral)' }}>
        −{a.kcal}
        <span style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 400 }}> kcal</span>
      </div>
    </Link>
  );
}

function DayCardMobile({
  d,
  today,
  expanded,
  onToggle,
  primary,
}: {
  d: DaySummary;
  today: string;
  expanded: boolean;
  onToggle: () => void;
  primary: string;
}) {
  const pct = d.goal > 0 ? d.consumed / d.goal : 0;
  const color = !d.hasData
    ? 'var(--text-4)'
    : pct > 1.10
      ? 'var(--coral)'
      : pct < 0.85
        ? 'var(--text-3)'
        : primary;
  return (
    <div
      style={{
        background: expanded ? 'oklch(1 0 0 / 0.03)' : 'var(--surface)',
        border: `1px solid ${expanded ? `color-mix(in oklch, ${primary} 25%, var(--border-2))` : 'var(--border-2)'}`,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '44px 1fr auto',
          gap: 12,
          alignItems: 'center',
          padding: '12px 14px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)', textTransform: 'uppercase' }}>
            {TR_DAYS[d.date.getDay()]}
          </div>
          <div className="num disp" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1 }}>
            {d.date.getDate()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 500 }}>{dayLabelRelative(d.iso, today)}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 3 }}>
            {d.meals.length} öğün · −{d.burned} kcal yakım
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="num" style={{ fontSize: 17, fontWeight: 600, color }}>{d.consumed}</div>
          <div className="mono" style={{ fontSize: 9.5, color: 'var(--text-4)' }}>
            kcal · %{Math.round(pct * 100)}
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 14px 14px', display: 'grid', gap: 10 }}>
          <div style={{
            padding: '10px 12px',
            background: 'oklch(1 0 0 / 0.025)',
            borderRadius: 10,
            border: '1px solid var(--border-2)',
            display: 'grid',
            gap: 8,
          }}>
            <MacroLine label="Protein" value={d.protein} goal={d.protGoal} color="var(--prot)" />
            <MacroLine label="Karb" value={d.carbs} goal={d.carbGoal} color="var(--carb)" />
            <MacroLine label="Yağ" value={d.fat} goal={d.fatGoal} color="var(--fat)" />
          </div>
          {d.meals.length > 0 ? (
            <div style={{ display: 'grid', gap: 6 }}>
              {d.meals.map((m) => <MealRowCompact key={m.id} m={m} accent={primary} />)}
            </div>
          ) : (
            <EmptyState text="Bu gün için öğün kaydı yok." />
          )}
          {d.activities.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {d.activities.map((a) => <ActivityRowCompact key={a.id} a={a} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
