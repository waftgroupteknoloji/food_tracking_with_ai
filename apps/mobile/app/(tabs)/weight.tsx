import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  PanResponder,
  Alert,
  KeyboardAvoidingView,
  Platform,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  Rect,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { LinearGradient as Gradient } from 'expo-linear-gradient';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { C, onPrimary } from '@/lib/theme';
import { todayLocalDate } from '@yemek-takip/utils';
import { ApiError } from '@yemek-takip/api-client';
import type { WeightEntry, WeightPeriod } from '@yemek-takip/validators';
import { CoinBadge } from '@/components/coin-badge';

const RANGES: { value: WeightPeriod; label: string }[] = [
  { value: 'week', label: '7 gün' },
  { value: 'month', label: '30 gün' },
  { value: 'year', label: '1 yıl' },
  { value: 'all', label: 'Tümü' },
];

const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
const TR_MONTHS_LONG = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function parseLocalIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}
function fmtShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${TR_MONTHS_SHORT[d.getMonth()]}`;
}
function fmtLong(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')} ${TR_MONTHS_LONG[d.getMonth()]}`;
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]!;
    const p1 = points[i]!;
    const cpx = (p0.x + p1.x) / 2;
    d += ` C ${cpx} ${p0.y}, ${cpx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function WeightScreen() {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [range, setRange] = useState<WeightPeriod>('month');
  const [sheetOpen, setSheetOpen] = useState(false);

  // Always fetch "all" so we can derive hero/start/streaks consistently,
  // then slice client-side for the chart card.
  const allQ = useQuery({
    queryKey: ['weight', 'all'],
    queryFn: () => api.weight.list('all'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.weight.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weight'] }),
  });
  const upsert = useMutation({
    mutationFn: (input: { date: string; weightKg: number; note?: string }) =>
      api.weight.upsert(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weight'] });
      setSheetOpen(false);
    },
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Kaydedilemedi'),
  });

  const all = useMemo<WeightEntry[]>(() => {
    const arr = (allQ.data ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    return arr;
  }, [allQ.data]);

  const heightM = user?.profile.heightCm ? user.profile.heightCm / 100 : 1.75;
  const targetKg = user?.profile.goalWeightKg ?? 70;

  const startKg = all[0]?.weightKg ?? targetKg;
  const currentKg = all[all.length - 1]?.weightKg ?? startKg;
  const totalDelta = +(currentKg - startKg).toFixed(1);
  const bmi = +(currentKg / (heightM * heightM)).toFixed(1);
  const bmiGoal = +(targetKg / (heightM * heightM)).toFixed(1);
  const streak = user?.streak.current ?? 0;

  const data = useMemo(() => {
    if (range === 'all') return all;
    const now = new Date();
    const back =
      range === 'week' ? 7 : range === 'month' ? 30 : range === 'year' ? 365 : 99999;
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - back);
    return all.filter((p) => parseLocalIso(p.date) >= cutoff);
  }, [all, range]);

  // 7-day delta from full list
  const last7Delta = useMemo(() => {
    if (all.length < 2) return 0;
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 7);
    const window = all.filter((p) => parseLocalIso(p.date) >= cutoff);
    if (window.length < 2) return 0;
    return +(window[window.length - 1]!.weightKg - window[0]!.weightKg).toFixed(1);
  }, [all]);

  // Avg kg/week (over full history)
  const speedPerWeek = useMemo(() => {
    if (all.length < 2) return 0;
    const days =
      (parseLocalIso(all[all.length - 1]!.date).getTime() -
        parseLocalIso(all[0]!.date).getTime()) /
      (1000 * 60 * 60 * 24);
    if (days <= 0) return 0;
    return +((Math.abs(totalDelta) / (days / 7)).toFixed(2));
  }, [all, totalDelta]);

  const heroPoints = useMemo(() => all.slice(-30), [all]);
  const reversed = useMemo(() => [...all].reverse(), [all]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ position: 'absolute', top: 12, right: 16, zIndex: 10 }}>
        <CoinBadge />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HERO ===== */}
        <Hero
          currentKg={currentKg}
          totalDelta={totalDelta}
          points={heroPoints}
        />

        {/* ===== PRIMARY ADD CTA ===== */}
        <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}
          >
            <Gradient
              colors={['#e4ff8a', '#b8f04d', '#9bd03a']}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                height: 54,
                borderRadius: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.5)',
                shadowColor: C.lime,
                shadowOpacity: 0.45,
                shadowOffset: { width: 0, height: 8 },
                shadowRadius: 18,
                elevation: 8,
              }}
            >
              <Ionicons name="add" size={22} color={onPrimary} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: onPrimary,
                  letterSpacing: -0.2,
                }}
              >
                Yeni tartım ekle
              </Text>
            </Gradient>
          </Pressable>
        </View>

        {/* ===== GOAL TRACK ===== */}
        <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <View style={s.card2}>
            <GoalTrack start={startKg} current={currentKg} target={targetKg} />
          </View>
        </View>

        {/* ===== CHART CARD ===== */}
        <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <View style={[s.card2, { padding: 14, paddingBottom: 8 }]}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 10,
              }}
            >
              <Text style={s.cardTitle}>Grafik</Text>
              <Text style={s.mono10}>{data.length} kayıt</Text>
            </View>
            <RangeTabs value={range} onChange={setRange} />
            <View style={{ marginTop: 14 }}>
              {data.length >= 2 ? (
                <WeightChart data={data} goal={targetKg} />
              ) : (
                <EmptyChart />
              )}
            </View>
            {data.length > 0 && (
              <View style={s.miniRow}>
                <MiniReadout
                  label="en yüksek"
                  value={Math.max(...data.map((p) => p.weightKg)).toFixed(1)}
                  unit="kg"
                />
                <MiniReadout
                  label="ortalama"
                  value={(data.reduce((acc, p) => acc + p.weightKg, 0) / data.length).toFixed(1)}
                  unit="kg"
                />
                <MiniReadout
                  label="en düşük"
                  value={Math.min(...data.map((p) => p.weightKg)).toFixed(1)}
                  unit="kg"
                />
              </View>
            )}
          </View>
        </View>

        {/* ===== STAT GRID ===== */}
        <View style={s.statGrid}>
          <StatTile
            label="Bu hafta"
            value={`${last7Delta < 0 ? '−' : last7Delta > 0 ? '+' : ''}${Math.abs(last7Delta).toFixed(1)}`}
            unit="kg"
            sub="son 7 gün"
            tone={last7Delta < 0 ? 'pos' : last7Delta > 0 ? 'neg' : 'flat'}
          />
          <StatTile
            label="Ortalama hız"
            value={speedPerWeek.toFixed(2)}
            unit="kg/hf"
            sub="haftalık iniş"
            tone="pos"
          />
          <StatTile
            label="Toplam"
            value={`${totalDelta < 0 ? '−' : totalDelta > 0 ? '+' : ''}${Math.abs(totalDelta).toFixed(1)}`}
            unit="kg"
            sub="başlangıçtan"
            tone={totalDelta < 0 ? 'pos' : totalDelta > 0 ? 'neg' : 'flat'}
          />
        </View>

        {/* ===== BMI + STREAK row ===== */}
        <View style={s.row2}>
          <View style={[s.card, { padding: 12, paddingBottom: 10 }]}>
            <Text style={s.labelXs}>Vücut Kitle İndeksi</Text>
            <BMIGauge value={bmi} target={bmiGoal} />
            <Text style={s.bmiSub}>
              hedef vke: <Text style={{ color: C.coral, fontWeight: '700' }}>{bmiGoal}</Text>
            </Text>
          </View>
          <View style={{ flex: 1, gap: 10 }}>
            <StreakRibbon streak={streak} />
            <NextMilestone current={currentKg} target={targetKg} speedPerWeek={speedPerWeek} />
          </View>
        </View>

        {/* ===== INSIGHT ===== */}
        <View style={{ marginHorizontal: 16, marginBottom: 18 }}>
          <InsightCard
            speedPerWeek={speedPerWeek}
            current={currentKg}
            target={targetKg}
          />
        </View>

        {/* ===== RECORDS ===== */}
        <View style={{ marginHorizontal: 16, marginBottom: 14 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              paddingHorizontal: 4,
              paddingBottom: 10,
            }}
          >
            <Text style={s.h3}>Kayıtlar</Text>
            <Text style={[s.mono10, { fontSize: 11, color: C.text3 }]}>{all.length} tartım</Text>
          </View>
          <View style={{ gap: 8 }}>
            {reversed.length === 0 && (
              <Text style={{ color: C.text3, textAlign: 'center', paddingVertical: 16 }}>
                Henüz tartım eklenmedi.
              </Text>
            )}
            {reversed.map((rec, i) => {
              const prev = reversed[i + 1];
              return (
                <RecordRow
                  key={rec._id}
                  rec={rec}
                  prev={prev}
                  onDelete={() => remove.mutate(rec._id)}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      <AddWeightSheet
        open={sheetOpen}
        initial={currentKg}
        saving={upsert.isPending}
        onClose={() => setSheetOpen(false)}
        onSave={(weightKg, note) =>
          upsert.mutate({ date: todayLocalDate(), weightKg, note })
        }
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────────
function Hero({
  currentKg,
  totalDelta,
  points,
}: {
  currentKg: number;
  totalDelta: number;
  points: WeightEntry[];
}) {
  const W = 410;
  const H = 110;
  let path = '';
  let area = '';
  if (points.length >= 2) {
    const ws = points.map((p) => p.weightKg);
    const min = Math.min(...ws) - 0.4;
    const max = Math.max(...ws) + 0.4;
    const span = max - min || 1;
    const px = points.map((p, i) => ({
      x: (i / (points.length - 1)) * W,
      y: H - ((p.weightKg - min) / span) * H,
    }));
    path = smoothPath(px);
    area = path + ` L ${W} ${H} L 0 ${H} Z`;
  }
  const deltaIsLoss = totalDelta < 0;

  return (
    <View style={{ position: 'relative', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, overflow: 'hidden' }}>
      {path !== '' && (
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, opacity: 0.55 }}
        >
          <Defs>
            <LinearGradient id="hero-grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={C.lime} stopOpacity={0.55} />
              <Stop offset="1" stopColor={C.lime} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={area} fill="url(#hero-grad)" />
          <Path d={path} fill="none" stroke={C.lime} strokeWidth={2} strokeLinecap="round" />
        </Svg>
      )}
      <View>
        <View>
          <Text style={s.labelXs}>Kilo</Text>
          <Text style={s.heroTitle}>İlerleme grafiği</Text>
        </View>

        <View
          style={{
            marginTop: 22,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={s.heroValue}>{currentKg.toFixed(1)}</Text>
            <Text style={s.heroUnit}>kg</Text>
          </View>
          {totalDelta !== 0 && (
            <View style={{ paddingBottom: 4, alignItems: 'flex-end' }}>
              <View
                style={[
                  s.deltaChip,
                  {
                    backgroundColor: deltaIsLoss
                      ? 'rgba(184, 240, 77, 0.16)'
                      : 'rgba(240, 141, 106, 0.16)',
                    borderColor: deltaIsLoss
                      ? 'rgba(184, 240, 77, 0.28)'
                      : 'rgba(240, 141, 106, 0.28)',
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: deltaIsLoss ? C.lime : C.coral,
                  }}
                >
                  {deltaIsLoss ? '▼' : '▲'}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: deltaIsLoss ? C.lime : C.coral,
                  }}
                >
                  {Math.abs(totalDelta)} kg
                </Text>
              </View>
              <Text style={{ fontSize: 10, color: C.text4, marginTop: 5 }}>başlangıçtan beri</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal track
// ─────────────────────────────────────────────────────────────────────────────
function GoalTrack({
  start,
  current,
  target,
}: {
  start: number;
  current: number;
  target: number;
}) {
  const lostKg = +(start - current).toFixed(1);
  const remainKg = +(current - target).toFixed(1);
  const totalRange = start - target;
  const progressPct =
    totalRange > 0 ? Math.max(0, Math.min(100, ((start - current) / totalRange) * 100)) : 0;

  return (
    <View style={{ padding: 16, paddingBottom: 14 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 8,
        }}
      >
        <View>
          <Text style={s.labelXs}>Hedefe yolculuk</Text>
          <Text style={{ fontSize: 11.5, color: C.text3, marginTop: 2 }}>
            <Text style={{ color: C.text, fontWeight: '700' }}>{lostKg} kg</Text> verildi ·{' '}
            <Text style={{ color: C.text, fontWeight: '700' }}>{remainKg} kg</Text> kaldı
          </Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: C.lime, letterSpacing: -0.5 }}>
          %{progressPct.toFixed(0)}
        </Text>
      </View>

      <View style={{ position: 'relative', height: 82, marginTop: 10 }}>
        {/* Start marker */}
        <View style={{ position: 'absolute', left: 0, top: 0 }}>
          <Text style={s.markerLabel}>BAŞLANGIÇ</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.text2, marginTop: 3 }}>
            {start} kg
          </Text>
        </View>
        {/* Target marker */}
        <View style={{ position: 'absolute', right: 0, top: 0, alignItems: 'flex-end' }}>
          <Text style={s.markerLabel}>HEDEF</Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: C.coral, marginTop: 3 }}>
            {target} kg
          </Text>
        </View>
        {/* Rail */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 40,
            height: 8,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: C.border2,
          }}
        />
        {/* Fill */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            top: 40,
            height: 8,
            width: `${progressPct}%`,
            backgroundColor: C.lime,
            borderRadius: 999,
            shadowColor: C.lime,
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 6,
            elevation: 2,
          }}
        />
        {/* Milestone ticks */}
        {[25, 50, 75].map((t) => (
          <View
            key={t}
            style={{
              position: 'absolute',
              left: `${t}%`,
              top: 40,
              width: 1,
              height: 8,
              backgroundColor: 'rgba(255,255,255,0.16)',
            }}
          />
        ))}
        {/* Current pin */}
        <View
          style={{
            position: 'absolute',
            left: `${progressPct}%`,
            top: 33,
            transform: [{ translateX: -11 }],
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              backgroundColor: C.lime,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: C.bg,
              shadowColor: C.lime,
              shadowOpacity: 0.4,
              shadowOffset: { width: 0, height: 6 },
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Ionicons name="scale" size={11} color={onPrimary} />
          </View>
          <View
            style={{
              marginTop: 6,
              paddingVertical: 2,
              paddingHorizontal: 7,
              borderRadius: 4,
              backgroundColor: 'rgba(184, 240, 77, 0.16)',
              borderWidth: 1,
              borderColor: 'rgba(184, 240, 77, 0.30)',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: C.lime }}>
              {current.toFixed(1)} kg
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Chart
// ─────────────────────────────────────────────────────────────────────────────
function WeightChart({ data, goal }: { data: WeightEntry[]; goal: number }) {
  const W = 360;
  const H = 230;
  const PAD_L = 36;
  const PAD_R = 16;
  const PAD_T = 22;
  const PAD_B = 30;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const [hoverIdx, setHover] = useState<number>(data.length - 1);
  useEffect(() => {
    setHover(data.length - 1);
  }, [data.length]);
  const layoutRef = useRef<{ width: number }>({ width: W });

  const ws = data.map((p) => p.weightKg);
  const lo = Math.min(...ws, goal + 0.5) - 0.3;
  const hi = Math.max(...ws) + 0.3;
  const span = hi - lo || 1;

  const px = data.map((p, i) => ({
    x: PAD_L + (i / Math.max(data.length - 1, 1)) * innerW,
    y: PAD_T + (1 - (p.weightKg - lo) / span) * innerH,
  }));
  const path = smoothPath(px);
  const area =
    path +
    ` L ${px[px.length - 1]!.x} ${PAD_T + innerH} L ${px[0]!.x} ${PAD_T + innerH} Z`;
  const goalY = PAD_T + (1 - (goal - lo) / span) * innerH;

  const ticks: { v: string; y: number }[] = [];
  for (let i = 0; i <= 3; i++) {
    const v = lo + (i / 3) * span;
    ticks.push({ v: v.toFixed(1), y: PAD_T + (1 - i / 3) * innerH });
  }

  const xLabels = [
    { i: 0, label: fmtShort(parseLocalIso(data[0]!.date)) },
    {
      i: Math.floor(data.length / 2),
      label: fmtShort(parseLocalIso(data[Math.floor(data.length / 2)]!.date)),
    },
    {
      i: data.length - 1,
      label: fmtShort(parseLocalIso(data[data.length - 1]!.date)),
    },
  ];

  const handleMove = (e: GestureResponderEvent) => {
    const width = layoutRef.current.width || W;
    const xRaw = e.nativeEvent.locationX;
    const xN = (xRaw / width) * W;
    const rel = (xN - PAD_L) / innerW;
    const idx = Math.round(rel * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, idx)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleMove,
      onPanResponderMove: handleMove,
      onPanResponderRelease: () => setHover(data.length - 1),
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    layoutRef.current.width = e.nativeEvent.layout.width;
  };

  const cursor = px[Math.min(hoverIdx, px.length - 1)]!;
  const hovered = data[Math.min(hoverIdx, data.length - 1)]!;
  const startW = data[0]!.weightKg;
  const deltaFromStart = +(hovered.weightKg - startW).toFixed(1);

  return (
    <View onLayout={onLayout} style={{ position: 'relative' }} {...panResponder.panHandlers}>
      <Svg width="100%" height={H * (1)} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.lime} stopOpacity={0.34} />
            <Stop offset="0.8" stopColor={C.lime} stopOpacity={0.04} />
            <Stop offset="1" stopColor={C.lime} stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="chart-stroke" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.lime} stopOpacity={1} />
            <Stop offset="1" stopColor={C.lime} stopOpacity={0.7} />
          </LinearGradient>
        </Defs>

        {/* Y grid */}
        {ticks.map((t, i) => (
          <G key={i}>
            <Line
              x1={PAD_L}
              x2={W - PAD_R}
              y1={t.y}
              y2={t.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
              strokeDasharray="2 4"
            />
            <SvgText
              x={PAD_L - 8}
              y={t.y + 3}
              fontSize={9}
              fill={C.text4}
              textAnchor="end"
            >
              {t.v}
            </SvgText>
          </G>
        ))}

        {/* Goal */}
        <Line
          x1={PAD_L}
          x2={W - PAD_R}
          y1={goalY}
          y2={goalY}
          stroke={C.coral}
          strokeWidth={1.2}
          strokeDasharray="3 5"
          opacity={0.7}
        />
        <Rect
          x={W - PAD_R - 56}
          y={goalY - 16}
          width={56}
          height={13}
          rx={3}
          fill="rgba(240,141,106,0.18)"
          stroke="rgba(240,141,106,0.35)"
        />
        <SvgText
          x={W - PAD_R - 50}
          y={goalY - 6}
          fontSize={9}
          fontWeight="600"
          fill={C.coral}
        >
          hedef {goal}
        </SvgText>

        {/* Area + line */}
        <Path d={area} fill="url(#chart-fill)" />
        <Path
          d={path}
          fill="none"
          stroke="url(#chart-stroke)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Endpoint dots */}
        {px.map((p, i) => {
          if (i === hoverIdx) return null;
          if (i === 0 || i === data.length - 1) {
            return <Circle key={`dot-${i}`} cx={p.x} cy={p.y} r={2.6} fill={C.lime} />;
          }
          return null;
        })}

        {/* Cursor */}
        <Line
          x1={cursor.x}
          x2={cursor.x}
          y1={PAD_T}
          y2={PAD_T + innerH}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <Circle cx={cursor.x} cy={cursor.y} r={9} fill="rgba(14,16,21,0.3)" />
        <Circle cx={cursor.x} cy={cursor.y} r={5} fill={C.lime} stroke={C.bg} strokeWidth={2} />

        {/* X labels */}
        {xLabels.map((l, i) => (
          <SvgText
            key={i}
            x={px[l.i]!.x}
            y={H - 10}
            fontSize={9}
            fill={C.text4}
            textAnchor="middle"
          >
            {l.label}
          </SvgText>
        ))}
      </Svg>

      {/* Tooltip */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${(cursor.x / W) * 100}%`,
          top: 8,
          transform: [{ translateX: -40 }],
          paddingVertical: 4,
          paddingHorizontal: 8,
          backgroundColor: 'rgba(10,13,18,0.92)',
          borderWidth: 1,
          borderColor: C.border,
          borderRadius: 8,
          minWidth: 80,
        }}
      >
        <Text style={{ fontSize: 9.5, color: C.text3, letterSpacing: 0.4 }}>
          {fmtShort(parseLocalIso(hovered.date))}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: C.text }}>
            {hovered.weightKg.toFixed(1)}
          </Text>
          <Text style={{ fontSize: 9, color: C.text4 }}>kg</Text>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color:
                deltaFromStart < 0 ? C.lime : deltaFromStart > 0 ? C.coral : C.text3,
            }}
          >
            {deltaFromStart > 0 ? '+' : ''}
            {deltaFromStart}
          </Text>
        </View>
      </View>
    </View>
  );
}

function EmptyChart() {
  return (
    <View
      style={{
        height: 230,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: C.border2,
        borderRadius: 12,
        borderStyle: 'dashed',
      }}
    >
      <Text style={{ color: C.text3, fontSize: 13 }}>Grafik için en az 2 kayıt gerekir</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BMI Gauge
// ─────────────────────────────────────────────────────────────────────────────
function BMIGauge({ value, target }: { value: number; target: number }) {
  const min = 18;
  const max = 40;
  const W = 130;
  const H = 80;
  const R = 52;
  const cx = W / 2;
  const cy = H - 6;
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const angle = (n: number) => Math.PI * (1 - (clamp(n) - min) / (max - min));
  const polar = (a: number) => ({ x: cx + Math.cos(a) * R, y: cy - Math.sin(a) * R });

  const arc = (a1: number, a2: number, color: string, key: number) => {
    const p1 = polar(a1);
    const p2 = polar(a2);
    const large = a1 - a2 > Math.PI ? 1 : 0;
    return (
      <Path
        key={key}
        d={`M ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y}`}
        stroke={color}
        strokeWidth={9}
        fill="none"
        strokeLinecap="round"
      />
    );
  };

  const bands = [
    { from: 18, to: 24.9, color: '#9bd446' },
    { from: 24.9, to: 29.9, color: C.amber },
    { from: 29.9, to: 40, color: C.coral },
  ];

  const needle = polar(angle(value));
  const targetP = polar(angle(target));

  let label = 'Aşırı kilolu';
  let labelColor: string = C.coral;
  if (value < 18.5) { label = 'Düşük'; labelColor = C.cyan; }
  else if (value < 25) { label = 'Normal'; labelColor = C.lime; }
  else if (value < 30) { label = 'Fazla kilolu'; labelColor = C.amber; }
  else if (value < 35) { label = 'Obez I'; labelColor = C.coral; }
  else { label = 'Obez II'; labelColor = C.coral; }

  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Svg width={W} height={H + 4} viewBox={`0 0 ${W} ${H + 4}`}>
        {bands.map((b, i) => arc(angle(b.from), angle(b.to), b.color, i))}
        <Circle cx={targetP.x} cy={targetP.y} r={3} fill={C.coral} stroke={C.bg} strokeWidth={1.5} />
        <Line
          x1={cx}
          y1={cy}
          x2={needle.x}
          y2={needle.y}
          stroke={C.text}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <Circle cx={cx} cy={cy} r={5} fill={C.bg} stroke={C.text} strokeWidth={1.5} />
      </Svg>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: -4 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, letterSpacing: -0.4 }}>
          {value}
        </Text>
        <Text style={{ fontSize: 9.5, color: C.text3, marginLeft: 2 }}>vke</Text>
      </View>
      <Text
        style={{
          fontSize: 9,
          color: labelColor,
          fontWeight: '700',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Streak ribbon
// ─────────────────────────────────────────────────────────────────────────────
function StreakRibbon({ streak }: { streak: number }) {
  const filled = Math.min(streak, 7);
  return (
    <View style={s.streakBox}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: 'rgba(184, 240, 77, 0.24)',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Ionicons name="flame" size={18} color={C.lime} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', columnGap: 5 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.4 }}>
              {streak}
            </Text>
            <Text style={{ fontSize: 12, color: C.text2 }} numberOfLines={1}>
              günlük seri
            </Text>
          </View>
          <Text style={{ fontSize: 10, color: C.text4, marginTop: 1 }} numberOfLines={1}>
            her gün en az 1 kayıt
          </Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 999,
              backgroundColor: i < filled ? C.lime : 'rgba(255,255,255,0.18)',
            }}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestone tile
// ─────────────────────────────────────────────────────────────────────────────
function NextMilestone({
  current,
  target,
  speedPerWeek,
}: {
  current: number;
  target: number;
  speedPerWeek: number;
}) {
  // Next round-down milestone above target.
  const nextMilestone =
    target >= current ? target : Math.max(target, Math.floor(current - 0.1));
  const delta = +(current - nextMilestone).toFixed(1);
  const weeks = speedPerWeek > 0.05 ? Math.max(1, Math.round(delta / speedPerWeek)) : null;
  return (
    <View style={[s.card, { padding: 12, paddingHorizontal: 13 }]}>
      <Text style={s.labelXs}>Bir sonraki kilometre taşı</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 6 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.text, letterSpacing: -0.4 }}>
          {nextMilestone.toFixed(1)}
        </Text>
        <Text style={{ fontSize: 10, color: C.text4, marginLeft: 4 }}>kg</Text>
      </View>
      <Text style={{ fontSize: 10, color: C.text4, marginTop: 4 }}>
        <Text style={{ color: C.lime, fontWeight: '700' }}>
          −{delta.toFixed(1)} kg
        </Text>{' '}
        daha{weeks ? ` · ~${weeks} hf` : ''}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Insight
// ─────────────────────────────────────────────────────────────────────────────
function InsightCard({
  speedPerWeek,
  current,
  target,
}: {
  speedPerWeek: number;
  current: number;
  target: number;
}) {
  const remain = +(current - target).toFixed(1);
  const weeks = speedPerWeek > 0.05 ? Math.max(1, Math.round(remain / speedPerWeek)) : null;
  return (
    <View
      style={{
        padding: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(184, 240, 77, 0.30)',
        borderRadius: 14,
        backgroundColor: 'rgba(184, 240, 77, 0.05)',
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          backgroundColor: 'rgba(184, 240, 77, 0.22)',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2,
        }}
      >
        <Ionicons name="sparkles" size={15} color={C.lime} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.labelXs, { color: C.lime, marginBottom: 4 }]}>analiz</Text>
        <Text style={{ fontSize: 13, lineHeight: 18, color: C.text }}>
          {speedPerWeek > 0
            ? <>Haftada ortalama <Text style={{ color: C.lime, fontWeight: '700' }}>{speedPerWeek.toFixed(2)} kg</Text> {current > target ? 'veriyorsun' : 'değişim var'}.{weeks ? <> Bu tempoda hedefe yaklaşık <Text style={{ color: C.lime, fontWeight: '700' }}>{weeks} hafta</Text> kaldı.</> : null}</>
            : 'Daha fazla tartım ekledikçe burada haftalık trendini göreceksin.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <Chip text="📉 yavaş ama istikrarlı" />
          <Chip text="+ kalori açığını koru" tone="lime" />
        </View>
      </View>
    </View>
  );
}

function Chip({ text, tone }: { text: string; tone?: 'lime' }) {
  return (
    <View
      style={{
        height: 22,
        paddingHorizontal: 10,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tone === 'lime' ? 'rgba(184,240,77,0.14)' : 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: tone === 'lime' ? 'rgba(184,240,77,0.22)' : C.border2,
      }}
    >
      <Text
        style={{
          fontSize: 10.5,
          fontWeight: '500',
          color: tone === 'lime' ? C.lime : C.text2,
        }}
      >
        {text}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Records
// ─────────────────────────────────────────────────────────────────────────────
function RecordRow({
  rec,
  prev,
  onDelete,
}: {
  rec: WeightEntry;
  prev?: WeightEntry;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const delta = prev ? +(rec.weightKg - prev.weightKg).toFixed(1) : 0;
  const tone = delta < 0 ? 'pos' : delta > 0 ? 'neg' : 'flat';
  const deltaColor = tone === 'pos' ? C.lime : tone === 'neg' ? C.coral : C.text3;
  const arrow = delta < 0 ? '▼' : delta > 0 ? '▲' : '–';
  const d = parseLocalIso(rec.date);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: C.surface,
        borderWidth: 1,
        borderColor: C.border2,
        borderRadius: 12,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: C.border2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="scale-outline" size={18} color={C.text3} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14.5, fontWeight: '600', color: C.text, letterSpacing: -0.2 }}>
          {fmtLong(d)}
        </Text>
        <Text style={{ fontSize: 10.5, color: C.text4, marginTop: 2 }}>
          {rec.date}
          {rec.note ? ` · ${rec.note}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, letterSpacing: -0.3 }}>
            {rec.weightKg.toFixed(1)}
          </Text>
          <Text style={{ fontSize: 10, color: C.text4, marginLeft: 2 }}>kg</Text>
        </View>
        {prev && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
            <Text style={{ fontSize: 8, color: deltaColor }}>{arrow}</Text>
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: deltaColor }}>
              {Math.abs(delta).toFixed(1)}
            </Text>
          </View>
        )}
      </View>
      <Pressable
        onPress={() => setMenuOpen(true)}
        hitSlop={8}
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="ellipsis-horizontal" size={16} color={C.text4} />
      </Pressable>

      <Modal transparent visible={menuOpen} onRequestClose={() => setMenuOpen(false)} animationType="fade">
        <Pressable
          onPress={() => setMenuOpen(false)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        >
          <View
            style={{
              backgroundColor: C.bg,
              borderTopWidth: 1,
              borderTopColor: C.border,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 18,
              paddingBottom: 32,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 999,
                alignSelf: 'center',
                marginBottom: 8,
              }}
            />
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                onDelete();
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: 'rgba(240, 141, 106, 0.10)',
              }}
            >
              <Ionicons name="trash-outline" size={18} color={C.coral} />
              <Text style={{ color: C.coral, fontWeight: '600', fontSize: 14 }}>Kaydı sil</Text>
            </Pressable>
            <Pressable
              onPress={() => setMenuOpen(false)}
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: C.text2, fontWeight: '600' }}>Vazgeç</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Range tabs
// ─────────────────────────────────────────────────────────────────────────────
function RangeTabs({
  value,
  onChange,
}: {
  value: WeightPeriod;
  onChange: (v: WeightPeriod) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 4,
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: C.border2,
        borderRadius: 999,
      }}
    >
      {RANGES.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 7,
              borderRadius: 999,
              backgroundColor: active ? C.lime : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: active ? onPrimary : C.text2,
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

// ─────────────────────────────────────────────────────────────────────────────
// Misc
// ─────────────────────────────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  unit,
  sub,
  tone = 'flat',
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: 'pos' | 'neg' | 'flat';
}) {
  const color = tone === 'pos' ? C.lime : tone === 'neg' ? C.coral : C.text;
  return (
    <View style={[s.card, { padding: 12, paddingHorizontal: 13, flex: 1 }]}>
      <Text style={[s.labelXs, { fontSize: 9.5 }]}>{label}</Text>
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color, letterSpacing: -0.6 }}>
          {value}
        </Text>
        {unit && <Text style={{ fontSize: 10, color: C.text4 }}>{unit}</Text>}
      </View>
      {sub && <Text style={{ fontSize: 10, color: C.text4, marginTop: 4 }}>{sub}</Text>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add weight bottom sheet
// ─────────────────────────────────────────────────────────────────────────────
function AddWeightSheet({
  open,
  initial,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  initial: number;
  saving: boolean;
  onClose: () => void;
  onSave: (weightKg: number, note?: string) => void;
}) {
  const [val, setVal] = useState<number>(initial);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setVal(initial);
      setNote('');
    }
  }, [open, initial]);

  const bump = (delta: number) => setVal((v) => +(Math.max(20, Math.min(500, v + delta))).toFixed(1));

  const handleSave = () => {
    if (Number.isNaN(val) || val < 20 || val > 500) {
      Alert.alert('Geçersiz kilo', 'Kilo 20 ile 500 kg arasında olmalı.');
      return;
    }
    onSave(+val.toFixed(1), note.trim() || undefined);
  };

  if (!open) return null;
  return (
    <Modal
      transparent
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'flex-end',
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: C.bg,
              borderTopWidth: 1,
              borderTopColor: C.border,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 18,
              paddingBottom: 28,
              gap: 4,
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderRadius: 999,
                alignSelf: 'center',
                marginBottom: 12,
              }}
            />
            <Text style={s.labelXs}>yeni tartım</Text>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: C.text,
                letterSpacing: -0.3,
                marginBottom: 18,
                marginTop: 4,
              }}
            >
              Bugünkü kilon
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                marginTop: 4,
              }}
            >
              <StepBtn icon="remove" onPress={() => bump(-0.1)} onLong={() => bump(-1)} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text
                  style={{
                    fontSize: 52,
                    fontWeight: '700',
                    color: C.lime,
                    letterSpacing: -2,
                    lineHeight: 56,
                  }}
                >
                  {val.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 14, color: C.text3, marginLeft: 6 }}>kg</Text>
              </View>
              <StepBtn icon="add" onPress={() => bump(0.1)} onLong={() => bump(1)} />
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginTop: 14,
                flexWrap: 'wrap',
              }}
            >
              {[-1, -0.5, +0.5, +1].map((d) => (
                <Pressable
                  key={d}
                  onPress={() => bump(d)}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: C.border2,
                    },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={{ color: C.text2, fontSize: 12, fontWeight: '600' }}>
                    {d > 0 ? `+${d}` : d}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 10,
                marginTop: 22,
              }}
            >
              <View style={{ flex: 1 }}>
                <Pressable
                  onPress={onClose}
                  disabled={saving}
                  android_ripple={{ color: 'rgba(255,255,255,0.06)' }}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: C.border,
                    backgroundColor: C.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                    gap: 6,
                  }}
                >
                  <Ionicons name="close" size={16} color={C.text2} />
                  <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>Vazgeç</Text>
                </Pressable>
              </View>
              <View
                style={{
                  flex: 1.4,
                  borderRadius: 14,
                  overflow: 'hidden',
                  shadowColor: C.lime,
                  shadowOpacity: 0.45,
                  shadowOffset: { width: 0, height: 8 },
                  shadowRadius: 16,
                  elevation: 8,
                }}
              >
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  android_ripple={{ color: 'rgba(0,0,0,0.10)' }}
                  style={{ opacity: saving ? 0.75 : 1 }}
                >
                  <Gradient
                    colors={['#e4ff8a', '#b8f04d', '#9bd03a']}
                    locations={[0, 0.55, 1]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{
                      height: 52,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: 'rgba(255,255,255,0.5)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Ionicons name="checkmark" size={18} color={onPrimary} />
                    <Text
                      style={{
                        color: onPrimary,
                        fontWeight: '700',
                        fontSize: 15,
                        letterSpacing: -0.2,
                      }}
                    >
                      {saving ? 'Kaydediliyor…' : 'Kaydet'}
                    </Text>
                  </Gradient>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function StepBtn({
  icon,
  onPress,
  onLong,
}: {
  icon: 'add' | 'remove';
  onPress: () => void;
  onLong: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLong}
      delayLongPress={350}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 999,
          backgroundColor: 'rgba(184, 240, 77, 0.14)',
          borderWidth: 1,
          borderColor: 'rgba(184, 240, 77, 0.30)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}
    >
      <Ionicons name={icon} size={22} color={C.lime} />
    </Pressable>
  );
}

function MiniReadout({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 6 }}>
      <Text style={{ fontSize: 9, color: C.text4, letterSpacing: 0.8, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: C.text }}>{value}</Text>
        <Text style={{ fontSize: 9, color: C.text4, marginLeft: 2 }}>{unit}</Text>
      </View>
    </View>
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
  heroTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: C.text,
    marginTop: 2,
    letterSpacing: -0.4,
  },
  heroValue: {
    fontSize: 64,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -2.4,
    lineHeight: 64,
  },
  heroUnit: {
    fontSize: 15,
    color: C.text3,
    marginLeft: 6,
  },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
    borderWidth: 1,
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
    borderRadius: 14,
  },
  card2: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.2,
  },
  mono10: {
    fontSize: 10,
    color: C.text4,
  },
  miniRow: {
    flexDirection: 'row',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border2,
  },
  statGrid: {
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 8,
  },
  row2: {
    marginHorizontal: 16,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 10,
  },
  markerLabel: {
    fontSize: 9,
    color: C.text4,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  bmiSub: {
    fontSize: 9.5,
    color: C.text4,
    textAlign: 'center',
    marginTop: 2,
  },
  streakBox: {
    padding: 11,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: 'rgba(184, 240, 77, 0.22)',
    borderRadius: 12,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.3,
  },
});
