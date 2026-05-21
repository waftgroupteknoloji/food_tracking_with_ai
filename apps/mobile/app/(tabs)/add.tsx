import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { pickFromLibrary, takePhoto, uploadImageFromUri } from '@/lib/upload';
import { C, onPrimary } from '@/lib/theme';

type Stage = 'idle' | 'uploading' | 'analyzing';

const STAGES = [
  'Tabak ve yemekler tanındı',
  'Porsiyon büyüklüğü tahmin ediliyor',
  'Makro besinler hesaplanıyor',
  'Sonuç hazırlanıyor',
];

export default function AddScreen() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startMealUpload(source: 'camera' | 'library') {
    setError(null);
    try {
      const uri = source === 'camera' ? await takePhoto() : await pickFromLibrary();
      if (!uri) return;
      setPreview(uri);

      setStage('uploading');
      const { key, publicUrl } = await uploadImageFromUri(uri, 'meals');

      setStage('analyzing');
      const meal = await api.meals.create({
        photoKey: key,
        photoUrl: publicUrl,
        consumedAt: new Date().toISOString(),
      });
      setStage('idle');
      setPreview(null);
      router.push(`/meal/${meal._id}?fresh=1`);
    } catch (err) {
      setStage('idle');
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Hata');
      Alert.alert('Hata', err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  if (stage !== 'idle') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
        <AnalyzingOverlay stage={stage} previewUri={preview} onCancel={() => setStage('idle')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Header />

        <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
          <ViewfinderCard
            onShutter={() => startMealUpload('camera')}
            onGallery={() => startMealUpload('library')}
          />
        </View>

        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Text style={[s.labelXs, { paddingTop: 2 }]}>YA DA HIZLI EKLE</Text>
          <QuickAddGrid
            onPressText={() => router.push('/add-meal-text')}
            onPressActivity={() => router.push('/add-activity')}
            onPressWater={() => router.push('/add-water')}
            onPressWeight={() => router.push('/add-weight')}
          />
        </View>

        {error && (
          <View style={[s.errorBox, { marginHorizontal: 16, marginTop: 14 }]}>
            <Ionicons name="alert-circle-outline" size={16} color={C.coral} />
            <Text style={{ color: C.coral, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header() {
  return (
    <View style={s.header}>
      <View style={{ width: 36 }} />
      <View style={{ alignItems: 'center' }}>
        <Text style={s.headerTitle}>Yemek ekle</Text>
        <Text style={s.headerSub}>ne yedin?</Text>
      </View>
      <View style={{ width: 36 }} />
    </View>
  );
}

function ViewfinderCard({ onShutter, onGallery }: { onShutter: () => void; onGallery: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2800,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ).start();
    Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 2800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ).start();
  }, [pulse, ring]);

  const pulseScale = pulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.04, 1] });
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.7, 0, 0] });

  return (
    <View style={s.vfCard}>
      <View style={s.vfBg} pointerEvents="none" />

      <CornerBracket pos="tl" />
      <CornerBracket pos="tr" />
      <CornerBracket pos="bl" />
      <CornerBracket pos="br" />

      {/* Center prompt */}
      <View style={s.vfCenter} pointerEvents="box-none">
        <View style={s.pulseStage}>
          <Animated.View
            pointerEvents="none"
            style={[
              s.pulseRing,
              { transform: [{ scale: ringScale }], opacity: ringOpacity },
            ]}
          />
          <Animated.View style={[s.pulseCircle, { transform: [{ scale: pulseScale }] }]}>
            <View style={s.iconCenter}>
              <Ionicons name="camera" size={40} color={onPrimary} />
            </View>
          </Animated.View>
        </View>
        <Text style={s.vfTitle}>Tabağı kadraja al</Text>
        <Text style={s.vfSub}>AI 3 saniyede tanır · kalori{'\n'}ve makroları otomatik çıkarır</Text>
      </View>

      {/* Bottom action row */}
      <View style={s.vfActions} pointerEvents="box-none">
        <Pressable
          onPress={onGallery}
          style={({ pressed }) => [s.sideBtn, pressed && { opacity: 0.7 }]}
          hitSlop={6}
        >
          <Ionicons name="images-outline" size={20} color={C.text} />
        </Pressable>

        <ShutterButton onPress={onShutter} />

        <Pressable
          style={({ pressed }) => [s.sideBtn, pressed && { opacity: 0.7 }]}
          hitSlop={6}
        >
          <Ionicons name="mic-outline" size={20} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

function ShutterButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.shutterOuter, pressed && { transform: [{ scale: 0.96 }] }]}
      hitSlop={4}
    >
      {/* 1px lime outer ring */}
      <View style={s.shutterRing}>
        {/* 4px dark gap */}
        <View style={s.shutterGap}>
          {/* 64px lime button */}
          <LinearGradient
            colors={['#e4ff8a', '#b8f04d', '#9bd03a']}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.shutterCore}
          >
            <View style={s.iconCenter}>
              <Ionicons name="camera" size={26} color={onPrimary} />
            </View>
          </LinearGradient>
        </View>
      </View>
    </Pressable>
  );
}

function CornerBracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base: any = { position: 'absolute', width: 28, height: 28, borderColor: C.lime };
  const variants: Record<typeof pos, any> = {
    tl: { top: 14, left: 14, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 6 },
    tr: { top: 14, right: 14, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6 },
    bl: { bottom: 14, left: 14, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 6 },
    br: { bottom: 14, right: 14, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6 },
  };
  return <View style={[base, variants[pos]]} />;
}

function QuickAddGrid({
  onPressText,
  onPressActivity,
  onPressWater,
  onPressWeight,
}: {
  onPressText: () => void;
  onPressActivity: () => void;
  onPressWater: () => void;
  onPressWeight: () => void;
}) {
  const items = [
    {
      label: 'Yazıyla',
      icon: 'create-outline' as const,
      color: C.lime,
      tint: 'rgba(184, 240, 77, 0.14)',
      onPress: onPressText,
    },
    {
      label: 'Aktivite',
      icon: 'pulse' as const,
      color: C.coral,
      tint: 'rgba(240, 141, 106, 0.14)',
      onPress: onPressActivity,
    },
    {
      label: 'Su',
      icon: 'water' as const,
      color: C.cyan,
      tint: 'rgba(126, 200, 224, 0.14)',
      onPress: onPressWater,
    },
    {
      label: 'Kilo',
      icon: 'scale' as const,
      color: C.amber,
      tint: 'rgba(232, 193, 74, 0.14)',
      onPress: onPressWeight,
    },
  ];

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map((q) => (
        <Pressable
          key={q.label}
          onPress={q.onPress}
          style={({ pressed }) => [s.quickTile, pressed && { opacity: 0.85 }]}
        >
          <View style={[s.quickIcon, { backgroundColor: q.tint }]}>
            <Ionicons name={q.icon} size={18} color={q.color} />
          </View>
          <Text style={s.quickLabel}>{q.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function AnalyzingOverlay({
  stage,
  previewUri,
  onCancel,
}: {
  stage: Stage;
  previewUri: string | null;
  onCancel: () => void;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const orbPulse = useRef(new Animated.Value(0)).current;
  const [stageIdx, setStageIdx] = useState(0);
  const [tNum, setTNum] = useState(0);

  useEffect(() => {
    t.setValue(0);
    Animated.loop(
      Animated.timing(t, {
        toValue: 1,
        duration: 4800,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    ).start();
    Animated.loop(
      Animated.timing(orbPulse, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ).start();
    const sub = t.addListener(({ value }) => {
      setTNum(value);
      const idx = Math.min(Math.floor(value * STAGES.length), STAGES.length);
      setStageIdx(idx);
    });
    return () => t.removeListener(sub);
  }, [t, orbPulse]);

  // smoothstep 18..82
  const smooth = tNum * tNum * (3 - 2 * tNum);
  const scanPct = 18 + smooth * 64;
  const progressPct = tNum * 100;
  const orbOpacity = orbPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1, 0.5] });

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="chevron-back" size={18} color={C.text2} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={s.headerTitle}>Analiz ediliyor</Text>
          <Text style={s.headerSub}>
            {stage === 'uploading' ? 'Fotoğraf yükleniyor' : 'Claude inceliyor'}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
        <View style={s.vfCard}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={s.vfPhoto} resizeMode="cover" />
          ) : (
            <View style={[s.vfPhoto, { backgroundColor: C.surface2 }]} />
          )}

          {/* Vignette */}
          <View pointerEvents="none" style={s.vignette} />

          {/* Scan glow (above beam) */}
          <View
            pointerEvents="none"
            style={[s.scanGlowBox, { top: `${scanPct}%`, transform: [{ translateY: -36 }] }]}
          >
            <LinearGradient
              colors={['rgba(184, 240, 77, 0)', 'rgba(184, 240, 77, 0.22)']}
              style={{ flex: 1 }}
            />
          </View>

          {/* Scan beam */}
          <View
            pointerEvents="none"
            style={[s.scanBeam, { top: `${scanPct}%` }]}
          />

          {/* Detection boxes */}
          {[
            { x: 32, y: 36, w: 32, h: 26, l: 'tavuk', c: 92, show: 1 },
            { x: 56, y: 50, w: 24, h: 18, l: 'pirinç', c: 88, show: 2 },
            { x: 28, y: 60, w: 24, h: 16, l: 'sos', c: 76, show: 3 },
          ].map((b, i) => {
            const visible = stageIdx >= b.show;
            return (
              <View
                key={i}
                pointerEvents="none"
                style={[
                  s.detectBox,
                  {
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    width: `${b.w}%`,
                    height: `${b.h}%`,
                    opacity: visible ? 1 : 0,
                  },
                ]}
              >
                <View style={s.detectTag}>
                  <Text style={s.detectTagText}>
                    {b.l} · %{b.c}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* AI orb pill top-left */}
          <Animated.View style={[s.aiOrb, { opacity: orbOpacity }]}>
            <View style={s.aiOrbDot}>
              <Ionicons name="sparkles" size={12} color={onPrimary} />
            </View>
            <Text style={s.aiOrbLabel}>CLAUDE VISION</Text>
          </Animated.View>

          {/* Progress bar at bottom of photo */}
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progressPct}%` }]} />
          </View>
        </View>
      </View>

      {/* Stages list */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={s.stagesCard}>
          {STAGES.map((label, i) => {
            const done = i < stageIdx;
            const loading = i === stageIdx;
            return (
              <View key={i} style={s.stageRow}>
                <View
                  style={[
                    s.stageDot,
                    done && { backgroundColor: C.lime, borderColor: C.lime },
                    loading && { borderColor: C.lime, borderWidth: 2 },
                  ]}
                >
                  {done ? <Ionicons name="checkmark" size={11} color={onPrimary} /> : null}
                </View>
                <Text style={[s.stageLabel, (done || loading) && { color: C.text }]}>
                  {label}
                  {loading ? '…' : ''}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18 }}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [s.cancelBtn, pressed && { opacity: 0.8 }]}
        >
          <Text style={s.cancelText}>İptal et</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.whiteAlpha.a04,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 10,
    color: C.text3,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  labelXs: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.text3,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Viewfinder card
  vfCard: {
    aspectRatio: 4 / 5,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0c0f15',
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 20 },
    shadowRadius: 36,
    elevation: 10,
  },
  vfBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(184, 240, 77, 0.04)',
  },
  vfPhoto: { width: '100%', height: '100%' },

  vfCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  pulseStage: {
    width: 116,
    height: 116,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 116,
    height: 116,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(184, 240, 77, 0.45)',
  },
  pulseCircle: {
    width: 96,
    height: 96,
    borderRadius: 999,
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.lime,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 18 },
    shadowRadius: 28,
    elevation: 12,
  },
  vfTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  vfSub: {
    marginTop: 8,
    fontSize: 11,
    color: C.text3,
    textAlign: 'center',
    lineHeight: 16,
  },

  // Viewfinder bottom action row
  vfActions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 16,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Shutter button (3-layer)
  shutterOuter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.lime,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 26,
    elevation: 12,
  },
  shutterGap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0c0f15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick add — compact 4-col grid (matches design)
  quickTile: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: 'center',
    gap: 8,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: C.text2,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(240, 141, 106, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(240, 141, 106, 0.28)',
  },

  // Analyzing overlay
  vignette: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  scanBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: C.lime,
    shadowColor: C.lime,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
  },
  scanGlowBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 36,
    overflow: 'hidden',
  },

  detectBox: {
    position: 'absolute',
    borderWidth: 1.6,
    borderColor: C.lime,
    borderRadius: 6,
  },
  detectTag: {
    position: 'absolute',
    top: -19,
    left: -1,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 4,
    backgroundColor: C.lime,
  },
  detectTagText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: onPrimary,
    letterSpacing: 0.4,
  },

  aiOrb: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(184, 240, 77, 0.32)',
  },
  aiOrbDot: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.lime,
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
  },
  aiOrbLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: C.lime,
    letterSpacing: 0.6,
  },

  progressTrack: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.lime,
  },

  stagesCard: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(184, 240, 77, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(184, 240, 77, 0.22)',
    gap: 10,
  },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stageDot: {
    width: 18,
    height: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLabel: { fontSize: 12.5, color: C.text4 },

  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: C.whiteAlpha.a04,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: 'center',
  },
  cancelText: { fontSize: 13, fontWeight: '600', color: C.text3 },
});
