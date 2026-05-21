import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiError } from '@yemek-takip/api-client';
import type { Meal, MealType, MealItem } from '@yemek-takip/validators';
import { api } from '@/lib/api';
import { C, onPrimary } from '@/lib/theme';
import { MealPhoto } from '@/components/meal-photo';

const MEAL_SLOTS: {
  value: MealType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgNormal: string;
  bgActive: string;
  borderNormal: string;
}[] = [
  {
    value: 'breakfast', label: 'Kahvaltı', icon: 'cafe-outline', color: C.amber,
    bgNormal: 'rgba(232,193,74,0.15)', bgActive: 'rgba(232,193,74,0.55)', borderNormal: 'rgba(232,193,74,0.4)',
  },
  {
    value: 'lunch', label: 'Öğle', icon: 'sunny-outline', color: C.lime,
    bgNormal: 'rgba(184,240,77,0.15)', bgActive: 'rgba(184,240,77,0.55)', borderNormal: 'rgba(184,240,77,0.4)',
  },
  {
    value: 'snack', label: 'Atıştırma', icon: 'leaf-outline', color: C.cyan,
    bgNormal: 'rgba(126,200,224,0.15)', bgActive: 'rgba(126,200,224,0.55)', borderNormal: 'rgba(126,200,224,0.4)',
  },
  {
    value: 'dinner', label: 'Akşam', icon: 'moon-outline', color: C.coral,
    bgNormal: 'rgba(240,141,106,0.15)', bgActive: 'rgba(240,141,106,0.55)', borderNormal: 'rgba(240,141,106,0.4)',
  },
];

const PORTION_MIN = 20;
const PORTION_MAX = 600;
const PORTION_STEP = 20;

type EditableItem = MealItem & {
  _localId: string;
  _baseGrams: number;
  _kcalPerG: number;
  _protPerG: number;
  _carbsPerG: number;
  _fatPerG: number;
};

const newLocalId = () => Math.random().toString(36).slice(2);

function makeEditable(it: MealItem): EditableItem {
  const baseGrams = it.grams && it.grams > 0 ? it.grams : 100;
  const kcal = Number(it.kcal) || 0;
  const m = it.macros ?? {};
  return {
    ...it,
    _localId: newLocalId(),
    _baseGrams: baseGrams,
    _kcalPerG: kcal / baseGrams,
    _protPerG: (m.protein ?? 0) / baseGrams,
    _carbsPerG: (m.carbs ?? 0) / baseGrams,
    _fatPerG: (m.fat ?? 0) / baseGrams,
  };
}

function scaleItem(it: EditableItem, newG: number): EditableItem {
  const g = Math.max(0, Math.round(newG));
  return {
    ...it,
    grams: g,
    kcal: Math.round(it._kcalPerG * g),
    macros: {
      protein: Math.round(it._protPerG * g * 10) / 10,
      carbs: Math.round(it._carbsPerG * g * 10) / 10,
      fat: Math.round(it._fatPerG * g * 10) / 10,
    },
    isEdited: true,
  };
}

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery<Meal>({
    queryKey: ['meal', id],
    queryFn: () => api.meals.get(id!),
  });

  const [items, setItems] = useState<EditableItem[]>([]);
  const [mealType, setMealType] = useState<MealType | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [titleFocused, setTitleFocused] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (query.data && !hydrated) {
      setItems(query.data.items.map((it) => makeEditable(it)));
      setMealType(query.data.mealType);
      const initialTitle =
        query.data.userNote?.trim() ||
        (query.data.aiAnalysis?.rawJson as { meal_description?: string } | undefined)
          ?.meal_description ||
        query.data.items[0]?.name ||
        '';
      setTitle(initialTitle);
      setHydrated(true);
    }
  }, [query.data, hydrated]);

  const totals = useMemo(() => {
    let kcal = 0;
    let grams = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    for (const it of items) {
      kcal += Number(it.kcal) || 0;
      grams += Number(it.grams) || 0;
      protein += it.macros?.protein ?? 0;
      carbs += it.macros?.carbs ?? 0;
      fat += it.macros?.fat ?? 0;
    }
    return {
      kcal: Math.round(kcal),
      grams: Math.round(grams),
      protein: Math.round(protein),
      carbs: Math.round(carbs),
      fat: Math.round(fat),
    };
  }, [items]);

  // per 100g reference, computed from current item proportions
  const per100Kcal = useMemo(() => {
    if (totals.grams <= 0) return 0;
    return Math.round((totals.kcal / totals.grams) * 100);
  }, [totals]);

  const save = useMutation({
    mutationFn: () =>
      api.meals.update(id!, {
        mealType,
        userNote: title.trim() || undefined,
        items: items.map(({ _localId, _baseGrams, _kcalPerG, _protPerG, _carbsPerG, _fatPerG, ...rest }) => rest),
      }),
    onSuccess: () => router.back(),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Kaydedilemedi'),
  });

  const remove = useMutation({
    mutationFn: () => api.meals.remove(id!),
    onSuccess: () => router.replace('/(tabs)'),
    onError: (err) =>
      Alert.alert('Hata', err instanceof ApiError ? err.message : 'Silinemedi'),
  });

  function bumpItemGrams(localId: string, deltaG: number) {
    setItems((prev) =>
      prev.map((it) =>
        it._localId === localId ? scaleItem(it, (it.grams ?? 0) + deltaG) : it,
      ),
    );
  }

  function setPortion(newTotal: number) {
    const clamped = Math.max(PORTION_MIN, Math.min(PORTION_MAX, newTotal));
    const currentTotal = items.reduce((sum, it) => sum + (it.grams ?? 0), 0);
    if (currentTotal <= 0) return;
    const ratio = clamped / currentTotal;
    setItems((prev) => prev.map((it) => scaleItem(it, (it.grams ?? 0) * ratio)));
  }

  function deleteItem(localId: string) {
    setItems((prev) => prev.filter((it) => it._localId !== localId));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        _localId: newLocalId(),
        name: '',
        quantity: 1,
        unit: 'porsiyon',
        grams: 50,
        kcal: 0,
        macros: { protein: 0, carbs: 0, fat: 0 },
        isEdited: false,
        isAdded: true,
        _baseGrams: 50,
        _kcalPerG: 0,
        _protPerG: 0,
        _carbsPerG: 0,
        _fatPerG: 0,
      },
    ]);
  }

  if (query.isLoading || !query.data) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={C.lime} />
      </SafeAreaView>
    );
  }

  const meal = query.data;
  const aiError = meal.aiAnalysis.error;
  const confidence = meal.aiAnalysis.confidence
    ? Math.round(meal.aiAnalysis.confidence * 100)
    : null;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View style={s.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="chevron-back" size={18} color={C.text2} />
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Text style={s.headerTitle}>Düzelt ve onayla</Text>
              <Text style={s.headerSub}>3 / 3</Text>
            </View>
            {confidence != null ? (
              <View style={s.aiBadge}>
                <Ionicons name="sparkles" size={11} color={C.lime} />
                <Text style={s.aiBadgeText}>%{confidence}</Text>
              </View>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero photo */}
            <View style={s.hero}>
              <MealPhoto photoUrl={meal.photoUrl} style={s.heroPhoto} />
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
                locations={[0.3, 1]}
                style={s.heroGradient}
                pointerEvents="none"
              />
              <View style={s.heroBottom}>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  onFocus={() => setTitleFocused(true)}
                  onBlur={() => setTitleFocused(false)}
                  placeholder="Yemek adı"
                  placeholderTextColor="rgba(247,248,250,0.5)"
                  style={[
                    s.heroTitle,
                    titleFocused && {
                      borderColor: 'rgba(184, 240, 77, 0.6)',
                      borderStyle: 'dashed',
                    },
                  ]}
                />
                <View style={s.heroKcalRow}>
                  <Text style={s.heroKcal}>{totals.kcal}</Text>
                  <Text style={s.heroKcalLabel}>
                    kcal · {totals.grams}g
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [s.heroChip, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="camera-outline" size={11} color={C.text} />
                <Text style={s.heroChipText}>Yeniden çek</Text>
              </Pressable>
            </View>

            {aiError && (
              <View style={s.warnBox}>
                <Ionicons name="warning-outline" size={16} color={C.amber} />
                <Text style={{ flex: 1, color: C.amber, fontSize: 12.5 }}>
                  AI analizi yapılamadı: {aiError}. Aşağıdan elle düzenle.
                </Text>
              </View>
            )}

            {/* Portion stepper */}
            <View style={s.portionCard}>
              <View style={s.portionHead}>
                <Text style={s.labelXs}>PORSIYON BÜYÜKLÜĞÜ</Text>
                <Text style={s.portionPer100}>
                  per 100g · {per100Kcal} kcal
                </Text>
              </View>
              <View style={s.portionRow}>
                <Pressable
                  onPress={() => setPortion(totals.grams - PORTION_STEP)}
                  style={({ pressed }) => [s.stepBtn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={s.stepBtnText}>−</Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <SliderTrack value={totals.grams} min={PORTION_MIN} max={PORTION_MAX} />
                  <View style={s.portionValueRow}>
                    <Text style={s.portionValue}>{totals.grams}</Text>
                    <Text style={s.portionUnit}>gram</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setPortion(totals.grams + PORTION_STEP)}
                  style={({ pressed }) => [s.stepBtnPrimary, pressed && { opacity: 0.85 }]}
                >
                  <Text style={[s.stepBtnText, { color: onPrimary }]}>+</Text>
                </Pressable>
              </View>
            </View>

            {/* Macros */}
            <View style={s.macroGrid}>
              <MacroCard label="PROTEİN" value={totals.protein} color={C.lime} />
              <MacroCard label="KARB" value={totals.carbs} color={C.amber} />
              <MacroCard label="YAĞ" value={totals.fat} color={C.coral} />
            </View>

            {/* Ingredients */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.labelXs}>İÇİNDEKİLER</Text>
                <Pressable
                  onPress={addItem}
                  style={({ pressed }) => [s.addBtn, pressed && { opacity: 0.6 }]}
                  hitSlop={6}
                >
                  <Ionicons name="add" size={12} color={C.lime} />
                  <Text style={s.addBtnText}>Ekle</Text>
                </Pressable>
              </View>
              <View style={{ gap: 6 }}>
                {items.length === 0 && (
                  <Text
                    style={{
                      fontSize: 12.5,
                      color: C.text3,
                      textAlign: 'center',
                      paddingVertical: 14,
                    }}
                  >
                    Henüz içerik yok. "Ekle"ye bas.
                  </Text>
                )}
                {items.map((it) => (
                  <IngredientRow
                    key={it._localId}
                    item={it}
                    onBump={(d) => bumpItemGrams(it._localId, d)}
                    onDelete={() => deleteItem(it._localId)}
                    onNameChange={(name) =>
                      setItems((prev) =>
                        prev.map((p) =>
                          p._localId === it._localId ? { ...p, name, isEdited: true } : p,
                        ),
                      )
                    }
                  />
                ))}
              </View>
            </View>

            {/* Meal slot */}
            <View style={s.section}>
              <Text style={[s.labelXs, { marginBottom: 10 }]}>ÖĞÜN</Text>
              <View style={s.slotRow}>
                {MEAL_SLOTS.map((slot) => {
                  const active = mealType === slot.value;
                  return (
                    <Pressable
                      key={slot.value}
                      onPress={() => setMealType(active ? undefined : slot.value)}
                      style={[
                        s.slotCard,
                        { backgroundColor: active ? slot.bgActive : slot.bgNormal },
                        { borderColor: active ? slot.color : slot.borderNormal },
                        active && { borderWidth: 2.5, transform: [{ scale: 1.04 }] },
                      ]}
                    >
                      <Ionicons name={slot.icon} size={22} color={slot.color} />
                      <Text style={[s.slotCardLabel, { color: active ? slot.color : C.text2 }]} numberOfLines={1}>
                        {slot.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

          </ScrollView>

          {/* Sticky action bar: red delete + green confirm */}
          <View
            style={{
              width: '100%',
              flexDirection: 'row',
              paddingHorizontal: 16,
              paddingTop: 14,
              paddingBottom: 20,
              borderTopWidth: 1,
              borderTopColor: '#272930',
              backgroundColor: '#15171c',
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                Alert.alert('Sil', 'Bu yemeği silmek istediğine emin misin?', [
                  { text: 'İptal', style: 'cancel' },
                  { text: 'Sil', style: 'destructive', onPress: () => remove.mutate() },
                ])
              }
              disabled={remove.isPending}
              style={{
                flex: 1,
                marginRight: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 56,
                borderRadius: 14,
                backgroundColor: '#e54848',
              }}
            >
              {remove.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 16,
                      fontWeight: '700',
                      color: '#fff',
                      letterSpacing: 0.3,
                    }}
                  >
                    Sil
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => save.mutate()}
              disabled={save.isPending}
              style={{
                flex: 1,
                marginLeft: 6,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                height: 56,
                borderRadius: 14,
                backgroundColor: '#b8f04d',
              }}
            >
              {save.isPending ? (
                <ActivityIndicator color="#0a0d12" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#0a0d12" />
                  <View style={{ marginLeft: 8, alignItems: 'center' }}>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: '#0a0d12',
                        letterSpacing: 0.3,
                        lineHeight: 18,
                      }}
                    >
                      Kaydet
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: '#0a0d12',
                        opacity: 0.7,
                        marginTop: 1,
                      }}
                    >
                      ({totals.kcal} kcal)
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

function SliderTrack({ value, min, max }: { value: number; min: number; max: number }) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <View style={s.sliderTrack}>
      <View style={[s.sliderFill, { width: `${pct * 100}%` }]} />
      <View style={[s.sliderThumb, { left: `${pct * 100}%` }]} />
    </View>
  );
}

function MacroCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={[
        s.macroCard,
        { borderColor: `${color}40`, backgroundColor: `${color}14` },
      ]}
    >
      <Text style={[s.macroLabel, { color }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
        <Text style={s.macroValue}>{value}</Text>
        <Text style={s.macroUnit}>g</Text>
      </View>
    </View>
  );
}

function IngredientRow({
  item,
  onBump,
  onDelete,
  onNameChange,
}: {
  item: EditableItem;
  onBump: (delta: number) => void;
  onDelete: () => void;
  onNameChange: (name: string) => void;
}) {
  return (
    <View style={s.ingrRow}>
      <View style={s.ingrTop}>
        <View style={s.ingrDot} />
        <TextInput
          value={item.name}
          onChangeText={onNameChange}
          placeholder="Bileşen"
          placeholderTextColor={C.text4}
          style={s.ingrName}
        />
        <Pressable onPress={onDelete} hitSlop={8} style={s.ingrDeleteBtn}>
          <Ionicons name="trash-outline" size={15} color={C.text4} />
        </Pressable>
      </View>
      <View style={s.ingrBottom}>
        <View style={s.gramStepper}>
          <Pressable onPress={() => onBump(-5)} style={s.gramStepBtn} hitSlop={4}>
            <Text style={s.gramStepText}>−</Text>
          </Pressable>
          <Text style={s.gramValue}>{item.grams ?? 0}g</Text>
          <Pressable onPress={() => onBump(5)} style={s.gramStepBtn} hitSlop={4}>
            <Text style={s.gramStepText}>+</Text>
          </Pressable>
        </View>
        <Text style={s.ingrKcal}>{item.kcal} kcal</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
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
  headerTitle: { fontSize: 15, fontWeight: '600', color: C.text, letterSpacing: -0.2 },
  headerSub: { fontSize: 10, color: C.text3, marginTop: 2, letterSpacing: 0.4 },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(184, 240, 77, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(184, 240, 77, 0.32)',
  },
  aiBadgeText: { fontSize: 10.5, fontWeight: '700', color: C.lime, letterSpacing: 0.6 },

  labelXs: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.text3,
    fontWeight: '600',
    textTransform: 'uppercase',
  },

  // Hero
  hero: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    position: 'relative',
  },
  heroPhoto: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  heroBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.3,
    padding: 4,
    marginHorizontal: -4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  heroKcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  heroKcal: {
    fontSize: 32,
    fontWeight: '600',
    color: C.text,
    lineHeight: 34,
    letterSpacing: -0.6,
  },
  heroKcalLabel: { fontSize: 11, color: C.text3 },
  heroChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroChipText: { fontSize: 10.5, fontWeight: '600', color: C.text },

  warnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(232, 193, 74, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(232, 193, 74, 0.30)',
  },

  // Portion
  portionCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
  },
  portionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  portionPer100: { fontSize: 11, color: C.text3 },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.whiteAlpha.a04,
    borderWidth: 1,
    borderColor: C.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPrimary: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 18, fontWeight: '600', color: C.text },
  sliderTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: C.whiteAlpha.a08,
    position: 'relative',
  },
  sliderFill: {
    height: 4,
    borderRadius: 999,
    backgroundColor: C.lime,
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    marginLeft: -7,
    borderRadius: 999,
    backgroundColor: C.lime,
    borderWidth: 2,
    borderColor: C.bg,
  },
  portionValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  portionValue: {
    fontSize: 24,
    fontWeight: '600',
    color: C.text,
    letterSpacing: -0.4,
  },
  portionUnit: { fontSize: 11, color: C.text3 },

  // Macros
  macroGrid: { flexDirection: 'row', gap: 8, marginTop: 10 },
  macroCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  macroLabel: { fontSize: 9.5, fontWeight: '700', letterSpacing: 0.8 },
  macroValue: { fontSize: 22, fontWeight: '600', color: C.text },
  macroUnit: { fontSize: 11, color: C.text3 },

  // Section
  section: { marginTop: 16 },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 11, fontWeight: '600', color: C.lime },

  // Ingredients — two-row layout so long names stay readable
  ingrRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border2,
    gap: 8,
  },
  ingrTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ingrBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
  },
  ingrDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: C.lime,
    flexShrink: 0,
  },
  ingrName: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '600',
    color: C.text,
    padding: 0,
    minWidth: 0,
  },
  ingrDeleteBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gramStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.whiteAlpha.a04,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border2,
    height: 30,
  },
  gramStepBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gramStepText: { color: C.text2, fontSize: 16, fontWeight: '600' },
  gramValue: {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 12.5,
    fontWeight: '600',
    color: C.text,
  },
  ingrKcal: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text2,
  },

  // Meal slot — soft lime tint when active, dark-theme friendly
  slotRow: {
    flexDirection: 'row',
    gap: 8,
  },
  slotCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  slotCardLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // CTA bar — two equal buttons filling page width
  ctaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: C.border2,
    backgroundColor: 'rgba(21, 23, 28, 0.92)',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e54848',
    shadowColor: '#e54848',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  cta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: 14,
    backgroundColor: C.lime,
    shadowColor: C.lime,
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 8,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: onPrimary, letterSpacing: 0.3 },
});
