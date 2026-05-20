import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { todayLocalDate } from '@yemek-takip/utils';
import { C } from '@/lib/theme';

const QUICK_AMOUNTS = [100, 250, 330, 500, 750, 1000];

export default function AddWaterScreen() {
  const today = todayLocalDate();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['water', today],
    queryFn: () => api.water.listByDate(today),
  });

  const add = useMutation({
    mutationFn: (amountMl: number) => api.water.add({ amountMl }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water', today] }),
    onError: (err) => Alert.alert('Hata', err instanceof Error ? err.message : 'Hata'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.water.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['water', today] }),
  });

  const totalMl = query.data?.totalMl ?? 0;
  const liters = Math.round((totalMl / 1000) * 10) / 10;
  const goalMl = 2500;
  const pct = Math.min((totalMl / goalMl) * 100, 100);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Su' }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['bottom']}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 40 }}>
          <View style={s.heroCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="water" size={14} color={C.cyan} />
              <Text style={s.heroLabel}>BUGÜNKÜ SU</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 }}>
              <Text style={s.heroBig}>{liters}</Text>
              <Text style={{ color: C.text3, fontSize: 16 }}>/ {goalMl / 1000}L</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${pct}%` }]} />
            </View>
            <Text style={{ fontSize: 11.5, color: C.text3, marginTop: 8 }}>
              Hedefin %{Math.round(pct)}'i
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={s.sectionLabel}>HIZLI EKLE</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {QUICK_AMOUNTS.map((amount) => (
                <Pressable
                  key={amount}
                  onPress={() => add.mutate(amount)}
                  disabled={add.isPending}
                  style={({ pressed }) => [
                    s.amountBtn,
                    pressed && { opacity: 0.85 },
                    add.isPending && { opacity: 0.5 },
                  ]}
                >
                  <Ionicons name="water" size={22} color={C.cyan} />
                  <Text style={{ color: C.text, fontWeight: '700', fontSize: 14, marginTop: 4 }}>
                    {amount}
                  </Text>
                  <Text style={{ color: C.text3, fontSize: 10 }}>ml</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={s.sectionLabel}>BUGÜNKÜ KAYITLAR</Text>
            <View style={{ gap: 8 }}>
              {(query.data?.entries ?? []).map((e) => (
                <View key={e._id} style={s.entryRow}>
                  <View style={s.entryIcon}>
                    <Ionicons name="water" size={18} color={C.cyan} />
                  </View>
                  <Text style={{ flex: 1, color: C.text, fontWeight: '600', fontSize: 14 }}>
                    {e.amountMl} ml
                  </Text>
                  <Pressable onPress={() => remove.mutate(e._id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={C.coral} />
                  </Pressable>
                </View>
              ))}
              {!query.data?.entries.length && (
                <View style={s.emptyBox}>
                  <Text style={{ color: C.text4, fontSize: 13 }}>Henüz su eklenmedi.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const s = StyleSheet.create({
  heroCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  heroLabel: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.cyan,
    fontWeight: '700',
  },
  heroBig: {
    fontSize: 48,
    fontWeight: '700',
    color: C.cyan,
    letterSpacing: -1.5,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.cyan,
    borderRadius: 999,
  },
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.text3,
    fontWeight: '600',
  },
  amountBtn: {
    width: '31%',
    paddingVertical: 14,
    backgroundColor: 'rgba(126,200,224,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(126,200,224,0.25)',
    alignItems: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border2,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(126,200,224,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.border2,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});
