import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@yemek-takip/api-client';
import { api } from '@/lib/api';
import { pickFromLibrary, takePhoto, uploadImageFromUri } from '@/lib/upload';
import { C, onPrimary } from '@/lib/theme';

type Stage = 'idle' | 'uploading' | 'analyzing';

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

  const isBusy = stage !== 'idle';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 18 }}>
        <View>
          <Text style={s.labelXs}>Ekle</Text>
          <Text style={s.h1}>Bir şeyler kaydedelim</Text>
          <Text style={s.subtitle}>
            Yemek fotoğrafı, aktivite, kilo veya su — hangisini eklemek istersin?
          </Text>
        </View>

        {/* AI MEAL — PRIMARY HERO */}
        <View style={s.heroCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={s.aiBadge}>
              <Ionicons name="sparkles" size={11} color={onPrimary} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: onPrimary, letterSpacing: 0.4 }}>
                AI
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: C.text3, fontWeight: '600', letterSpacing: 0.8 }}>
              FOTOĞRAFTAN YEMEK
            </Text>
          </View>

          {isBusy ? (
            <View style={s.uploadingBox}>
              {preview && (
                <Image source={{ uri: preview }} style={s.previewImg} resizeMode="cover" />
              )}
              <ActivityIndicator size="large" color={C.lime} />
              <Text style={{ color: C.text2, fontWeight: '600', marginTop: 8 }}>
                {stage === 'uploading' ? 'Fotoğraf yükleniyor…' : 'AI tabağı analiz ediyor…'}
              </Text>
              <Text style={{ color: C.text3, fontSize: 12, marginTop: 4 }}>
                Birkaç saniye sürer
              </Text>
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => startMealUpload('camera')}
                style={({ pressed }) => [s.dropzone, pressed && { opacity: 0.85 }]}
              >
                <View style={s.dropzoneIcon}>
                  <Ionicons name="camera" size={28} color={onPrimary} />
                </View>
                <Text style={s.dropzoneTitle}>Fotoğraf çek</Text>
                <Text style={s.dropzoneSub}>
                  Tabağı çek, AI kaloriyi otomatik hesaplasın
                </Text>
              </Pressable>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <Pressable
                  onPress={() => startMealUpload('library')}
                  style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="images-outline" size={16} color={C.text} />
                  <Text style={s.secondaryBtnText}>Galeriden seç</Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/add-meal-text')}
                  style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name="create-outline" size={16} color={C.text} />
                  <Text style={s.secondaryBtnText}>Yazıyla</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* OTHER TYPES */}
        <View style={{ gap: 10 }}>
          <Text style={s.sectionLabel}>HIZLI EKLE</Text>

          <QuickRow
            icon="pulse"
            iconColor={C.coral}
            tint="rgba(240, 141, 106, 0.14)"
            title="Aktivite"
            subtitle="'1 saat yürüdüm' yaz, AI hesaplasın"
            onPress={() => router.push('/add-activity')}
          />
          <QuickRow
            icon="water"
            iconColor={C.cyan}
            tint="rgba(126, 200, 224, 0.14)"
            title="Su"
            subtitle="Bardak ekle, günlük hedefini takip et"
            onPress={() => router.push('/add-water')}
          />
          <QuickRow
            icon="scale"
            iconColor={C.amber}
            tint="rgba(232, 193, 74, 0.14)"
            title="Kilo"
            subtitle="Tartı + opsiyonel vücut fotoğrafı"
            onPress={() => router.push('/add-weight')}
          />
        </View>

        {error && !isBusy && (
          <View style={s.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={C.coral} />
            <Text style={{ color: C.coral, fontSize: 13, flex: 1 }}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickRow({
  icon,
  iconColor,
  tint,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.quickRow, pressed && { opacity: 0.85 }]}
    >
      <View style={[s.quickIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.quickTitle}>{title}</Text>
        <Text style={s.quickSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={C.text3} />
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
    fontSize: 26,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.6,
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: C.text3,
    marginTop: 6,
    lineHeight: 18,
  },
  sectionLabel: {
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: C.text3,
    fontWeight: '600',
    marginBottom: 2,
    marginLeft: 2,
  },
  heroCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.lime,
    borderRadius: 999,
  },
  dropzone: {
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(184, 240, 77, 0.45)',
    backgroundColor: 'rgba(184, 240, 77, 0.06)',
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  dropzoneIcon: {
    width: 62,
    height: 62,
    borderRadius: 999,
    backgroundColor: C.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: C.lime,
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 6,
  },
  dropzoneTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  dropzoneSub: {
    fontSize: 12,
    color: C.text3,
    marginTop: 6,
    textAlign: 'center',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  secondaryBtnText: {
    color: C.text,
    fontSize: 13.5,
    fontWeight: '600',
  },
  uploadingBox: {
    alignItems: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  previewImg: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginBottom: 6,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border2,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.2,
  },
  quickSub: {
    fontSize: 12,
    color: C.text3,
    marginTop: 2,
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
});
