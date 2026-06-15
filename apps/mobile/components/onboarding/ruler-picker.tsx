import { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { C } from '@/lib/theme';

interface RulerPickerProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  /** Kaç ondalık basamak gösterilsin (örn. 0.5 adımlar için 1). */
  decimals?: number;
}

const TICK_SPACING = 13;

/**
 * Yatay kaydırmalı cetvel seçici. Ortadaki lime çizgi seçili değeri gösterir.
 * Her 5. çentik uzun + sayı etiketli.
 */
export function RulerPicker({
  min,
  max,
  step = 1,
  value,
  onChange,
  unit,
  decimals = 0,
}: RulerPickerProps) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const sidePad = width / 2 - TICK_SPACING / 2;

  const ticks = useMemo(() => {
    const count = Math.round((max - min) / step) + 1;
    return Array.from({ length: count }, (_, i) => +(min + i * step).toFixed(6));
  }, [min, max, step]);

  // Değer dışarıdan ilk kez geldiğinde doğru konuma kaydır.
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    const idx = Math.round((value - min) / step);
    if (idx >= 0) {
      didInit.current = true;
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ x: idx * TICK_SPACING, animated: false });
      });
    }
  }, [value, min, step]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / TICK_SPACING);
    const clamped = Math.min(Math.max(idx, 0), ticks.length - 1);
    const next = ticks[clamped];
    if (next != null && next !== value) onChange(next);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.readout}>
        <Text style={styles.value}>{value.toFixed(decimals)}</Text>
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      <View style={styles.rulerBox}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_SPACING}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={handleScroll}
          contentContainerStyle={{ paddingHorizontal: sidePad }}
        >
          {ticks.map((t, i) => {
            const major = i % 5 === 0;
            return (
              <View key={i} style={styles.tickSlot}>
                <View
                  style={[
                    styles.tick,
                    major ? styles.tickMajor : styles.tickMinor,
                  ]}
                />
                {major ? (
                  <Text style={styles.tickLabel}>{t.toFixed(decimals)}</Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>

        {/* Ortadaki seçim göstergesi */}
        <View pointerEvents="none" style={styles.centerLine} />
        <View pointerEvents="none" style={styles.centerCap} />
      </View>
    </View>
  );
}

const RULER_HEIGHT = 96;

const styles = StyleSheet.create({
  wrap: { gap: 26 },
  readout: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  value: { fontSize: 56, fontWeight: '800', color: C.text, letterSpacing: -1.5 },
  unit: { fontSize: 18, fontWeight: '600', color: C.text3, marginBottom: 10 },
  rulerBox: { height: RULER_HEIGHT, justifyContent: 'center' },
  tickSlot: { width: TICK_SPACING, alignItems: 'center', justifyContent: 'flex-start', height: RULER_HEIGHT },
  tick: { width: 2, borderRadius: 2 },
  tickMinor: { height: 22, backgroundColor: C.border, marginTop: 8 },
  tickMajor: { height: 40, backgroundColor: C.text4, marginTop: 8 },
  tickLabel: { marginTop: 8, fontSize: 11, fontWeight: '600', color: C.text3 },
  centerLine: {
    position: 'absolute',
    left: '50%',
    marginLeft: -1.5,
    top: 4,
    width: 3,
    height: 56,
    borderRadius: 3,
    backgroundColor: C.lime,
  },
  centerCap: {
    position: 'absolute',
    left: '50%',
    marginLeft: -5,
    top: -2,
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: C.lime,
  },
});
