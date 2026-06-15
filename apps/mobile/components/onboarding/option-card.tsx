import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, onPrimary } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

interface OptionCardProps {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}

/** Onboarding'de cinsiyet / aktivite gibi tek satırlık seçimler için kart. */
export function OptionCard({ icon, title, subtitle, selected, onPress }: OptionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: 'rgba(184,240,77,0.10)' }}
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>
        <Ionicons name={icon} size={22} color={selected ? onPrimary : C.text2} />
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Ionicons name="checkmark" size={14} color={onPrimary} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  cardSelected: {
    borderColor: C.lime,
    backgroundColor: 'rgba(184,240,77,0.07)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface2,
  },
  iconWrapSelected: { backgroundColor: C.lime },
  textWrap: { flex: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '700', color: C.text },
  titleSelected: { color: C.text },
  subtitle: { fontSize: 12.5, color: C.text3, fontWeight: '500' },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: C.lime, backgroundColor: C.lime },
});
