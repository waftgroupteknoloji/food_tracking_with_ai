import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  RefreshControl,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { addDaysToLocal, todayLocalDate } from '@yemek-takip/utils';
import type { DailyStats, Meal } from '@yemek-takip/validators';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Dark theme tokens (mirrored from web's bugun-tokens.css, oklch → hex approx).
const C = {
  bg: '#15171c',
  bgDeep: '#0e1015',
  surface: '#1f2128',
  surface2: '#262932',
  surface3: '#31343d',
  border: '#31343d',
  border2: '#272930',
  text: '#f7f8fa',
  text2: '#bfc2c8',
  text3: '#8f939c',
  text4: '#6a6e77',
  lime: '#b8f04d',
  coral: '#f08d6a',
  cyan: '#7ec8e0',
  amber: '#e8c14a',
  magenta: '#e96a85',
};

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

interface TimelineMeal {
  _type: 'meal';
  id: string;
  name: string;
  kind: string;
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
  name: string;
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
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${h}:${mm}`;
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

function dayShapeFromStats(date: string, stats: DailyStats | undefined, today: string): DayShape {
  const dateObj = parseLocalIso(date);
  const isToday = date === today;
  const goal = stats?.target ?? 2200;
  const macroGoal = macroGoalsFromKcal(goal);
  const consumed = stats?.kcalIn ?? 0;
  const burned = stats?.kcalOut ?? 0;

  const meals: TimelineMeal[] = (stats?.meals ?? []).map((m) => {
    const macros = m.items.reduce(
      (acc, it) => ({
        p: acc.p + (it.macros?.protein ?? 0) * it.quantity,
        c: acc.c + (it.macros?.carbs ?? 0) * it.quantity,
        f: acc.f + (it.macros?.fat ?? 0) * it.quantity,
      }),
      { p: 0, c: 0, f: 0 },
    );
    const firstName = m.items[0]?.name ?? 'Yemek';
    const extra = m.items.length > 1 ? ` +${m.items.length - 1}` : '';
    return {
      _type: 'meal',
      id: m._id,
      name: `${firstName}${extra}`,
      kind: m.mealType ? KIND_LABEL[m.mealType] : 'Öğün',
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
      name,
      kcal: Math.round(a.totalKcalBurned),
      dur,
      time: timeFromIso(a.performedAt as string),
      iso: typeof a.performedAt === 'string' ? a.performedAt : new Date(a.performedAt).toISOString(),
    };
  });

  const protein = (stats?.meals ?? []).reduce(
    (sum, m) => sum + m.items.reduce((s, it) => s + (it.macros?.protein ?? 0) * it.quantity, 0),
    0,
  );
  const carbs = (stats?.meals ?? []).reduce(
    (sum, m) => sum + m.items.reduce((s, it) => s + (it.macros?.carbs ?? 0) * it.quantity, 0),
    0,
  );
  const fat = (stats?.meals ?? []).reduce(
    (sum, m) => sum + m.items.reduce((s, it) => s + (it.macros?.fat ?? 0) * it.quantity, 0),
    0,
  );

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
  if (day.iso === addDaysToLocal(today, -1)) return 'Dün';
  return TR_DAYS_LONG[day.date.getDay()]!;
}

export default function GunlukScreen() {
  const today = todayLocalDate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('all');
  const [count, setCount] = useState(7);
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

  const days = useMemo<DayShape[]>(
    () => dates.map((iso, i) => dayShapeFromStats(iso, queries[i]?.data, today)),
    [dates, queries, today],
  );

  const filteredDays = useMemo(() => {
    if (filter === 'all') return days;
    return days.map((d) => ({
      ...d,
      meals: filter === 'meal' ? d.meals : [],
      activities: filter === 'activity' ? d.activities : [],
    }));
  }, [days, filter]);

  const isRefreshing = queries.some((q) => q.isFetching);

  const toggle = (iso: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => qc.invalidateQueries({ queryKey: ['stats', 'daily'] })}
            tintColor={C.lime}
            colors={[C.lime]}
          />
        }
      >
        <View style={{ paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 }}>
          <Text style={s.labelXs}>Günlük · akış</Text>
          <Text style={s.h1}>Ne yedin, ne yaktın?</Text>
          <Text style={{ color: C.text3, fontSize: 12.5, marginTop: 4 }}>
            Son {count} günün tam dökümü, saat saat.
          </Text>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          <FilterChips filter={filter} setFilter={setFilter} />
        </View>

        <View style={{ paddingHorizontal: 14, paddingTop: 14, gap: 14 }}>
          {filteredDays.map((day) => {
            const isOpen = expanded.has(day.iso);
            const cnt = day.meals.length + day.activities.length;
            return (
              <DayCard
                key={day.iso}
                day={day}
                today={today}
                expanded={isOpen}
                count={cnt}
                onToggle={() => toggle(day.iso)}
              />
            );
          })}
        </View>

        {count < 60 && (
          <View style={{ alignItems: 'center', marginTop: 22, paddingHorizontal: 14 }}>
            <Pressable
              onPress={() => setCount((c) => Math.min(c + 7, 60))}
              style={({ pressed }) => [
                s.loadMoreBtn,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={{ color: C.text, fontSize: 13.5, fontWeight: '600' }}>
                Daha eski günler
              </Text>
              <Ionicons name="chevron-down" size={14} color={C.text2} />
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChips({
  filter,
  setFilter,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
}) {
  const opts: { id: Filter; label: string; icon: keyof typeof Ionicons.glyphMap | null }[] = [
    { id: 'all', label: 'Hepsi', icon: null },
    { id: 'meal', label: 'Yemekler', icon: 'restaurant-outline' },
    { id: 'activity', label: 'Aktiviteler', icon: 'pulse-outline' },
  ];
  return (
    <View style={s.filterRow}>
      {opts.map((o) => {
        const active = filter === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => setFilter(o.id)}
            style={[
              s.filterChip,
              {
                backgroundColor: active ? C.lime : 'transparent',
              },
            ]}
          >
            {o.icon && (
              <Ionicons name={o.icon} size={13} color={active ? '#0a0d12' : C.text2} />
            )}
            <Text
              style={{
                color: active ? '#0a0d12' : C.text2,
                fontSize: 12.5,
                fontWeight: '600',
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function DayCard({
  day,
  today,
  expanded,
  count,
  onToggle,
}: {
  day: DayShape;
  today: string;
  expanded: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <View style={s.dayCard}>
      <Pressable onPress={onToggle} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <DayHeader day={day} today={today} expanded={expanded} count={count} />
        <View style={s.macroGrid}>
          <MacroMini label="Protein" value={day.protein} goal={day.protGoal} color={C.lime} />
          <MacroMini label="Karb" value={day.carbs} goal={day.carbGoal} color={C.amber} />
          <MacroMini label="Yağ" value={day.fat} goal={day.fatGoal} color={C.coral} />
          <MacroMini
            label="Su"
            value={day.waterTotal.toFixed(1)}
            goal={day.waterGoal}
            color={C.cyan}
            suffix="L"
          />
        </View>
      </Pressable>

      {expanded && <DayTimeline day={day} />}
    </View>
  );
}

function DayHeader({
  day,
  today,
  expanded,
  count,
}: {
  day: DayShape;
  today: string;
  expanded: boolean;
  count: number;
}) {
  const netColor =
    day.net > day.goal ? C.coral : day.net < day.goal * 0.7 ? C.text3 : C.lime;
  return (
    <View style={s.dayHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <View style={s.chevron}>
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={14}
            color={C.text2}
          />
        </View>
        <View style={{ minWidth: 0, flex: 1 }}>
          <Text
            style={[
              s.labelXs,
              { color: day.isToday ? C.lime : C.text3, marginBottom: 2 },
            ]}
            numberOfLines={1}
          >
            {dayLabel(day, today)}
            <Text style={{ color: C.text4 }}>  ·  {count} kayıt</Text>
          </Text>
          <Text style={s.dayTitle} numberOfLines={1}>
            {fmtFull(day.date)}
          </Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={[s.netNum, { color: netColor }]}>{day.net}</Text>
          <Text style={{ fontSize: 10, color: C.text4, marginLeft: 4 }}>
            / {day.goal}
          </Text>
        </View>
        <Text style={{ fontSize: 9.5, color: C.text3, marginTop: 2, letterSpacing: 0.6 }}>
          NET KCAL
        </Text>
      </View>
    </View>
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
    <View style={{ flexBasis: '48%', flexGrow: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 4,
        }}
      >
        <Text style={{ fontSize: 10.5, color: C.text3, fontWeight: '500' }}>{label}</Text>
        <Text style={{ fontSize: 10.5, color: C.text, fontWeight: '600' }}>
          {value}
          <Text style={{ color: C.text4, fontWeight: '400' }}>
            /{goal}
            {suffix}
          </Text>
        </Text>
      </View>
      <View style={s.macroTrack}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 999 }} />
      </View>
    </View>
  );
}

function DayTimeline({ day }: { day: DayShape }) {
  const router = useRouter();
  const entries = useMemo<TimelineEntry[]>(() => {
    const all: TimelineEntry[] = [...day.meals, ...day.activities];
    all.sort((x, y) => x.iso.localeCompare(y.iso));
    return all;
  }, [day]);

  if (entries.length === 0) {
    return (
      <View style={s.emptyDay}>
        <Text style={{ color: C.text4, fontSize: 12.5 }}>Bu gün için kayıt yok.</Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      {entries.map((e) => {
        if (e._type === 'meal') {
          return (
            <MealRow
              key={`m-${e.id}`}
              meal={e}
              onPress={() => router.push(`/meal/${e.id}`)}
            />
          );
        }
        return (
          <ActivityRow
            key={`a-${e.id}`}
            act={e}
            onPress={() => router.push(`/activity/${e.id}`)}
          />
        );
      })}
    </View>
  );
}

function MealRow({ meal, onPress }: { meal: TimelineMeal; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.entryRow,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {meal.photoUrl ? (
        <Image
          source={{ uri: meal.photoUrl }}
          style={{ width: 64, height: 64, borderRadius: 12 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            backgroundColor: `hsl(${meal.hue}, 32%, 38%)`,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Ionicons name="restaurant" size={22} color="rgba(255,255,255,0.65)" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Text style={s.mealName} numberOfLines={1}>
          {meal.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={s.kindPill}>
            <Text style={{ fontSize: 9.5, color: C.text3, fontWeight: '500' }}>
              {meal.kind}
            </Text>
          </View>
          <Text style={{ fontSize: 10.5, color: C.text3 }}>{meal.time}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
          <Text style={{ fontSize: 10.5, color: C.lime, fontWeight: '600' }}>{meal.p}p</Text>
          <Text style={{ fontSize: 10.5, color: C.amber, fontWeight: '600' }}>{meal.c}k</Text>
          <Text style={{ fontSize: 10.5, color: C.coral, fontWeight: '600' }}>{meal.f}y</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{meal.kcal}</Text>
        <Text style={{ fontSize: 9.5, color: C.text3, marginTop: 2 }}>kcal</Text>
      </View>
    </Pressable>
  );
}

function ActivityRow({ act, onPress }: { act: TimelineActivity; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.entryRow,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: 'rgba(240, 141, 106, 0.16)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="pulse" size={20} color={C.coral} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={s.mealName} numberOfLines={1}>
          {act.name}
        </Text>
        <Text style={{ fontSize: 10.5, color: C.text3 }}>
          {act.time} · {act.dur} dk
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.coral }}>−{act.kcal}</Text>
        <Text style={{ fontSize: 9.5, color: C.text3, marginTop: 2 }}>kcal</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  labelXs: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: C.text3,
    fontWeight: '600',
  },
  h1: {
    fontSize: 24,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    padding: 3,
    backgroundColor: C.surface,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border2,
    alignSelf: 'flex-start',
    gap: 2,
  },
  filterChip: {
    paddingHorizontal: 13,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
  },
  dayCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.4,
  },
  netNum: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  macroGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 12,
    marginTop: 14,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border2,
  },
  macroTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: C.surface2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border2,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.2,
  },
  kindPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border2,
  },
  emptyDay: {
    marginTop: 12,
    padding: 18,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border2,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
  },
});
